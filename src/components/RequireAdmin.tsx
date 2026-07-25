import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/** 管理员路由守卫：非管理员直接重定向到责任人首页 */
export default function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user?.isAdmin) {
    return <Navigate to="/tasks" replace />;
  }
  return <>{children}</>;
}
