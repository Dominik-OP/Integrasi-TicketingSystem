CREATE OR REPLACE FUNCTION public.categorize_ticket(
  p_ticket_id uuid,
  p_expected_version integer,
  p_actor_user_id uuid,
  p_category_id uuid
)
RETURNS public.tickets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_before public.tickets%ROWTYPE;
  v_after public.tickets%ROWTYPE;
  v_category public.categories%ROWTYPE;
  v_sla public.sla_rules%ROWTYPE;
  v_actor_name text;
  v_actor_role text;
BEGIN
  IF NOT public.has_permission_for_user(p_actor_user_id, 'assign_ticket') THEN
    RAISE EXCEPTION 'actor is not allowed to categorize tickets';
  END IF;

  SELECT * INTO v_before
  FROM public.tickets
  WHERE id = p_ticket_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ticket not found'; END IF;
  IF v_before.version <> p_expected_version THEN
    RAISE EXCEPTION 'ticket version conflict: expected %, found %', p_expected_version, v_before.version;
  END IF;

  SELECT * INTO v_category
  FROM public.categories
  WHERE id = p_category_id AND is_active;
  IF NOT FOUND THEN RAISE EXCEPTION 'active category not found'; END IF;

  SELECT * INTO v_sla
  FROM public.sla_rules
  WHERE category_id = v_category.id;
  IF NOT FOUND THEN RAISE EXCEPTION 'category SLA rule not found'; END IF;

  SELECT tm.display_name, r.name INTO v_actor_name, v_actor_role
  FROM public.team_members tm
  JOIN public.roles r ON r.id = tm.role_id
  WHERE tm.user_id = p_actor_user_id AND tm.is_active AND r.is_active;
  IF v_actor_name IS NULL THEN RAISE EXCEPTION 'active actor not found'; END IF;

  UPDATE public.tickets
  SET category_id = v_category.id,
      category_name_snapshot = v_category.name,
      sla_response_minutes_snapshot = v_sla.response_target_minutes,
      sla_resolution_minutes_snapshot = v_sla.resolution_target_minutes
  WHERE id = p_ticket_id
  RETURNING * INTO v_after;

  INSERT INTO public.ticket_events (
    ticket_id, event_type, visibility, actor_user_id,
    actor_name_snapshot, actor_role_snapshot, summary, before_data, after_data
  ) VALUES (
    p_ticket_id, 'category_changed', 'internal', p_actor_user_id,
    v_actor_name, v_actor_role, 'Kategori tiket diubah menjadi ' || v_category.name,
    jsonb_build_object('category_id', v_before.category_id, 'category', v_before.category_name_snapshot),
    jsonb_build_object('category_id', v_after.category_id, 'category', v_after.category_name_snapshot)
  );

  RETURN v_after;
END;
$$;

REVOKE ALL ON FUNCTION public.categorize_ticket(uuid, integer, uuid, uuid)
  FROM PUBLIC, anon, authenticated;
