import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import BottomNavigation from '@mui/material/BottomNavigation';
import BottomNavigationAction from '@mui/material/BottomNavigationAction';
import AssignmentIcon from '@mui/icons-material/Assignment';
import PersonIcon from '@mui/icons-material/Person';
import ArchiveIcon from '@mui/icons-material/Archive';
import DashboardIcon from '@mui/icons-material/Dashboard';
import DescriptionIcon from '@mui/icons-material/Description';
import Paper from '@mui/material/Paper';
import { useAuth } from '../contexts/AuthContext';

/** 责任人（业主）底部导航 */
const ownerTabs = [
  { path: '/tasks', label: '我的任务', icon: <AssignmentIcon /> },
  { path: '/assets', label: '资产档案', icon: <ArchiveIcon /> },
  { path: '/profile', label: '我的', icon: <PersonIcon /> },
];

/** 管理员底部导航（含通用「我的」页） */
const adminTabs = [
  { path: '/admin/tasks', label: '盘点任务', icon: <AssignmentIcon /> },
  { path: '/admin/dashboard', label: '进度监控', icon: <DashboardIcon /> },
  { path: '/admin/report', label: '盘点报告', icon: <DescriptionIcon /> },
  { path: '/profile', label: '我的', icon: <PersonIcon /> },
];

/**
 * 主布局组件：按当前用户角色（user.isAdmin）自动渲染对应底部导航，
 * 不再提供手动角色切换。角色由后端权限标记权威判定。
 */
export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  const tabs = isAdmin ? adminTabs : ownerTabs;

  const currentTab =
    tabs.find((t) => location.pathname.startsWith(t.path))?.path ??
    (isAdmin ? '/admin/tasks' : '/tasks');

  return (
    <div className="flex flex-col h-full">
      {/* 主内容区 */}
      <main className="flex-1 overflow-y-auto pb-2">
        <Outlet />
      </main>

      {/* 底部导航栏：按当前角色自动展示对应一套导航 */}
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
