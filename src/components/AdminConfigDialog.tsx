import { useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import InputAdornment from '@mui/material/InputAdornment';
import SearchIcon from '@mui/icons-material/Search';
import dd from 'dingtalk-jsapi';
import { ensureDingtalkConfig } from '../utils/ddConfig';
import { getAdminUsers, setAdminUsers, type AdminUser } from '../api/admin';

interface Props {
  open: boolean;
  onClose: () => void;
}

interface PickedUser {
  name: string;
  emplId: string;
  selectDeptName?: string;
}

export default function AdminConfigDialog({ open, onClose }: Props) {
  const [users, setUsers] = useState<AdminUser[]>(getAdminUsers());
  const [keyword, setKeyword] = useState('');
  const [candidates, setCandidates] = useState<PickedUser[]>([]);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [picking, setPicking] = useState(false);

  /** 调起钉钉组织架构选人 */
  const handleOpenPicker = async () => {
    setPicking(true);
    setMsg(null);
    try {
      const configOk = await ensureDingtalkConfig();
      if (!configOk) {
        setMsg({ type: 'error', text: '钉钉 JSAPI 鉴权失败，无法打开选人' });
        setPicking(false);
        return;
      }

      const result = await (dd as any).biz.contact.complexPicker({
        title: '选择管理员',
        multiple: false,
        responseUserOnly: true,
        startWithDepartmentId: 0,
      }) as { users?: PickedUser[] };
      if (result?.users && result.users.length > 0) {
        const u = result.users[0];
        if (users.some((x) => x.dingtalkUserId === u.emplId)) {
          setMsg({ type: 'error', text: '该管理员已存在' });
        } else {
          const next = [...users, { dingtalkUserId: u.emplId, name: u.name }];
          setUsers(next);
          setAdminUsers(next);
          setMsg({ type: 'success', text: `已添加：${u.name}（${u.selectDeptName || '未知部门'}）` });
          setKeyword('');
          setCandidates([]);
        }
      }
    } catch (e) {
      console.warn('钉钉选人失败:', e);
      setMsg({ type: 'error', text: '钉钉选人失败，请重试' });
    } finally {
      setPicking(false);
    }
  };

  /** 按输入框关键字手动搜索（备用：仅展示已有列表过滤） */
  const handleSearch = () => {
    const k = keyword.trim();
    if (!k) {
      setCandidates([]);
      return;
    }
    // 本地过滤：若已选列表中存在匹配项，方便快速删除
    const found = users
      .filter((u) => u.name.includes(k) || u.dingtalkUserId.includes(k))
      .map((u) => ({ name: u.name, emplId: u.dingtalkUserId }));
    setCandidates(found);
  };

  const handleAddFromCandidate = (u: PickedUser) => {
    if (users.some((x) => x.dingtalkUserId === u.emplId)) {
      setMsg({ type: 'error', text: '该管理员已存在' });
      return;
    }
    const next = [...users, { dingtalkUserId: u.emplId, name: u.name }];
    setUsers(next);
    setAdminUsers(next);
    setMsg({ type: 'success', text: `已添加：${u.name}` });
    setKeyword('');
    setCandidates([]);
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
          {/* 搜索 / 选人入口 */}
          <TextField
            label="搜索姓名或选择"
            size="small"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="点击右侧按钮从钉钉组织架构选择"
            fullWidth
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={handleSearch} disabled={picking}>
                    <SearchIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          <Button
            variant="contained"
            onClick={handleOpenPicker}
            disabled={picking}
            startIcon={<AddIcon />}
            sx={{ borderRadius: '10px', textTransform: 'none', py: 1 }}
          >
            {picking ? '选择中...' : '从钉钉组织架构选择'}
          </Button>

          {msg && (
            <Alert severity={msg.type} sx={{ fontSize: '0.85rem' }} onClose={() => setMsg(null)}>
              {msg.text}
            </Alert>
          )}

          {/* 候选结果（本地过滤或选人回调） */}
          {candidates.length > 0 && (
            <Stack spacing={1}>
              <Typography variant="caption" color="text.secondary">搜索结果</Typography>
              {candidates.map((u) => (
                <Button
                  key={u.emplId}
                  variant="outlined"
                  size="small"
                  onClick={() => handleAddFromCandidate(u)}
                  sx={{ justifyContent: 'flex-start', textTransform: 'none', borderRadius: '8px' }}
                >
                  {u.name} · {u.emplId}
                </Button>
              ))}
            </Stack>
          )}

          {/* 管理员列表 */}
          <Typography variant="subtitle2" fontWeight={600}>
            已选管理员
          </Typography>
          {users.length === 0 ? (
            <Typography color="text.secondary" textAlign="center" sx={{ py: 2 }}>
              暂无管理员，请从钉钉组织架构选择
            </Typography>
          ) : (
            <Stack spacing={1}>
              {users.map((u) => (
                <Stack
                  key={u.dingtalkUserId}
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  sx={{ px: 1, py: 0.75, bgcolor: 'grey.50', borderRadius: 1 }}
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
