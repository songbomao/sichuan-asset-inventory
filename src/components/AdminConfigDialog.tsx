import { useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import { getAdminUsers, setAdminUsers, type AdminUser } from '../api/admin';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function AdminConfigDialog({ open, onClose }: Props) {
  const [users, setUsers] = useState<AdminUser[]>(getAdminUsers());
  const [newId, setNewId] = useState('');
  const [newName, setNewName] = useState('');
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleAdd = () => {
    const id = newId.trim();
    const name = newName.trim();
    if (!id || !name) {
      setMsg({ type: 'error', text: '钉钉 UserID 和姓名不能为空' });
      return;
    }
    // 钉钉 userid 格式校验：纯数字 或 manager\d+
    const validId = /^(\d+|manager\d+)$/;
    if (!validId.test(id)) {
      setMsg({ type: 'error', text: '钉钉 UserID 格式错误（应纯数字或 manager+数字）' });
      return;
    }
    if (users.some((u) => u.dingtalkUserId === id)) {
      setMsg({ type: 'error', text: '该管理员已存在' });
      return;
    }
    const next = [...users, { dingtalkUserId: id, name }];
    setUsers(next);
    setAdminUsers(next);
    setNewId('');
    setNewName('');
    setMsg({ type: 'success', text: `已添加管理员：${name}` });
  };

  const handleDelete = (dingtalkUserId: string) => {
    const next = users.filter((u) => u.dingtalkUserId !== dingtalkUserId);
    setUsers(next);
    setAdminUsers(next);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="xs"
      sx={{ '& .MuiDialog-paper': { margin: { xs: 2, sm: 4 } } }}
    >
      <DialogTitle sx={{ fontWeight: 700, fontSize: '1.1rem', pb: 1 }}>管理员配置</DialogTitle>
      <DialogContent sx={{ pt: '8px !important' }}>
        <Stack spacing={2}>
          {/* 添加表单 */}
          <TextField
            label="钉钉 UserID"
            size="small"
            value={newId}
            onChange={(e) => setNewId(e.target.value)}
            placeholder="例如 06123456789"
            fullWidth
          />
          <TextField
            label="姓名"
            size="small"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="张三"
            fullWidth
          />
          <Button
            variant="contained"
            onClick={handleAdd}
            sx={{ borderRadius: '10px', textTransform: 'none', py: 1 }}
          >
            添加
          </Button>

          {msg && (
            <Alert severity={msg.type} sx={{ fontSize: '0.85rem' }} onClose={() => setMsg(null)}>
              {msg.text}
            </Alert>
          )}

          {/* 管理员列表 */}
          {users.length === 0 ? (
            <Typography color="text.secondary" textAlign="center" sx={{ py: 2 }}>
              暂无管理员，请添加
            </Typography>
          ) : (
            <Stack spacing={1}>
              {users.map((u) => (
                <Stack
                  key={u.dingtalkUserId}
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  sx={{ px: 1, py: 0.5, bgcolor: 'grey.50', borderRadius: 1 }}
                >
                  <Stack spacing={0.25}>
                    <Typography variant="body2" fontWeight={600}>{u.name}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ wordBreak: 'break-all' }}>
                      {u.dingtalkUserId}
                    </Typography>
                  </Stack>
                  <IconButton size="small" onClick={() => handleDelete(u.dingtalkUserId)} color="error">
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Stack>
              ))}
            </Stack>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 2, pb: 2 }}>
        <Button onClick={onClose} variant="contained" sx={{ borderRadius: '10px', textTransform: 'none' }}>
          完成
        </Button>
      </DialogActions>
    </Dialog>
  );
}