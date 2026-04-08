import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { DeviceTable } from '../components/DeviceTable';
import { WorkersTable } from '../components/WorkersTable';
import { EmptyState, ErrorState, LoadingState } from '../components/StateBlocks';
import { deleteDevice, listDevices } from '../lib/devices';
import { listWorkers } from '../lib/users';
import { getCurrentWorkspaceId, getWorkspaceSummary } from '../lib/workspaces';
import { useAuth } from '../hooks/useAuth';

export function DevicesPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [items, setItems] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [workspaceSummary, setWorkspaceSummary] = useState(null);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const filteredItems = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return items;
    }

    return items.filter((device) => {
      return (
        device.name?.toLowerCase().includes(normalized) ||
        device.type?.toLowerCase().includes(normalized) ||
        device.inventory_number?.toLowerCase().includes(normalized) ||
        device.serial_number?.toLowerCase().includes(normalized)
      );
    });
  }, [items, query]);

  async function loadDevices() {
    setIsLoading(true);
    setError('');

    try {
      const workspaceId = getCurrentWorkspaceId();

      const devicesPromise = listDevices({ workspaceId });
      const workersPromise = isAdmin ? listWorkers() : Promise.resolve({ items: [] });
      const workspacePromise = getWorkspaceSummary(workspaceId);

      const [devicesResponse, workersResponse, workspaceData] = await Promise.all([devicesPromise, workersPromise, workspacePromise]);

      setItems(devicesResponse.items);
      setWorkers(workersResponse.items);
      setWorkspaceSummary(workspaceData);
    } catch (loadError) {
      setError(loadError?.message || 'Failed to fetch devices.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadDevices();
  }, [isAdmin]);

  async function handleDelete(device) {
    const confirmed = window.confirm(`Delete device "${device.name}"? This action cannot be undone.`);
    if (!confirmed) {
      return;
    }

    try {
      await deleteDevice(device.id);
      setItems((current) => current.filter((item) => item.id !== device.id));
    } catch (deleteError) {
      window.alert(deleteError?.message || 'Delete failed.');
    }
  }

  if (isLoading) {
    return <LoadingState message="Loading devices..." />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={loadDevices} />;
  }

  const limitReached = Boolean(workspaceSummary && !workspaceSummary.isUnlimited && workspaceSummary.usedDevices >= workspaceSummary.limit);

  return (
    <div className="space-y-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Devices</h2>
          <p className="text-sm text-slate-600">Browse all office equipment and ownership details.</p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name, type, inventory..."
            className="w-72 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
          />
          {isAdmin ? (
            limitReached ? (
              <Link to="/billing" className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700">
                Upgrade to add device
              </Link>
            ) : (
              <Link to="/devices/new" className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
                Add device
              </Link>
            )
          ) : null}
        </div>
      </div>

      {limitReached ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <p>Free plan allows up to 10 devices. Upgrade to Unlimited to add more.</p>
          <Link to="/billing" className="mt-2 inline-block font-semibold text-amber-900 underline">
            Open billing
          </Link>
        </div>
      ) : null}

      {filteredItems.length === 0 ? (
        <EmptyState title="No devices found" message="Try adjusting search filters or add a new device." />
      ) : (
        <DeviceTable devices={filteredItems} isAdmin={isAdmin} onDelete={handleDelete} />
      )}

      {isAdmin ? (
        <section>
          <div className="mb-3">
            <h3 className="text-xl font-bold text-slate-900">Workers</h3>
            <p className="text-sm text-slate-600">Visible only for admin users.</p>
          </div>

          {workers.length === 0 ? (
            <EmptyState title="No workers found" message="Create users in PocketBase auth collection." />
          ) : (
            <WorkersTable workers={workers} />
          )}
        </section>
      ) : null}
    </div>
  );
}
