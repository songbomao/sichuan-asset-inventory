import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import BottomNavigation from '@mui/material/BottomNavigation';
import BottomNavigationAction from '@mui/material/BottomNavigationAction';
import InventoryIcon from '@mui/icons-material/Inventory';
import PersonIcon from '@mui/icons-material/Person';
import ArchiveIcon from '@mui/icons-material/Archive';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import Paper from '@mui/material/Paper';
import { useAuth } from '../contexts/AuthContext';

/** 责任人（业主）底部导航
 * 「进度概览」指向全局进度看板（/admin/dashboard，已对全员开放），
 * 普通用户进入后仅见整体进度 + 各部门完成率 + 本人进度，任务下钻等管理功能不可见。
 */
const ownerTabs = [
  { path: '/tasks', label: '我的盘点', icon: <InventoryIcon /> },
  { path: '/admin/dashboard', label: '进度概览', icon: <DashboardIcon /> },
  { path: '/assets', label: '资产档案', icon: <ArchiveIcon /> },
  { path: '/profile', label: '我的', icon: <PersonIcon /> },
];

/**
 * 管理员底部导航（含通用「我的」页）
 * 「盘点报告」不再作为独立入口，已合并至任务详情（任务卡片 → 盘点报告卡片）。
 * 「管理」（原「盘点任务」）承载任务管理/资产对比同步/固资查询，置于最右侧入口。
 * 原「我的进度」入口已取消（方案B）：其总体完成率汇总已合并至「我的盘点」页顶部，
 * 进度看板入口保留在任务详情页（任务卡片 → 进度看板），避免底部导航过度拥挤。
 */
const adminTabs = [
  { path: '/tasks', label: '我的盘点', icon: <InventoryIcon /> },
  { path: '/admin/dashboard', label: '全局进度', icon: <DashboardIcon /> },
  { path: '/profile', label: '我的', icon: <PersonIcon /> },
  { path: '/admin/tasks', label: '管理', icon: <AdminPanelSettingsIcon /> },
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
      {/* 主内容区（顶部留白给全局返回控制台按钮） */}
      <main className="flex-1 overflow-y-auto pt-12 pb-2">
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
