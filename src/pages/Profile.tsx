import { useNavigate } from 'react-router-dom';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonIcon from '@mui/icons-material/Person';
import BadgeIcon from '@mui/icons-material/Badge';
import BusinessIcon from '@mui/icons-material/Business';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import FingerprintIcon from '@mui/icons-material/Fingerprint';
import { useAuth } from '../contexts/AuthContext';

/**
 * 个人中心页面
 */
export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="p-4 space-y-4">
      {/* 头部 */}
      <h1 className="text-xl font-bold text-gray-900 px-1">我的</h1>

      {/* 用户信息卡片 */}
      <Card className="glow-border overflow-hidden">
        {/* 背景 */}
        <div className="h-24 bg-gradient-to-r from-primary to-[#4a148c]" />

        <CardContent sx={{ position: 'relative', pt: 0, mt: '-32px' }}>
          <div className="flex flex-col items-center">
            <Avatar
              src={user?.avatar || undefined}
              sx={{
                width: 72,
                height: 72,
                bgcolor: '#fff',
                border: '3px solid #fff',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              }}
            >
              {!user?.avatar && <PersonIcon sx={{ fontSize: 36, color: '#1a237e' }} />}
            </Avatar>

            <h2 className="text-lg font-bold mt-3 text-gray-900">
              {user?.name || '未知用户'}
            </h2>
            <p className="text-sm text-gray-500">@{user?.username || '--'}</p>

            <div className="w-full mt-4 space-y-2">
              <div className="flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-lg">
                <BadgeIcon fontSize="small" className="text-primary" />
                <span className="text-sm text-gray-600">角色</span>
                <span className="text-sm font-medium ml-auto">{user?.role || '盘点员'}</span>
              </div>
              <div className="flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-lg">
                <BusinessIcon fontSize="small" className="text-primary" />
                <span className="text-sm text-gray-600">部门</span>
                <span className="text-sm font-medium ml-auto">{user?.department || '--'}</span>
              </div>
              <div className="flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-lg">
                <AdminPanelSettingsIcon fontSize="small" className="text-primary" />
                <span className="text-sm text-gray-600">ID</span>
                <span className="text-sm font-medium ml-auto font-mono text-xs">{user?.id || '--'}</span>
              </div>
              {user?.dingtalkUserId && (
                <div className="flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-lg">
                  <FingerprintIcon fontSize="small" className="text-primary" />
                  <span className="text-sm text-gray-600">钉钉</span>
                  <span className="text-sm font-medium ml-auto font-mono text-xs">{user.dingtalkUserId}</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 退出登录 */}
      <Button
        variant="outlined"
        color="error"
        fullWidth
        startIcon={<LogoutIcon />}
        onClick={handleLogout}
        sx={{ py: 1.2, borderRadius: '12px' }}
      >
        退出登录
      </Button>

      {/* 底部版权 */}
      <p className="text-center text-xs text-gray-400 pt-4">
        四川固定资产盘点系统 v1.0.0
      </p>
    </div>
  );
}
