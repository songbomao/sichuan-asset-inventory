import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonIcon from '@mui/icons-material/Person';
import BadgeIcon from '@mui/icons-material/Badge';
import BusinessIcon from '@mui/icons-material/Business';
import PhoneIcon from '@mui/icons-material/Phone';
import FingerprintIcon from '@mui/icons-material/Fingerprint';
import SettingsIcon from '@mui/icons-material/Settings';
import Chip from '@mui/material/Chip';
import { useAuth } from '../contexts/AuthContext';
import { APP_VERSION, RELEASE_NOTES } from '../config/version';
import AdminConfigDialog from '../components/AdminConfigDialog';

/** 信息行组件 */
function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Stack direction="row" alignItems="center" spacing={1.5} sx={{ py: 1, px: 1 }}>
      <span className="text-gray-400">{icon}</span>
      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 48 }}>{label}</Typography>
      <Typography variant="body2" sx={{ ml: 'auto', fontWeight: 500, wordBreak: 'break-all' }}>
        {value || '--'}
      </Typography>
    </Stack>
  );
}

/**
 * 个人中心页面
 */
export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [adminDialogOpen, setAdminDialogOpen] = useState(false);

  const handleLogout = () => {
    // 设置退出标记，防止登录页自动触发钉钉免登
    localStorage.setItem('logout_flag', '1');
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="p-4 space-y-4">
      {/* 头部 */}
      <Typography variant="h5" fontWeight={700} sx={{ px: 1 }}>我的</Typography>

      {/* 用户信息卡片 */}
      <Card sx={{ overflow: 'hidden', borderRadius: 3 }}>
        {/* 背景 */}
        <div className="h-20 bg-gradient-to-r from-primary to-[#4a148c]" />

        <CardContent sx={{ position: 'relative', pt: 0, mt: '-40px' }}>
          <Stack alignItems="center" spacing={1}>
            <Avatar
              src={user?.avatar || undefined}
              sx={{
                width: 80,
                height: 80,
                bgcolor: '#fff',
                border: '3px solid #fff',
                boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
                fontSize: 32,
              }}
            >
              {!user?.avatar && (user?.name?.[0] || <PersonIcon sx={{ fontSize: 36, color: '#1a237e' }} />)}
            </Avatar>

            <Typography variant="h6" fontWeight={700}>
              {user?.name || '未知用户'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              @{user?.username || '--'}
            </Typography>
            <Chip
              label={user?.role || '盘点员'}
              size="small"
              color="primary"
              variant="outlined"
              sx={{ mt: 0.5 }}
            />
          </Stack>

          <Divider sx={{ my: 2 }} />

          {/* 详细信息 */}
          <Stack spacing={0.5}>
            <InfoRow icon={<BadgeIcon fontSize="small" />} label="ID" value={user?.id || '--'} />
            <InfoRow icon={<BusinessIcon fontSize="small" />} label="部门" value={user?.department || '--'} />
            <InfoRow icon={<PhoneIcon fontSize="small" />} label="手机" value={user?.mobile || '--'} />
            <InfoRow icon={<FingerprintIcon fontSize="small" />} label="钉钉" value={user?.dingtalkUserId || '--'} />
          </Stack>
        </CardContent>
      </Card>

      {/* 管理员设置 */}
      <Button
        variant="outlined"
        fullWidth
        startIcon={<SettingsIcon />}
        onClick={() => setAdminDialogOpen(true)}
        sx={{ py: 1.3, borderRadius: '12px', textTransform: 'none' }}
      >
        管理员设置
      </Button>

      {/* 退出登录 */}
      <Button
        variant="outlined"
        color="error"
        fullWidth
        startIcon={<LogoutIcon />}
        onClick={handleLogout}
        sx={{ py: 1.3, borderRadius: '12px' }}
      >
        退出登录
      </Button>

      {/* 底部版权 */}
      <Typography variant="caption" color="text.disabled" textAlign="center" display="block">
        {APP_VERSION}
      </Typography>
      <Typography variant="caption" color="text.disabled" textAlign="center" display="block" sx={{ opacity: 0.6 }}>
        {RELEASE_NOTES}
      </Typography>

      {/* 管理员配置弹窗 */}
      <AdminConfigDialog open={adminDialogOpen} onClose={() => setAdminDialogOpen(false)} />
    </div>
  );
}