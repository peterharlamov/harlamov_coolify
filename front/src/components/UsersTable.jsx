function RoleBadge({ role }) {
  const classes = role === 'admin' ? 'bg-violet-100 text-violet-700' : 'bg-sky-100 text-sky-700';

  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${classes}`}>{role}</span>;
}

function VerifiedBadge({ verified }) {
  const classes = verified ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700';
  const label = verified ? 'Verified' : 'Unverified';

  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${classes}`}>{label}</span>;
}

export function UsersTable({ users, canEditRole, onEditRole }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Verified</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {users.map((record) => (
              <tr key={record.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-900">{record.name || '-'}</td>
                <td className="px-4 py-3 text-slate-600">{record.emailDisplay}</td>
                <td className="px-4 py-3">
                  <RoleBadge role={record.role} />
                </td>
                <td className="px-4 py-3">
                  <VerifiedBadge verified={record.verified} />
                </td>
                <td className="px-4 py-3 text-slate-600">{record.created ? new Date(record.created).toLocaleDateString() : '-'}</td>
                <td className="px-4 py-3 text-right">
                  {canEditRole ? (
                    <button
                      type="button"
                      onClick={() => onEditRole(record)}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      Edit role
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
