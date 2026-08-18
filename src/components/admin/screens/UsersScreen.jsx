import { useCallback, useEffect, useMemo, useState } from 'react';
import { LoaderCircle, Search, ShieldCheck } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { EmptyNotice, Field, inputClass, Modal, Panel, RoleBadge, ScreenHeading, StatusBadge } from '../AdminUI';

const joinedFormatter = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Colombo',
});

function UserAvatar({ name }) {
  const initials = String(name || 'User').split(' ').map((part) => part[0]).join('').slice(0, 2);
  return <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-yellow-400/25 bg-yellow-400/10 font-display text-xs font-black uppercase text-yellow-300">{initials}</span>;
}

export default function UsersScreen({ adminRole }) {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('All');
  const [selectedUser, setSelectedUser] = useState(null);
  const [adminAccess, setAdminAccess] = useState(false);
  const [hostName, setHostName] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const canManageAccess = adminRole === 'super_admin';

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    const { data, error: directoryError } = await supabase.rpc('admin_list_users');
    if (directoryError) {
      setError(directoryError.message || 'Unable to load the user directory.');
    } else {
      setUsers(data ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const filtered = useMemo(() => users.filter((user) => {
    const matchesSearch = `${user.display_name} ${user.email}`.toLowerCase().includes(search.toLowerCase());
    return matchesSearch && (role === 'All' || user.roles.includes(role));
  }), [role, search, users]);

  const openUser = (user) => {
    setSelectedUser(user);
    setAdminAccess(user.roles.includes('admin'));
    setHostName(user.host_name ?? '');
    setError('');
  };

  const closeModal = () => {
    if (!saving) setSelectedUser(null);
  };

  const handleAccessSave = async (event) => {
    event.preventDefault();
    if (!selectedUser || !canManageAccess) return;
    setSaving(true);
    setError('');
    const { error: updateError } = await supabase.rpc('admin_update_user_access', {
      p_user_id: selectedUser.user_id,
      p_admin_access: adminAccess,
      p_host_name: hostName || null,
    });
    if (updateError) {
      setError(updateError.message || 'Unable to update access.');
      setSaving(false);
      return;
    }
    setNotice(`${selectedUser.display_name}'s access was updated and recorded in the audit history.`);
    setSelectedUser(null);
    setSaving(false);
    await loadUsers();
  };

  return (
    <div className="space-y-7">
      <ScreenHeading
        eyebrow="Access Directory"
        title="Users & Roles"
        description={canManageAccess
          ? 'Review signed-in accounts and safely assign Admin or paired Host access.'
          : 'Review signed-in accounts. Only a Super Admin can change access.'}
      />
      {notice && <div role="status" className="rounded-xl border border-yellow-400/25 bg-yellow-400/10 px-4 py-3 text-sm font-semibold text-yellow-200">{notice}</div>}
      {error && !selectedUser && <div role="alert" className="rounded-xl border border-red-400/25 bg-red-400/10 px-4 py-3 text-sm font-semibold text-red-200">{error}</div>}

      <Panel className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-white/10 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="relative w-full sm:max-w-sm"><Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" aria-hidden="true" /><input value={search} onChange={(event) => setSearch(event.target.value)} className={`${inputClass} pl-10`} placeholder="Search names or email addresses" aria-label="Search users" /></div>
          <select value={role} onChange={(event) => setRole(event.target.value)} className={`${inputClass} sm:w-48`} aria-label="Filter users by role"><option>All</option><option value="super_admin">super_admin</option><option value="admin">admin</option><option value="host">host</option><option value="user">user</option></select>
        </div>

        {loading ? (
          <div role="status" className="flex items-center justify-center gap-3 p-10 text-sm font-bold text-zinc-400"><LoaderCircle className="h-5 w-5 animate-spin text-yellow-400" aria-hidden="true" /> Loading users from Supabase...</div>
        ) : filtered.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-[1000px] w-full text-left text-sm">
              <thead className="bg-black/35 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500"><tr><th className="px-5 py-3.5">User</th><th className="px-4 py-3.5">Email</th><th className="px-4 py-3.5">Joined</th><th className="px-4 py-3.5">Points</th><th className="px-4 py-3.5">Roles</th><th className="px-4 py-3.5">Status</th><th className="px-5 py-3.5 text-right">Action</th></tr></thead>
              <tbody className="divide-y divide-white/10">
                {filtered.map((user) => (
                  <tr key={user.user_id} className="transition hover:bg-white/[0.025]">
                    <td className="px-5 py-4"><div className="flex items-center gap-3"><UserAvatar name={user.display_name} /><div><span className="font-bold text-white">{user.display_name}</span>{user.host_name && <p className="mt-1 text-xs font-semibold text-violet-300">Host: {user.host_name}</p>}</div></div></td>
                    <td className="px-4 py-4 font-mono text-xs text-zinc-400">{user.email}</td>
                    <td className="px-4 py-4 text-xs text-zinc-400">{joinedFormatter.format(new Date(user.joined_at))}</td>
                    <td className="px-4 py-4 font-display text-lg font-black text-white">{user.total_points}</td>
                    <td className="px-4 py-4"><div className="flex flex-wrap gap-1.5">{user.roles.map((userRole) => <RoleBadge key={userRole} role={userRole} />)}</div></td>
                    <td className="px-4 py-4"><StatusBadge status={user.email_confirmed ? 'Active' : 'Pending'} /></td>
                    <td className="px-5 py-4 text-right"><button type="button" onClick={() => openUser(user)} className="rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-zinc-300 transition hover:border-yellow-400/35 hover:text-yellow-300 focus:outline-none focus:ring-2 focus:ring-yellow-400/50">{canManageAccess ? 'Manage' : 'View'}</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <div className="p-6"><EmptyNotice>No signed-in users match those filters.</EmptyNotice></div>}
      </Panel>

      <Modal open={Boolean(selectedUser)} onClose={closeModal} title={canManageAccess ? 'Manage User Access' : 'User Access'} description="Host access is always paired with Admin access so both hosts can use the control centre.">
        {selectedUser && <form onSubmit={handleAccessSave} className="space-y-5">
          <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/25 p-4"><UserAvatar name={selectedUser.display_name} /><div><p className="font-bold text-white">{selectedUser.display_name}</p><p className="mt-1 font-mono text-xs text-zinc-500">{selectedUser.email}</p></div></div>

          <Field label="Admin panel access" hint="Allows race, question, scoring, and leaderboard administration.">
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-black/25 p-4 text-sm text-zinc-200"><input type="checkbox" checked={adminAccess} disabled={!canManageAccess} onChange={(event) => { setAdminAccess(event.target.checked); if (!event.target.checked) setHostName(''); }} className="h-4 w-4 accent-yellow-400" /> Grant Admin role</label>
          </Field>

          <Field label="Host prediction identity" hint="Select only for Lakindu or Kasun. This also requires Admin access.">
            <select value={hostName} disabled={!canManageAccess} onChange={(event) => { setHostName(event.target.value); if (event.target.value) setAdminAccess(true); }} className={inputClass}>
              <option value="">Not a host</option><option value="Lakindu">Lakindu</option><option value="Kasun">Kasun</option>
            </select>
          </Field>

          <div className="rounded-xl border border-yellow-400/20 bg-yellow-400/10 p-4 text-xs leading-5 text-yellow-100"><span className="mb-1 flex items-center gap-2 font-black uppercase tracking-[0.14em]"><ShieldCheck className="h-4 w-4" aria-hidden="true" /> Protected change</span>The User role is always preserved. Every access change is recorded with the acting Super Admin.</div>
          {error && <p role="alert" className="text-sm font-semibold text-red-300">{error}</p>}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button type="button" disabled={saving} onClick={closeModal} className="rounded-xl border border-white/15 px-5 py-3 text-xs font-black uppercase tracking-[0.15em] text-zinc-300 disabled:opacity-50">Close</button>{canManageAccess && <button type="submit" disabled={saving} className="rounded-xl bg-yellow-400 px-5 py-3 text-xs font-black uppercase tracking-[0.15em] text-black disabled:cursor-wait disabled:opacity-60">{saving ? 'Saving...' : 'Save Access'}</button>}</div>
        </form>}
      </Modal>
    </div>
  );
}
