import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import TaskList from './pages/TaskList';
import Inventory from './pages/Inventory';
import Records from './pages/Records';
import Profile from './pages/Profile';
import AdminTasks from './pages/AdminTasks';
import Review from './pages/Review';
import Dashboard from './pages/Dashboard';
import Report from './pages/Report';
import AssetLifecycle from './pages/AssetLifecycle';
import TaskDetail from './pages/TaskDetail';

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

      {/* 任务详情入口页 */}
      <Route
        path="/tasks/:taskId"
        element={
          <ProtectedRoute>
            <TaskDetail />
          </ProtectedRoute>
        }
      />

      {/* 复盘页 — 独立页面 */}
      <Route
        path="/tasks/:taskId/review"
        element={
          <ProtectedRoute>
            <Review />
          </ProtectedRoute>
        }
      />

      {/* 进度看板 — 独立页面 */}
      <Route
        path="/tasks/:taskId/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      {/* 盘点报告 — 独立页面 */}
      <Route
        path="/tasks/:taskId/report"
        element={
          <ProtectedRoute>
            <Report />
          </ProtectedRoute>
        }
      />

      {/* 资产全生命周期 — 独立页面 */}
      <Route
        path="/asset-lifecycle"
        element={
          <ProtectedRoute>
            <AssetLifecycle />
          </ProtectedRoute>
        }
      />

      {/* 默认重定向 */}
      <Route path="*" element={<Navigate to="/tasks" replace />} />
    </Routes>
  );
}
