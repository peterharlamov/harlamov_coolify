import { useMemo, useState, useEffect } from 'react';
import { listUsers, updateUserRole } from '../lib/users';
import { EmptyState, ErrorState, LoadingState } from '../components/StateBlocks';
import { UsersTable } from '../components/UsersTable';
import { useAuth } from '../hooks/useAuth';

export function UsersPage() {
  const { user } = useAuth();
  const isAdmin = (user?.role || 'worker') === 'admin';

  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingUser, setEditingUser] = useState(null);
  const [nextRole, setNextRole] = useState('worker');
  const [isSavingRole, setIsSavingRole] = useState(false);

  async function loadUsers() {
    setIsLoading(true);
    setError('');

    try {
      const response = await listUsers();
      setUsers(response.items);
    } catch (loadError) {
      setError(loadError?.message || 'Failed to load users.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  const summary = useMemo(() => {
    const totalUsers = users.length;
    const totalAdmins = users.filter((record) => record.role === 'admin').length;
    const totalWorkers = users.filter((record) => record.role === 'worker').length;

    return { totalUsers, totalAdmins, totalWorkers };
  }, [users]);

  function handleOpenEditRole(user) {
    setEditingUser(user);
    setNextRole(user.role || 'worker');
  }

  function handleCloseModal() {
    if (isSavingRole) {
      return;
    }

    setEditingUser(null);
    setNextRole('worker');
  }

  async function handleSaveRole(event) {
    event.preventDefault();

    if (!editingUser) {
      return;
    }

    setIsSavingRole(true);
    setError('');

    try {
      await updateUserRole(editingUser.id, nextRole);
      await loadUsers();
      handleCloseModal();
    } catch (saveError) {
      setError(saveError?.message || 'Failed to update user role.');
    } finally {
      setIsSavingRole(false);
    }
  }

  if (isLoading) {
    return <LoadingState message="Loading users..." />;
  }

  if (error && users.length === 0) {
    return <ErrorState message={error} onRetry={loadUsers} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Users</h2>
          <p className="text-sm text-slate-600">Manage access roles and account verification status.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <SummaryCard label="Total users" value={summary.totalUsers} accent="from-cyan-500 to-sky-500" />
        <SummaryCard label="Total admins" value={summary.totalAdmins} accent="from-violet-500 to-fuchsia-500" />
        <SummaryCard label="Total workers" value={summary.totalWorkers} accent="from-emerald-500 to-teal-500" />
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      ) : null}

      {users.length === 0 ? (
        <EmptyState title="No users found" message="Create users through registration or PocketBase dashboard." />
      ) : (
        <UsersTable users={users} canEditRole={isAdmin} onEditRole={handleOpenEditRole} />
      )}

      {editingUser ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/45 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-soft">
            <h3 className="text-lg font-bold text-slate-900">Edit role</h3>
            <p className="mt-1 text-sm text-slate-600">Update role for {editingUser.name || editingUser.emailDisplay || 'Email hidden'}.</p>

            <form onSubmit={handleSaveRole} className="mt-4 space-y-4">
              <div>
                <label htmlFor="role" className="mb-1 block text-sm font-medium text-slate-700">
                  Role
                </label>
                <select
                  id="role"
                  value={nextRole}
                  onChange={(event) => setNextRole(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none"
                >
                  <option value="worker">worker</option>
                  <option value="admin">admin</option>
                </select>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingRole}
                  className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSavingRole ? 'Saving...' : 'Save role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SummaryCard({ label, value, accent }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-soft">
      <div className={`h-2 bg-gradient-to-r ${accent}`} />
      <div className="p-5">
        <p className="text-sm text-slate-500">{label}</p>
        <p className="mt-1 text-3xl font-bold text-slate-900">{value}</p>
      </div>
    </div>
  );
}
