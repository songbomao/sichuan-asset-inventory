import { useState, useEffect, useRef, useCallback } from 'react';
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
import InputAdornment from '@mui/material/InputAdornment';
import SearchIcon from '@mui/icons-material/Search';
import CircularProgress from '@mui/material/CircularProgress';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import dd from 'dingtalk-jsapi';
import { ensureDingtalkConfig, type DingtalkJsapiConfig } from '../utils/ddConfig';
import { getAdminUsers, setAdminUsers, searchDingtalkUsers, type AdminUser, type DingtalkSearchUser } from '../api/admin';

interface Props {
  open: boolean;
  onClose: () => void;
}

interface PickedUser {
  name: string;
  emplId: string;
  selectDeptName?: string;
  department?: string;
  phone?: string;
}

export default function AdminConfigDialog({ open, onClose }: Props) {
  const [users, setUsers] = useState<AdminUser[]>(getAdminUsers());
  const [keyword, setKeyword] = useState('');
  const [candidates, setCandidates] = useState<PickedUser[]>([]);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [picking, setPicking] = useState(false);
  const [searching, setSearching] = useState(false);
  const [diagnosis, setDiagnosis] = useState<string[]>([]);
  const [lastConfig, setLastConfig] = useState<DingtalkJsapiConfig | null>(null);

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** 组件打开时做一次环境诊断 */
  useEffect(() => {
    if (!open) return;
    const lines: string[] = [];
    lines.push(`dd 对象是否存在: ${typeof dd !== 'undefined' ? '是' : '否'}`);
    lines.push(`dd.config 是否存在: ${typeof dd?.config === 'function' ? '是' : '否'}`);
    lines.push(`dd.biz.contact.complexPicker 是否存在: ${typeof (dd as any)?.biz?.contact?.complexPicker === 'function' ? '是' : '否'}`);
    try {
      const env = (dd as any).env;
      lines.push(`dd.env: ${env ? JSON.stringify(env) : '无'}`);
    } catch {
      lines.push('dd.env: 读取失败');
    }
    setDiagnosis(lines);
  }, [open]);

  /** 调起钉钉组织架构选人 */
  const handleOpenPicker = async () => {
    setPicking(true);
    setMsg(null);
    let cfg: DingtalkJsapiConfig | undefined;
    try {
      const configResult = await ensureDingtalkConfig();
      if (!configResult.ok) {
        setMsg({
          type: 'error',
          text: `钉钉 JSAPI 鉴权失败：${configResult.error || '未知错误'}。请确认当前在钉钉内打开，或刷新后重试。`,
        });
        setPicking(false);
        return;
      }
      cfg = configResult.config;
      setLastConfig(cfg || null);

      if (typeof (dd as any).biz?.contact?.complexPicker !== 'function') {
        setMsg({
          type: 'error',
          text: '当前环境不支持钉钉组织架构选人，请使用上方「输入姓名搜索」方式添加管理员。',
        });
        setPicking(false);
        return;
      }

      (dd as any).biz.contact.complexPicker({
        title: '选择管理员',
        multiple: false,
        responseUserOnly: true,
        startWithDepartmentId: 0,
        isNeedSearch: true,
        onSuccess: (result: { users?: PickedUser[] }) => {
          if (result?.users && result.users.length > 0) {
            const u = result.users[0];
            addUser({
              dingtalkUserId: u.emplId,
              name: u.name,
              department: u.selectDeptName || u.department,
            });
          }
          setPicking(false);
        },
        onFail: (err: { errorCode?: number | string; errorMessage?: string; message?: string; [k: string]: unknown }) => {
          console.warn('钉钉选人失败:', err);
          const detail = err?.errorMessage || err?.message || JSON.stringify(err);
          let envInfo = '';
          try {
            const env = (dd as any).env;
            if (env) {
              envInfo = `；dd.env=${JSON.stringify(env)}`;
            }
          } catch {
            envInfo = '；dd.env=读取失败';
          }
          const configHint = cfg
            ? `（corpId=${cfg.corpId}，agentId=${cfg.agentId}${envInfo}）`
            : '';
          setMsg({
            type: 'error',
            text: `钉钉选人失败：${detail}${configHint}。当前钉钉账号可能未切换到「中通服」企业，导致组织架构选人无法使用；建议直接改用上方「输入姓名搜索」添加管理员（该方式已验证可用）。`,
          });
          setPicking(false);
        },
      });
    } catch (e) {
      console.warn('钉钉选人失败:', e);
      const detail = e instanceof Error ? e.message : JSON.stringify(e);
      setMsg({ type: 'error', text: `钉钉选人失败：${detail}` });
      setPicking(false);
    }
  };

  /** 添加用户到管理员列表 */
  const addUser = (u: AdminUser) => {
    if (users.some((x) => x.dingtalkUserId === u.dingtalkUserId)) {
      setMsg({ type: 'error', text: '该管理员已存在' });
      return;
    }
    const next = [...users, u];
    setUsers(next);
    setAdminUsers(next);
    setMsg({
      type: 'success',
      text: `已添加：${u.name}${u.department ? `（${u.department}）` : ''}`,
    });
    setKeyword('');
    setCandidates([]);
  };

  /** 从输入框搜索钉钉用户（debounce） */
  useEffect(() => {
    const k = keyword.trim();
    if (!k) {
      setCandidates([]);
      return;
    }
    if (k.length < 2) {
      setCandidates([]);
      return;
    }

    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      setMsg(null);
      try {
        const list = await searchDingtalkUsers(k);
        setCandidates(
          list.map((u) => ({
            name: u.name,
            emplId: u.userId,
            department: u.department,
            phone: u.mobile,
          })),
        );
        if (list.length === 0) {
          setMsg({ type: 'error', text: '未找到匹配用户，请尝试更完整姓名或使用「从钉钉组织架构选择」。' });
        }
      } catch (e) {
        console.warn('搜索用户失败:', e);
        const msg = e instanceof Error ? e.message : '搜索失败';
        setMsg({ type: 'error', text: `搜索失败：${msg}` });
        setCandidates([]);
      } finally {
        setSearching(false);
      }
    }, 400);

    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [keyword]);

  /** 从候选结果添加 */
  const handleAddFromCandidate = (u: PickedUser) => {
    addUser({
      dingtalkUserId: u.emplId,
      name: u.name,
      department: u.selectDeptName || u.department,
      phone: u.phone,
    });
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
            label="输入姓名从钉钉通讯录搜索"
            size="small"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="输入 2 个及以上字符开始搜索"
            fullWidth
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  {searching ? (
                    <CircularProgress size={16} />
                  ) : (
                    <SearchIcon fontSize="small" color="action" />
                  )}
                </InputAdornment>
              ),
            }}
          />

          {keyword.trim().length > 0 && keyword.trim().length < 2 && (
            <Typography variant="caption" color="text.secondary">
              请至少输入 2 个字符
            </Typography>
          )}

          {searching && (
            <Typography variant="caption" color="text.secondary">
              正在搜索钉钉通讯录，大型企业可能需要 3–5 秒，请稍候…
            </Typography>
          )}

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
            <Alert severity={msg.type} sx={{ fontSize: '0.85rem', wordBreak: 'break-all', whiteSpace: 'pre-wrap' }} onClose={() => setMsg(null)}>
              {msg.text}
            </Alert>
          )}

          {/* 候选结果（搜索或选人回调） */}
          {candidates.length > 0 && (
            <Stack spacing={1}>
              <Typography variant="caption" color="text.secondary">
                搜索结果（点击添加）
              </Typography>
              {candidates.map((u) => (
                <Button
                  key={u.emplId}
                  variant="outlined"
                  size="small"
                  onClick={() => handleAddFromCandidate(u)}
                  sx={{ justifyContent: 'flex-start', textTransform: 'none', borderRadius: '8px', py: 1 }}
                >
                  <Stack alignItems="flex-start" spacing={0.25}>
                    <Typography variant="body2" fontWeight={600}>
                      {u.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {u.selectDeptName || u.department || '未知部门'}
                      {u.phone ? ` · ${u.phone}` : ''}
                    </Typography>
                  </Stack>
                </Button>
              ))}
            </Stack>
          )}

          {keyword.trim().length >= 2 && !searching && candidates.length === 0 && !msg && (
            <Typography variant="caption" color="text.secondary" textAlign="center">
              未找到匹配用户，请尝试使用「从钉钉组织架构选择」
            </Typography>
          )}

          {/* 管理员列表 */}
          <Typography variant="subtitle2" fontWeight={600}>
            已选管理员
          </Typography>
          {users.length === 0 ? (
            <Typography color="text.secondary" textAlign="center" sx={{ py: 2 }}>
              暂无管理员，请搜索或从钉钉组织架构选择
            </Typography>
          ) : (
            <Stack spacing={1}>
              {users.map((u) => (
                <Stack
                  key={u.dingtalkUserId}
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  sx={{ px: 1.5, py: 1, bgcolor: 'grey.50', borderRadius: 1.5 }}
                >
                  <Stack spacing={0.25}>
                    <Typography variant="body2" fontWeight={600}>
                      {u.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {u.department ? `${u.department} · ` : ''}
                      {u.phone ? `${u.phone} · ` : ''}
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

          {/* 诊断信息（可折叠） */}
          <Accordion elevation={0} sx={{ bgcolor: 'transparent' }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="caption" color="text.secondary">
                钉钉环境诊断信息
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={0.5}>
                {diagnosis.map((line, idx) => (
                  <Typography key={idx} variant="caption" color="text.secondary" className="break-all">
                    {line}
                  </Typography>
                ))}
                {lastConfig && (
                  <Typography variant="caption" color="text.secondary" className="break-all">
                    最后鉴权配置：corpId={lastConfig.corpId}，agentId={lastConfig.agentId}
                  </Typography>
                )}
              </Stack>
            </AccordionDetails>
          </Accordion>
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
