import { useState, useEffect, useRef } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import StarIcon from '@mui/icons-material/Star';
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
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import CloseIcon from '@mui/icons-material/Close';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import dd from 'dingtalk-jsapi';
import { ensureDingtalkConfig, type DingtalkJsapiConfig } from '../utils/ddConfig';
import {
  getAdminList,
  addAdmin,
  removeAdmin,
  searchDingtalkUsers,
  getDingtalkDepartments,
  getDingtalkDepartmentUsers,
  type AdminUser,
  type DingtalkSearchUser,
  type DingtalkDepartmentNode,
} from '../api/admin';

interface Props {
  open: boolean;
  onClose: () => void;
  /** 配置变更后回调（用于刷新当前用户权限标记） */
  onChanged?: () => void;
}

interface PickedUser {
  name: string;
  emplId: string;
  selectDeptName?: string;
  department?: string;
  phone?: string;
}

export default function AdminConfigDialog({ open, onClose, onChanged }: Props) {
  const [list, setList] = useState<AdminUser[]>([]);
  const [keyword, setKeyword] = useState('');
  const [candidates, setCandidates] = useState<PickedUser[]>([]);
  const [isSuperAdd, setIsSuperAdd] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [picking, setPicking] = useState(false);
  const [searching, setSearching] = useState(false);
  const [diagnosis, setDiagnosis] = useState<string[]>([]);
  const [lastConfig, setLastConfig] = useState<DingtalkJsapiConfig | null>(null);

  /* 后端组织架构选择器（抽屉） */
  const [orgDrawerOpen, setOrgDrawerOpen] = useState(false);
  const [departments, setDepartments] = useState<DingtalkDepartmentNode[]>([]);
  const [selectedDeptId, setSelectedDeptId] = useState<number | null>(null);
  const [selectedDeptName, setSelectedDeptName] = useState<string | null>(null);
  const [selectedDeptChildren, setSelectedDeptChildren] = useState<DingtalkDepartmentNode[]>([]);
  const [expandedDeptIds, setExpandedDeptIds] = useState<Set<number>>(new Set());
  const [deptUsers, setDeptUsers] = useState<DingtalkSearchUser[]>([]);
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** 加载管理员列表（后端） */
  const loadList = async () => {
    try {
      const data = await getAdminList();
      setList(data);
    } catch (e) {
      setMsg({ type: 'error', text: e instanceof Error ? e.message : '加载管理员列表失败' });
    }
  };

  useEffect(() => {
    if (!open) return;
    setMsg(null);
    setKeyword('');
    setCandidates([]);
    loadList();

    // 环境诊断（钉钉选人兜底提示用）
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

  /** 在部门树中按 deptId 查找节点（用于取子部门列表） */
  const findDeptNode = (nodes: DingtalkDepartmentNode[], deptId: number): DingtalkDepartmentNode | null => {
    for (const n of nodes) {
      if (n.deptId === deptId) return n;
      if (n.children && n.children.length > 0) {
        const found = findDeptNode(n.children, deptId);
        if (found) return found;
      }
    }
    return null;
  };

  /** 选中某个部门：设置选中态、在左侧树中展开其自身、加载其直属人员 */
  const selectDept = (dept: DingtalkDepartmentNode) => {
    setSelectedDeptId(dept.deptId);
    setSelectedDeptName(dept.name);
    setSelectedDeptChildren(dept.children || []);
    setExpandedDeptIds((prev) => {
      const next = new Set(prev);
      next.add(dept.deptId);
      return next;
    });
    void loadDepartmentUsers(dept.deptId);
  };

  /** 切换左侧树某个部门节点的展开/折叠（仅控制显示，不加载人员） */
  const toggleExpand = (deptId: number) => {
    setExpandedDeptIds((prev) => {
      const next = new Set(prev);
      if (next.has(deptId)) next.delete(deptId);
      else next.add(deptId);
      return next;
    });
  };

  /** 加载某部门的【直属】用户列表（后端代理，recursive=false 只取直接隶属于该部门的成员） */
  const loadDepartmentUsers = async (deptId: number) => {
    setLoadingUsers(true);
    try {
      const users = await getDingtalkDepartmentUsers(deptId, false);
      setDeptUsers(users);
    } catch (e) {
      setMsg({ type: 'error', text: e instanceof Error ? e.message : '加载部门用户失败' });
    } finally {
      setLoadingUsers(false);
    }
  };

  /** 打开后端组织架构选择器并加载部门树 */
  const openOrgDrawer = () => {
    setOrgDrawerOpen(true);
    setMsg(null);
    setPicking(false);
  };

  /** 调起钉钉组织架构选人（原生 complexPicker 优先，失败自动兜底到后端自定义选择器） */
  const handleOpenPicker = async () => {
    setPicking(true);
    setMsg(null);
    let cfg: DingtalkJsapiConfig | undefined;
    try {
      const configResult = await ensureDingtalkConfig();
      if (!configResult.ok) {
        // 鉴权失败，直接走后端组织架构选择器（与手动输入同样稳定）
        openOrgDrawer();
        return;
      }
      cfg = configResult.config;
      setLastConfig(cfg || null);

      if (typeof (dd as any).biz?.contact?.complexPicker !== 'function') {
        // 非钉钉环境或原生不可用，直接走后端选择器
        openOrgDrawer();
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
            void doAdd({
              dingtalkUserId: u.emplId,
              name: u.name,
              department: u.selectDeptName || u.department,
              mobile: '',
            });
          }
          setPicking(false);
        },
        onFail: (err: { errorCode?: number | string; errorMessage?: string; message?: string; [k: string]: unknown }) => {
          console.warn('钉钉选人失败，自动切换后端组织架构选择器:', err);
          setMsg({ type: 'error', text: '钉钉原生选人失败，已自动切换为后端组织架构选择器，请在下方面板选择。' });
          openOrgDrawer();
        },
      });
    } catch (e) {
      console.warn('钉钉选人失败，自动切换后端组织架构选择器:', e);
      setMsg({ type: 'error', text: '钉钉原生选人失败，已自动切换为后端组织架构选择器，请在下方面板选择。' });
      openOrgDrawer();
    }
  };

  /** 添加管理员（后端） */
  const doAdd = async (u: { dingtalkUserId: string; name: string; department?: string; mobile?: string }) => {
    if (list.some((x) => x.dingtalkUserId === u.dingtalkUserId)) {
      setMsg({ type: 'error', text: '该管理员已存在' });
      return;
    }
    try {
      await addAdmin({
        dingtalkUserId: u.dingtalkUserId,
        name: u.name,
        department: u.department,
        mobile: u.mobile,
        isSuper: isSuperAdd,
      });
      setMsg({
        type: 'success',
        text: `已添加：${u.name}${u.department ? `（${u.department}）` : ''}${isSuperAdd ? '（超级管理员）' : ''}`,
      });
      setKeyword('');
      setCandidates([]);
      await loadList();
      onChanged?.();
    } catch (e) {
      setMsg({ type: 'error', text: e instanceof Error ? e.message : '添加失败' });
    }
  };

  /** 从后端组织架构选择器选中用户后添加并关闭抽屉 */
  const handlePickUser = (u: DingtalkSearchUser) => {
    void doAdd({
      dingtalkUserId: u.userId,
      name: u.name,
      department: selectedDeptName ?? u.department,
      mobile: u.mobile,
    });
    setOrgDrawerOpen(false);
  };

  /** 抽屉打开时只加载部门树，不默认加载人员 */
  useEffect(() => {
    if (!orgDrawerOpen) return;
    const load = async () => {
      setLoadingDepartments(true);
      setSelectedDeptId(null); // 重置选中
      setSelectedDeptName(null);
      setSelectedDeptChildren([]);
      setExpandedDeptIds(new Set());
      setDeptUsers([]); // 清空旧的人员列表
      try {
        const tree = await getDingtalkDepartments();
        setDepartments(tree);
      } catch (e) {
        setMsg({ type: 'error', text: e instanceof Error ? e.message : '加载部门架构失败' });
      } finally {
        setLoadingDepartments(false);
      }
    };
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgDrawerOpen]);

  /** 递归渲染部门树（支持逐级展开/折叠） */
  const renderDepartmentTree = (nodes: DingtalkDepartmentNode[], depth = 0) => (
    <Stack spacing={0.5}>
      {nodes.map((dept) => {
        const hasChildren = dept.children && dept.children.length > 0;
        const expanded = expandedDeptIds.has(dept.deptId);
        const selected = selectedDeptId === dept.deptId;
        return (
          <Stack key={dept.deptId} spacing={0.5}>
            <ListItemButton
              selected={selected}
              onClick={() => selectDept(dept)}
              sx={{ pl: depth * 3 + 2, py: 0.5, borderRadius: 1 }}
            >
              {hasChildren ? (
                <IconButton
                  size="small"
                  sx={{ mr: 0.5, ml: -1, p: 0.25 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleExpand(dept.deptId);
                  }}
                >
                  <ExpandMoreIcon
                    fontSize="small"
                    sx={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
                  />
                </IconButton>
              ) : null}
              <ListItemText
                primary={dept.name}
                primaryTypographyProps={{ fontSize: '0.9rem', fontWeight: selected ? 700 : 400 }}
              />
            </ListItemButton>
            {hasChildren && expanded && renderDepartmentTree(dept.children, depth + 1)}
          </Stack>
        );
      })}
    </Stack>
  );

  /** 从输入框搜索钉钉用户（debounce） */
  useEffect(() => {
    const k = keyword.trim();
    if (!k || k.length < 2) {
      setCandidates([]);
      return;
    }
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      setMsg(null);
      try {
        const found: DingtalkSearchUser[] = await searchDingtalkUsers(k);
        setCandidates(
          found.map((u) => ({
            name: u.name,
            emplId: u.userId,
            department: u.department,
            phone: u.mobile,
          })),
        );
        if (found.length === 0) {
          setMsg({ type: 'error', text: '未找到匹配用户，请尝试更完整姓名。' });
        }
      } catch (e) {
        console.warn('搜索用户失败:', e);
        const m = e instanceof Error ? e.message : '搜索失败';
        setMsg({ type: 'error', text: `搜索失败：${m}` });
        setCandidates([]);
      } finally {
        setSearching(false);
      }
    }, 400);

    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [keyword]);

  const handleDelete = async (dingtalkUserId: string) => {
    try {
      await removeAdmin(dingtalkUserId);
      setMsg({ type: 'success', text: '已删除管理员' });
      await loadList();
      onChanged?.();
    } catch (e) {
      setMsg({ type: 'error', text: e instanceof Error ? e.message : '删除失败' });
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        fullWidth
        maxWidth="xs"
        sx={{ '& .MuiDialog-paper': { margin: { xs: 2, sm: 4 } } }}
      >
      <DialogTitle sx={{ fontWeight: 700, fontSize: '1.1rem', pb: 1 }}>管理员配置（超级管理员）</DialogTitle>
      <DialogContent sx={{ pt: '8px !important' }}>
        <Stack spacing={2}>
          {/* 设为超级管理员 */}
          <FormControlLabel
            control={
              <Checkbox
                checked={isSuperAdd}
                onChange={(e) => setIsSuperAdd(e.target.checked)}
                icon={<StarIcon />}
                checkedIcon={<StarIcon />}
              />
            }
            label="添加为超级管理员（全权限，可继续配置管理员）"
          />

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
                  {searching ? <CircularProgress size={16} /> : <SearchIcon fontSize="small" color="action" />}
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
            <Alert severity={msg.type} sx={{ fontSize: '0.85rem', wordBreak: 'break-all', whiteSpace: 'pre-wrap' }} onClose={() => setMsg(null)}>
              {msg.text}
            </Alert>
          )}

          {/* 候选结果（搜索或选人回调） */}
          {candidates.length > 0 && (
            <Stack spacing={1}>
              <Typography variant="caption" color="text.secondary">搜索结果（点击添加）</Typography>
              {candidates.map((u) => (
                <Button
                  key={u.emplId}
                  variant="outlined"
                  size="small"
                  onClick={() => doAdd({ dingtalkUserId: u.emplId, name: u.name, department: u.selectDeptName || u.department, mobile: u.phone })}
                  sx={{ justifyContent: 'flex-start', textTransform: 'none', borderRadius: '8px', py: 1 }}
                >
                  <Stack alignItems="flex-start" spacing={0.25}>
                    <Typography variant="body2" fontWeight={600}>{u.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {(u.selectDeptName || u.department || '未填写部门')}
                      {u.phone ? ` · ${u.phone}` : ''}
                    </Typography>
                  </Stack>
                </Button>
              ))}
            </Stack>
          )}

          {/* 管理员列表 */}
          <Typography variant="subtitle2" fontWeight={600}>已配置管理员</Typography>
          {list.length === 0 ? (
            <Typography color="text.secondary" textAlign="center" sx={{ py: 2 }}>
              暂无管理员
            </Typography>
          ) : (
            <Stack spacing={1}>
              {list.map((u) => (
                <Stack
                  key={u.dingtalkUserId}
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  sx={{ px: 1.5, py: 1, bgcolor: 'grey.50', borderRadius: 1.5 }}
                >
                  <Stack spacing={0.25}>
                    <Typography variant="body2" fontWeight={600}>
                      {u.name}{u.isSuper ? ' ★' : ''}
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
              <Typography variant="caption" color="text.secondary">钉钉环境诊断信息</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={0.5}>
                {diagnosis.map((line, idx) => (
                  <Typography key={idx} variant="caption" color="text.secondary" className="break-all">{line}</Typography>
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

    {/* 后端组织架构选择器（独立全屏 Dialog，避免被外层 Dialog 遮罩压住） */}
    <Dialog
      open={orgDrawerOpen}
      onClose={() => setOrgDrawerOpen(false)}
      fullScreen
      PaperProps={{ sx: { bgcolor: 'background.paper' } }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1.5 }}>
          <Typography variant="subtitle1" fontWeight={700}>从钉钉组织架构选择</Typography>
          <IconButton onClick={() => setOrgDrawerOpen(false)} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
        <Divider />
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, overflow: 'hidden', flexGrow: 1 }}>
          {/* 左侧部门树 */}
          <Box sx={{ width: { xs: '100%', sm: 220 }, borderRight: { sm: '1px solid' }, borderColor: 'divider', overflowY: 'auto', py: 1, bgcolor: 'grey.50' }}>
            {loadingDepartments ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress size={24} />
              </Box>
            ) : departments.length === 0 ? (
              <Typography color="text.secondary" sx={{ p: 2, fontSize: '0.85rem' }}>暂无部门数据</Typography>
            ) : (
              renderDepartmentTree(departments)
            )}
          </Box>
          {/* 右侧：选中部门的直属成员 + 子部门列表 */}
          <Box sx={{ flexGrow: 1, overflowY: 'auto', py: 1, px: 1.5 }}>
            {selectedDeptId == null ? (
              <Typography color="text.secondary" textAlign="center" sx={{ py: 4 }}>
                请从左侧选择一个部门
              </Typography>
            ) : (
              <Stack spacing={2}>
                {/* 直属成员 */}
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ px: 1 }}>
                    {selectedDeptName ? `「${selectedDeptName}」直属成员（点击添加）` : '直属成员（点击添加）'}
                  </Typography>
                  {loadingUsers ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                      <CircularProgress size={24} />
                    </Box>
                  ) : deptUsers.length === 0 ? (
                    <Typography color="text.secondary" sx={{ p: 2, fontSize: '0.85rem' }}>该部门暂无可添加成员</Typography>
                  ) : (
                    <Stack spacing={1} sx={{ mt: 1 }}>
                      {deptUsers.map((u) => (
                        <Button
                          key={u.userId}
                          variant="outlined"
                          size="small"
                          onClick={() => handlePickUser(u)}
                          sx={{ justifyContent: 'flex-start', textTransform: 'none', borderRadius: '8px', py: 1 }}
                        >
                          <Stack alignItems="flex-start" spacing={0.25}>
                            <Typography variant="body2" fontWeight={600}>{u.name}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {selectedDeptName ?? ''}
                              {u.mobile ? ` · ${u.mobile}` : ''}
                            </Typography>
                          </Stack>
                        </Button>
                      ))}
                    </Stack>
                  )}
                </Box>

                {/* 子部门列表（选中部门时一并记录其 children） */}
                {selectedDeptChildren.length > 0 && (
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ px: 1 }}>
                      子部门（点击进入查看成员）
                    </Typography>
                    <Stack spacing={0.5} sx={{ mt: 1 }}>
                      {selectedDeptChildren.map((sub) => (
                        <ListItemButton
                          key={sub.deptId}
                          onClick={() => selectDept(sub)}
                          sx={{
                            borderRadius: 1,
                            px: 1.5,
                            py: 0.75,
                            border: '1px solid',
                            borderColor: 'divider',
                            bgcolor: 'background.paper',
                          }}
                        >
                          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ width: '100%' }}>
                            <Typography variant="body2">{sub.name}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {sub.children && sub.children.length > 0 ? `${sub.children.length} 个子部门 ›` : '查看成员 ›'}
                            </Typography>
                          </Stack>
                        </ListItemButton>
                      ))}
                    </Stack>
                  </Box>
                )}
              </Stack>
            )}
          </Box>
        </Box>
      </Box>
    </Dialog>
    </>
  );
}
