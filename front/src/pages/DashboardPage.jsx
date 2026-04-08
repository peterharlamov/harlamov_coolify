import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { countDevicesByStatus, listDevices } from '../lib/devices';
import { getWorkspaceSummary } from '../lib/workspaces';
import { DEVICE_STATUSES, STATUS_LABELS } from '../utils/inventory';
import { ErrorState, LoadingState, NoWorkspaceState } from '../components/StateBlocks';
import { useAuth } from '../hooks/useAuth';

export function DashboardPage() {
  const { user, workspace, workspaceError, isWorkspaceReady, refreshWorkspace } = useAuth();
  const isAdmin = (user?.role || 'worker') === 'admin';

  const [stats, setStats] = useState({ total: 0, statuses: {} });
  const [workspaceSummary, setWorkspaceSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const reload = () => {
    if (workspace?.id) {
      loadStats(workspace.id);
    }
  };

  async function loadStats(workspaceId) {
    setIsLoading(true);
    setError('');

    try {
      const all = await listDevices({ workspaceId, page: 1, perPage: 1 });
      const statusResults = await Promise.all(DEVICE_STATUSES.map((status) => countDevicesByStatus(status, workspaceId)));
      const workspaceData = await getWorkspaceSummary(workspaceId);

      const statuses = DEVICE_STATUSES.reduce((accumulator, status, index) => {
        accumulator[status] = statusResults[index].totalItems;
        return accumulator;
      }, {});

      setStats({
        total: all.totalItems,
        statuses,
      });
      setWorkspaceSummary(workspaceData);
    } catch (loadError) {
      setError(loadError?.message || 'Failed to load dashboard.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (!isWorkspaceReady) {
      return;
    }

    if (!workspace?.id) {
      setIsLoading(false);
      setStats({ total: 0, statuses: {} });
      setWorkspaceSummary(null);
      return;
    }

    loadStats(workspace.id);
  }, [isWorkspaceReady, workspace?.id]);

  const cards = useMemo(
    () => [
      { label: 'Total devices', value: stats.total, accent: 'from-sky-500 to-cyan-500' },
      {
        label: 'Workspace plan',
        value: workspaceSummary?.isUnlimited ? 'Unlimited' : 'Free',
        accent: 'from-brand-500 to-cyan-500',
      },
      {
        label: 'Usage',
        value: workspaceSummary
          ? workspaceSummary.isUnlimited
            ? `${workspaceSummary.usedDevices} / Unlimited`
            : `${workspaceSummary.usedDevices} / ${workspaceSummary.limit}`
          : '-',
        accent: 'from-violet-500 to-fuchsia-500',
      },
      ...DEVICE_STATUSES.map((status) => ({
        label: STATUS_LABELS[status],
        value: stats.statuses[status] ?? 0,
        accent: 'from-emerald-500 to-teal-500',
      })),
    ],
    [stats, workspaceSummary]
  );

  if (isLoading) {
    return <LoadingState message="Loading dashboard..." />;
  }

  if (!workspace?.id) {
    return <NoWorkspaceState message={workspaceError} onRetry={refreshWorkspace} isAdmin={isAdmin} />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={reload} />;
  }

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Dashboard</h2>
          <p className="text-slate-600">High-level overview of office equipment.</p>
        </div>
        <Link to="/devices" className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
          Open devices
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <div key={card.label} className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-soft">
            <div className={`h-2 bg-gradient-to-r ${card.accent}`} />
            <div className="p-5">
              <p className="text-sm text-slate-500">{card.label}</p>
              <p className="mt-1 text-3xl font-bold text-slate-900">{card.value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
