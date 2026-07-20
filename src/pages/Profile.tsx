import { useState, useEffect } from 'react';
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
import CorporateFareIcon from '@mui/icons-material/CorporateFare';
import PhoneIcon from '@mui/icons-material/Phone';
import FingerprintIcon from '@mui/icons-material/Fingerprint';
import SettingsIcon from '@mui/icons-material/Settings';
import StarIcon from '@mui/icons-material/Star';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import { useAuth } from '../contexts/AuthContext';
import { APP_VERSION, RELEASE_NOTES } from '../config/version';
import { getAdminInfo, bootstrapSuperAdmin, type AdminInfo } from '../api/admin';
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

/** 角色中文标签 */
function roleLabel(role?: string): string {
  if (role === 'superadmin') return '超级管理员';
  if (role === 'admin') return '管理员';
  return '盘点员';
}

/**
 * 个人中心页面
 */
export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, refreshAdmin, logout } = useAuth();
  const [adminDialogOpen, setAdminDialogOpen] = useState(false);
  const [adminInfo, setAdminInfo] = useState<AdminInfo | null>(null);
  const [bootstrapping, setBootstrapping] = useState(false);

  // 拉取当前权限信息（判断是否已初始化管理员、是否超级管理员）
  useEffect(() => {
    getAdminInfo()
      .then(setAdminInfo)
      .catch(() => setAdminInfo(null));
  }, []);

  const handleLogout = () => {
    // 设置退出标记，防止登录页自动触发钉钉免登
    localStorage.setItem('logout_flag', '1');
    logout();
    navigate('/login', { replace: true });
  };

  /** 一键初始化超级管理员（仅当系统尚无管理员时） */
  const handleBootstrap = async () => {
    setBootstrapping(true);
    try {
      await bootstrapSuperAdmin();
      await refreshAdmin();
      const info = await getAdminInfo();
      setAdminInfo(info);
      alert('初始化成功，您已成为超级管理员，现在可以配置其他管理员了。');
    } catch (e) {
      alert(e instanceof Error ? e.message : '初始化失败');
    } finally {
      setBootstrapping(false);
    }
  };

  const isSuper = adminInfo?.isSuper ?? user?.isSuper ?? false;
  const role = user?.role ?? '';

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
              label={roleLabel(role)}
              size="small"
              color={role === 'superadmin' ? 'warning' : role === 'admin' ? 'primary' : 'default'}
              variant="outlined"
              sx={{ mt: 0.5 }}
            />
          </Stack>

          <Divider sx={{ my: 2 }} />

          {/* 详细信息 */}
          <Stack spacing={0.5}>
            <InfoRow icon={<BadgeIcon fontSize="small" />} label="ID" value={user?.id || '--'} />
            <InfoRow icon={<CorporateFareIcon fontSize="small" />} label="公司" value={user?.company || '中通服供应链四川分公司'} />
            <InfoRow icon={<BusinessIcon fontSize="small" />} label="部门" value={user?.department || '--'} />
            <InfoRow icon={<PhoneIcon fontSize="small" />} label="手机" value={user?.mobile || '--'} />
            <InfoRow icon={<FingerprintIcon fontSize="small" />} label="钉钉" value={user?.dingtalkUserId || '--'} />
          </Stack>
        </CardContent>
      </Card>

      {/* 未初始化管理员：超级管理员一键初始化 */}
      {adminInfo && !adminInfo.hasAnyAdmin && (
        <Alert severity="info" sx={{ fontSize: '0.85rem' }}>
          系统尚未设置管理员。点击下方按钮，将<strong>当前账号</strong>设为超级管理员（拥有全部权限，并可继续配置其他管理员）。
        </Alert>
      )}
      {adminInfo && !adminInfo.hasAnyAdmin && (
        <Button
          variant="contained"
          fullWidth
          startIcon={<StarIcon />}
          disabled={bootstrapping}
          onClick={handleBootstrap}
          sx={{ py: 1.3, borderRadius: '12px', textTransform: 'none' }}
        >
          {bootstrapping ? '初始化中...' : '初始化超级管理员'}
        </Button>
      )}

      {/* 管理员配置（仅超级管理员可见） */}
      {isSuper && (
        <Button
          variant="outlined"
          fullWidth
          startIcon={<SettingsIcon />}
          onClick={() => setAdminDialogOpen(true)}
          sx={{ py: 1.3, borderRadius: '12px', textTransform: 'none' }}
        >
          管理员配置
        </Button>
      )}

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
      <Typography variant="caption" color="text.disabled" textAlign="center" display="block" sx={{ mt: 1, opacity: 0.5 }}>
        四川供应链 IT支撑研发中心
      </Typography>

      {/* 管理员配置弹窗 */}
      <AdminConfigDialog
        open={adminDialogOpen}
        onClose={() => setAdminDialogOpen(false)}
        onChanged={async () => {
          await refreshAdmin();
          try { setAdminInfo(await getAdminInfo()); } catch { /* ignore */ }
        }}
      />
    </div>
  );
}
