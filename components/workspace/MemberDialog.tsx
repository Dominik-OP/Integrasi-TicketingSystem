'use client';
import { PermissionOverrides } from '@/components/settings/master-data';
import { Dialog } from '@/components/ui';
import type { Member } from '@/lib/domain';
import { permissionList, roleLabel, type Permission, type RoleDefinition } from '@/lib/permissions';
import { Check, LoaderCircle } from 'lucide-react';
import { useState } from 'react';

export default function MemberDialog({
  member,
  roles,
  can,
  saveMember,
  notify,
  close,
}: {
  /** `null` adds a new member. */
  member: Member | null;
  roles: RoleDefinition[];
  can: (permission: Permission) => boolean;
  saveMember: (member: Member) => Promise<void>;
  notify: (message: string) => void;
  close: () => void;
}) {
  const [saving, setSaving] = useState(false);
  return (
    <Dialog title={member ? 'Edit anggota' : 'Tambah anggota'} close={close}>
      <form
        className="form-stack"
        onSubmit={async (e) => {
          e.preventDefault();
          if (saving) return;
          const fd = new FormData(e.currentTarget);
          const data: Member = {
            id: member?.id ?? crypto.randomUUID(),
            name: String(fd.get('name')).trim(),
            email: String(fd.get('email')).trim().toLowerCase(),
            role: can('manage_roles')
              ? (roles.find((r) => r.id === fd.get('roleId'))?.base ?? 'Agent')
              : (member?.role ?? 'Agent'),
            roleId: can('manage_roles')
              ? String(fd.get('roleId') ?? 'agent')
              : (member?.roleId ?? 'agent'),
            overrides: can('manage_roles')
              ? Object.fromEntries(
                  permissionList
                    .filter((p) => fd.get(`override:${p.key}`) !== 'default')
                    .map((p) => [p.key, fd.get(`override:${p.key}`) === 'allow'])
                )
              : (member?.overrides ?? {}),
            active: can('manage_users') ? fd.get('active') === 'on' : (member?.active ?? true),
          };
          setSaving(true);
          try {
            await saveMember(data);
            close();
            notify('Anggota tim berhasil disimpan ke backend.');
          } catch (error) {
            notify(error instanceof Error ? error.message : 'Anggota gagal disimpan.');
          } finally {
            setSaving(false);
          }
        }}
      >
        <label>
          Nama lengkap
          <input name="name" required readOnly={!can('manage_users')} defaultValue={member?.name} />
        </label>
        <label>
          Email
          <input name="email" type="email" required readOnly defaultValue={member?.email} />
          <small>Email login mengikuti akun terverifikasi dan tidak diubah dari halaman ini.</small>
        </label>
        {can('manage_roles') ? (
          <PermissionOverrides
            roles={roles}
            initialRoleId={member?.roleId ?? 'agent'}
            initialOverrides={member?.overrides ?? {}}
          />
        ) : (
          <p className="muted small-text">
            Role: {member ? roleLabel(member, roles) : 'Agent'}. Izin kelola role diperlukan untuk
            mengubah jabatan dan hak akses.
          </p>
        )}
        <label className="check-label">
          <input
            type="checkbox"
            name="active"
            disabled={!can('manage_users')}
            defaultChecked={member?.active ?? true}
          />{' '}
          Anggota aktif
        </label>
        <button className="primary" type="submit" disabled={saving}>
          {saving ? <LoaderCircle className="loading-spinner" size={16} /> : <Check size={16} />}{' '}
          {saving ? 'Menyimpan…' : 'Simpan anggota'}
        </button>
      </form>
    </Dialog>
  );
}
