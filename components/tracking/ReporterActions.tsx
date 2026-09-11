'use client';
import { Alert, AlertDescription, AlertTitle } from '@/components/shadcn/alert';
import { Button } from '@/components/shadcn/button';
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '@/components/shadcn/field';
import { Separator } from '@/components/shadcn/separator';
import { Spinner } from '@/components/shadcn/spinner';
import { Textarea } from '@/components/shadcn/textarea';
import { ToggleGroup, ToggleGroupItem } from '@/components/shadcn/toggle-group';
import type { Ticket } from '@/lib/domain';
import { CircleCheckIcon, LinkIcon, SendIcon, StarIcon } from 'lucide-react';
import { useState, type FormEvent } from 'react';

const ratingLabels = ['Sangat buruk', 'Buruk', 'Cukup', 'Baik', 'Sangat baik'];

type Body = Record<string, unknown>;

function useReporterAction(token: string, onDone: () => Promise<void> | void) {
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  async function run(action: string, body: Body, success: string) {
    setBusy(action);
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/public/tracking/actions', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token, action, ...body }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? 'Aksi gagal diproses.');
      setNotice(success);
      await onDone();
      return true;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Aksi gagal diproses.');
      return false;
    } finally {
      setBusy('');
    }
  }
  return { busy, error, notice, run };
}

