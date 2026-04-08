import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { pb } from '../lib/pocketbase';

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const currentRole = pb.authStore.record?.role;
  const navItems = [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/devices', label: 'Devices' },
    ...(currentRole === 'admin' ? [{ to: '/users', label: 'Users' }] : []),
  ];

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      <div className="mx-auto grid min-h-screen max-w-7xl grid-cols-1 gap-4 p-4 lg:grid-cols-[260px_1fr] lg:p-6">
        <aside className="rounded-3xl bg-white p-4 shadow-soft lg:p-6">
          <div className="mb-8 rounded-2xl bg-gradient-to-br from-brand-500 to-cyan-500 p-5 text-white">
            <p className="text-xs uppercase tracking-[0.18em] text-cyan-100">Inventuurisusteem</p>
            <h1 className="mt-2 text-2xl font-bold">Office Inventory</h1>
          </div>

          <nav className="space-y-2">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `block rounded-xl px-3 py-2 text-sm font-medium transition ${
                    isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="mt-8 rounded-xl bg-slate-50 p-3 text-sm">
            <p className="font-semibold text-slate-900">{user?.name || user?.email}</p>
            <p className="text-slate-500">Role: {currentRole || user?.role}</p>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="mt-4 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            Logout
          </button>
        </aside>

        <main className="flex min-h-[80vh] flex-col rounded-3xl bg-white p-4 shadow-soft lg:p-6">
          <header className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Workspace</p>
              <p className="text-sm font-semibold text-slate-900">Office Device Inventory</p>
            </div>
            <p className="text-sm text-slate-600">{new Date().toLocaleDateString()}</p>
          </header>

          <div className="animate-fade-up">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
