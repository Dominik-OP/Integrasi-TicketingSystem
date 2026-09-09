/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Category, Member, Status, TeamAccessRequest, Ticket } from '@/lib/domain';
import type { Permission, RoleDefinition } from '@/lib/permissions';
import type { Project } from '@/lib/projects';

const statusLabels: Record<string, Status> = {
  new: 'New / Open',
  on_review: 'On Review',
  in_progress: 'In Progress',
  waiting_on_user: 'Waiting on User',
  resolved: 'Resolved',
  closed: 'Closed',
};

const roleLabels = { admin: 'Admin', reviewer: 'Reviewer', agent: 'Agent' } as const;
const titleCase = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

export function mapWorkspace(
  raw: Record<string, any>,
  attachmentUrls: Record<string, string> = {}
) {
  const roles: RoleDefinition[] = raw.roles.map((role: any) => ({
    id: role.id,
    name: role.name,
    base: roleLabels[role.access_level_key as keyof typeof roleLabels] ?? 'Agent',
    permissions: Object.fromEntries(
      raw.rolePermissions
        .filter((item: any) => item.role_id === role.id)
        .map((item: any) => [item.permission_key, item.allowed])
    ) as Record<Permission, boolean>,
  }));
  const team: Member[] = raw.team.map((member: any) => ({
    id: member.user_id,
    name: member.display_name,
    email: member.email,
    roleId: member.role_id,
    role: roles.find((role) => role.id === member.role_id)?.base ?? 'Agent',
    active: member.is_active,
    overrides: Object.fromEntries(
      raw.overrides
        .filter((item: any) => item.user_id === member.user_id)
        .map((item: any) => [item.permission_key, item.allowed])
    ),
  }));
  const accessRequests: TeamAccessRequest[] = (raw.accessRequests ?? []).map((request: any) => ({
    userId: request.user_id,
    name: request.display_name,
    email: request.email,
    requestedAt: request.requested_at,
  }));
  const projects: Project[] = raw.projects.map((project: any) => ({
    id: project.slug,
    databaseId: project.id,
    name: project.name,
    prefix: project.ticket_prefix,
    description: project.description,
    active: project.is_active,
  }));
  const categories: Category[] = raw.categories.map((category: any) => {
    const sla = raw.slaRules.find((item: any) => item.category_id === category.id);
    return {
      id: category.id,
      name: category.name,
      priority: titleCase(category.default_priority),
      response: Math.round((sla?.response_target_minutes ?? 0) / 60),
      resolution: Math.round((sla?.resolution_target_minutes ?? 0) / 60),
      active: category.is_active,
    };
  });
  const tickets: Ticket[] = raw.tickets.map((ticket: any) => ({
    databaseId: ticket.id,
    version: ticket.version,
    id: ticket.ticket_number,
    projectId: raw.projects.find((project: any) => project.id === ticket.project_id)?.slug,
    createdBy: ticket.created_by_user_id ?? undefined,
    title: ticket.title,
    description: ticket.description,
    impact: ticket.impact,
    name: ticket.reporter_name,
    email: ticket.reporter_email,
    category: ticket.category_name_snapshot,
    priority: titleCase(ticket.priority),
    status: statusLabels[ticket.status] ?? 'New / Open',
    agent: ticket.assigned_agent_id ?? '',
    reviewer: ticket.assigned_reviewer_id ?? '',
    created: ticket.created_at,
    updated: ticket.updated_at,
    attachments: raw.attachments
      .filter((item: any) => item.ticket_id === ticket.id && item.upload_status !== 'deleted')
      .map((item: any) => ({
        name: item.original_filename,
        ...(attachmentUrls[item.storage_key] ? { url: attachmentUrls[item.storage_key] } : {}),
      })),
    resolution: ticket.resolution_cause
      ? {
          cause: ticket.resolution_cause,
          fix: ticket.resolution_fix ?? '',
          impact: ticket.resolution_impact ?? '',
          reporterSteps: ticket.resolution_steps ?? '',
          internalNotes: ticket.resolution_internal_reference ?? undefined,
          at: ticket.resolved_at ?? ticket.updated_at,
          author: 'Tim support',
          authorRole: 'Support',
        }
      : undefined,
    closure: ticket.closed_reason
      ? {
          reason: ticket.closed_reason,
          at: ticket.closed_at ?? ticket.updated_at,
          author: 'Tim support',
          authorRole: 'Support',
        }
      : undefined,
    history: raw.events
      .filter((item: any) => item.ticket_id === ticket.id)
      .map((item: any) => ({
        text: item.summary,
        at: item.occurred_at,
        internal: item.visibility === 'internal',
        actorId: item.actor_user_id ?? undefined,
        actorName: item.actor_name_snapshot,
        actorRole: item.actor_role_snapshot,
      })),
    comments: raw.comments
      .filter((item: any) => item.ticket_id === ticket.id)
      .map((item: any) => ({
        text: item.body,
        at: item.created_at,
        author: item.author_name_snapshot,
        authorRole: item.author_role_snapshot,
        internal: item.visibility === 'internal',
      })),
  }));
  return { team, accessRequests, roles, projects, categories, tickets };
}

export const statusValues: Record<Status, string> = Object.fromEntries(
  Object.entries(statusLabels).map(([key, value]) => [value, key])
) as Record<Status, string>;