export default function ReporterActions({
  ticket,
  token,
  onChanged,
}: {
  ticket: Ticket;
  /** Private tracking token; actions are unavailable when the ticket was found by number + email. */
  token: string;
  onChanged: () => Promise<void> | void;
}) {
  const { busy, error, notice, run } = useReporterAction(token, onChanged);
  const [reopening, setReopening] = useState(false);
  const [rating, setRating] = useState(ticket.feedback ? String(ticket.feedback.rating) : '');
  const [editingFeedback, setEditingFeedback] = useState(!ticket.feedback);
  const done = ticket.status === 'Resolved' || ticket.status === 'Closed';

  if (!token) {
    return (
      <div className="ui-scope">
        <Alert>
          <LinkIcon />
          <AlertTitle>Ingin membalas atau memberi penilaian?</AlertTitle>
          <AlertDescription>
            Buka tiket ini dari link pribadi yang kami kirim ke email Anda.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const submit =
    (handler: (data: FormData, form: HTMLFormElement) => Promise<void>) =>
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const form = event.currentTarget;
      await handler(new FormData(form), form);
    };

  return (
    <div className="ui-scope flex flex-col gap-6">
      {notice && (
        <Alert>
          <CircleCheckIcon />
          <AlertTitle>{notice}</AlertTitle>
        </Alert>
      )}
      {error && (
        <Alert variant="destructive">
          <AlertTitle>{error}</AlertTitle>
        </Alert>
      )}

      {ticket.status === 'Resolved' && (
        <FieldSet>
          <FieldLegend>Apakah masalah Anda sudah selesai?</FieldLegend>
          <FieldDescription>
            Konfirmasi Anda membantu tim menutup tiket atau melanjutkan penanganan.
          </FieldDescription>
          {reopening ? (
            <form
              onSubmit={submit(async (data) => {
                const ok = await run(
                  'confirm',
                  { resolved: false, note: data.get('note') },
                  'Tiket dibuka kembali. Tim support akan meninjau kendala Anda.'
                );
                if (ok) setReopening(false);
              })}
            >
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="reopen-note">Kendala yang masih terjadi</FieldLabel>
                  <Textarea
                    id="reopen-note"
                    name="note"
                    required
                    maxLength={2000}
                    placeholder="Contoh: Setelah login ulang, pesan error yang sama masih muncul."
                  />
                </Field>
                <div className="flex flex-wrap gap-2">
                  <Button type="submit" disabled={!!busy}>
                    {busy === 'confirm' && <Spinner data-icon="inline-start" />}
                    Buka kembali tiket
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setReopening(false)}>
                    Batal
                  </Button>
                </div>
              </FieldGroup>
            </form>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button
                disabled={!!busy}
                onClick={() =>
                  run('confirm', { resolved: true }, 'Terima kasih! Tiket sudah ditutup.')
                }
              >
                {busy === 'confirm' ? (
                  <Spinner data-icon="inline-start" />
                ) : (
                  <CircleCheckIcon data-icon="inline-start" />
                )}
                Ya, sudah selesai
              </Button>
              <Button variant="outline" disabled={!!busy} onClick={() => setReopening(true)}>
                Belum, masih ada kendala
              </Button>
            </div>
          )}
        </FieldSet>
      )}

      {done && (
        <>
          <Separator />
          {editingFeedback ? (
            <form
              onSubmit={submit(async (data) => {
                const ok = await run(
                  'feedback',
                  { rating: Number(rating), comment: data.get('comment') },
                  'Terima kasih atas penilaian Anda.'
                );
                if (ok) setEditingFeedback(false);
              })}
            >
              <FieldSet>
                <FieldLegend>Bagaimana penanganan tiket ini?</FieldLegend>
                <FieldDescription>Penilaian Anda hanya terlihat oleh tim support.</FieldDescription>
                <FieldGroup>
                  <ToggleGroup
                    type="single"
                    variant="outline"
                    value={rating}
                    onValueChange={setRating}
                    aria-label="Penilaian layanan"
                    className="flex-wrap"
                  >
                    {ratingLabels.map((label, index) => (
                      <ToggleGroupItem
                        key={label}
                        value={String(index + 1)}
                        aria-label={`${index + 1} dari 5, ${label}`}
                      >
                        <StarIcon />
                        {index + 1}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                  {rating && (
                    <FieldDescription>{ratingLabels[Number(rating) - 1]}</FieldDescription>
                  )}
                  <Field>
                    <FieldLabel htmlFor="feedback-comment">Komentar (opsional)</FieldLabel>
                    <Textarea
                      id="feedback-comment"
                      name="comment"
                      maxLength={2000}
                      defaultValue={ticket.feedback?.comment}
                      placeholder="Apa yang sudah baik atau perlu diperbaiki?"
                    />
                  </Field>
                  <div>
                    <Button type="submit" disabled={!rating || !!busy}>
                      {busy === 'feedback' && <Spinner data-icon="inline-start" />}
                      Kirim penilaian
                    </Button>
                  </div>
                </FieldGroup>
              </FieldSet>
            </form>
          ) : (
            ticket.feedback && (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-muted-foreground text-sm">
                  Penilaian Anda:{' '}
                  <strong className="text-foreground">
                    {ticket.feedback.rating}/5 · {ratingLabels[ticket.feedback.rating - 1]}
                  </strong>
                </p>
                <Button variant="ghost" size="sm" onClick={() => setEditingFeedback(true)}>
                  Ubah penilaian
                </Button>
              </div>
            )
          )}
        </>
      )}

      {ticket.status !== 'Closed' ? (
        <>
          <Separator />
          <form
            onSubmit={submit(async (data, form) => {
              const ok = await run(
                'reply',
                { body: data.get('body') },
                'Balasan terkirim. Tim support akan menerima notifikasi.'
              );
              if (ok) form.reset();
            })}
          >
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="reporter-reply">Balas tim support</FieldLabel>
                <Textarea
                  id="reporter-reply"
                  name="body"
                  required
                  maxLength={5000}
                  placeholder="Tambahkan informasi, jawaban, atau perkembangan terbaru…"
                />
                <FieldDescription>
                  Balasan Anda terlihat oleh tim dan tercatat pada riwayat tiket.
                </FieldDescription>
              </Field>
              <div>
                <Button type="submit" disabled={!!busy}>
                  {busy === 'reply' ? (
                    <Spinner data-icon="inline-start" />
                  ) : (
                    <SendIcon data-icon="inline-start" />
                  )}
                  Kirim balasan
                </Button>
              </div>
            </FieldGroup>
          </form>
        </>
      ) : (
        <p className="text-muted-foreground text-sm">
          Tiket sudah ditutup. Buat laporan baru bila kendala muncul kembali.
        </p>
      )}
    </div>
  );
}
