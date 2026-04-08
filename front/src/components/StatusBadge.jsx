import { STATUS_LABELS } from '../utils/inventory';

const styleMap = {
  available: 'bg-emerald-100 text-emerald-700',
  in_use: 'bg-sky-100 text-sky-700',
  repair: 'bg-amber-100 text-amber-700',
  written_off: 'bg-rose-100 text-rose-700',
};

export function StatusBadge({ status }) {
  const style = styleMap[status] ?? 'bg-slate-100 text-slate-700';

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${style}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}
