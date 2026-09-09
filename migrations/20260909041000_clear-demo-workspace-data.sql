-- Leave authorization reference data intact so Microsoft SSO bootstrap and role approval keep working.
-- Clear all workspace-owned and operational data so the application starts empty.
DELETE FROM public.email_deliveries;
DELETE FROM public.outbox_events;
DELETE FROM public.audit_events;
DELETE FROM public.attachments;
DELETE FROM public.comments;
DELETE FROM public.tracking_grants;
DELETE FROM public.ticket_events;
DELETE FROM public.tickets;
DELETE FROM public.ticket_counters;
DELETE FROM public.sla_rules;
DELETE FROM public.categories;
DELETE FROM public.projects;
DELETE FROM public.user_preferences;
DELETE FROM public.user_permission_overrides;
DELETE FROM public.team_access_requests;
DELETE FROM public.team_members;
