CREATE OR REPLACE FUNCTION public.create_team_ticket(
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
  p_created_by_user_id uuid,
  p_priority text
)
RETURNS public.tickets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_priority text := lower(btrim(p_priority));
  v_ticket public.tickets%ROWTYPE;
BEGIN
  IF p_created_by_user_id IS NULL
     OR NOT public.is_active_team_member(p_created_by_user_id) THEN
    RAISE EXCEPTION 'active team member is required';
  END IF;
  IF v_priority NOT IN ('low', 'medium', 'high', 'urgent') THEN
    RAISE EXCEPTION 'invalid priority';
  END IF;

  v_ticket := public.create_ticket(
    p_project_slug,
    p_category_id,
    p_reporter_name,
    p_reporter_email,
    p_title,
    p_description,
    p_impact,
    p_tracking_token_hash,
    p_tracking_expires_at,
    p_idempotency_key,
    p_created_by_user_id
  );

  UPDATE public.tickets
  SET priority = v_priority,
      priority_snapshot = v_priority
  WHERE id = v_ticket.id
  RETURNING * INTO v_ticket;

  RETURN v_ticket;
END;
$$;

REVOKE ALL ON FUNCTION public.create_team_ticket(
  text, uuid, text, text, text, text, text, text, timestamptz, text, uuid, text
) FROM PUBLIC, anon, authenticated;
