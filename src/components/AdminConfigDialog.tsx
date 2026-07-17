import { useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';
import Alert from '@mui/material/Alert';
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
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 700, px: { xs: 2, sm: 3 } }}>管理员配置</DialogTitle>
      <DialogContent dividers sx={{ px: { xs: 2, sm: 3 } }}>
        <div className="space-y-4">
          {/* 添加表单 */}
          <div className="space-y-3">
            <TextField
              label="钉钉 UserID"
              fullWidth
              size="small"
              value={newId}
              onChange={(e) => setNewId(e.target.value)}
              placeholder="例如 06123456789"
            />
            <TextField
              label="姓名"
              fullWidth
              size="small"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="张三"
            />
            <Button
              variant="contained"
              fullWidth
              size="small"
              onClick={handleAdd}
              sx={{ borderRadius: '10px', textTransform: 'none' }}
            >
              添加
            </Button>
          </div>

          {msg && (
            <Alert severity={msg.type} sx={{ fontSize: '0.85rem' }} onClose={() => setMsg(null)}>
              {msg.text}
            </Alert>
          )}

          {/* 管理员列表 */}
          {users.length === 0 ? (
            <div className="text-center text-gray-400 text-sm py-4">暂无管理员，请添加</div>
          ) : (
            <List dense>
              {users.map((u) => (
                <ListItem
                  key={u.dingtalkUserId}
                  secondaryAction={
                    <IconButton edge="end" size="small" onClick={() => handleDelete(u.dingtalkUserId)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  }
                >
                  <ListItemText
                    primary={u.name}
                    secondary={u.dingtalkUserId}
                    primaryTypographyProps={{ fontSize: '0.9rem' }}
                    secondaryTypographyProps={{ fontSize: '0.75rem' }}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </div>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} variant="contained" sx={{ borderRadius: '10px', textTransform: 'none' }}>
          完成
        </Button>
      </DialogActions>
    </Dialog>
  );
}