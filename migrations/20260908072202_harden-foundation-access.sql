-- Harden runtime access after the first advisor scan.
-- Business RPCs and helper functions remain callable only by project_admin.

REVOKE EXECUTE ON FUNCTION public.is_active_team_member(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.user_base_access(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_permission_for_user(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_permission(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.can_user_view_ticket(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.can_view_ticket(uuid) FROM PUBLIC, anon, authenticated;

DROP POLICY active_team_read_access_levels ON public.access_levels;
DROP POLICY active_team_read_permissions ON public.permissions;
DROP POLICY active_team_read_roles ON public.roles;
DROP POLICY active_team_read_role_permissions ON public.role_permissions;
DROP POLICY active_team_read_members ON public.team_members;
DROP POLICY managers_read_permission_overrides ON public.user_permission_overrides;
DROP POLICY active_team_read_projects ON public.projects;
DROP POLICY active_team_read_categories ON public.categories;
DROP POLICY active_team_read_sla_rules ON public.sla_rules;
DROP POLICY scoped_ticket_read ON public.tickets;
DROP POLICY scoped_ticket_event_read ON public.ticket_events;
DROP POLICY scoped_comment_read ON public.comments;
DROP POLICY scoped_attachment_read ON public.attachments;
DROP POLICY report_view_audit_events ON public.audit_events;

-- Authenticated users may read non-sensitive reference data. Team membership,
-- tickets, and related rows remain scoped to the current auth.uid().
CREATE POLICY authenticated_read_access_levels ON public.access_levels
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) IS NOT NULL);
CREATE POLICY authenticated_read_permissions ON public.permissions
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) IS NOT NULL);
CREATE POLICY authenticated_read_roles ON public.roles
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) IS NOT NULL);
CREATE POLICY authenticated_read_role_permissions ON public.role_permissions
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) IS NOT NULL);
CREATE POLICY members_read_own_profile ON public.team_members
  FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));
CREATE POLICY users_read_own_permission_overrides ON public.user_permission_overrides
  FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));
CREATE POLICY authenticated_read_projects ON public.projects
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) IS NOT NULL);
CREATE POLICY authenticated_read_categories ON public.categories
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) IS NOT NULL);
CREATE POLICY authenticated_read_sla_rules ON public.sla_rules
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) IS NOT NULL);

CREATE POLICY scoped_ticket_read ON public.tickets
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.team_members tm
      JOIN public.roles r ON r.id = tm.role_id AND r.is_active
      LEFT JOIN public.role_permissions rp
        ON rp.role_id = tm.role_id AND rp.permission_key = 'view_all'
      LEFT JOIN public.user_permission_overrides upo
        ON upo.user_id = tm.user_id AND upo.permission_key = 'view_all'
      WHERE tm.user_id = (SELECT auth.uid())
        AND tm.is_active
        AND (
          COALESCE(upo.allowed, rp.allowed, false)
          OR assigned_agent_id = tm.user_id
          OR assigned_reviewer_id = tm.user_id
          OR created_by_user_id = tm.user_id
        )
    )
  );

CREATE POLICY scoped_ticket_event_read ON public.ticket_events
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tickets t WHERE t.id = ticket_id));
CREATE POLICY scoped_comment_read ON public.comments
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tickets t WHERE t.id = ticket_id));
CREATE POLICY scoped_attachment_read ON public.attachments
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tickets t WHERE t.id = ticket_id));

-- These tables are intentionally server-only. Explicit deny policies make the
-- intent visible to audits while project_admin retains service access.
CREATE POLICY deny_runtime_ticket_counters ON public.ticket_counters
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY deny_runtime_tracking_grants ON public.tracking_grants
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY deny_runtime_outbox_events ON public.outbox_events
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY deny_runtime_email_deliveries ON public.email_deliveries
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY deny_runtime_audit_events ON public.audit_events
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

REVOKE SELECT ON public.audit_events FROM authenticated;

CREATE INDEX user_preferences_default_project_idx
  ON public.user_preferences (default_project_id)
  WHERE default_project_id IS NOT NULL;
CREATE INDEX tickets_created_by_user_idx
  ON public.tickets (created_by_user_id, created_at DESC)
  WHERE created_by_user_id IS NOT NULL;
CREATE INDEX comments_author_user_idx
  ON public.comments (author_user_id, created_at DESC)
  WHERE author_user_id IS NOT NULL;
CREATE INDEX attachments_uploaded_by_user_idx
  ON public.attachments (uploaded_by_user_id, created_at DESC)
  WHERE uploaded_by_user_id IS NOT NULL;
