import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import BottomNavigation from '@mui/material/BottomNavigation';
import BottomNavigationAction from '@mui/material/BottomNavigationAction';
import AssignmentIcon from '@mui/icons-material/Assignment';
import HistoryIcon from '@mui/icons-material/History';
import PersonIcon from '@mui/icons-material/Person';
import Paper from '@mui/material/Paper';

const tabs = [
  { path: '/tasks', label: '任务', icon: <AssignmentIcon /> },
  { path: '/records', label: '记录', icon: <HistoryIcon /> },
  { path: '/profile', label: '我的', icon: <PersonIcon /> },
];

/**
 * 主布局组件：底部导航 + 内容区
 */
export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();

  // 根据当前路径匹配底部导航选中项
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
