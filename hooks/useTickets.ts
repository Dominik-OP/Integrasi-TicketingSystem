'use client';
import { type Member, type Ticket } from '@/lib/demo';
import {
  canUpdateTicket,
  canViewTicket,
  hasPermission,
  roleLabel,
  type RoleDefinition,
} from '@/lib/permissions';
import { newTrackingToken, nextTicketNumber, type Project } from '@/lib/projects';
import { useCallback, type Dispatch, type SetStateAction } from 'react';

interface UseTicketsReturn {
  tickets: Ticket[];
  setTickets: React.Dispatch<React.SetStateAction<Ticket[]>>;
  ready: boolean;
  changeTicket: (id: string, patch: Partial<Ticket>, event: string) => void;
  moveTicket: (id: string, status: Ticket['status']) => void;
  submitTicket: (
    data: Omit<
      Ticket,
      'id' | 'created' | 'updated' | 'comments' | 'projectId' | 'trackingToken'
    > & { projectId: string }
  ) => Ticket;
}

export function useTickets(
  team: Member[],
  tickets: Ticket[],
  setTickets: Dispatch<SetStateAction<Ticket[]>>,
  ready: boolean,
  projects: Project[],
  roles: RoleDefinition[],
  userId: string,
  setToast: (msg: string) => void,
  onResolve: (id: string) => void,
  onClose: (id: string) => void,
  reload: () => Promise<void>
): UseTicketsReturn {
  const changeTicket = useCallback(
    (id: string, patch: Partial<Ticket>, event: string) => {
      const ticket = tickets.find((t) => t.id === id);
      const user = team.find((member) => member.id === userId && member.active);
      if (!user || !ticket || !canViewTicket(user, roles, ticket)) return;
      if (patch.status && !canUpdateTicket(user, roles, ticket)) return;
      if (patch.comments && !hasPermission(user, roles, 'comment')) return;
      if (
        (patch.agent !== undefined ||
          patch.reviewer !== undefined ||
          patch.priority !== undefined) &&
        !hasPermission(user, roles, 'assign_ticket')
      )
        return;
      if (patch.status === 'Resolved' && !patch.resolution) {
        onResolve(id);
        return;
      }
      if (patch.status === 'Closed' && !patch.closure) {
        onClose(id);
        return;
      }
      const databaseId = ticket.databaseId;
      if (!databaseId || !ticket.version) return;
      const newestComment = patch.comments?.at(-1);
      const payload = newestComment
        ? {
            action: 'comment',
            body: newestComment.text,
            visibility: newestComment.internal ? 'internal' : 'public',
          }
        : patch.status
          ? {
              action: 'transition',
              status: patch.status,
              expectedVersion: ticket.version,
              reason: patch.closure?.reason,
              resolution: patch.resolution,
            }
          : {
              action: 'assign',
              expectedVersion: ticket.version,
              reviewer: patch.reviewer ?? ticket.reviewer,
              agent: patch.agent ?? ticket.agent,
              priority: patch.priority ?? ticket.priority,
            };
      setTickets((all) =>
        all.map((t) =>
          t.id === id
            ? {
                ...t,
                ...patch,
                updated: new Date().toISOString(),
                history: [
                  ...t.history,
                  {
                    text: event,
                    actorId: userId,
                    actorName: team.find((m) => m.id === userId)?.name ?? 'System',
                    actorRole: team.find((m) => m.id === userId)
                      ? roleLabel(
                          team.find((m) => m.id === userId)!,
                          roles
                        )
                      : 'System',
                    at: new Date().toISOString(),
                    internal: !patch.status,
                  },
                ],
              }
            : t
        )
      );
      void fetch(`/api/tickets/${encodeURIComponent(databaseId)}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      })
        .then(async (response) => {
          const data = await response.json();
          if (!response.ok) throw new Error(data.error);
          await reload();
          setToast('Perubahan tiket berhasil disimpan.');
        })
        .catch((reason) => {
          setToast(reason instanceof Error ? reason.message : 'Perubahan tiket gagal disimpan.');
          void reload();
        });
    },
    [tickets, setTickets, userId, team, roles, setToast, onResolve, onClose, reload]
  );

  const moveTicket = useCallback(
    (id: string, status: Ticket['status']) => {
      const t = tickets.find((t) => t.id === id);
      if (!t || status === t.status) return;
      changeTicket(id, { status }, `Status diubah menjadi ${status}`);
    },
    [tickets, changeTicket]
  );

  const submitTicket = useCallback(
    (
      data: Omit<
        Ticket,
        'id' | 'created' | 'updated' | 'comments' | 'projectId' | 'trackingToken'
      > & { projectId: string }
    ) => {
      const now = new Date().toISOString();
      const project = projects.find((p) => p.id === data.projectId);
      if (!project) throw new Error('Project not found');

      const newTicket: Ticket = {
        ...data,
        id: nextTicketNumber(project, tickets),
        projectId: project.id,
        trackingToken: newTrackingToken(),
        created: now,
        updated: now,
        history: data.history,
        comments: [],
      };
      setTickets((all) => [newTicket, ...all]);
      return newTicket;
    },
    [tickets, projects, setTickets]
  );

  return { tickets, setTickets, ready, changeTicket, moveTicket, submitTicket };
}
