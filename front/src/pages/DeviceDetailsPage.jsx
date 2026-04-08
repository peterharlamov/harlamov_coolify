import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { StatusBadge } from '../components/StatusBadge';
import { EmptyState, ErrorState, LoadingState } from '../components/StateBlocks';
import { getDeviceById } from '../lib/devices';
import { createDeviceNote, deleteDeviceNote, listDeviceNotes } from '../lib/notes';
import { useAuth } from '../hooks/useAuth';
import { TYPE_LABELS } from '../utils/inventory';

export function DeviceDetailsPage() {
  const { id } = useParams();
  const { user } = useAuth();

  const [device, setDevice] = useState(null);
  const [notes, setNotes] = useState([]);
  const [noteText, setNoteText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function loadDetails() {
    setIsLoading(true);
    setError('');

    try {
      const [deviceResponse, notesResponse] = await Promise.all([getDeviceById(id), listDeviceNotes(id)]);
      setDevice(deviceResponse);
      setNotes(notesResponse.items);
    } catch (loadError) {
      setError(loadError?.message || 'Failed to load device details.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadDetails();
  }, [id]);

  async function handleAddNote(event) {
    event.preventDefault();

    if (!noteText.trim()) {
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await createDeviceNote({
        device: id,
        author: user.id,
        text: noteText.trim(),
      });

      setNoteText('');
      const notesResponse = await listDeviceNotes(id);
      setNotes(notesResponse.items);
    } catch (submitError) {
      setError(submitError?.message || 'Failed to add note.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteNote(noteId) {
    const confirmed = window.confirm('Delete this note?');
    if (!confirmed) {
      return;
    }

    try {
      await deleteDeviceNote(noteId);
      setNotes((current) => current.filter((note) => note.id !== noteId));
    } catch (deleteError) {
      window.alert(deleteError?.message || 'Failed to delete note.');
    }
  }

  if (isLoading) {
    return <LoadingState message="Loading device details..." />;
  }

  if (error && !device) {
    return <ErrorState message={error} onRetry={loadDetails} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{device.name}</h2>
          <p className="mt-1 text-sm text-slate-600">Device details and activity notes</p>
        </div>
        <Link to="/devices" className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
          Back to devices
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 rounded-2xl border border-slate-200 p-5 md:grid-cols-2">
        <Info label="Type" value={TYPE_LABELS[device.type] || device.type} />
        <Info label="Inventory #" value={device.inventory_number} />
        <Info label="Serial #" value={device.serial_number || '-'} />
        <Info label="Assigned to" value={device.expand?.assigned_to?.name || '-'} />
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Status</p>
          <div className="mt-1">
            <StatusBadge status={device.status} />
          </div>
        </div>
        <Info label="Description" value={device.description || '-'} />
      </div>

      <section className="rounded-2xl border border-slate-200 p-5">
        <h3 className="text-lg font-semibold text-slate-900">Device notes</h3>
        <p className="mb-4 text-sm text-slate-600">Workers can add notes about usage, issues, and context.</p>

        <form onSubmit={handleAddNote} className="mb-5 space-y-3">
          <textarea
            value={noteText}
            onChange={(event) => setNoteText(event.target.value)}
            rows={3}
            placeholder="Add a note..."
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? 'Adding...' : 'Add note'}
          </button>
        </form>

        {notes.length === 0 ? (
          <EmptyState title="No notes yet" message="Add the first note for this device." />
        ) : (
          <div className="space-y-3">
            {notes.map((note) => {
              const canDelete = user?.role === 'admin' || note.author === user?.id;

              return (
                <div key={note.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-900">{note.expand?.author?.name || note.expand?.author?.email || 'Unknown'}</p>
                    <div className="flex items-center gap-3">
                      <p className="text-xs text-slate-500">{new Date(note.created).toLocaleString()}</p>
                      {canDelete ? (
                        <button
                          type="button"
                          onClick={() => handleDeleteNote(note.id)}
                          className="text-xs font-semibold text-rose-600 hover:text-rose-700"
                        >
                          Delete
                        </button>
                      ) : null}
                    </div>
                  </div>
                  <p className="whitespace-pre-wrap text-sm text-slate-700">{note.text}</p>
                </div>
              );
            })}
          </div>
        )}

        {error ? <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
      </section>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-900">{value}</p>
    </div>
  );
}
