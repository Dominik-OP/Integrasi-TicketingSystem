import type { InsForgeClient } from '@insforge/sdk';

async function rows(query: PromiseLike<{ data: unknown; error: { message: string } | null }>) {
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return Array.isArray(data) ? data : data ? [data] : [];
}

export async function loadWorkspaceRaw(client: InsForgeClient) {
  const [
    team,
    roles,
    rolePermissions,
    overrides,
    projects,
    categories,
    slaRules,
    tickets,
    events,
    comments,
    attachments,
  ] = await Promise.all([
    rows(client.database.from('team_members').select('*').order('display_name')),
    rows(client.database.from('roles').select('*').order('name')),
    rows(client.database.from('role_permissions').select('*')),
    rows(client.database.from('user_permission_overrides').select('*')),
    rows(client.database.from('projects').select('*').order('name')),
    rows(client.database.from('categories').select('*').order('name')),
    rows(client.database.from('sla_rules').select('*')),
    rows(
      client.database
        .from('tickets')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500)
    ),
    rows(client.database.from('ticket_events').select('*').order('occurred_at')),
    rows(client.database.from('comments').select('*').order('created_at')),
    rows(client.database.from('attachments').select('*').order('created_at')),
  ]);
  return {
    team,
    roles,
    rolePermissions,
    overrides,
    projects,
    categories,
    slaRules,
    tickets,
    events,
    comments,
    attachments,
  };
}
