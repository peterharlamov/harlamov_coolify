import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function RoleRoute({ allowedRoles = [] }) {
  const { user } = useAuth();
  const role = user?.role || 'worker';

  if (!user || !allowedRoles.includes(role)) {
    return <Navigate to="/devices" replace />;
  }

  return <Outlet />;
}
