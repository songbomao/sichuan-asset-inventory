import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import RequireAdmin from './components/RequireAdmin';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import HomeIcon from '@mui/icons-material/Home';
import Login from './pages/Login';
import TaskList from './pages/TaskList';
import Inventory from './pages/Inventory';
import Profile from './pages/Profile';
import AssetsArchive from './pages/AssetsArchive';
import AdminTasks from './pages/AdminTasks';
import Review from './pages/Review';
import Dashboard from './pages/Dashboard';
import Report from './pages/Report';
import AssetLifecycle from './pages/AssetLifecycle';
import TaskDetail from './pages/TaskDetail';
import MyProgress from './pages/MyProgress';
import MyRecords from './pages/MyRecords';
import AdminTaskRecords from './pages/AdminTaskRecords';

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

/** 全局顶部导航栏
 *
 * MUI AppBar position="fixed" 在钉钉 WebView (X5/UC 内核) 中有事件穿透 bug，
 * 故改用纯 div + position:fixed + flexbox，对齐 ConsoleButton 的可用模式。
 */
function GlobalAppBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  if (location.pathname === '/login') return null;

  return (
    <div
      style={{
        position: 'fixed',
        zIndex: 1200,
        top: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        maxWidth: '480px',
        height: 48,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        boxSizing: 'border-box',
        borderRadius: '0 0 12px 12px',
        backgroundImage: 'linear-gradient(135deg, #1a237e 0%, #4a148c 100%)',
        color: '#ffffff',
        boxShadow: '0 2px 10px rgba(26, 35, 126, 0.28)',
      }}
    >
      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#ffffff', fontSize: '0.95rem', letterSpacing: '0.04em' }}>
        AI 盘点·账实秒合
      </Typography>
      <IconButton
        color="inherit"
        size="small"
        onClick={() => navigate(isAdmin ? '/admin/tasks' : '/tasks', { replace: true })}
        title="返回控制台"
        aria-label="返回控制台"
        sx={{
          '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.16)' },
        }}
      >
        <HomeIcon fontSize="small" />
      </IconButton>
    </div>
  );
}

export default function App() {
  return (
    <>
      <GlobalAppBar />
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
        {/* 我的进度 — 所有角色通用入口，追踪个人名下任务盘点进度 */}
        <Route path="/my-progress" element={<MyProgress />} />
        {/* 历史兼容别名：原 /records 统一到「我的盘点记录」单一入口 */}
        <Route path="/records" element={<Navigate to="/my-records" replace />} />

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

      {/* 我的盘点记录（责任人）— 独立页面 */}
      <Route
        path="/my-records"
        element={
          <ProtectedRoute>
            <MyRecords />
          </ProtectedRoute>
        }
      />

      {/* 任务盘点记录（管理员）— 独立页面，需管理员权限 */}
      <Route
        path="/admin/tasks/:taskId/records"
        element={
          <ProtectedRoute>
            <RequireAdmin>
              <AdminTaskRecords />
            </RequireAdmin>
          </ProtectedRoute>
        }
      />

      {/* 默认重定向（按角色落地首页） */}
      <Route path="*" element={<RoleHome />} />
    </Routes>
    </>
  );
}
