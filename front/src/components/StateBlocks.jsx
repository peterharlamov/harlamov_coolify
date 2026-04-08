export function LoadingState({ message = 'Loading...' }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-600 shadow-soft">
      {message}
    </div>
  );
}

export function ErrorState({ message = 'Something went wrong.', onRetry }) {
  return (
    <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-700 shadow-soft">
      <p className="font-medium">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700"
        >
          Retry
        </button>
      ) : null}
    </div>
  );
}

export function EmptyState({ title = 'No data yet', message = 'Add your first record to get started.' }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-soft">
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm text-slate-600">{message}</p>
    </div>
  );
}

export function NoWorkspaceState({ message, onRetry, isAdmin }) {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-soft">
      <h3 className="text-lg font-semibold text-amber-900">Workspace required</h3>
      <p className="mt-2 text-sm text-amber-800">{message || 'Your account is not attached to a workspace. Contact administrator.'}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700"
        >
          {isAdmin ? 'Recover workspace' : 'Retry'}
        </button>
      ) : null}
    </div>
  );
}
