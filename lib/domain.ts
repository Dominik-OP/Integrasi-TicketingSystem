import type { Permission } from './permissions';
export const statuses = [
  'New / Open',
  'On Review',
  'In Progress',
  'Waiting on User',
  'Resolved',
  'Closed',
] as const;
export type Status = (typeof statuses)[number];
export const priorityClass = (p: string) => p.toLowerCase();
export type Role = 'Admin' | 'Reviewer' | 'Agent';
export type Member = {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  roleId?: string;
  overrides?: Partial<Record<Permission, boolean>>;
};
export type TeamAccessRequest = {
  userId: string;
  name: string;
  email: string;
  requestedAt: string;
};
export type Category = {
  id?: string;
  name: string;
  priority: string;
  response: number;
  resolution: number;
  active?: boolean;
};
export type Resolution = {
  cause: string;
  fix: string;
  impact: string;
  reporterSteps: string;
  internalNotes?: string;
  at: string;
  author: string;
  authorRole: string;
};
export type Closure = {
  reason: string;
  at: string;
  author: string;
  authorRole: string;
};
export type TicketAttachment = {
  name: string;
  url?: string;
};
export type Ticket = {
  databaseId?: string;
  version?: number;
  projectId?: string;
  trackingToken?: string;
  impact?: string;
  createdBy?: string;
  id: string;
  title: string;
  description: string;
  name: string;
  email: string;
  category: string;
  priority: string;
  status: Status;
  agent: string;
  reviewer: string;
  created: string;
  updated: string;
  attachments: TicketAttachment[];
  resolution?: Resolution;
  closure?: Closure;
  history: {
    text: string;
    at: string;
    internal?: boolean;
    actorId?: string;
    actorName?: string;
    actorRole?: string;
  }[];
  comments: {
    text: string;
    at: string;
    author: string;
    authorRole?: string;
    internal: boolean;
  }[];
};
export const initials = (name: string) =>
  name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('');
export const date = (value: string) =>
  new Date(value).toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
