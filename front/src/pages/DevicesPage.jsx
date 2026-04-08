import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { DeviceTable } from '../components/DeviceTable';
import { EmptyState, ErrorState, LoadingState } from '../components/StateBlocks';
import { deleteDevice, listDevices } from '../lib/devices';
import { useAuth } from '../hooks/useAuth';

export function DevicesPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [items, setItems] = useState([]);
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
      const response = await listDevices();
      setItems(response.items);
    } catch (loadError) {
      setError(loadError?.message || 'Failed to fetch devices.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadDevices();
  }, []);

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

  return (
    <div>
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
            <Link to="/devices/new" className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
              Add device
            </Link>
          ) : null}
        </div>
      </div>

      {filteredItems.length === 0 ? (
        <EmptyState title="No devices found" message="Try adjusting search filters or add a new device." />
      ) : (
        <DeviceTable devices={filteredItems} isAdmin={isAdmin} onDelete={handleDelete} />
      )}
    </div>
  );
}
