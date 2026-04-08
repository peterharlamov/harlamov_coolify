import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { createDevice, getDeviceById, updateDevice } from '../lib/devices';
import { pb } from '../lib/pocketbase';
import { DEVICE_STATUSES, DEVICE_TYPES, STATUS_LABELS, TYPE_LABELS } from '../utils/inventory';
import { ErrorState, LoadingState } from '../components/StateBlocks';

const initialForm = {
  name: '',
  type: 'laptop',
  inventory_number: '',
  serial_number: '',
  status: 'available',
  assigned_to: '',
  description: '',
};

export function DeviceFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm] = useState(initialForm);
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');

  const pageTitle = useMemo(() => (isEdit ? 'Edit device' : 'Add device'), [isEdit]);

  async function loadData() {
    setIsLoading(true);
    setLoadError('');

    try {
      const usersPromise = pb.collection('users').getList(1, 200, { sort: 'name' });
      const devicePromise = isEdit ? getDeviceById(id) : Promise.resolve(null);

      const [usersResponse, device] = await Promise.all([usersPromise, devicePromise]);
      setUsers(usersResponse.items);

      if (device) {
        setForm({
          name: device.name || '',
          type: device.type || 'laptop',
          inventory_number: device.inventory_number || '',
          serial_number: device.serial_number || '',
          status: device.status || 'available',
          assigned_to: device.assigned_to || '',
          description: device.description || '',
        });
      }
    } catch (loadError) {
      setLoadError(loadError?.message || 'Failed to load form data.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [id]);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    const payload = {
      ...form,
      assigned_to: form.assigned_to || null,
    };

    try {
      if (isEdit) {
        await updateDevice(id, payload);
      } else {
        await createDevice(payload);
      }

      navigate('/devices');
    } catch (submitError) {
      setError(submitError?.message || 'Failed to save device.');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return <LoadingState message="Loading form..." />;
  }

  if (loadError) {
    return <ErrorState message={loadError} onRetry={loadData} />;
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{pageTitle}</h2>
          <p className="text-sm text-slate-600">Manage inventory metadata and ownership.</p>
        </div>
        <Link to="/devices" className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
          Back to list
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-slate-200 p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Name</label>
            <input name="name" value={form.name} onChange={handleChange} required className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Type</label>
            <select name="type" value={form.type} onChange={handleChange} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm">
              {DEVICE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Inventory number</label>
            <input
              name="inventory_number"
              value={form.inventory_number}
              onChange={handleChange}
              required
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Serial number</label>
            <input name="serial_number" value={form.serial_number} onChange={handleChange} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Status</label>
            <select name="status" value={form.status} onChange={handleChange} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm">
              {DEVICE_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Assigned to</label>
            <select name="assigned_to" value={form.assigned_to} onChange={handleChange} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm">
              <option value="">Unassigned</option>
              {users.map((worker) => (
                <option key={worker.id} value={worker.id}>
                  {worker.name || worker.email}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            rows={4}
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
          />
        </div>

        {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? 'Saving...' : isEdit ? 'Save changes' : 'Create device'}
        </button>
      </form>
    </div>
  );
}
