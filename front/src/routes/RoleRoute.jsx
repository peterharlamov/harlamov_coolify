import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { pb } from '../lib/pocketbase';

export function RoleRoute({ allowedRoles = [] }) {
  const { user } = useAuth();
  const role = pb.authStore.record?.role || user?.role;

  if (!user || !allowedRoles.includes(role)) {
    return <Navigate to="/devices" replace />;
  }

  return <Outlet />;
}
