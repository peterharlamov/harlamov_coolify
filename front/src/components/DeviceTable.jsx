import { Link } from 'react-router-dom';
import { StatusBadge } from './StatusBadge';

export function DeviceTable({ devices, isAdmin, onDelete }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Inventory</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Assigned To</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {devices.map((device) => (
              <tr key={device.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-900">{device.name}</td>
                <td className="px-4 py-3 text-slate-600">{device.type}</td>
                <td className="px-4 py-3 text-slate-600">{device.inventory_number}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={device.status} />
                </td>
                <td className="px-4 py-3 text-slate-600">{device.expand?.assigned_to?.name || '-'}</td>
                <td className="px-4 py-3 text-right">
                  <div className="inline-flex items-center gap-2">
                    <Link
                      to={`/devices/${device.id}`}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-100"
                    >
                      Open
                    </Link>
                    {isAdmin ? (
                      <>
                        <Link
                          to={`/devices/${device.id}/edit`}
                          className="rounded-lg border border-cyan-200 px-3 py-1.5 font-medium text-cyan-700 hover:bg-cyan-50"
                        >
                          Edit
                        </Link>
                        <button
                          type="button"
                          onClick={() => onDelete(device)}
                          className="rounded-lg border border-rose-200 px-3 py-1.5 font-medium text-rose-700 hover:bg-rose-50"
                        >
                          Delete
                        </button>
                      </>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
