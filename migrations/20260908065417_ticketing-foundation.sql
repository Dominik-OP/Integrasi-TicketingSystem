-- Ticketing backend foundation for InsForge.
-- Application objects live in public; InsForge-managed schemas are referenced only.

CREATE TABLE public.access_levels (
  key text PRIMARY KEY,
  display_name text NOT NULL CHECK (btrim(display_name) <> ''),
  sort_order smallint NOT NULL UNIQUE CHECK (sort_order > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT access_levels_key_check CHECK (key IN ('agent', 'reviewer', 'admin'))
);

CREATE TABLE public.permissions (
  key text PRIMARY KEY,
  label text NOT NULL CHECK (btrim(label) <> ''),
  description text NOT NULL DEFAULT '',
  sort_order smallint NOT NULL UNIQUE CHECK (sort_order > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT permissions_key_check CHECK (
    key IN (
      'view_all', 'assign_ticket', 'update_status', 'comment',
      'manage_categories', 'manage_roles', 'manage_users',
      'manage_projects', 'view_reports', 'export_reports'
    )
  )
);

CREATE TABLE public.roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL,
  name text NOT NULL CHECK (btrim(name) <> ''),
  access_level_key text NOT NULL REFERENCES public.access_levels(key) ON UPDATE RESTRICT ON DELETE RESTRICT,
  is_system boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT roles_slug_format CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

CREATE UNIQUE INDEX roles_slug_unique ON public.roles (lower(slug));
CREATE UNIQUE INDEX roles_name_unique ON public.roles (lower(name));
CREATE INDEX roles_access_level_idx ON public.roles (access_level_key) WHERE is_active;

CREATE TABLE public.role_permissions (
  role_id uuid NOT NULL REFERENCES public.roles(id) ON UPDATE RESTRICT ON DELETE CASCADE,
  permission_key text NOT NULL REFERENCES public.permissions(key) ON UPDATE RESTRICT ON DELETE CASCADE,
  allowed boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (role_id, permission_key)
);

CREATE INDEX role_permissions_permission_idx ON public.role_permissions (permission_key, role_id);

CREATE TABLE public.team_members (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  role_id uuid NOT NULL REFERENCES public.roles(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  display_name text NOT NULL CHECK (btrim(display_name) <> ''),
  email text NOT NULL CHECK (email = lower(email) AND email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  is_active boolean NOT NULL DEFAULT true,
  deactivated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT team_members_deactivation_check CHECK (
    (is_active AND deactivated_at IS NULL) OR
    (NOT is_active AND deactivated_at IS NOT NULL)
  )
);

CREATE UNIQUE INDEX team_members_email_unique ON public.team_members (lower(email));
CREATE INDEX team_members_role_idx ON public.team_members (role_id) WHERE is_active;

CREATE TABLE public.user_permission_overrides (
  user_id uuid NOT NULL REFERENCES public.team_members(user_id) ON UPDATE RESTRICT ON DELETE CASCADE,
  permission_key text NOT NULL REFERENCES public.permissions(key) ON UPDATE RESTRICT ON DELETE CASCADE,
  allowed boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, permission_key)
);

CREATE INDEX user_permission_overrides_permission_idx
  ON public.user_permission_overrides (permission_key, user_id);

CREATE TABLE public.user_preferences (
  user_id uuid PRIMARY KEY REFERENCES public.team_members(user_id) ON UPDATE RESTRICT ON DELETE CASCADE,
  theme text NOT NULL DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
  compact_mode boolean NOT NULL DEFAULT false,
  default_project_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL,
  name text NOT NULL CHECK (btrim(name) <> ''),
  ticket_prefix text NOT NULL,
  description text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT projects_slug_format CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  CONSTRAINT projects_prefix_format CHECK (ticket_prefix ~ '^[A-Z]{2,8}$')
);

CREATE UNIQUE INDEX projects_slug_unique ON public.projects (lower(slug));
CREATE UNIQUE INDEX projects_prefix_unique ON public.projects (upper(ticket_prefix));
CREATE INDEX projects_active_name_idx ON public.projects (is_active, name);

ALTER TABLE public.user_preferences
  ADD CONSTRAINT user_preferences_default_project_fk
  FOREIGN KEY (default_project_id) REFERENCES public.projects(id) ON UPDATE RESTRICT ON DELETE SET NULL;

CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL,
  name text NOT NULL CHECK (btrim(name) <> ''),
  default_priority text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT categories_slug_format CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  CONSTRAINT categories_priority_check CHECK (default_priority IN ('low', 'medium', 'high', 'urgent'))
);

CREATE UNIQUE INDEX categories_slug_unique ON public.categories (lower(slug));
CREATE UNIQUE INDEX categories_name_unique ON public.categories (lower(name));
CREATE INDEX categories_active_name_idx ON public.categories (is_active, name);

CREATE TABLE public.sla_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL UNIQUE REFERENCES public.categories(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  response_target_minutes integer NOT NULL CHECK (response_target_minutes > 0),
  resolution_target_minutes integer NOT NULL CHECK (resolution_target_minutes > 0),
  uses_business_hours boolean NOT NULL DEFAULT false,
  pauses_while_waiting boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sla_rules_target_order_check CHECK (resolution_target_minutes >= response_target_minutes)
);

CREATE TABLE public.ticket_counters (
  project_id uuid NOT NULL REFERENCES public.projects(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  business_date date NOT NULL,
  last_sequence integer NOT NULL CHECK (last_sequence > 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, business_date)
);

CREATE TABLE public.tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  category_id uuid REFERENCES public.categories(id) ON UPDATE RESTRICT ON DELETE SET NULL,
  created_by_user_id uuid REFERENCES public.team_members(user_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  assigned_reviewer_id uuid REFERENCES public.team_members(user_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  assigned_agent_id uuid REFERENCES public.team_members(user_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  ticket_number text NOT NULL UNIQUE,
  business_date date NOT NULL,
  sequence_number integer NOT NULL CHECK (sequence_number > 0),
  submission_idempotency_key text,
  reporter_name text NOT NULL CHECK (btrim(reporter_name) <> ''),
  reporter_email text NOT NULL CHECK (reporter_email = lower(reporter_email)),
  title text NOT NULL CHECK (btrim(title) <> '' AND char_length(title) <= 200),
  description text NOT NULL CHECK (btrim(description) <> ''),
  impact text NOT NULL DEFAULT '',
  category_name_snapshot text NOT NULL CHECK (btrim(category_name_snapshot) <> ''),
  priority text NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  priority_snapshot text NOT NULL CHECK (priority_snapshot IN ('low', 'medium', 'high', 'urgent')),
  sla_response_minutes_snapshot integer CHECK (sla_response_minutes_snapshot > 0),
  sla_resolution_minutes_snapshot integer CHECK (sla_resolution_minutes_snapshot > 0),
  status text NOT NULL DEFAULT 'new' CHECK (
    status IN ('new', 'on_review', 'in_progress', 'waiting_on_user', 'resolved', 'closed')
  ),
  resolution_cause text,
  resolution_fix text,
  resolution_impact text,
  resolution_steps text,
  resolution_internal_reference text,
  closed_reason text,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  first_reviewed_at timestamptz,
  first_public_reply_at timestamptz,
  resolved_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tickets_project_sequence_unique UNIQUE (project_id, business_date, sequence_number),
  CONSTRAINT tickets_project_idempotency_unique UNIQUE (project_id, submission_idempotency_key),
  CONSTRAINT tickets_sla_snapshot_check CHECK (
    sla_resolution_minutes_snapshot IS NULL OR
    sla_response_minutes_snapshot IS NULL OR
    sla_resolution_minutes_snapshot >= sla_response_minutes_snapshot
  ),
  CONSTRAINT tickets_resolution_required_check CHECK (
    status NOT IN ('resolved', 'closed') OR (
      NULLIF(btrim(resolution_cause), '') IS NOT NULL AND
      NULLIF(btrim(resolution_fix), '') IS NOT NULL AND
      NULLIF(btrim(resolution_impact), '') IS NOT NULL
    )
  ),
  CONSTRAINT tickets_closed_reason_check CHECK (
    status <> 'closed' OR NULLIF(btrim(closed_reason), '') IS NOT NULL
  )
);

CREATE INDEX tickets_project_status_created_idx
  ON public.tickets (project_id, status, created_at DESC, id DESC);
CREATE INDEX tickets_agent_status_created_idx
  ON public.tickets (assigned_agent_id, status, created_at DESC, id DESC)
  WHERE assigned_agent_id IS NOT NULL;
CREATE INDEX tickets_reviewer_status_created_idx
  ON public.tickets (assigned_reviewer_id, status, created_at DESC, id DESC)
  WHERE assigned_reviewer_id IS NOT NULL;
CREATE INDEX tickets_reporter_email_created_idx
  ON public.tickets (lower(reporter_email), created_at DESC, id DESC);
CREATE INDEX tickets_category_created_idx
  ON public.tickets (category_id, created_at DESC) WHERE category_id IS NOT NULL;
CREATE INDEX tickets_updated_probe_idx ON public.tickets (updated_at DESC, id DESC);

CREATE TABLE public.ticket_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  event_type text NOT NULL CHECK (event_type ~ '^[a-z0-9]+(_[a-z0-9]+)*$'),
  visibility text NOT NULL DEFAULT 'internal' CHECK (visibility IN ('public', 'internal')),
  actor_user_id uuid REFERENCES public.team_members(user_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  actor_name_snapshot text NOT NULL CHECK (btrim(actor_name_snapshot) <> ''),
  actor_role_snapshot text NOT NULL CHECK (btrim(actor_role_snapshot) <> ''),
  summary text NOT NULL CHECK (btrim(summary) <> ''),
  before_data jsonb,
  after_data jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ticket_events_ticket_time_idx
  ON public.ticket_events (ticket_id, occurred_at DESC, id DESC);
CREATE INDEX ticket_events_actor_time_idx
  ON public.ticket_events (actor_user_id, occurred_at DESC)
  WHERE actor_user_id IS NOT NULL;

CREATE TABLE public.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  author_user_id uuid REFERENCES public.team_members(user_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  author_name_snapshot text NOT NULL CHECK (btrim(author_name_snapshot) <> ''),
  author_role_snapshot text NOT NULL CHECK (btrim(author_role_snapshot) <> ''),
  body text NOT NULL CHECK (btrim(body) <> ''),
  visibility text NOT NULL CHECK (visibility IN ('public', 'internal')),
  source text NOT NULL DEFAULT 'team' CHECK (source IN ('team', 'reporter', 'system')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX comments_ticket_time_idx
  ON public.comments (ticket_id, created_at DESC, id DESC);

CREATE TABLE public.attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  comment_id uuid REFERENCES public.comments(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  uploaded_by_user_id uuid REFERENCES public.team_members(user_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  original_filename text NOT NULL CHECK (btrim(original_filename) <> ''),
  storage_bucket text NOT NULL CHECK (btrim(storage_bucket) <> ''),
  storage_key text,
  storage_url text,
  mime_type text NOT NULL CHECK (mime_type IN ('image/png', 'image/jpeg', 'image/webp', 'application/pdf')),
  size_bytes bigint NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 5242880),
  visibility text NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'internal')),
  upload_status text NOT NULL DEFAULT 'pending' CHECK (upload_status IN ('pending', 'ready', 'failed', 'deleted')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT attachments_ready_storage_check CHECK (
    upload_status <> 'ready' OR (
      NULLIF(btrim(storage_key), '') IS NOT NULL AND
      NULLIF(btrim(storage_url), '') IS NOT NULL
    )
  )
);

CREATE UNIQUE INDEX attachments_bucket_key_unique
  ON public.attachments (storage_bucket, storage_key)
  WHERE storage_key IS NOT NULL AND upload_status <> 'deleted';
CREATE INDEX attachments_ticket_time_idx
  ON public.attachments (ticket_id, created_at DESC, id DESC);
CREATE INDEX attachments_comment_idx
  ON public.attachments (comment_id) WHERE comment_id IS NOT NULL;

CREATE TABLE public.tracking_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON UPDATE RESTRICT ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tracking_grants_expiry_check CHECK (expires_at > created_at),
  CONSTRAINT tracking_grants_revoke_check CHECK (revoked_at IS NULL OR revoked_at >= created_at)
);

CREATE INDEX tracking_grants_ticket_active_idx
  ON public.tracking_grants (ticket_id, expires_at DESC)
  WHERE revoked_at IS NULL;

CREATE TABLE public.outbox_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL CHECK (event_type ~ '^[a-z0-9]+(_[a-z0-9]+)*$'),
  aggregate_type text NOT NULL CHECK (btrim(aggregate_type) <> ''),
  aggregate_id uuid NOT NULL,
  deduplication_key text NOT NULL UNIQUE CHECK (btrim(deduplication_key) <> ''),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(payload) = 'object'),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'dead_letter')),
  available_at timestamptz NOT NULL DEFAULT now(),
  locked_at timestamptz,
  locked_by text,
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  max_attempts integer NOT NULL DEFAULT 5 CHECK (max_attempts > 0),
  last_error text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT outbox_lock_check CHECK (
    (locked_at IS NULL AND locked_by IS NULL) OR
    (locked_at IS NOT NULL AND NULLIF(btrim(locked_by), '') IS NOT NULL)
  )
);

CREATE INDEX outbox_events_dispatch_idx
  ON public.outbox_events (status, available_at, created_at)
  WHERE status IN ('pending', 'failed');
CREATE INDEX outbox_events_aggregate_idx
  ON public.outbox_events (aggregate_type, aggregate_id, created_at DESC);

CREATE TABLE public.email_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  outbox_event_id uuid NOT NULL REFERENCES public.outbox_events(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  recipient_email text NOT NULL CHECK (recipient_email = lower(recipient_email)),
  provider text NOT NULL CHECK (btrim(provider) <> ''),
  provider_message_id text,
  provider_idempotency_key text NOT NULL UNIQUE CHECK (btrim(provider_idempotency_key) <> ''),
  status text NOT NULL CHECK (status IN ('queued', 'sent', 'delivered', 'bounced', 'failed', 'unknown')),
  attempt_number integer NOT NULL CHECK (attempt_number > 0),
  error_code text,
  error_message text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT email_deliveries_attempt_unique UNIQUE (outbox_event_id, attempt_number)
);

CREATE INDEX email_deliveries_outbox_idx
  ON public.email_deliveries (outbox_event_id, created_at DESC);

CREATE TABLE public.audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid REFERENCES public.team_members(user_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  actor_name_snapshot text NOT NULL CHECK (btrim(actor_name_snapshot) <> ''),
  actor_role_snapshot text NOT NULL CHECK (btrim(actor_role_snapshot) <> ''),
  action text NOT NULL CHECK (action ~ '^[a-z0-9]+(_[a-z0-9]+)*$'),
  entity_type text NOT NULL CHECK (btrim(entity_type) <> ''),
  entity_id text NOT NULL CHECK (btrim(entity_id) <> ''),
  before_data jsonb,
  after_data jsonb,
  request_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX audit_events_entity_time_idx
  ON public.audit_events (entity_type, entity_id, created_at DESC, id DESC);
CREATE INDEX audit_events_actor_time_idx
  ON public.audit_events (actor_user_id, created_at DESC)
  WHERE actor_user_id IS NOT NULL;

-- updated_at maintenance
CREATE TRIGGER access_levels_updated_at BEFORE UPDATE ON public.access_levels
  FOR EACH ROW EXECUTE FUNCTION system.update_updated_at();
CREATE TRIGGER roles_updated_at BEFORE UPDATE ON public.roles
  FOR EACH ROW EXECUTE FUNCTION system.update_updated_at();
CREATE TRIGGER role_permissions_updated_at BEFORE UPDATE ON public.role_permissions
  FOR EACH ROW EXECUTE FUNCTION system.update_updated_at();
CREATE TRIGGER team_members_updated_at BEFORE UPDATE ON public.team_members
  FOR EACH ROW EXECUTE FUNCTION system.update_updated_at();
CREATE TRIGGER user_permission_overrides_updated_at BEFORE UPDATE ON public.user_permission_overrides
  FOR EACH ROW EXECUTE FUNCTION system.update_updated_at();
CREATE TRIGGER user_preferences_updated_at BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW EXECUTE FUNCTION system.update_updated_at();
CREATE TRIGGER projects_updated_at BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION system.update_updated_at();
CREATE TRIGGER categories_updated_at BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION system.update_updated_at();
CREATE TRIGGER sla_rules_updated_at BEFORE UPDATE ON public.sla_rules
  FOR EACH ROW EXECUTE FUNCTION system.update_updated_at();
CREATE TRIGGER ticket_counters_updated_at BEFORE UPDATE ON public.ticket_counters
  FOR EACH ROW EXECUTE FUNCTION system.update_updated_at();
CREATE TRIGGER attachments_updated_at BEFORE UPDATE ON public.attachments
  FOR EACH ROW EXECUTE FUNCTION system.update_updated_at();
CREATE TRIGGER outbox_events_updated_at BEFORE UPDATE ON public.outbox_events
  FOR EACH ROW EXECUTE FUNCTION system.update_updated_at();

-- RBAC helpers are SECURITY DEFINER so RLS policies never recurse through protected tables.
CREATE OR REPLACE FUNCTION public.is_active_team_member(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.team_members tm
    JOIN public.roles r ON r.id = tm.role_id
    WHERE tm.user_id = p_user_id
      AND tm.is_active
      AND r.is_active
  );
$$;

CREATE OR REPLACE FUNCTION public.user_base_access(p_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
  SELECT r.access_level_key
  FROM public.team_members tm
  JOIN public.roles r ON r.id = tm.role_id
  WHERE tm.user_id = p_user_id
    AND tm.is_active
    AND r.is_active;
$$;

CREATE OR REPLACE FUNCTION public.has_permission_for_user(p_user_id uuid, p_permission_key text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
  SELECT COALESCE((
    SELECT COALESCE(upo.allowed, rp.allowed, false)
    FROM public.team_members tm
    JOIN public.roles r ON r.id = tm.role_id AND r.is_active
    LEFT JOIN public.role_permissions rp
      ON rp.role_id = tm.role_id AND rp.permission_key = p_permission_key
    LEFT JOIN public.user_permission_overrides upo
      ON upo.user_id = tm.user_id AND upo.permission_key = p_permission_key
    WHERE tm.user_id = p_user_id
      AND tm.is_active
  ), false);
$$;

CREATE OR REPLACE FUNCTION public.has_permission(p_permission_key text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
  SELECT COALESCE(public.has_permission_for_user((SELECT auth.uid()), p_permission_key), false);
$$;

CREATE OR REPLACE FUNCTION public.can_user_view_ticket(p_user_id uuid, p_ticket_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.tickets t
    WHERE t.id = p_ticket_id
      AND public.is_active_team_member(p_user_id)
      AND (
        public.has_permission_for_user(p_user_id, 'view_all')
        OR t.assigned_agent_id = p_user_id
        OR t.assigned_reviewer_id = p_user_id
        OR t.created_by_user_id = p_user_id
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.can_view_ticket(p_ticket_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
  SELECT public.can_user_view_ticket((SELECT auth.uid()), p_ticket_id);
$$;

CREATE OR REPLACE FUNCTION public.guard_last_active_admin_member()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_old_level text;
  v_new_level text;
  v_other_admins integer;
BEGIN
  SELECT r.access_level_key INTO v_old_level
  FROM public.roles r WHERE r.id = OLD.role_id;

  IF TG_OP = 'UPDATE' THEN
    SELECT r.access_level_key INTO v_new_level
    FROM public.roles r WHERE r.id = NEW.role_id;
  END IF;

  IF OLD.is_active AND v_old_level = 'admin'
     AND (TG_OP = 'DELETE' OR NOT NEW.is_active OR v_new_level <> 'admin') THEN
    PERFORM pg_advisory_xact_lock(hashtext('ticketing:last-active-admin'));
    SELECT count(*) INTO v_other_admins
    FROM public.team_members tm
    JOIN public.roles r ON r.id = tm.role_id
    WHERE tm.user_id <> OLD.user_id
      AND tm.is_active
      AND r.is_active
      AND r.access_level_key = 'admin';

    IF v_other_admins = 0 THEN
      RAISE EXCEPTION 'cannot remove, deactivate, or demote the last active admin';
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  IF NEW.is_active THEN NEW.deactivated_at := NULL;
  ELSIF OLD.is_active AND NEW.deactivated_at IS NULL THEN NEW.deactivated_at := now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER team_members_guard_last_admin
BEFORE UPDATE OR DELETE ON public.team_members
FOR EACH ROW EXECUTE FUNCTION public.guard_last_active_admin_member();

CREATE OR REPLACE FUNCTION public.guard_admin_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_affected_admins integer;
  v_other_admins integer;
BEGIN
  IF OLD.access_level_key = 'admin'
     AND OLD.is_active
     AND (NEW.access_level_key <> 'admin' OR NOT NEW.is_active) THEN
    PERFORM pg_advisory_xact_lock(hashtext('ticketing:last-active-admin'));
    SELECT count(*) INTO v_affected_admins
    FROM public.team_members tm
    WHERE tm.role_id = OLD.id AND tm.is_active;

    IF v_affected_admins > 0 THEN
      SELECT count(*) INTO v_other_admins
      FROM public.team_members tm
      JOIN public.roles r ON r.id = tm.role_id
      WHERE tm.role_id <> OLD.id
        AND tm.is_active
        AND r.is_active
        AND r.access_level_key = 'admin';

      IF v_other_admins = 0 THEN
        RAISE EXCEPTION 'cannot change the role of the last active admin';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER roles_guard_last_admin
BEFORE UPDATE OF access_level_key, is_active ON public.roles
FOR EACH ROW EXECUTE FUNCTION public.guard_admin_role_change();

CREATE OR REPLACE FUNCTION public.validate_attachment_comment_ticket()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  IF NEW.comment_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.comments c
    WHERE c.id = NEW.comment_id AND c.ticket_id = NEW.ticket_id
  ) THEN
    RAISE EXCEPTION 'attachment comment must belong to the same ticket';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER attachments_validate_comment_ticket
BEFORE INSERT OR UPDATE OF ticket_id, comment_id ON public.attachments
FOR EACH ROW EXECUTE FUNCTION public.validate_attachment_comment_ticket();

CREATE OR REPLACE FUNCTION public.enforce_ticket_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  IF NEW.project_id IS DISTINCT FROM OLD.project_id
     OR NEW.ticket_number IS DISTINCT FROM OLD.ticket_number
     OR NEW.business_date IS DISTINCT FROM OLD.business_date
     OR NEW.sequence_number IS DISTINCT FROM OLD.sequence_number
     OR NEW.submission_idempotency_key IS DISTINCT FROM OLD.submission_idempotency_key THEN
    RAISE EXCEPTION 'ticket business identity fields are immutable';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT (
      (OLD.status = 'new' AND NEW.status = 'on_review') OR
      (OLD.status = 'on_review' AND NEW.status = 'in_progress') OR
      (OLD.status = 'in_progress' AND NEW.status IN ('waiting_on_user', 'resolved', 'on_review')) OR
      (OLD.status = 'waiting_on_user' AND NEW.status IN ('in_progress', 'on_review')) OR
      (OLD.status = 'resolved' AND NEW.status IN ('closed', 'on_review')) OR
      (OLD.status = 'closed' AND NEW.status = 'on_review')
    ) THEN
      RAISE EXCEPTION 'illegal ticket status transition: % -> %', OLD.status, NEW.status;
    END IF;

    IF NEW.status = 'in_progress' AND NOT EXISTS (
      SELECT 1
      FROM public.team_members tm
      JOIN public.roles r ON r.id = tm.role_id
      WHERE tm.user_id = NEW.assigned_agent_id
        AND tm.is_active
        AND r.is_active
        AND r.access_level_key = 'agent'
    ) THEN
      RAISE EXCEPTION 'in_progress requires an active assigned agent';
    END IF;

    IF NEW.status = 'on_review' AND OLD.status = 'new' AND NEW.first_reviewed_at IS NULL THEN
      NEW.first_reviewed_at := now();
    END IF;
    IF NEW.status = 'resolved' THEN NEW.resolved_at := now(); END IF;
    IF NEW.status = 'closed' THEN NEW.closed_at := now(); END IF;
    IF OLD.status IN ('resolved', 'closed') AND NEW.status = 'on_review' THEN
      NEW.resolved_at := NULL;
      NEW.closed_at := NULL;
      NEW.closed_reason := NULL;
    END IF;
  END IF;

  NEW.version := OLD.version + 1;
  RETURN NEW;
END;
$$;

CREATE TRIGGER tickets_enforce_update
BEFORE UPDATE ON public.tickets
FOR EACH ROW EXECUTE FUNCTION public.enforce_ticket_update();

CREATE TRIGGER tickets_updated_at
BEFORE UPDATE ON public.tickets
FOR EACH ROW EXECUTE FUNCTION system.update_updated_at();

CREATE OR REPLACE FUNCTION public.allocate_ticket_number(p_project_id uuid, p_business_date date)
RETURNS TABLE(ticket_number text, sequence_number integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_prefix text;
  v_sequence integer;
BEGIN
  SELECT p.ticket_prefix INTO v_prefix
  FROM public.projects p
  WHERE p.id = p_project_id AND p.is_active
  FOR UPDATE;

  IF v_prefix IS NULL THEN
    RAISE EXCEPTION 'active project not found';
  END IF;

  INSERT INTO public.ticket_counters (project_id, business_date, last_sequence)
  VALUES (p_project_id, p_business_date, 1)
  ON CONFLICT (project_id, business_date)
  DO UPDATE SET last_sequence = public.ticket_counters.last_sequence + 1
  RETURNING last_sequence INTO v_sequence;

  RETURN QUERY SELECT
    v_prefix || '-' || to_char(p_business_date, 'YYYYMMDD') || '-' || lpad(v_sequence::text, 4, '0'),
    v_sequence;
END;
$$;

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

  SELECT * INTO v_category
  FROM public.categories c
  WHERE c.id = p_category_id AND c.is_active;
  IF NOT FOUND THEN RAISE EXCEPTION 'active category not found'; END IF;

  SELECT * INTO v_sla
  FROM public.sla_rules s
  WHERE s.category_id = v_category.id;

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
    v_category.name, v_category.default_priority, v_category.default_priority,
    v_sla.response_target_minutes, v_sla.resolution_target_minutes
  ) RETURNING * INTO v_ticket;

  INSERT INTO public.tracking_grants (ticket_id, token_hash, expires_at)
  VALUES (v_ticket.id, lower(p_tracking_token_hash), p_tracking_expires_at);

  INSERT INTO public.ticket_events (
    ticket_id, event_type, visibility, actor_user_id,
    actor_name_snapshot, actor_role_snapshot, summary, after_data
  ) VALUES (
    v_ticket.id, 'ticket_created', 'public', p_created_by_user_id,
    btrim(p_reporter_name), 'Pelapor', 'Tiket dibuat oleh pelapor',
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

CREATE OR REPLACE FUNCTION public.assign_ticket(
  p_ticket_id uuid,
  p_expected_version integer,
  p_actor_user_id uuid,
  p_reviewer_user_id uuid,
  p_agent_user_id uuid,
  p_priority text
)
RETURNS public.tickets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_before public.tickets%ROWTYPE;
  v_after public.tickets%ROWTYPE;
  v_actor_name text;
  v_actor_role text;
BEGIN
  IF NOT public.has_permission_for_user(p_actor_user_id, 'assign_ticket') THEN
    RAISE EXCEPTION 'actor is not allowed to assign tickets';
  END IF;
  IF p_priority NOT IN ('low', 'medium', 'high', 'urgent') THEN
    RAISE EXCEPTION 'invalid priority';
  END IF;
  IF p_reviewer_user_id IS NOT NULL AND public.user_base_access(p_reviewer_user_id) NOT IN ('reviewer', 'admin') THEN
    RAISE EXCEPTION 'reviewer must be an active reviewer or admin';
  END IF;
  IF p_agent_user_id IS NOT NULL AND public.user_base_access(p_agent_user_id) <> 'agent' THEN
    RAISE EXCEPTION 'agent must be an active agent';
  END IF;

  SELECT * INTO v_before FROM public.tickets WHERE id = p_ticket_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ticket not found'; END IF;
  IF v_before.version <> p_expected_version THEN
    RAISE EXCEPTION 'ticket version conflict: expected %, found %', p_expected_version, v_before.version;
  END IF;

  SELECT tm.display_name, r.name INTO v_actor_name, v_actor_role
  FROM public.team_members tm JOIN public.roles r ON r.id = tm.role_id
  WHERE tm.user_id = p_actor_user_id AND tm.is_active AND r.is_active;

  UPDATE public.tickets
  SET assigned_reviewer_id = p_reviewer_user_id,
      assigned_agent_id = p_agent_user_id,
      priority = p_priority
  WHERE id = p_ticket_id
  RETURNING * INTO v_after;

  INSERT INTO public.ticket_events (
    ticket_id, event_type, visibility, actor_user_id,
    actor_name_snapshot, actor_role_snapshot, summary, before_data, after_data
  ) VALUES (
    p_ticket_id, 'assignment_changed', 'internal', p_actor_user_id,
    v_actor_name, v_actor_role, 'Assignment atau prioritas tiket diperbarui',
    jsonb_build_object('reviewer_id', v_before.assigned_reviewer_id, 'agent_id', v_before.assigned_agent_id, 'priority', v_before.priority),
    jsonb_build_object('reviewer_id', v_after.assigned_reviewer_id, 'agent_id', v_after.assigned_agent_id, 'priority', v_after.priority)
  );

  RETURN v_after;
END;
$$;

CREATE OR REPLACE FUNCTION public.transition_ticket(
  p_ticket_id uuid,
  p_expected_version integer,
  p_actor_user_id uuid,
  p_new_status text,
  p_reason text DEFAULT NULL,
  p_resolution_cause text DEFAULT NULL,
  p_resolution_fix text DEFAULT NULL,
  p_resolution_impact text DEFAULT NULL,
  p_resolution_steps text DEFAULT NULL,
  p_resolution_internal_reference text DEFAULT NULL
)
RETURNS public.tickets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_before public.tickets%ROWTYPE;
  v_after public.tickets%ROWTYPE;
  v_actor_name text;
  v_actor_role text;
  v_public_reply text;
BEGIN
  IF NOT public.has_permission_for_user(p_actor_user_id, 'update_status') THEN
    RAISE EXCEPTION 'actor is not allowed to update ticket status';
  END IF;

  SELECT * INTO v_before FROM public.tickets WHERE id = p_ticket_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ticket not found'; END IF;
  IF v_before.version <> p_expected_version THEN
    RAISE EXCEPTION 'ticket version conflict: expected %, found %', p_expected_version, v_before.version;
  END IF;
  IF public.user_base_access(p_actor_user_id) = 'agent'
     AND v_before.assigned_agent_id IS DISTINCT FROM p_actor_user_id THEN
    RAISE EXCEPTION 'agents may only transition tickets assigned to them';
  END IF;
  IF v_before.status IN ('resolved', 'closed') AND p_new_status = 'on_review'
     AND NULLIF(btrim(p_reason), '') IS NULL THEN
    RAISE EXCEPTION 'reopen reason is required';
  END IF;

  SELECT tm.display_name, r.name INTO v_actor_name, v_actor_role
  FROM public.team_members tm JOIN public.roles r ON r.id = tm.role_id
  WHERE tm.user_id = p_actor_user_id AND tm.is_active AND r.is_active;
  IF v_actor_name IS NULL THEN RAISE EXCEPTION 'active actor not found'; END IF;

  UPDATE public.tickets
  SET status = p_new_status,
      resolution_cause = CASE WHEN p_new_status = 'resolved' THEN p_resolution_cause ELSE resolution_cause END,
      resolution_fix = CASE WHEN p_new_status = 'resolved' THEN p_resolution_fix ELSE resolution_fix END,
      resolution_impact = CASE WHEN p_new_status = 'resolved' THEN p_resolution_impact ELSE resolution_impact END,
      resolution_steps = CASE WHEN p_new_status = 'resolved' THEN p_resolution_steps ELSE resolution_steps END,
      resolution_internal_reference = CASE WHEN p_new_status = 'resolved' THEN p_resolution_internal_reference ELSE resolution_internal_reference END,
      closed_reason = CASE WHEN p_new_status = 'closed' THEN p_reason ELSE closed_reason END,
      first_public_reply_at = CASE
        WHEN p_new_status = 'resolved' THEN COALESCE(first_public_reply_at, now())
        ELSE first_public_reply_at
      END
  WHERE id = p_ticket_id
  RETURNING * INTO v_after;

  INSERT INTO public.ticket_events (
    ticket_id, event_type, visibility, actor_user_id,
    actor_name_snapshot, actor_role_snapshot, summary, before_data, after_data
  ) VALUES (
    p_ticket_id,
    CASE WHEN v_before.status IN ('resolved', 'closed') AND p_new_status = 'on_review'
      THEN 'ticket_reopened' ELSE 'status_changed' END,
    'public', p_actor_user_id, v_actor_name, v_actor_role,
    CASE WHEN NULLIF(btrim(p_reason), '') IS NULL
      THEN 'Status diubah menjadi ' || p_new_status
      ELSE 'Status diubah menjadi ' || p_new_status || ': ' || btrim(p_reason) END,
    jsonb_build_object('status', v_before.status),
    jsonb_build_object('status', v_after.status, 'reason', p_reason)
  );

  IF p_new_status = 'resolved' THEN
    v_public_reply := 'Penyebab: ' || btrim(p_resolution_cause)
      || E'\n\nPerbaikan: ' || btrim(p_resolution_fix)
      || E'\n\nDampak/perubahan: ' || btrim(p_resolution_impact)
      || CASE WHEN NULLIF(btrim(p_resolution_steps), '') IS NULL THEN ''
         ELSE E'\n\nLangkah pelapor: ' || btrim(p_resolution_steps) END;

    INSERT INTO public.comments (
      ticket_id, author_user_id, author_name_snapshot, author_role_snapshot,
      body, visibility, source
    ) VALUES (
      p_ticket_id, p_actor_user_id, v_actor_name, v_actor_role,
      v_public_reply, 'public', 'system'
    );

  END IF;

  IF p_new_status IN ('resolved', 'closed') THEN
    INSERT INTO public.outbox_events (
      event_type, aggregate_type, aggregate_id, deduplication_key, payload
    ) VALUES (
      'ticket_' || p_new_status, 'ticket', p_ticket_id,
      'ticket-' || p_new_status || ':' || p_ticket_id::text || ':v' || v_after.version::text,
      jsonb_build_object(
        'ticket_id', p_ticket_id,
        'ticket_number', v_after.ticket_number,
        'reporter_email', v_after.reporter_email,
        'status', p_new_status
      )
    );
  END IF;

  RETURN v_after;
END;
$$;

CREATE OR REPLACE FUNCTION public.add_ticket_comment(
  p_ticket_id uuid,
  p_actor_user_id uuid,
  p_body text,
  p_visibility text
)
RETURNS public.comments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_comment public.comments%ROWTYPE;
  v_ticket public.tickets%ROWTYPE;
  v_actor_name text;
  v_actor_role text;
BEGIN
  IF p_visibility NOT IN ('public', 'internal') THEN RAISE EXCEPTION 'invalid visibility'; END IF;
  IF NULLIF(btrim(p_body), '') IS NULL THEN RAISE EXCEPTION 'comment body is required'; END IF;
  IF NOT public.has_permission_for_user(p_actor_user_id, 'comment')
     OR NOT public.can_user_view_ticket(p_actor_user_id, p_ticket_id) THEN
    RAISE EXCEPTION 'actor is not allowed to comment on this ticket';
  END IF;

  SELECT * INTO v_ticket FROM public.tickets WHERE id = p_ticket_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ticket not found'; END IF;
  SELECT tm.display_name, r.name INTO v_actor_name, v_actor_role
  FROM public.team_members tm JOIN public.roles r ON r.id = tm.role_id
  WHERE tm.user_id = p_actor_user_id AND tm.is_active AND r.is_active;

  INSERT INTO public.comments (
    ticket_id, author_user_id, author_name_snapshot, author_role_snapshot,
    body, visibility, source
  ) VALUES (
    p_ticket_id, p_actor_user_id, v_actor_name, v_actor_role,
    btrim(p_body), p_visibility, 'team'
  ) RETURNING * INTO v_comment;

  INSERT INTO public.ticket_events (
    ticket_id, event_type, visibility, actor_user_id,
    actor_name_snapshot, actor_role_snapshot, summary, after_data
  ) VALUES (
    p_ticket_id, 'comment_added', p_visibility, p_actor_user_id,
    v_actor_name, v_actor_role,
    CASE WHEN p_visibility = 'public' THEN 'Balasan publik ditambahkan' ELSE 'Catatan internal ditambahkan' END,
    jsonb_build_object('comment_id', v_comment.id)
  );

  IF p_visibility = 'public' THEN
    UPDATE public.tickets
    SET first_public_reply_at = COALESCE(first_public_reply_at, now())
    WHERE id = p_ticket_id;

    INSERT INTO public.outbox_events (
      event_type, aggregate_type, aggregate_id, deduplication_key, payload
    ) VALUES (
      'public_reply_added', 'ticket', p_ticket_id,
      'public-reply:' || v_comment.id::text,
      jsonb_build_object(
        'ticket_id', p_ticket_id,
        'ticket_number', v_ticket.ticket_number,
        'reporter_email', v_ticket.reporter_email,
        'comment_id', v_comment.id
      )
    );
  END IF;

  RETURN v_comment;
END;
$$;

REVOKE ALL ON FUNCTION public.allocate_ticket_number(uuid, date) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_ticket(text, uuid, text, text, text, text, text, text, timestamptz, text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.assign_ticket(uuid, integer, uuid, uuid, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.transition_ticket(uuid, integer, uuid, text, text, text, text, text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.add_ticket_comment(uuid, uuid, text, text) FROM PUBLIC, anon, authenticated;

-- Seed stable master data only; no users or business tickets are inserted.
INSERT INTO public.access_levels (key, display_name, sort_order) VALUES
  ('agent', 'Agent', 1),
  ('reviewer', 'Reviewer', 2),
  ('admin', 'Admin', 3);

INSERT INTO public.permissions (key, label, description, sort_order) VALUES
  ('view_all', 'Lihat semua tiket', 'Melihat seluruh tiket lintas project.', 1),
  ('assign_ticket', 'Assign & delegasikan tiket', 'Menentukan reviewer, agent, dan prioritas final.', 2),
  ('update_status', 'Ubah status tiket', 'Mengubah status sesuai transition rule.', 3),
  ('comment', 'Komentar internal & publik', 'Menulis diskusi pada tiket yang dapat diakses.', 4),
  ('manage_categories', 'Kelola kategori & SLA', 'Mengelola kategori dan target SLA.', 5),
  ('manage_roles', 'Kelola role & hak akses', 'Mengelola role dan permission matrix.', 6),
  ('manage_users', 'Kelola anggota tim', 'Mengelola anggota dan status aktif.', 7),
  ('manage_projects', 'Kelola project & prefix', 'Mengelola project dan prefix nomor tiket.', 8),
  ('view_reports', 'Lihat analitik', 'Melihat KPI sesuai cakupan tiket.', 9),
  ('export_reports', 'Ekspor laporan', 'Mengekspor laporan sesuai cakupan.', 10);

INSERT INTO public.roles (slug, name, access_level_key, is_system) VALUES
  ('admin', 'Admin', 'admin', true),
  ('team-lead', 'Team Lead', 'reviewer', true),
  ('reviewer', 'Reviewer', 'reviewer', true),
  ('senior-agent', 'Senior Agent', 'agent', true),
  ('agent', 'Agent', 'agent', true);

INSERT INTO public.role_permissions (role_id, permission_key, allowed)
SELECT r.id, p.key,
  CASE
    WHEN r.access_level_key = 'admin' THEN true
    WHEN r.access_level_key = 'reviewer' AND p.key IN (
      'view_all', 'assign_ticket', 'update_status', 'comment', 'view_reports', 'export_reports'
    ) THEN true
    WHEN r.access_level_key = 'agent' AND p.key IN (
      'update_status', 'comment', 'view_reports'
    ) THEN true
    ELSE false
  END
FROM public.roles r
CROSS JOIN public.permissions p;

INSERT INTO public.projects (slug, name, ticket_prefix, description) VALUES
  ('app', 'Aplikasi Utama', 'APP', 'Aplikasi operasional dan layanan utama.'),
  ('web', 'Website', 'WEB', 'Website publik dan pengalaman pelanggan.'),
  ('internal', 'Internal Tools', 'INT', 'Perangkat kerja internal untuk tim.');

INSERT INTO public.categories (slug, name, default_priority) VALUES
  ('akses-akun', 'Akses & Akun', 'high'),
  ('bug-error', 'Bug & Error', 'high'),
  ('permintaan-fitur', 'Permintaan Fitur', 'low'),
  ('lainnya', 'Lainnya', 'medium');

INSERT INTO public.sla_rules (
  category_id, response_target_minutes, resolution_target_minutes,
  uses_business_hours, pauses_while_waiting
)
SELECT c.id, v.response_minutes, v.resolution_minutes, false, false
FROM (VALUES
  ('akses-akun', 120, 480),
  ('bug-error', 60, 360),
  ('permintaan-fitur', 480, 2880),
  ('lainnya', 240, 1440)
) AS v(category_slug, response_minutes, resolution_minutes)
JOIN public.categories c ON c.slug = v.category_slug;

-- RLS: public portal operations go through validated Next.js server routes.
-- Anonymous callers receive no direct table privileges.
ALTER TABLE public.access_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permission_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sla_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracking_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outbox_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY active_team_read_access_levels ON public.access_levels
  FOR SELECT TO authenticated USING (public.is_active_team_member((SELECT auth.uid())));
CREATE POLICY active_team_read_permissions ON public.permissions
  FOR SELECT TO authenticated USING (public.is_active_team_member((SELECT auth.uid())));
CREATE POLICY active_team_read_roles ON public.roles
  FOR SELECT TO authenticated USING (public.is_active_team_member((SELECT auth.uid())));
CREATE POLICY active_team_read_role_permissions ON public.role_permissions
  FOR SELECT TO authenticated USING (public.is_active_team_member((SELECT auth.uid())));
CREATE POLICY active_team_read_members ON public.team_members
  FOR SELECT TO authenticated USING (public.is_active_team_member((SELECT auth.uid())));
CREATE POLICY managers_read_permission_overrides ON public.user_permission_overrides
  FOR SELECT TO authenticated USING (
    user_id = (SELECT auth.uid()) OR public.has_permission('manage_users') OR public.has_permission('manage_roles')
  );
CREATE POLICY users_manage_own_preferences ON public.user_preferences
  FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY active_team_read_projects ON public.projects
  FOR SELECT TO authenticated USING (public.is_active_team_member((SELECT auth.uid())));
CREATE POLICY active_team_read_categories ON public.categories
  FOR SELECT TO authenticated USING (public.is_active_team_member((SELECT auth.uid())));
CREATE POLICY active_team_read_sla_rules ON public.sla_rules
  FOR SELECT TO authenticated USING (public.is_active_team_member((SELECT auth.uid())));
CREATE POLICY scoped_ticket_read ON public.tickets
  FOR SELECT TO authenticated USING (public.can_user_view_ticket((SELECT auth.uid()), id));
CREATE POLICY scoped_ticket_event_read ON public.ticket_events
  FOR SELECT TO authenticated USING (public.can_user_view_ticket((SELECT auth.uid()), ticket_id));
CREATE POLICY scoped_comment_read ON public.comments
  FOR SELECT TO authenticated USING (public.can_user_view_ticket((SELECT auth.uid()), ticket_id));
CREATE POLICY scoped_attachment_read ON public.attachments
  FOR SELECT TO authenticated USING (public.can_user_view_ticket((SELECT auth.uid()), ticket_id));
CREATE POLICY report_view_audit_events ON public.audit_events
  FOR SELECT TO authenticated USING (
    public.has_permission('manage_users') OR
    public.has_permission('manage_roles') OR
    public.has_permission('manage_projects') OR
    public.has_permission('manage_categories')
  );

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON
  public.access_levels,
  public.permissions,
  public.roles,
  public.role_permissions,
  public.team_members,
  public.user_permission_overrides,
  public.projects,
  public.categories,
  public.sla_rules,
  public.tickets,
  public.ticket_events,
  public.comments,
  public.attachments,
  public.audit_events
TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_preferences TO authenticated;

GRANT EXECUTE ON FUNCTION public.is_active_team_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_base_access(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_permission_for_user(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_permission(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_user_view_ticket(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_ticket(uuid) TO authenticated;
