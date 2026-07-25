import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import RequireAdmin from './components/RequireAdmin';
import Login from './pages/Login';
import TaskList from './pages/TaskList';
import Inventory from './pages/Inventory';
import Records from './pages/Records';
import Profile from './pages/Profile';
import AssetsArchive from './pages/AssetsArchive';
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

/** 按当前用户角色落地首页：管理员进入盘点控制台，责任人进入我的任务 */
function RoleHome() {
  const { isAdmin } = useAuth();
  return <Navigate to={isAdmin ? '/admin/tasks' : '/tasks'} replace />;
}

/** 已登录自动跳转首页（按角色） */
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  if (token) {
    return <RoleHome />;
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

      {/* 受保护路由 — 带底部导航（责任人 / 管理员双套导航由 Layout 内部按角色渲染） */}
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        {/* 责任人导航 */}
        <Route path="/tasks" element={<TaskList />} />
        <Route path="/assets" element={<AssetsArchive />} />
        <Route path="/profile" element={<Profile />} />
        {/* 原 /records 并入资产档案的时间线子 tab */}
        <Route path="/records" element={<Navigate to="/assets?tab=timeline" replace />} />

        {/* 管理员导航（需管理员权限） */}
        <Route
          path="/admin/tasks"
          element={
            <RequireAdmin>
              <AdminTasks />
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/dashboard"
          element={
            <RequireAdmin>
              <Dashboard />
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/report"
          element={
            <RequireAdmin>
              <Report />
            </RequireAdmin>
          }
        />
        {/* 历史兼容别名 */}
        <Route path="/admin" element={<Navigate to="/admin/tasks" replace />} />
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

      {/* 默认重定向（按角色落地首页） */}
      <Route path="*" element={<RoleHome />} />
    </Routes>
  );
}
