import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import BottomNavigation from '@mui/material/BottomNavigation';
import BottomNavigationAction from '@mui/material/BottomNavigationAction';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import AssignmentIcon from '@mui/icons-material/Assignment';
import PersonIcon from '@mui/icons-material/Person';
import ArchiveIcon from '@mui/icons-material/Archive';
import DashboardIcon from '@mui/icons-material/Dashboard';
import DescriptionIcon from '@mui/icons-material/Description';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import { useAuth } from '../contexts/AuthContext';

/** 责任人（业主）底部导航 */
const ownerTabs = [
  { path: '/tasks', label: '我的任务', icon: <AssignmentIcon /> },
  { path: '/assets', label: '资产档案', icon: <ArchiveIcon /> },
  { path: '/profile', label: '我的', icon: <PersonIcon /> },
];

/** 管理员底部导航 */
const adminTabs = [
  { path: '/admin/tasks', label: '盘点任务', icon: <AssignmentIcon /> },
  { path: '/admin/dashboard', label: '进度监控', icon: <DashboardIcon /> },
  { path: '/admin/report', label: '盘点报告', icon: <DescriptionIcon /> },
];

/**
 * 主布局组件：顶部角色切换器 + 底部导航（按当前角色视图显示对应一套导航）
 */
export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, roleView, setRoleView } = useAuth();

  const isAdmin = !!user?.isAdmin;
  const tabs = roleView === 'admin' ? adminTabs : ownerTabs;

  const currentTab =
    tabs.find((t) => location.pathname.startsWith(t.path))?.path ??
    (roleView === 'admin' ? '/admin/tasks' : '/tasks');

  const handleRoleChange = (
    _e: React.MouseEvent<HTMLElement>,
    next: 'owner' | 'admin' | null,
  ) => {
    if (!next) return;
    setRoleView(next);
    navigate(next === 'admin' ? '/admin/tasks' : '/tasks');
  };

  return (
    <div className="flex flex-col h-full">
      {/* 顶部角色切换器 */}
      <Paper
        square
        elevation={1}
        sx={{ position: 'sticky', top: 0, zIndex: 10 }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1 }}>
          <AdminPanelSettingsIcon fontSize="small" color="action" />
          <ToggleButtonGroup
            size="small"
            exclusive
            value={roleView}
            onChange={handleRoleChange}
            disabled={!isAdmin && roleView === 'admin'}
          >
            <ToggleButton value="owner" sx={{ px: 2, py: 0.5 }}>
              责任人
            </ToggleButton>
            <ToggleButton value="admin" disabled={!isAdmin} sx={{ px: 2, py: 0.5 }}>
              管理员
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Paper>

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
