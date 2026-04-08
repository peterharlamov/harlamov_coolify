export function devLog(label, payload) {
  if (!import.meta.env.DEV) {
    return;
  }

  console.log(`[debug] ${label}`, payload);
}

export function devTable(label, rows) {
  if (!import.meta.env.DEV) {
    return;
  }

  console.groupCollapsed(`[debug] ${label}`);
  console.table(Array.isArray(rows) ? rows : []);
  console.groupEnd();
}
