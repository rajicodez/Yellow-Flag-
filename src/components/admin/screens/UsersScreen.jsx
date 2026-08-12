import { useMemo, useState } from 'react';
import { Search, ShieldCheck } from 'lucide-react';
import { DemoLabel, Field, inputClass, Modal, Panel, RoleBadge, ScreenHeading, StatusBadge } from '../AdminUI';
import { demoUsers } from '../data';

function UserAvatar({ name }) {
  return <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-yellow-400/25 bg-yellow-400/10 font-display text-xs font-black uppercase text-yellow-300">{name.split(' ').map((part) => part[0]).join('').slice(0, 2)}</span>;
}

export default function UsersScreen() {
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('All');
  const [selectedUser, setSelectedUser] = useState(null);
  const [notice, setNotice] = useState('');
  const filtered = useMemo(() => demoUsers.filter((user) => `${user.name} ${user.email}`.toLowerCase().includes(search.toLowerCase()) && (role === 'All' || user.role === role)), [role, search]);

  const closeModal = () => setSelectedUser(null);
  const handleRolePreview = (event) => {
    event.preventDefault();
    setNotice('Role change preview completed locally. No user metadata or database role changed.');
    closeModal();
  };

  return (
    <div className="space-y-7">
      <ScreenHeading eyebrow="Access Directory" title="Users & Roles" description="Review fictional demonstration accounts and preview role controls without touching authentication or Supabase." action={<DemoLabel>Masked Demo Accounts</DemoLabel>} />
      {notice && <div role="status" className="rounded-xl border border-yellow-400/25 bg-yellow-400/10 px-4 py-3 text-sm font-semibold text-yellow-200">{notice}</div>}
      <Panel className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-white/10 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="relative w-full sm:max-w-sm"><Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" aria-hidden="true" /><input value={search} onChange={(event) => setSearch(event.target.value)} className={`${inputClass} pl-10`} placeholder="Search users" aria-label="Search users" /></div>
          <select value={role} onChange={(event) => setRole(event.target.value)} className={`${inputClass} sm:w-48`} aria-label="Filter users by role"><option>All</option><option value="super_admin">super_admin</option><option value="admin">admin</option><option value="host">host</option><option value="user">user</option></select>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[980px] w-full text-left text-sm">
            <thead className="bg-black/35 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500"><tr><th className="px-5 py-3.5">User</th><th className="px-4 py-3.5">Email</th><th className="px-4 py-3.5">Joined</th><th className="px-4 py-3.5">Points</th><th className="px-4 py-3.5">Role</th><th className="px-4 py-3.5">Status</th><th className="px-5 py-3.5 text-right">Action</th></tr></thead>
            <tbody className="divide-y divide-white/10">
              {filtered.map((user) => <tr key={user.id} className="transition hover:bg-white/[0.025]"><td className="px-5 py-4"><div className="flex items-center gap-3"><UserAvatar name={user.name} /><span className="font-bold text-white">{user.name}</span></div></td><td className="px-4 py-4 font-mono text-xs text-zinc-400">{user.email}</td><td className="px-4 py-4 text-xs text-zinc-400">{user.joined}</td><td className="px-4 py-4 font-display text-lg font-black text-white">{user.points}</td><td className="px-4 py-4"><RoleBadge role={user.role} /></td><td className="px-4 py-4"><StatusBadge status={user.status} /></td><td className="px-5 py-4 text-right"><button type="button" onClick={() => setSelectedUser(user)} className="rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-zinc-300 transition hover:border-yellow-400/35 hover:text-yellow-300 focus:outline-none focus:ring-2 focus:ring-yellow-400/50">View</button></td></tr>)}
            </tbody>
          </table>
        </div>
      </Panel>

      <Modal open={Boolean(selectedUser)} onClose={closeModal} title="User Role Preview" description="This editor cannot update Supabase or authentication metadata.">
        {selectedUser && <form onSubmit={handleRolePreview} className="space-y-5">
          <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/25 p-4"><UserAvatar name={selectedUser.name} /><div><p className="font-bold text-white">{selectedUser.name}</p><p className="mt-1 font-mono text-xs text-zinc-500">{selectedUser.email}</p></div></div>
          <Field label="Role"><select className={inputClass} defaultValue={selectedUser.role}><option value="super_admin">super_admin</option><option value="admin">admin</option><option value="host">host</option><option value="user">user</option></select></Field>
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-xs leading-5 text-red-200"><span className="mb-1 flex items-center gap-2 font-black uppercase tracking-[0.14em]"><ShieldCheck className="h-4 w-4" aria-hidden="true" /> Prototype Guardrail</span>No real permission or role change will be saved.</div>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button type="button" onClick={closeModal} className="rounded-xl border border-white/15 px-5 py-3 text-xs font-black uppercase tracking-[0.15em] text-zinc-300">Cancel</button><button type="submit" className="rounded-xl bg-yellow-400 px-5 py-3 text-xs font-black uppercase tracking-[0.15em] text-black">Preview Role Change</button></div>
        </form>}
      </Modal>
    </div>
  );
}
