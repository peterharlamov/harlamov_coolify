export function WorkersTable({ workers }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {workers.map((worker) => (
              <tr key={worker.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-900">{worker.name || '-'}</td>
                <td className="px-4 py-3 text-slate-600">{worker.email}</td>
                <td className="px-4 py-3 text-slate-600">{worker.role}</td>
                <td className="px-4 py-3 text-slate-600">{new Date(worker.created).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
