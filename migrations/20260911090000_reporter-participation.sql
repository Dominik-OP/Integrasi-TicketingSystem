-- Reporter participation through private tracking links: replies, resolution confirmation, and
-- satisfaction (CSAT) ratings. Every action authenticates with the sha256 hash of the tracking
-- token and runs server-side only; anon/authenticated roles get no execute privileges.

CREATE TABLE public.ticket_feedback (
  ticket_id uuid PRIMARY KEY REFERENCES public.tickets(id) ON UPDATE RESTRICT ON DELETE CASCADE,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text NOT NULL DEFAULT '' CHECK (char_length(comment) <= 2000),
  submitted_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ticket_feedback_submitted_idx ON public.ticket_feedback (submitted_at DESC);

CREATE TRIGGER ticket_feedback_updated_at BEFORE UPDATE ON public.ticket_feedback
  FOR EACH ROW EXECUTE FUNCTION system.update_updated_at();

ALTER TABLE public.ticket_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY scoped_ticket_feedback_read ON public.ticket_feedback
  FOR SELECT TO authenticated USING (public.can_user_view_ticket((SELECT auth.uid()), ticket_id));
REVOKE ALL ON public.ticket_feedback FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.ticket_feedback TO authenticated;

-- Resolves and locks the ticket behind a valid, unexpired, unrevoked tracking grant.
CREATE OR REPLACE FUNCTION public.lock_ticket_for_tracking_token(p_token_hash text)
RETURNS public.tickets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_ticket public.tickets%ROWTYPE;
BEGIN
  IF p_token_hash IS NULL OR lower(p_token_hash) !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'tracking link is invalid or expired';
  END IF;

  SELECT t.* INTO v_ticket
  FROM public.tracking_grants g
  JOIN public.tickets t ON t.id = g.ticket_id
  WHERE g.token_hash = lower(p_token_hash)
    AND g.revoked_at IS NULL
    AND g.expires_at > now()
  FOR UPDATE OF t;
  IF NOT FOUND THEN RAISE EXCEPTION 'tracking link is invalid or expired'; END IF;

  UPDATE public.tracking_grants SET last_used_at = now() WHERE token_hash = lower(p_token_hash);
  RETURN v_ticket;
END;
$$;

CREATE OR REPLACE FUNCTION public.add_reporter_comment(p_token_hash text, p_body text)
RETURNS public.comments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_body text := btrim(COALESCE(p_body, ''));
  v_ticket public.tickets%ROWTYPE;
  v_after public.tickets%ROWTYPE;
  v_comment public.comments%ROWTYPE;
  v_next_status text;
BEGIN
  IF v_body = '' THEN RAISE EXCEPTION 'reply body is required'; END IF;
  IF char_length(v_body) > 5000 THEN RAISE EXCEPTION 'reply body is too long'; END IF;

  v_ticket := public.lock_ticket_for_tracking_token(p_token_hash);
  IF v_ticket.status = 'closed' THEN RAISE EXCEPTION 'ticket is closed'; END IF;
  IF (
    SELECT count(*) FROM public.comments c
    WHERE c.ticket_id = v_ticket.id
      AND c.source = 'reporter'
      AND c.created_at > now() - interval '10 minutes'
  ) >= 5 THEN
    RAISE EXCEPTION 'too many replies';
  END IF;

  INSERT INTO public.comments (
    ticket_id, author_user_id, author_name_snapshot, author_role_snapshot,
    body, visibility, source
  ) VALUES (
    v_ticket.id, NULL, v_ticket.reporter_name, 'Pelapor', v_body, 'public', 'reporter'
  ) RETURNING * INTO v_comment;

  INSERT INTO public.ticket_events (
    ticket_id, event_type, visibility, actor_user_id,
    actor_name_snapshot, actor_role_snapshot, summary, after_data
  ) VALUES (
    v_ticket.id, 'reporter_reply_added', 'public', NULL,
    v_ticket.reporter_name, 'Pelapor', 'Pelapor menambahkan balasan',
    jsonb_build_object('comment_id', v_comment.id)
  );

  -- A reply answers "Waiting on User", so the ticket goes back to the team: to the assigned
  -- agent when one is still active, otherwise back to review.
  IF v_ticket.status = 'waiting_on_user' THEN
    v_next_status := CASE WHEN EXISTS (
      SELECT 1
      FROM public.team_members tm
      JOIN public.roles r ON r.id = tm.role_id
      WHERE tm.user_id = v_ticket.assigned_agent_id
        AND tm.is_active AND r.is_active AND r.access_level_key = 'agent'
    ) THEN 'in_progress' ELSE 'on_review' END;

    UPDATE public.tickets SET status = v_next_status WHERE id = v_ticket.id
    RETURNING * INTO v_after;

    INSERT INTO public.ticket_events (
      ticket_id, event_type, visibility, actor_user_id,
      actor_name_snapshot, actor_role_snapshot, summary, before_data, after_data
    ) VALUES (
      v_ticket.id, 'status_changed', 'public', NULL,
      v_ticket.reporter_name, 'Pelapor',
      'Status diubah menjadi ' || v_next_status || ': pelapor membalas',
      jsonb_build_object('status', v_ticket.status),
      jsonb_build_object('status', v_after.status)
    );
  END IF;

  INSERT INTO public.outbox_events (
    event_type, aggregate_type, aggregate_id, deduplication_key, payload
  ) VALUES (
    'reporter_reply_added', 'ticket', v_ticket.id, 'reporter-reply:' || v_comment.id::text,
    jsonb_build_object(
      'ticket_id', v_ticket.id,
      'ticket_number', v_ticket.ticket_number,
      'comment_id', v_comment.id
    )
  );

  RETURN v_comment;
END;
$$;

CREATE OR REPLACE FUNCTION public.confirm_ticket_resolution(
  p_token_hash text,
  p_resolved boolean,
  p_note text DEFAULT NULL
)
RETURNS public.tickets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_note text := NULLIF(btrim(COALESCE(p_note, '')), '');
  v_ticket public.tickets%ROWTYPE;
  v_after public.tickets%ROWTYPE;
  v_comment public.comments%ROWTYPE;
BEGIN
  IF p_resolved IS NULL THEN RAISE EXCEPTION 'confirmation choice is required'; END IF;
  IF char_length(COALESCE(v_note, '')) > 2000 THEN RAISE EXCEPTION 'note is too long'; END IF;
  IF NOT p_resolved AND v_note IS NULL THEN RAISE EXCEPTION 'reopen reason is required'; END IF;

  v_ticket := public.lock_ticket_for_tracking_token(p_token_hash);
  IF v_ticket.status <> 'resolved' THEN
    RAISE EXCEPTION 'ticket is not awaiting confirmation';
  END IF;

  IF p_resolved THEN
    UPDATE public.tickets
    SET status = 'closed',
        closed_reason = 'Dikonfirmasi selesai oleh pelapor' || COALESCE(': ' || v_note, '')
    WHERE id = v_ticket.id
    RETURNING * INTO v_after;
  ELSE
    UPDATE public.tickets SET status = 'on_review' WHERE id = v_ticket.id
    RETURNING * INTO v_after;
  END IF;

  INSERT INTO public.ticket_events (
    ticket_id, event_type, visibility, actor_user_id,
    actor_name_snapshot, actor_role_snapshot, summary, before_data, after_data
  ) VALUES (
    v_ticket.id,
    CASE WHEN p_resolved THEN 'resolution_confirmed' ELSE 'ticket_reopened' END,
    'public', NULL, v_ticket.reporter_name, 'Pelapor',
    CASE WHEN p_resolved
      THEN 'Pelapor mengonfirmasi masalah sudah selesai'
      ELSE 'Dibuka kembali oleh pelapor: ' || v_note END,
    jsonb_build_object('status', v_ticket.status),
    jsonb_build_object('status', v_after.status, 'reason', v_note)
  );

  -- Keep the reporter's own words in the ticket discussion.
  IF v_note IS NOT NULL THEN
    INSERT INTO public.comments (
      ticket_id, author_user_id, author_name_snapshot, author_role_snapshot,
      body, visibility, source
    ) VALUES (
      v_ticket.id, NULL, v_ticket.reporter_name, 'Pelapor', v_note, 'public', 'reporter'
    ) RETURNING * INTO v_comment;
  END IF;

  IF NOT p_resolved THEN
    INSERT INTO public.outbox_events (
      event_type, aggregate_type, aggregate_id, deduplication_key, payload
    ) VALUES (
      'ticket_reopened_by_reporter', 'ticket', v_ticket.id,
      'ticket-reopened-by-reporter:' || v_ticket.id::text || ':v' || v_after.version::text,
      jsonb_build_object(
        'ticket_id', v_ticket.id,
        'ticket_number', v_ticket.ticket_number,
        'comment_id', v_comment.id
      )
    );
  END IF;

  RETURN v_after;
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_ticket_feedback(
  p_token_hash text,
  p_rating integer,
  p_comment text DEFAULT NULL
)
RETURNS public.ticket_feedback
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_comment text := btrim(COALESCE(p_comment, ''));
  v_ticket public.tickets%ROWTYPE;
  v_feedback public.ticket_feedback%ROWTYPE;
BEGIN
  IF p_rating IS NULL OR p_rating NOT BETWEEN 1 AND 5 THEN
    RAISE EXCEPTION 'rating must be between 1 and 5';
  END IF;
  IF char_length(v_comment) > 2000 THEN RAISE EXCEPTION 'feedback comment is too long'; END IF;

  v_ticket := public.lock_ticket_for_tracking_token(p_token_hash);
  IF v_ticket.status NOT IN ('resolved', 'closed') THEN
    RAISE EXCEPTION 'ticket is not resolved yet';
  END IF;

  INSERT INTO public.ticket_feedback (ticket_id, rating, comment)
  VALUES (v_ticket.id, p_rating, v_comment)
  ON CONFLICT (ticket_id) DO UPDATE SET rating = EXCLUDED.rating, comment = EXCLUDED.comment
  RETURNING * INTO v_feedback;

  INSERT INTO public.ticket_events (
    ticket_id, event_type, visibility, actor_user_id,
    actor_name_snapshot, actor_role_snapshot, summary, after_data
  ) VALUES (
    v_ticket.id, 'feedback_submitted', 'internal', NULL,
    v_ticket.reporter_name, 'Pelapor',
    'Pelapor memberi penilaian ' || p_rating::text || '/5',
    jsonb_build_object('rating', p_rating)
  );

  RETURN v_feedback;
END;
$$;

REVOKE ALL ON FUNCTION public.lock_ticket_for_tracking_token(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.add_reporter_comment(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.confirm_ticket_resolution(text, boolean, text)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.submit_ticket_feedback(text, integer, text)
  FROM PUBLIC, anon, authenticated;
