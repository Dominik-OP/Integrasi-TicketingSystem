CREATE TABLE public.team_access_requests (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON UPDATE RESTRICT ON DELETE CASCADE,
  email text NOT NULL CHECK (
    email = lower(email)
    AND email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  ),
  display_name text NOT NULL CHECK (btrim(display_name) <> ''),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  assigned_role_id uuid REFERENCES public.roles(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  reviewed_by_user_id uuid REFERENCES public.team_members(user_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  requested_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT team_access_requests_review_check CHECK (
    (status = 'pending' AND assigned_role_id IS NULL AND reviewed_by_user_id IS NULL AND reviewed_at IS NULL)
    OR
    (status = 'approved' AND assigned_role_id IS NOT NULL AND reviewed_by_user_id IS NOT NULL AND reviewed_at IS NOT NULL)
    OR
    (status = 'rejected' AND assigned_role_id IS NULL AND reviewed_by_user_id IS NOT NULL AND reviewed_at IS NOT NULL)
  )
);

CREATE UNIQUE INDEX team_access_requests_email_unique
  ON public.team_access_requests (lower(email));
CREATE INDEX team_access_requests_pending_idx
  ON public.team_access_requests (requested_at, user_id)
  WHERE status = 'pending';

CREATE TRIGGER team_access_requests_updated_at
BEFORE UPDATE ON public.team_access_requests
FOR EACH ROW EXECUTE FUNCTION system.update_updated_at();

ALTER TABLE public.team_access_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.team_access_requests FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.register_team_access_request(
  p_user_id uuid,
  p_email text,
  p_display_name text,
  p_allowed_domain text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_email text := lower(btrim(p_email));
  v_name text := COALESCE(NULLIF(btrim(p_display_name), ''), split_part(lower(btrim(p_email)), '@', 1));
  v_member public.team_members%ROWTYPE;
  v_request public.team_access_requests%ROWTYPE;
  v_admin_role_id uuid;
BEGIN
  IF p_user_id IS NULL OR split_part(v_email, '@', 2) <> lower(btrim(p_allowed_domain)) THEN
    RAISE EXCEPTION 'email domain is not allowed';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('integrasi:first-admin'));

  SELECT * INTO v_member
  FROM public.team_members
  WHERE user_id = p_user_id;
  IF FOUND THEN
    RETURN CASE WHEN v_member.is_active THEN 'active' ELSE 'inactive' END;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.team_members tm
    WHERE lower(tm.email) = v_email AND tm.user_id <> p_user_id
  ) THEN
    RAISE EXCEPTION 'email already belongs to another account';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.team_members) THEN
    SELECT id INTO v_admin_role_id
    FROM public.roles
    WHERE slug = 'admin' AND is_active;
    IF v_admin_role_id IS NULL THEN RAISE EXCEPTION 'admin role is unavailable'; END IF;

    INSERT INTO public.team_members (user_id, role_id, display_name, email)
    VALUES (p_user_id, v_admin_role_id, v_name, v_email);

    INSERT INTO public.team_access_requests (
      user_id, email, display_name, status, assigned_role_id,
      reviewed_by_user_id, reviewed_at
    ) VALUES (
      p_user_id, v_email, v_name, 'approved', v_admin_role_id,
      p_user_id, now()
    )
    ON CONFLICT (user_id) DO NOTHING;

    RETURN 'active';
  END IF;

  INSERT INTO public.team_access_requests (user_id, email, display_name)
  VALUES (p_user_id, v_email, v_name)
  ON CONFLICT (user_id) DO UPDATE
  SET display_name = EXCLUDED.display_name,
      email = EXCLUDED.email
  RETURNING * INTO v_request;

  RETURN v_request.status;
END;
$$;

CREATE OR REPLACE FUNCTION public.review_team_access_request(
  p_actor_user_id uuid,
  p_request_user_id uuid,
  p_decision text,
  p_role_id uuid DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_request public.team_access_requests%ROWTYPE;
BEGIN
  IF NOT public.has_permission_for_user(p_actor_user_id, 'manage_users')
     OR NOT public.has_permission_for_user(p_actor_user_id, 'manage_roles') THEN
    RAISE EXCEPTION 'actor cannot review team access';
  END IF;

  IF p_decision NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'invalid access decision';
  END IF;

  SELECT * INTO v_request
  FROM public.team_access_requests
  WHERE user_id = p_request_user_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'access request not found'; END IF;
  IF v_request.status <> 'pending' THEN RETURN v_request.status; END IF;

  IF p_decision = 'approved' THEN
    IF p_role_id IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.roles r WHERE r.id = p_role_id AND r.is_active
    ) THEN
      RAISE EXCEPTION 'active role is required';
    END IF;

    INSERT INTO public.team_members (user_id, role_id, display_name, email)
    VALUES (v_request.user_id, p_role_id, v_request.display_name, v_request.email);

    UPDATE public.team_access_requests
    SET status = 'approved',
        assigned_role_id = p_role_id,
        reviewed_by_user_id = p_actor_user_id,
        reviewed_at = now()
    WHERE user_id = p_request_user_id;
  ELSE
    UPDATE public.team_access_requests
    SET status = 'rejected',
        assigned_role_id = NULL,
        reviewed_by_user_id = p_actor_user_id,
        reviewed_at = now()
    WHERE user_id = p_request_user_id;
  END IF;

  RETURN p_decision;
END;
$$;

REVOKE ALL ON FUNCTION public.register_team_access_request(uuid, text, text, text)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.review_team_access_request(uuid, uuid, text, uuid)
  FROM PUBLIC, anon, authenticated;
