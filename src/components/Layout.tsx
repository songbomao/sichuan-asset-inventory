import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import BottomNavigation from '@mui/material/BottomNavigation';
import BottomNavigationAction from '@mui/material/BottomNavigationAction';
import AssignmentIcon from '@mui/icons-material/Assignment';
import HistoryIcon from '@mui/icons-material/History';
import PersonIcon from '@mui/icons-material/Person';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import Paper from '@mui/material/Paper';
import { useAuth } from '../contexts/AuthContext';

const baseTabs = [
  { path: '/tasks', label: '任务', icon: <AssignmentIcon /> },
  { path: '/records', label: '记录', icon: <HistoryIcon /> },
  { path: '/profile', label: '我的', icon: <PersonIcon /> },
];

const adminTab = { path: '/admin', label: '管理', icon: <AdminPanelSettingsIcon /> };

/**
 * 主布局组件：底部导航 + 内容区
 * 管理员（后端判定）可见"管理"tab
 */
export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const tabs = user?.isAdmin ? [...baseTabs, adminTab] : baseTabs;

  const currentTab = tabs.find((t) => location.pathname.startsWith(t.path))?.path ?? '/tasks';

  return (
    <div className="flex flex-col h-full">
      {/* 主内容区 */}
      <main className="flex-1 overflow-y-auto pb-2">
        <Outlet />
      </main>

      {/* 底部导航栏 */}
      <Paper
        sx={{ position: 'sticky', bottom: 0, zIndex: 10 }}
        elevation={3}
      >
        <BottomNavigation
          value={currentTab}
          onChange={(_e, newValue: string) => {
            navigate(newValue);
          }}
          showLabels
        >
          {tabs.map((tab) => (
            <BottomNavigationAction
              key={tab.path}
              label={tab.label}
              value={tab.path}
              icon={tab.icon}
            />
          ))}
        </BottomNavigation>
      </Paper>
    </div>
  );
}
