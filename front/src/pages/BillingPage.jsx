import { useEffect, useState } from 'react';
import { createSubscriptionCheckoutSession, confirmBillingSession, getHostedPaymentLink, hasHostedPaymentLink } from '../lib/billing';
import { getWorkspaceSummary } from '../lib/workspaces';
import { pb } from '../lib/pocketbase';
import { ErrorState, LoadingState, NoWorkspaceState } from '../components/StateBlocks';
import { useAuth } from '../hooks/useAuth';
import { devLog } from '../utils/devLogger';
import { PB_COLLECTIONS } from '../lib/pbCollections';

export function BillingPage() {
  const { user, workspace, workspaceError, isWorkspaceReady, refreshWorkspace } = useAuth();
  const isAdmin = (user?.role || 'worker') === 'admin';

  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState('');

  async function loadSummary(workspaceId) {
    setIsLoading(true);
    setError('');
    devLog('billing.load.start', { workspaceId, user: pb.authStore.model });

    try {
      const nextSummary = await getWorkspaceSummary(workspaceId);
      setSummary(nextSummary);
      devLog('billing.load.summary', nextSummary);
    } catch (loadError) {
      setError(loadError?.message || 'Failed to load billing data.');
      devLog('billing.load.error', {
        message: loadError?.message,
        status: loadError?.status,
        data: loadError?.data,
        configuredCollections: PB_COLLECTIONS,
      });
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
      setSummary(null);
      return;
    }

    loadSummary(workspace.id);
  }, [isWorkspaceReady, workspace?.id]);

  useEffect(() => {
    if (!workspace?.id) {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');

    if (!sessionId) {
      return;
    }

    let cancelled = false;

    async function confirmAndRefresh() {
      setIsConfirming(true);

      try {
        await confirmBillingSession({
          sessionId,
          workspaceId: workspace.id,
        });

        if (!cancelled) {
          await loadSummary(workspace.id);
          const cleanUrl = `${window.location.pathname}${window.location.hash || ''}`;
          window.history.replaceState({}, '', cleanUrl);
        }
      } catch (confirmError) {
        if (!cancelled) {
          setError(confirmError?.message || 'Failed to confirm subscription payment.');
        }
      } finally {
        if (!cancelled) {
          setIsConfirming(false);
        }
      }
    }

    confirmAndRefresh();

    return () => {
      cancelled = true;
    };
  }, [workspace?.id]);

  async function handleUpgrade() {
    if (!summary?.workspace?.id) {
      return;
    }

    setIsRedirecting(true);
    setError('');

    try {
      let url = '';

      if (hasHostedPaymentLink()) {
        url = getHostedPaymentLink({
          workspaceId: summary.workspace.id,
          userEmail: pb.authStore.record?.email,
        });
      } else {
        const payload = await createSubscriptionCheckoutSession({
          workspaceId: summary.workspace.id,
          userEmail: pb.authStore.record?.email,
        });

        url = payload.url;
      }

      if (!url) {
        throw new Error('Checkout URL is not configured.');
      }

      window.location.href = url;
    } catch (upgradeError) {
      setError(upgradeError?.message || 'Failed to start Stripe Checkout.');
      setIsRedirecting(false);
    }
  }

  if (!isWorkspaceReady || isLoading || isConfirming) {
    return <LoadingState message="Loading billing..." />;
  }

  if (!workspace?.id) {
    return <NoWorkspaceState message={workspaceError} onRetry={refreshWorkspace} isAdmin={isAdmin} />;
  }

  if (error && !summary) {
    return <ErrorState message={error} onRetry={() => loadSummary(workspace.id)} />;
  }

  const planName = summary.isUnlimited ? 'Unlimited' : 'Free';
  const usageText = summary.isUnlimited ? `${summary.usedDevices} / Unlimited` : `${summary.usedDevices} / ${summary.limit}`;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Billing</h2>
        <p className="text-sm text-slate-600">Workspace-level subscription and device usage limits.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card label="Workspace" value={summary.workspace.name || '-'} accent="from-sky-500 to-cyan-500" />
        <Card label="Plan" value={planName} accent="from-brand-500 to-cyan-500" />
        <Card label="Subscription status" value={summary.status} accent="from-violet-500 to-fuchsia-500" />
        <Card label="Device usage" value={usageText} accent="from-emerald-500 to-teal-500" />
      </div>

      {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
        {!summary.isUnlimited ? (
          <div className="space-y-3">
            <p className="text-sm text-slate-700">Free plan allows up to 10 devices. Upgrade to Unlimited to remove the cap.</p>
            <button
              type="button"
              onClick={handleUpgrade}
              disabled={isRedirecting}
              className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isRedirecting ? 'Redirecting to Stripe...' : 'Upgrade to Unlimited'}
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-emerald-700">Subscription active</p>
            <p className="text-sm text-slate-600">Your workspace can create unlimited devices.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function Card({ label, value, accent }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-soft">
      <div className={`h-2 bg-gradient-to-r ${accent}`} />
      <div className="p-5">
        <p className="text-sm text-slate-500">{label}</p>
        <p className="mt-1 text-xl font-bold text-slate-900">{value}</p>
      </div>
    </div>
  );
}
