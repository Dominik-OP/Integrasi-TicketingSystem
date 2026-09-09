ALTER TABLE public.email_deliveries
  DROP CONSTRAINT email_deliveries_attempt_unique;

ALTER TABLE public.email_deliveries
  ADD CONSTRAINT email_deliveries_attempt_unique
  UNIQUE (outbox_event_id, recipient_email, attempt_number);

CREATE INDEX outbox_events_stale_lock_idx
  ON public.outbox_events (locked_at)
  WHERE status = 'processing';

CREATE OR REPLACE FUNCTION public.claim_email_outbox(
  p_worker_id text,
  p_limit integer DEFAULT 10
)
RETURNS SETOF public.outbox_events
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  IF NULLIF(btrim(p_worker_id), '') IS NULL THEN
    RAISE EXCEPTION 'worker id is required';
  END IF;

  UPDATE public.outbox_events
  SET status = 'dead_letter',
      locked_at = NULL,
      locked_by = NULL,
      last_error = COALESCE(last_error, 'Worker lease expired after final attempt')
  WHERE status = 'processing'
    AND locked_at < now() - interval '15 minutes'
    AND attempt_count >= max_attempts;

  RETURN QUERY
  WITH candidates AS (
    SELECT event.id
    FROM public.outbox_events event
    WHERE event.attempt_count < event.max_attempts
      AND (
        (
          event.status IN ('pending', 'failed')
          AND event.available_at <= now()
        )
        OR (
          event.status = 'processing'
          AND event.locked_at < now() - interval '15 minutes'
        )
      )
    ORDER BY event.available_at, event.created_at, event.id
    FOR UPDATE SKIP LOCKED
    LIMIT LEAST(GREATEST(COALESCE(p_limit, 10), 1), 50)
  ), claimed AS (
    UPDATE public.outbox_events event
    SET status = 'processing',
        locked_at = now(),
        locked_by = btrim(p_worker_id),
        attempt_count = event.attempt_count + 1,
        last_error = NULL
    FROM candidates
    WHERE event.id = candidates.id
    RETURNING event.*
  )
  SELECT * FROM claimed;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_email_outbox(
  p_event_id uuid,
  p_worker_id text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  UPDATE public.outbox_events
  SET status = 'sent',
      sent_at = now(),
      locked_at = NULL,
      locked_by = NULL,
      last_error = NULL
  WHERE id = p_event_id
    AND status = 'processing'
    AND locked_by = btrim(p_worker_id);

  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.fail_email_outbox(
  p_event_id uuid,
  p_worker_id text,
  p_error text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_status text;
BEGIN
  UPDATE public.outbox_events
  SET status = CASE
        WHEN attempt_count >= max_attempts THEN 'dead_letter'
        ELSE 'failed'
      END,
      available_at = now() + CASE attempt_count
        WHEN 1 THEN interval '1 minute'
        WHEN 2 THEN interval '5 minutes'
        WHEN 3 THEN interval '15 minutes'
        WHEN 4 THEN interval '1 hour'
        ELSE interval '6 hours'
      END,
      locked_at = NULL,
      locked_by = NULL,
      last_error = left(COALESCE(NULLIF(p_error, ''), 'Unknown email delivery error'), 1000)
  WHERE id = p_event_id
    AND status = 'processing'
    AND locked_by = btrim(p_worker_id)
  RETURNING status INTO v_status;

  RETURN v_status;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_email_outbox(text, integer)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_email_outbox(uuid, text)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fail_email_outbox(uuid, text, text)
  FROM PUBLIC, anon, authenticated;
