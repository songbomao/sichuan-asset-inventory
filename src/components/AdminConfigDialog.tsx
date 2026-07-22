import { useState, useEffect, useRef, Fragment } from 'react';
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
import CloseIcon from '@mui/icons-material/Close';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Collapse from '@mui/material/Collapse';
import dd from 'dingtalk-jsapi';
import { ensureDingtalkConfig, type DingtalkJsapiConfig } from '../utils/ddConfig';
import {
  getAdminList,
  addAdmin,
  removeAdmin,
  searchDingtalkUsers,
  getDingtalkDepartments,
  getDingtalkDepartmentUsers,
  getDingtalkSubDepartments,
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
  /** 下钻路径：数组最后一个节点为当前展开（focused）部门；数组为空表示处于根目录（无选中） */
  const [path, setPath] = useState<DingtalkDepartmentNode[]>([]);
  const [focusedDeptUsers, setFocusedDeptUsers] = useState<DingtalkSearchUser[]>([]);
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);

  /** 当前展开（focused）的部门节点：手风琴式，同一时间仅有一个 */
  const focused = path.length > 0 ? path[path.length - 1] : null;

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

  /** 递归更新部门树中某节点的 children（用于懒加载后回填） */
  const updateDeptChildren = (
    nodes: DingtalkDepartmentNode[],
    targetDeptId: number,
    children: DingtalkDepartmentNode[],
  ): DingtalkDepartmentNode[] =>
    nodes.map((n) => {
      if (n.deptId === targetDeptId) return { ...n, children };
      if (n.children && n.children.length > 0) {
        return { ...n, children: updateDeptChildren(n.children, targetDeptId, children) };
      }
      return n;
    });

  /** 懒加载某部门的直接子部门（回填部门树，供就地展开时使用） */
  const loadSubDepartments = async (deptId: number) => {
    try {
      const subs = await getDingtalkSubDepartments(deptId);
      const mapped: DingtalkDepartmentNode[] = subs.map((s) => ({
        deptId: s.deptId,
        name: s.name,
        parentId: s.parentId,
        children: [],
      }));
      setDepartments((prev) => updateDeptChildren(prev, deptId, mapped));
    } catch {
      // 加载失败时保持为空，下次展开可重试
    }
  };

  /** 下钻进入某个部门：将其设为当前展开（focused）节点，同时收起其它（手风琴）。
   *  就地展开其「直属成员」与「子部门列表」，并在尚未加载子部门时懒加载、始终加载直属成员。 */
  const drillInto = (dept: DingtalkDepartmentNode) => {
    setPath((prev) => [...prev, dept]);
    void loadFocusedUsers(dept.deptId);
    if (!dept.children || dept.children.length === 0) {
      void loadSubDepartments(dept.deptId);
    }
  };

  /** 通过面包屑跳转到某一级部门（同时收起其下更深层级，符合手风琴） */
  const jumpTo = (index: number) => {
    const target = path[index];
    if (!target) return;
    setPath(path.slice(0, index + 1));
    void loadFocusedUsers(target.deptId);
  };

  /** 返回根目录（收起所有层级） */
  const collapseToRoot = () => {
    setPath([]);
    setFocusedDeptUsers([]);
  };

  /** 加载某个部门的【直属】用户列表（后端代理，recursive=false 只取直接隶属于该部门的成员） */
  const loadFocusedUsers = async (deptId: number) => {
    setLoadingUsers(true);
    try {
      const users = await getDingtalkDepartmentUsers(deptId, false);
      setFocusedDeptUsers(users);
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
      department: focused?.name ?? u.department,
      mobile: u.mobile,
    });
    setOrgDrawerOpen(false);
  };

  /** 抽屉打开时只加载部门树，不默认加载人员 */
  useEffect(() => {
    if (!orgDrawerOpen) return;
    const load = async () => {
      setLoadingDepartments(true);
      setPath([]); // 重置下钻路径
      setFocusedDeptUsers([]); // 清空旧的人员列表
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

  /** 根目录 / 某一层级下的部门行：点击即就地展开（下钻进入该部门） */
  const renderDeptRow = (dept: DingtalkDepartmentNode) => (
    <ListItemButton
      key={dept.deptId}
      onClick={() => drillInto(dept)}
      sx={{ borderRadius: 1, py: 0.75, px: 1.5, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ width: '100%' }}>
        <Typography variant="body2" fontWeight={500}>{dept.name}</Typography>
        <Typography variant="caption" color="text.secondary">进入 ›</Typography>
      </Stack>
    </ListItemButton>
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

    {/* 后端组织架构选择器（独立全屏 Dialog，避免被外层 Dialog 遮罩压住）
        单棵树就地展开 + 手风琴式下钻：面包屑导航 + 当前部门「直属成员 / 子部门」就地展开 */}
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
        <Box sx={{ overflowY: 'auto', flexGrow: 1, py: 1, px: 1.5 }}>
          {/* 面包屑：根目录 + 逐级下钻路径（点击回退，手风琴自动收起更深层） */}
          <Stack direction="row" spacing={0.5} alignItems="center" sx={{ px: 0.5, py: 1, flexWrap: 'wrap' }}>
            <Button
              size="small"
              onClick={collapseToRoot}
              sx={{ textTransform: 'none', minWidth: 'auto', fontWeight: focused ? 400 : 700 }}
            >
              根目录
            </Button>
            {path.map((node, idx) => (
              <Fragment key={node.deptId}>
                <Typography color="text.secondary" sx={{ fontSize: '0.9rem' }}>›</Typography>
                <Button
                  size="small"
                  onClick={() => jumpTo(idx)}
                  sx={{ textTransform: 'none', minWidth: 'auto', fontWeight: idx === path.length - 1 ? 700 : 400 }}
                >
                  {node.name}
                </Button>
              </Fragment>
            ))}
          </Stack>

          {loadingDepartments ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={24} />
            </Box>
          ) : departments.length === 0 ? (
            <Typography color="text.secondary" sx={{ p: 2, fontSize: '0.85rem' }}>暂无部门数据</Typography>
          ) : focused == null ? (
            /* 根目录：列出顶层部门，点击即就地展开（进入该部门） */
            <Stack spacing={0.5} sx={{ mt: 1 }}>
              {departments.map((dept) => renderDeptRow(dept))}
            </Stack>
          ) : (
            /* 当前展开部门：就地展开「直属成员」与「子部门列表」，用 Collapse 做过渡动画 */
            <Collapse in timeout="auto" key={focused.deptId}>
              <Stack spacing={2} sx={{ mt: 1, px: 0.5 }}>
                {/* 直属成员（点击即添加） */}
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ px: 1 }}>
                    「{focused.name}」直属成员（点击添加）
                  </Typography>
                  {loadingUsers ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                      <CircularProgress size={24} />
                    </Box>
                  ) : focusedDeptUsers.length === 0 ? (
                    <Typography color="text.secondary" sx={{ p: 2, fontSize: '0.85rem' }}>该部门暂无可添加成员</Typography>
                  ) : (
                    <Stack spacing={1} sx={{ mt: 1 }}>
                      {focusedDeptUsers.map((u) => (
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
                              {focused.name}
                              {u.mobile ? ` · ${u.mobile}` : ''}
                            </Typography>
                          </Stack>
                        </Button>
                      ))}
                    </Stack>
                  )}
                </Box>

                {/* 子部门列表：点击子部门即就地展开该子部门（手风琴自动收起其他） */}
                {focused.children && focused.children.length > 0 && (
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ px: 1 }}>
                      子部门（点击进入查看成员）
                    </Typography>
                    <Stack spacing={0.5} sx={{ mt: 1 }}>
                      {focused.children.map((sub) => (
                        <ListItemButton
                          key={sub.deptId}
                          onClick={() => drillInto(sub)}
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
            </Collapse>
          )}
        </Box>
      </Box>
    </Dialog>
    </>
  );
}
