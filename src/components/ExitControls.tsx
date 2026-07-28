import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import IconButton from '@mui/material/IconButton';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import HomeIcon from '@mui/icons-material/Home';
import LogoutIcon from '@mui/icons-material/Logout';
import { useAuth } from '../contexts/AuthContext';

/** 当前角色对应的首页（工作台）路径 */
export function getHomePath(isAdmin: boolean): string {
  return isAdmin ? '/admin/tasks' : '/tasks';
}

/**
 * 退出应用：在钉钉环境调用 dd.biz.navigation.close 关闭微应用并返回钉钉工作台；
 * 非钉钉环境（浏览器调试）给出兜底提示。
 */
export function exitApp(): void {
  try {
    const dd: any = (window as any).dd;
    if (dd && typeof dd.biz?.navigation?.close === 'function') {
      dd.biz.navigation.close({});
      return;
    }
  } catch (e) {
    console.warn('[蜀资点兵] dd.biz.navigation.close 调用失败:', e);
  }
  // 兜底：非钉钉环境无法关闭微应用，提示用户使用系统返回键
  // eslint-disable-next-line no-alert
  alert('当前不在钉钉环境中，请使用系统返回键退出应用。');
}

/** 退出应用按钮（带确认弹窗），可在工作台及各层级页面右上角统一使用 */
export function ExitAppButton() {
  const [open, setOpen] = useState(false);

  const handleConfirm = () => {
    setOpen(false);
    exitApp();
  };

  return (
    <>
      <IconButton
        color="inherit"
        size="small"
        onClick={() => setOpen(true)}
        title="退出应用"
        aria-label="退出应用"
      >
        <LogoutIcon fontSize="small" />
      </IconButton>
      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>退出应用</DialogTitle>
        <DialogContent>
          <DialogContentText>
            确定要退出「蜀资点兵」并返回钉钉工作台吗？
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>取消</Button>
          <Button color="error" variant="contained" onClick={handleConfirm}>
            退出
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

/**
 * 返回工作台按钮（家图标）。点击后使用 replace 落地首页，
 * 避免继续在深层返回栈上累积，用户一次点击即可回到主界面。
 * 返回工作台为非破坏性操作（仍在应用内），无需确认。
 */
export function ReturnHomeButton({ isAdmin }: { isAdmin: boolean }) {
  const navigate = useNavigate();
  return (
    <IconButton
      color="inherit"
      size="small"
      onClick={() => navigate(getHomePath(isAdmin), { replace: true })}
      title="返回工作台"
      aria-label="返回工作台"
    >
      <HomeIcon fontSize="small" />
    </IconButton>
  );
}

/**
 * 页头右侧操作区组合：默认同时提供「返回工作台」与「退出应用」。
 * 工作台首页只需退出应用，可传 showHome={false}。
 */
export function HeaderActions({
  isAdmin,
  showHome = true,
}: {
  isAdmin: boolean;
  showHome?: boolean;
}) {
  return (
    <>
      {showHome && <ReturnHomeButton isAdmin={isAdmin} />}
      <ExitAppButton />
    </>
  );
}
