import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import TaskList from './pages/TaskList';
import Inventory from './pages/Inventory';
import Records from './pages/Records';
import Profile from './pages/Profile';
import AdminTasks from './pages/AdminTasks';

/** 受保护路由：未登录跳转登录页 */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

/** 已登录自动跳转首页 */
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  if (token) {
    return <Navigate to="/tasks" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      {/* 公开路由 */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />

      {/* 受保护路由 — 带底部导航 */}
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/tasks" element={<TaskList />} />
        <Route path="/records" element={<Records />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/admin" element={<AdminTasks />} />
      </Route>

      {/* 盘点页 — 独立页面，不带底部导航 */}
      <Route
        path="/tasks/:taskId/inventory"
        element={
          <ProtectedRoute>
            <Inventory />
          </ProtectedRoute>
        }
      />

      {/* 默认重定向 */}
      <Route path="*" element={<Navigate to="/tasks" replace />} />
    </Routes>
  );
}
