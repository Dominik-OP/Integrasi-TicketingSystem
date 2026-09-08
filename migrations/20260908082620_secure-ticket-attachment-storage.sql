-- Ticket attachments are uploaded and served only by trusted Next.js routes.
-- No anon/authenticated policy is intentionally created: the project-admin
-- client performs writes and mints short-lived signed URLs after app-level
-- ticket authorization succeeds.
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
