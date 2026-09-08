-- Allow the public intake form to create a ticket before support categorises it.
CREATE OR REPLACE FUNCTION public.create_ticket(
  p_project_slug text,
  p_category_id uuid,
  p_reporter_name text,
  p_reporter_email text,
  p_title text,
  p_description text,
  p_impact text,
  p_tracking_token_hash text,
  p_tracking_expires_at timestamptz,
  p_idempotency_key text,
  p_created_by_user_id uuid DEFAULT NULL
)
RETURNS public.tickets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_project public.projects%ROWTYPE;
  v_category public.categories%ROWTYPE;
  v_sla public.sla_rules%ROWTYPE;
  v_ticket public.tickets%ROWTYPE;
  v_number text;
  v_sequence integer;
  v_category_name text := 'Belum dikategorikan';
  v_priority text := 'medium';
  v_response_minutes integer;
  v_resolution_minutes integer;
  v_business_date date := (now() AT TIME ZONE 'Asia/Jakarta')::date;
BEGIN
  IF NULLIF(btrim(p_idempotency_key), '') IS NULL THEN
    RAISE EXCEPTION 'idempotency key is required';
  END IF;

  SELECT * INTO v_project
  FROM public.projects p
  WHERE lower(p.slug) = lower(p_project_slug) AND p.is_active;
  IF NOT FOUND THEN RAISE EXCEPTION 'active project not found'; END IF;

  SELECT * INTO v_ticket
  FROM public.tickets t
  WHERE t.project_id = v_project.id
    AND t.submission_idempotency_key = p_idempotency_key;
  IF FOUND THEN RETURN v_ticket; END IF;

  IF p_category_id IS NOT NULL THEN
    SELECT * INTO v_category
    FROM public.categories c
    WHERE c.id = p_category_id AND c.is_active;
    IF NOT FOUND THEN RAISE EXCEPTION 'active category not found'; END IF;

    SELECT * INTO v_sla FROM public.sla_rules s WHERE s.category_id = v_category.id;
    v_category_name := v_category.name;
    v_priority := v_category.default_priority;
    v_response_minutes := v_sla.response_target_minutes;
    v_resolution_minutes := v_sla.resolution_target_minutes;
  END IF;

  SELECT a.ticket_number, a.sequence_number
  INTO v_number, v_sequence
  FROM public.allocate_ticket_number(v_project.id, v_business_date) a;

  INSERT INTO public.tickets (
    project_id, category_id, created_by_user_id, ticket_number,
    business_date, sequence_number, submission_idempotency_key,
    reporter_name, reporter_email, title, description, impact,
    category_name_snapshot, priority, priority_snapshot,
    sla_response_minutes_snapshot, sla_resolution_minutes_snapshot
  ) VALUES (
    v_project.id, v_category.id, p_created_by_user_id, v_number,
    v_business_date, v_sequence, p_idempotency_key,
    btrim(p_reporter_name), lower(btrim(p_reporter_email)), btrim(p_title), btrim(p_description), COALESCE(p_impact, ''),
    v_category_name, v_priority, v_priority,
    v_response_minutes, v_resolution_minutes
  ) RETURNING * INTO v_ticket;

  INSERT INTO public.tracking_grants (ticket_id, token_hash, expires_at)
  VALUES (v_ticket.id, lower(p_tracking_token_hash), p_tracking_expires_at);

  INSERT INTO public.ticket_events (
    ticket_id, event_type, visibility, actor_user_id,
    actor_name_snapshot, actor_role_snapshot, summary, after_data
  ) VALUES (
    v_ticket.id, 'ticket_created', 'public', p_created_by_user_id,
    btrim(p_reporter_name), CASE WHEN p_created_by_user_id IS NULL THEN 'Pelapor' ELSE 'Anggota tim' END,
    CASE WHEN p_created_by_user_id IS NULL THEN 'Tiket dibuat oleh pelapor' ELSE 'Tiket dibuat oleh tim support' END,
    jsonb_build_object('status', v_ticket.status, 'ticket_number', v_ticket.ticket_number)
  );

  INSERT INTO public.outbox_events (
    event_type, aggregate_type, aggregate_id, deduplication_key, payload
  ) VALUES (
    'ticket_created', 'ticket', v_ticket.id, 'ticket-created:' || v_ticket.id::text,
    jsonb_build_object(
      'ticket_id', v_ticket.id,
      'ticket_number', v_ticket.ticket_number,
      'reporter_email', v_ticket.reporter_email
    )
  );

  RETURN v_ticket;
EXCEPTION
  WHEN unique_violation THEN
    SELECT * INTO v_ticket
    FROM public.tickets t
    WHERE t.project_id = v_project.id
      AND t.submission_idempotency_key = p_idempotency_key;
    IF FOUND THEN RETURN v_ticket; END IF;
    RAISE;
END;
$$;

-- A fresh project has no team member. The first verified email becomes Admin.
-- The advisory lock makes simultaneous first logins deterministic.
CREATE OR REPLACE FUNCTION public.bootstrap_first_admin(
  p_user_id uuid,
  p_email text,
  p_display_name text
)
RETURNS public.team_members
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_member public.team_members%ROWTYPE;
  v_role_id uuid;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('integrasi:first-admin'));

  SELECT * INTO v_member FROM public.team_members WHERE user_id = p_user_id;
  IF FOUND THEN RETURN v_member; END IF;

  IF EXISTS (SELECT 1 FROM public.team_members) THEN
    RAISE EXCEPTION 'email is not registered as a team member';
  END IF;

  SELECT id INTO v_role_id FROM public.roles WHERE slug = 'admin' AND is_active;
  IF v_role_id IS NULL THEN RAISE EXCEPTION 'admin role is unavailable'; END IF;

  INSERT INTO public.team_members (user_id, role_id, display_name, email)
  VALUES (
    p_user_id,
    v_role_id,
    COALESCE(NULLIF(btrim(p_display_name), ''), split_part(lower(btrim(p_email)), '@', 1)),
    lower(btrim(p_email))
  )
  RETURNING * INTO v_member;

  RETURN v_member;
END;
$$;

REVOKE ALL ON FUNCTION public.bootstrap_first_admin(uuid, text, text) FROM PUBLIC, anon, authenticated;
