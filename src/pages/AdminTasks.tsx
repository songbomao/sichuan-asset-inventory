import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '@mui/material/Card';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import Skeleton from '@mui/material/Skeleton';
import Alert from '@mui/material/Alert';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Box from '@mui/material/Box';
import Autocomplete from '@mui/material/Autocomplete';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import AddIcon from '@mui/icons-material/Add';
import SendIcon from '@mui/icons-material/Send';
import CloseIcon from '@mui/icons-material/Close';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import HistoryIcon from '@mui/icons-material/History';
import DeleteIcon from '@mui/icons-material/Delete';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import {
  getAdminTaskList,
  createTask,
  dispatchTask,
  deleteTask,
  getSyncStatus,
  getInventoryOptions,
  getDingtalkDepartments,
  getDingtalkSubDepartments,
  previewAssetsByCategories,
  previewPersonnelByDepartments,
  compareAssets,
  validateCategoryResponsibles,
  pollNotifyJob,
  type AdminTaskItem,
  type CreateTaskParams,
  type CreateTaskErrorDetail,
  type InventoryOptionsResult,
  type SyncStatusResult,
  type DingtalkDepartmentNode,
  type PreviewAssetItem,
  type PreviewPersonnelItem,
  type CompareAssetsResult,
  type CategoryResponsibleCheckResult,
} from '../api/admin';
import { useAuth } from '../contexts/AuthContext';
import AssetSyncCompare from './AssetSyncCompare';
import AssetLocalTable from './AssetLocalTable';
import DeadlinePicker from '../components/DeadlinePicker';

const scopeTypeOptions = [
  { value: 'all', label: '全部资产' },
  { value: 'by_dept', label: '按资产责任人' },
  { value: 'by_category', label: '按盘点类别' },
  { value: 'by_org', label: '按组织' },
  { value: 'by_cost_center', label: '按成本中心' },
];

/**
 * 根据任务当前节点计算卡片状态展示（覆盖三个真实节点：
 * 盘点完成归档 > 报告生成 > 盘点中 > 已取消；其余回退到原始 status）。
 */
function getStatusMeta(task: AdminTaskItem): { label: string; color: 'default' | 'primary' | 'success' | 'warning' | 'error' } {
  if (task.archiveTime) return { label: '盘点完成归档', color: 'success' };
  if (task.reportTime) return { label: '报告生成', color: 'warning' };
  if (task.status === 'running') return { label: '盘点中', color: 'primary' };
  if (task.status === 'cancelled') return { label: '已取消', color: 'error' };
  return { label: task.status, color: 'default' };
}

/** 将日期格式化为 yyyy-MM-dd HH:mm:ss（无效值回退 '--'） */
function formatDateTime(date?: string | null): string {
  if (!date) return '--';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '--';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/** 紫色实心按钮统一样式：保证各种状态下文字均为白色、背景为紫色 */
const purpleContainedSx = {
  borderRadius: '10px',
  textTransform: 'none',
  whiteSpace: 'nowrap',
  bgcolor: '#7b1fa2',
  color: '#fff',
  '&:hover': { bgcolor: '#6a1b9a', color: '#fff' },
  '&:active': { bgcolor: '#6a1b9a', color: '#fff' },
  '&:focus': { color: '#fff' },
  '&.Mui-focusVisible': { color: '#fff' },
  '&.Mui-disabled': { bgcolor: '#7b1fa2', color: 'rgba(255,255,255,0.7)' },
};

/** 按当前年份生成 5 类任务名称预设 */
function buildPresetNames(year: number): { value: string; label: string }[] {
  const month = new Date().getMonth() + 1;
  const quarter = Math.floor((month - 1) / 3) + 1;
  return [
    { value: `${year}年${month}月月度盘点`, label: `${year}年${month}月月度盘点` },
    { value: `${year}年Q${quarter}季度盘点`, label: `${year}年Q${quarter}季度盘点` },
    { value: `${year}年上半年盘点`, label: `${year}年上半年盘点` },
    { value: `${year}年度盘点`, label: `${year}年度盘点` },
    { value: '专项盘点', label: '专项盘点' },
  ];
}

/** 新建任务 Dialog 本地表单（比提交参数多几个维度字段） */
interface DialogForm {
  /** 任务名称（可选，允许为空，空时后端生成默认名） */
  TaskName: string;
  /** 盘点方式：by_dept | by_category */
  method: 'by_dept' | 'by_category' | '';
  /** 选中的盘点类别名称（by_category 时使用） */
  categories: string[];
  /** by_category 精确选中的资产编码（关闭预览时清空，空数组视为"全选"） */
  selectedAssetCodes: string[];
  /** by_dept 精确选中的人员姓名（关闭预览时清空，空数组视为"全选"） */
  selectedPersonNames: string[];
  NeedReview: boolean;
  ReviewRatio: number;
  Deadline: string;
  CreatedBy: string;
}

const defaultForm: DialogForm = {
  TaskName: '',
  method: '',
  categories: [],
  selectedAssetCodes: [],
  selectedPersonNames: [],
  NeedReview: false,
  ReviewRatio: 0.3,
  Deadline: '',
  CreatedBy: '',
};

export default function AdminTasks() {
  const [tasks, setTasks] = useState<AdminTaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<'tasks' | 'sync' | 'asset'>('tasks');
  /** 切换 Tab 时自增，用于驱动子模块（如「资产对比同步」）自动刷新 */
  const [refreshNonce, setRefreshNonce] = useState(0);

  // 数据同步状态（下达任务前置校验，不再渲染 Alert，仅用于按钮就绪回退）
  const [syncStatus, setSyncStatus] = useState<SyncStatusResult | null>(null);

  // 切换「盘点任务管理」Tab 时自动差异对比检查的结果提示
  const [compareCheck, setCompareCheck] = useState<{ type: 'success' | 'warning' | 'info'; msg: string } | null>(null);
  const [compareChecking, setCompareChecking] = useState(false);
  /** 最近一次差异对比的完整结果（含样例明细，用于一致性拦截弹窗展示） */
  const [compareResult, setCompareResult] = useState<CompareAssetsResult | null>(null);
  /** 校验①：SAP 与本地数据不一致时，点击「新建任务」弹出的拦截弹窗 */
  const [consistencyBlockOpen, setConsistencyBlockOpen] = useState(false);

  // 下达任务的页面级反馈
  const [dispatchMsg, setDispatchMsg] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // 删除任务：待确认的任务 + 删除中状态
  const [deleteTarget, setDeleteTarget] = useState<AdminTaskItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  // 仅管理员可进入任务管理
  if (!user?.isAdmin) {
    return (
      <div className="p-4">
        <Alert severity="warning">无权限：仅管理员可进入任务管理。</Alert>
      </div>
    );
  }

  /* ---- 新建任务 Dialog ---- */
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<DialogForm>({ ...defaultForm });
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  /** 后台异步推送进度提示（创建/下达/删除任务成功后，notifyJob 轮询完成后的静默一次性提示） */
  const [notifyMsg, setNotifyMsg] = useState<{ type: 'success' | 'warning' | 'error'; msg: string } | null>(null);
  /** 创建任务后端校验拦截（empty_user / match_failed / responsible_person_anomaly）的结构化明细弹窗 */
  const [validationError, setValidationError] = useState<CreateTaskErrorDetail | null>(null);
  /** 校验②：by_category 确认创建前责任人完整性预校验拦截（缺失/无效责任人）的结构化明细弹窗 */
  const [categoryCheckError, setCategoryCheckError] = useState<CategoryResponsibleCheckResult | null>(null);
  const [inventoryOptions, setInventoryOptions] = useState<InventoryOptionsResult>({ departments: [], categories: [] });
  const [optionsLoading, setOptionsLoading] = useState(false);

  /* 合并选人弹窗：部门树 + 人员多选（替代原独立的部门弹窗 / 人员预览弹窗） */
  const [personPickerOpen, setPersonPickerOpen] = useState(false);
  const [deptTree, setDeptTree] = useState<DingtalkDepartmentNode[]>([]);
  const [expandedDepts, setExpandedDepts] = useState<Set<number>>(new Set());
  const [loadingDeptTree, setLoadingDeptTree] = useState(false);
  const [deptBusy, setDeptBusy] = useState(false);
  /** 选中的部门：deptId(number) -> name(string) */
  const [selectedDeptMap, setSelectedDeptMap] = useState<Record<number, string>>({});

  /* 类别资产预览（全屏 Dialog + 精确多选） */
  const [assetPreviewOpen, setAssetPreviewOpen] = useState(false);
  const [assetKeyword, setAssetKeyword] = useState('');
  const [assetList, setAssetList] = useState<PreviewAssetItem[]>([]);
  const [assetTotal, setAssetTotal] = useState(0);
  const [assetLoading, setAssetLoading] = useState(false);
  const [assetSelected, setAssetSelected] = useState<Set<string>>(new Set());
  const [assetPage, setAssetPage] = useState(1);
  const ASSET_PAGE_SIZE = 50;
  const [assetSelectingAll, setAssetSelectingAll] = useState(false);

  /** 拉取资产预览列表（按类别 + 关键字过滤，重置到第一页） */
  const fetchAssetPreview = useCallback(
    async (keyword?: string, page = 1) => {
      if (form.categories.length === 0) return;
      setAssetLoading(true);
      try {
        const res = await previewAssetsByCategories({
          categoryNames: form.categories,
          keyword,
          page,
          pageSize: ASSET_PAGE_SIZE,
        });
        setAssetList(res.list ?? []);
        setAssetTotal(res.total ?? 0);
        setAssetPage(page);
      } catch (err) {
        console.error('预览资产失败', err);
        setAssetList([]);
        setAssetTotal(0);
      } finally {
        setAssetLoading(false);
      }
    },
    [form.categories],
  );

  /** 打开资产预览时初始化选中集合（回显已选） */
  const openAssetPreview = () => {
    setAssetSelected(new Set(form.selectedAssetCodes));
    setAssetKeyword('');
    setAssetPreviewOpen(true);
    void fetchAssetPreview('', 1);
  };

  /** 全选资产：若当前列表未覆盖全部，则拉取全部页数据后再选中 */
  const handleSelectAllAssets = useCallback(async () => {
    if (assetList.length >= assetTotal) {
      setAssetSelected(new Set(assetList.map((i) => i.assetCode)));
      return;
    }
    setAssetSelectingAll(true);
    try {
      const res = await previewAssetsByCategories({
        categoryNames: form.categories,
        keyword: assetKeyword,
        page: 1,
        pageSize: Math.max(assetTotal, 1000),
      });
      setAssetSelected(new Set((res.list ?? []).map((i) => i.assetCode)));
    } catch (err) {
      console.error('全选加载资产失败', err);
    } finally {
      setAssetSelectingAll(false);
    }
  }, [assetList, assetTotal, form.categories, assetKeyword]);

  /* 人员预览状态已并入 personPickerOpen 合并选人弹窗 */
  const [personKeyword, setPersonKeyword] = useState('');
  const [personList, setPersonList] = useState<PreviewPersonnelItem[]>([]);
  const [personTotal, setPersonTotal] = useState(0);
  const [personLoading, setPersonLoading] = useState(false);
  const [personSelected, setPersonSelected] = useState<Set<string>>(new Set());

  /**
   * 主弹窗「本次盘点数量」所需的部门人员列表（与选人弹窗的人员列表分离，
   * 主弹窗关闭时部门变化也需实时计算，故在外部单独拉取并缓存）。
   */
  const [deptPersonList, setDeptPersonList] = useState<PreviewPersonnelItem[]>([]);

  /** 拉取人员预览列表（按已选部门） */
  const fetchPersonPreview = useCallback(async () => {
    const deptIds = Object.keys(selectedDeptMap).map(Number);
    if (deptIds.length === 0) return;
    setPersonLoading(true);
    try {
      const res = await previewPersonnelByDepartments({ deptIds });
      setPersonList(res.list ?? []);
      setPersonTotal(res.total ?? 0);
      } catch (err) {
        console.error('预览人员失败', err);
        setPersonList([]);
        setPersonTotal(0);
      } finally {
      setPersonLoading(false);
    }
  }, [selectedDeptMap]);

  /** 打开合并选人弹窗：初始化已选人员集合（回显已选），部门树与人员列表在弹窗内加载 */
  const openPersonPicker = () => {
    setPersonSelected(new Set(form.selectedPersonNames));
    setPersonPickerOpen(true);
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

  /** 展开/收起部门（首次展开时懒加载直接子部门） */
  const toggleExpand = async (node: DingtalkDepartmentNode) => {
    if (expandedDepts.has(node.deptId)) {
      setExpandedDepts((prev) => {
        const next = new Set(prev);
        next.delete(node.deptId);
        return next;
      });
      return;
    }
    if (node.children.length === 0) {
      try {
        const subs = await getDingtalkSubDepartments(node.deptId);
        const children = subs.map((s) => ({ deptId: s.deptId, name: s.name, parentId: s.parentId, children: [] }));
        setDeptTree((prev) => updateDeptChildren(prev, node.deptId, children));
      } catch {
        // 加载失败保持为空，下次可重试
      }
    }
    setExpandedDepts((prev) => new Set(prev).add(node.deptId));
  };

  /** 勾选/取消勾选部门（仅操作当前节点，避免递归加载整棵子树导致性能极差）。
   * 人员预览/任务创建由后端按部门 ID 递归子部门处理，无需前端预先展开全部后代。 */
  const toggleDept = (node: DingtalkDepartmentNode) => {
    const isSelected = Object.prototype.hasOwnProperty.call(selectedDeptMap, node.deptId);
    const next = { ...selectedDeptMap };
    if (isSelected) {
      delete next[node.deptId];
    } else {
      next[node.deptId] = node.name;
    }
    setSelectedDeptMap(next);
  };

  /** 移除单个已选部门（Chip 删除） */
  const removeDept = (deptId: number) => {
    setSelectedDeptMap((prev) => {
      const next = { ...prev };
      delete next[deptId];
      return next;
    });
  };

  /** 递归渲染部门树节点（带勾选框 + 展开） */
  const renderDeptNode = (node: DingtalkDepartmentNode, depth: number) => {
    const checked = Object.prototype.hasOwnProperty.call(selectedDeptMap, node.deptId);
    const hasChildren = node.children.length > 0;
    const selectedChildCount = node.children.filter((c) =>
      Object.prototype.hasOwnProperty.call(selectedDeptMap, c.deptId),
    ).length;
    const indeterminate = !checked && selectedChildCount > 0;
    const expanded = expandedDepts.has(node.deptId);
    return (
      <Box key={node.deptId}>
        <Stack direction="row" alignItems="center" sx={{ pl: depth * 2 }}>
          <Checkbox
            checked={checked}
            indeterminate={indeterminate}
            onChange={() => void toggleDept(node)}
            disabled={deptBusy}
          />
          <Typography variant="body2" sx={{ flex: 1, fontSize: '0.85rem' }}>{node.name}</Typography>
          {hasChildren && (
            <IconButton size="small" onClick={() => void toggleExpand(node)}>
              {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
            </IconButton>
          )}
        </Stack>
        {expanded && hasChildren && (
          <Box>
            {node.children.map((c) => renderDeptNode(c, depth + 1))}
          </Box>
        )}
      </Box>
    );
  };

  /** 打开合并选人弹窗时加载根部门树 */
  useEffect(() => {
    if (!personPickerOpen) return;
    const load = async () => {
      setLoadingDeptTree(true);
      try {
        const tree = await getDingtalkDepartments();
        setDeptTree(tree);
      } catch {
        setDeptTree([]);
      } finally {
        setLoadingDeptTree(false);
      }
    };
    void load();
  }, [personPickerOpen]);

  /** 合并选人弹窗打开且已选部门时，加载所选部门（含子部门）的全部人员 */
  useEffect(() => {
    if (!personPickerOpen) return;
    if (Object.keys(selectedDeptMap).length === 0) {
      setPersonList([]);
      setPersonTotal(0);
      return;
    }
    void fetchPersonPreview();
  }, [personPickerOpen, selectedDeptMap, fetchPersonPreview]);

  /** #3 主弹窗实时数量（by_category）：类别变化时预取资产总数，写入 assetTotal */
  useEffect(() => {
    if (form.method !== 'by_category' || form.categories.length === 0) return;
    const names = form.categories;
    let cancelled = false;
    previewAssetsByCategories({ categoryNames: names, page: 1, pageSize: 1 })
      .then((res) => {
        if (!cancelled) setAssetTotal(res.total ?? 0);
      })
      .catch(() => {
        if (!cancelled) setAssetTotal(0);
      });
    return () => {
      cancelled = true;
    };
  }, [form.method, form.categories]);

  /** #3 主弹窗实时数量（by_dept）：已选部门变化时拉取人员列表，缓存到 deptPersonList */
  useEffect(() => {
    if (form.method !== 'by_dept') return;
    const deptIds = Object.keys(selectedDeptMap).map(Number);
    if (deptIds.length === 0) {
      setDeptPersonList([]);
      return;
    }
    let cancelled = false;
    previewPersonnelByDepartments({ deptIds })
      .then((res) => {
        if (!cancelled) setDeptPersonList(res.list ?? []);
      })
      .catch(() => {
        if (!cancelled) setDeptPersonList([]);
      });
    return () => {
      cancelled = true;
    };
  }, [form.method, selectedDeptMap]);

  /** #3 计算主弹窗实时盘点数量；未选方式时返回 null（用于隐藏计数行） */
  const computeInventoryCount = (): number | null => {
    if (form.method === 'by_category') {
      return form.selectedAssetCodes.length > 0 ? form.selectedAssetCodes.length : assetTotal;
    }
    if (form.method === 'by_dept') {
      if (form.selectedPersonNames.length > 0) {
        const sel = new Set(form.selectedPersonNames);
        return deptPersonList
          .filter((p) => sel.has(p.name))
          .reduce((sum, p) => sum + (p.assetCount ?? 0), 0);
      }
      return deptPersonList.reduce((sum, p) => sum + (p.assetCount ?? 0), 0);
    }
    return null;
  };

  const presetNames = buildPresetNames(new Date().getFullYear());

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await getAdminTaskList();
      setTasks(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSyncStatus = useCallback(async () => {
    try {
      const s = await getSyncStatus();
      setSyncStatus(s);
    } catch {
      // 获取失败时不阻塞页面，syncReady 保持 false
    }
  }, []);

  /** 切换「盘点任务管理」Tab 时自动跑一次差异对比，并按结果给出提示 */
  const runCompareCheck = useCallback(async () => {
    setCompareCheck(null);
    setCompareChecking(true);
    try {
      const res: CompareAssetsResult = await compareAssets();
      setCompareResult(res);
      const onlyInView = res.summary?.onlyInViewCount ?? 0;
      const onlyInTable = res.summary?.onlyInTableCount ?? 0;
      const different = res.summary?.differentCount ?? 0;
      const diffCount = onlyInView + onlyInTable + different;
      if (diffCount > 0) {
        setCompareCheck({
          type: 'warning',
          msg: `数据存在差异（共 ${diffCount} 条：仅本地 ${onlyInTable} / 仅 SAP视图 ${onlyInView} / 字段不一致 ${different}），请先到「资产对比同步」执行同步操作后再下达任务`,
        });
      } else {
        setCompareCheck({ type: 'success', msg: '数据一致，无需同步，可正常下达任务' });
      }
    } catch {
      setCompareResult(null);
      setCompareCheck({ type: 'info', msg: '差异对比检查失败，请手动执行「资产对比同步」' });
    } finally {
      setCompareChecking(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
    fetchSyncStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchTasks]);

  // 下达任务就绪条件：实时差异对比一致(success)即可下达；
  // 若实时对比发现差异(warning)，即使之前同步过也要先重新同步；
  // 实时对比结果尚未返回时，回退到「是否已完成过同步」(isLatest)。
  const syncReady =
    compareCheck?.type === 'success' ? true :
    compareCheck?.type === 'warning' ? false :
    !!syncStatus?.isLatest;

  /** 打开新建任务弹窗 */
  const openDialog = () => {
    setForm({ ...defaultForm, CreatedBy: user?.name ?? '' });
    setFeedback(null);
    setDialogOpen(true);
    setSelectedDeptMap({});
    setDeptPersonList([]);
    setDeptTree([]);
    setExpandedDepts(new Set());
    setOptionsLoading(true);
    getInventoryOptions()
      .then(setInventoryOptions)
      .catch(() => setInventoryOptions({ departments: [], categories: [] }))
      .finally(() => setOptionsLoading(false));
  };

  /**
   * 校验①：点击「新建任务」时，比对 SAP 系统数据与本地数据。
   * 若已有实时对比结论则直接复用；否则实时跑一次差异对比。
   * 不一致 → 弹出拦截弹窗，禁止继续创建；一致 → 打开新建任务弹窗。
   */
  const handleNewTaskClick = async () => {
    // 已有结论直接复用，避免重复比对
    if (compareCheck?.type === 'warning') {
      setConsistencyBlockOpen(true);
      return;
    }
    if (compareCheck?.type === 'success') {
      openDialog();
      return;
    }
    setCompareChecking(true);
    try {
      const res = await compareAssets();
      setCompareResult(res);
      const onlyInView = res.summary?.onlyInViewCount ?? 0;
      const onlyInTable = res.summary?.onlyInTableCount ?? 0;
      const different = res.summary?.differentCount ?? 0;
      const diffCount = onlyInView + onlyInTable + different;
      if (diffCount > 0) {
        setCompareCheck({
          type: 'warning',
          msg: `数据存在差异（共 ${diffCount} 条：仅本地 ${onlyInTable} / 仅 SAP视图 ${onlyInView} / 字段不一致 ${different}），请先到「资产对比同步」执行同步操作后再下达任务`,
        });
        setConsistencyBlockOpen(true);
        return;
      }
      setCompareCheck({ type: 'success', msg: '数据一致，无需同步，可正常下达任务' });
      openDialog();
    } catch {
      setCompareResult(null);
      setCompareCheck({ type: 'info', msg: '差异对比检查失败，可手动执行「资产对比同步」后再尝试' });
      // 检查失败≠不一致，不强制拦截，但保留提示，允许打开弹窗
      openDialog();
    } finally {
      setCompareChecking(false);
    }
  };

  /**
   * 后台静默跟踪钉钉推送进度：拿到后端返回的 notifyJobId 后，不阻塞 UI、不弹 loading，
   * 仅在轮询完成后用现有 Alert 机制提示一次最终结果（成功 X/Y 人 / 失败名单 / job 错误原因）。
   * 三处 handler 在成功分支追加调用即可，不影响既有的表单校验/列表刷新/关闭弹窗等逻辑。
   */
  const trackNotify = useCallback((notifyJobId: string | undefined, label: string) => {
    if (!notifyJobId) return;
    pollNotifyJob(notifyJobId)
      .then((res) => {
        if (!res.success) {
          setNotifyMsg({
            type: 'error',
            msg: `${label}：钉钉推送失败${res.error ? `（${res.error}）` : '，请稍后重试'}`,
          });
          return;
        }
        if (res.failedCount > 0) {
          const names = res.failedUserNames.slice(0, 5).join('、');
          const more = res.failedUserNames.length > 5 ? ` 等 ${res.failedUserNames.length} 人` : '';
          setNotifyMsg({
            type: 'warning',
            msg: `钉钉通知已发送 ${res.sent}/${res.total} 人；${res.failedCount} 人推送失败：${names}${more}`,
          });
        } else {
          setNotifyMsg({
            type: 'success',
            msg: `钉钉通知已发送 ${res.sent}/${res.total} 人`,
          });
        }
      })
      .catch((err) => {
        setNotifyMsg({
          type: 'error',
          msg: `${label}：推送进度查询失败，${err instanceof Error ? err.message : '未知错误'}`,
        });
      });
  }, []);

  /** 提交新建任务 */
  const handleCreate = async () => {
    if (!form.TaskName.trim()) {
      setFeedback({ type: 'error', msg: '请填写盘点任务名称' });
      return;
    }
    if (!form.method) {
      setFeedback({ type: 'error', msg: '请选择盘点方式' });
      return;
    }
    if (form.method === 'by_dept' && Object.keys(selectedDeptMap).length === 0) {
      setFeedback({ type: 'error', msg: '请选择盘点责任人范围（部门）' });
      return;
    }
    if (form.method === 'by_category' && form.categories.length === 0) {
      setFeedback({ type: 'error', msg: '请选择盘点类别' });
      return;
    }
    if (!form.Deadline) {
      setFeedback({ type: 'error', msg: '请选择截止时间（精确到年月日时分秒）' });
      return;
    }
    if (!form.CreatedBy.trim()) {
      setFeedback({ type: 'error', msg: '创建人不能为空' });
      return;
    }
    setSubmitting(true);
    setFeedback(null);
    try {
      // 校验②：by_category 确认创建前，反向校验所选类别下资产的责任人完整性
      if (form.method === 'by_category') {
        const selectedAssetCodes = (form.selectedAssetCodes.length > 0 && form.selectedAssetCodes.length < assetTotal) ? form.selectedAssetCodes : undefined;
        const check = await validateCategoryResponsibles({ categoryNames: form.categories, selectedAssetCodes });
        if (check.missingCount + check.invalidCount > 0) {
          setCategoryCheckError(check);
          setSubmitting(false);
          return;
        }
      }
      const scopeValues: number[] | string[] =
        form.method === 'by_dept'
          ? Object.keys(selectedDeptMap).map(Number)
          : form.categories;
      const scopeConfig = JSON.stringify({
        scopeType: form.method,
        scopeValues,
        selectedAssetCodes: (form.method === 'by_category' && form.selectedAssetCodes.length > 0 && form.selectedAssetCodes.length < assetTotal) ? form.selectedAssetCodes : undefined,
        selectedPersonNames: form.method === 'by_dept' ? form.selectedPersonNames : undefined,
      });
      const body: CreateTaskParams = {
        TaskName: form.TaskName.trim(),
        ScopeType: form.method,
        ScopeConfig: scopeConfig,
        NeedReview: form.NeedReview,
        CreatedBy: form.CreatedBy.trim(),
      };
      if (form.NeedReview && form.ReviewRatio) body.ReviewRatio = form.ReviewRatio;
      if (form.Deadline) body.Deadline = form.Deadline;

      const r = await createTask(body);
      const failedText = r.failedUserNames?.length ? `；${r.failedUserNames.length} 人未匹配到钉钉（${r.failedUserNames.join('、')}）` : '';
      setFeedback({ type: 'success', msg: `任务创建成功，覆盖 ${r.assetCount} 项资产，已通知 ${r.dispatchedUsers} 人${failedText}` });
      // 后端改为异步推送：拿到 notifyJobId 后后台轮询进度，完成后静默提示一次
      if (r.notifyJobId) trackNotify(r.notifyJobId, '任务创建');
      setTimeout(() => {
        setDialogOpen(false);
        setForm({ ...defaultForm });
        setSelectedDeptMap({});
        fetchTasks();
      }, 1500);
    } catch (err) {
      const detail = (err as Error & { detail?: CreateTaskErrorDetail })?.detail;
      if (detail && (detail.reason === 'empty_user' || detail.reason === 'match_failed' || detail.reason === 'responsible_person_anomaly')) {
        setValidationError(detail);
      } else {
        setFeedback({ type: 'error', msg: err instanceof Error ? err.message : '创建失败' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  /** 下达任务（钉钉推送） */
  const handleDispatch = async (taskId: number) => {
    if (!syncReady) {
      setDispatchMsg({
        type: 'error',
        msg: '数据未同步到最新，请先到「资产对比同步」完成数据同步后再下达任务。',
      });
      return;
    }
    try {
      const r = await dispatchTask(taskId);
      const failedCount = r.failedUserNames?.length ?? 0;
      const failedText = failedCount > 0 ? `；${failedCount} 人未匹配到钉钉（${r.failedUserNames.join('、')}）` : '；全部匹配成功';
      setDispatchMsg({
        type: 'success',
        msg: `已通知 ${r.dispatchedUsers} 人${failedText}`,
      });
      // 后端改为异步推送：拿到 notifyJobId 后后台轮询进度，完成后静默提示一次
      if (r.notifyJobId) trackNotify(r.notifyJobId, '下达任务');
      fetchTasks();
    } catch (err) {
      setDispatchMsg({ type: 'error', msg: err instanceof Error ? err.message : '下达任务失败' });
    }
  };

  /** 删除任务（仅删除指定 taskId，删除后刷新列表不影响其他任务） */
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const delJob = await deleteTask(deleteTarget.id);
      setDispatchMsg({ type: 'success', msg: `任务「${deleteTarget.taskName}」已删除` });
      // 后端改为异步推送：拿到 notifyJobId 后后台轮询取消通知进度，完成后静默提示一次
      if (delJob.notifyJobId) trackNotify(delJob.notifyJobId, '删除任务');
      setDeleteTarget(null);
      fetchTasks();
    } catch (err) {
      setDispatchMsg({ type: 'error', msg: err instanceof Error ? err.message : '删除任务失败' });
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      {/* 版块切换 */}
      <Tabs
        value={tab}
        onChange={(_e, v) => {
          setTab(v);
          setRefreshNonce((n) => n + 1);
          // 选中 Tab 时自动刷新对应模块数据（不弹窗）
          if (v === 'tasks') {
            void fetchTasks();
            void fetchSyncStatus();
            void runCompareCheck();
          }
        }}
        variant="fullWidth"
        sx={{ mb: 1, minHeight: 40, '& .MuiTab-root': { minHeight: 40, textTransform: 'none', fontSize: '0.9rem' } }}
      >
        <Tab value="tasks" label="盘点任务管理" />
        <Tab value="sync" label="资产对比同步" />
        <Tab value="asset" label="固资查询" />
      </Tabs>

      {tab === 'tasks' && (
      <>
      {/* 头部 */}
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm text-gray-500">
          创建和下发盘点任务
        </div>
        <div className="flex gap-1 shrink-0 items-center">
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon />}
            onClick={handleNewTaskClick}
            disabled={compareChecking}
            sx={purpleContainedSx}
          >
            新建盘点
          </Button>
        </div>
      </div>

      {/* 切换 Tab 时自动差异对比检查提示 */}
      {compareChecking && (
        <Alert severity="info" sx={{ fontSize: '0.82rem' }} icon={<CircularProgress size={16} />}>
          正在检查数据差异...
        </Alert>
      )}
      {compareCheck && !compareChecking && (
        <Alert severity={compareCheck.type} sx={{ fontSize: '0.82rem' }}>
          {compareCheck.msg}
        </Alert>
      )}

      {/* 下达任务反馈 */}
      {dispatchMsg && (
        <Alert
          severity={dispatchMsg.type}
          onClose={() => setDispatchMsg(null)}
          sx={{ fontSize: '0.85rem' }}
        >
          {dispatchMsg.msg}
        </Alert>
      )}

      {/* 后台异步推送进度提示（创建/下达/删除任务后，notify 轮询完成的一次性提示） */}
      {notifyMsg && (
        <Alert
          severity={notifyMsg.type}
          onClose={() => setNotifyMsg(null)}
          sx={{ fontSize: '0.85rem' }}
        >
          {notifyMsg.msg}
        </Alert>
      )}

      {/* 错误提示 */}
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ fontSize: '0.85rem' }}>
          {error}
        </Alert>
      )}

      {/* 加载骨架 */}
      {loading &&
        [1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent>
              <Skeleton variant="text" width="60%" height={28} />
              <Skeleton variant="text" width="40%" height={20} />
              <Skeleton variant="text" width="30%" height={20} />
            </CardContent>
          </Card>
        ))}

      {/* 空状态 */}
      {!loading && !error && tasks.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <p className="text-base font-medium">暂无盘点任务</p>
          <p className="text-sm mt-1">点击右上角"新建盘点"开始</p>
        </div>
      )}

      {/* 引导提示 */}
      {!loading && !error && tasks.length > 0 && (
        <Alert severity="info" sx={{ fontSize: '0.8rem', mb: 1 }}>
          点击任务卡片可查看进度看板、复盘管理与盘点报告
        </Alert>
      )}

      {/* 任务卡片列表 */}
      {!loading &&
        tasks.map((task) => {
          const st = getStatusMeta(task);
          return (
            <Card key={task.id} className="glow-border hover:shadow-glow transition-shadow">
              <CardActionArea onClick={() => navigate(`/tasks/${task.id}`)}>
                <CardContent>
                  <div className="flex items-start justify-between mb-2 gap-2">
                    <Typography variant="subtitle1" component="h3" className="font-semibold text-gray-900" sx={{ flex: 1, minWidth: 0 }}>
                      {task.taskName}
                    </Typography>
                    <div className="flex items-center gap-3 shrink-0">
                      <Chip label={st.label} color={st.color} size="small" />
                      <Tooltip title={task.archiveTime || task.status === 'completed' ? '该状态任务不可删除' : '删除任务'}>
                        <span>
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            startIcon={<DeleteIcon fontSize="small" />}
                            disabled={!!task.archiveTime || task.status === 'completed'}
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteTarget(task);
                            }}
                            sx={{ borderRadius: '8px', textTransform: 'none', px: 1 }}
                          >
                            删除
                          </Button>
                        </span>
                      </Tooltip>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-gray-500 mb-3 flex-wrap">
                    <span>范围：{scopeTypeOptions.find((o) => o.value === task.scopeType)?.label ?? task.scopeType}</span>
                    {task.assetCount !== undefined && <span>资产：{task.assetCount}</span>}
                    {task.deadline && <span>截止：{formatDateTime(task.deadline)}</span>}
                    {task.needReview && <span>复盘 {(task.reviewRatio ?? 0.3) * 100}%</span>}
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>{task.createdBy || '--'}{task.createdAt ? ` · ${formatDateTime(task.createdAt)}` : ''}</span>
                    <div className="flex items-center gap-1.5">
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<HistoryIcon />}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/admin/tasks/${task.id}/records`);
                        }}
                        sx={{ borderRadius: '8px', textTransform: 'none' }}
                      >
                        盘点记录
                      </Button>
                      {task.status === 'draft' && (
                        <Tooltip title={!syncReady ? (compareCheck?.type === 'warning' ? '实时对比发现数据差异，请先到「资产对比同步」同步后再下达任务' : '请先完成数据同步后再下达任务') : ''}>
                          <span>
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<SendIcon />}
                              disabled={!syncReady}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDispatch(task.id);
                              }}
                              sx={{ borderRadius: '8px', textTransform: 'none' }}
                            >
                              下达任务
                            </Button>
                          </span>
                        </Tooltip>
                      )}
                    </div>
                  </div>
                </CardContent>
              </CardActionArea>
            </Card>
          );
        })}

      {/* 底部间距 */}
      <div className="h-4" />

      {/* ---- 删除任务确认 Dialog ---- */}
      <Dialog open={!!deleteTarget} onClose={() => !deleting && setDeleteTarget(null)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1.05rem' }}>确认删除任务</DialogTitle>
        <DialogContent sx={{ pt: '8px !important' }}>
          <Typography variant="body2" color="text.secondary">
            即将删除任务「{deleteTarget?.taskName}」。该操作将级联删除此任务下的资产清单与盘点记录，
            <strong>不会影响其他任务</strong>，但删除后不可恢复。
            {deleteTarget?.status === 'running' && (
              <span className="block mt-1 text-orange-600">运行中任务删除后，系统将向任务内所有人员发送「取消盘点」钉钉提醒。</span>
            )}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteTarget(null)} disabled={deleting} sx={{ textTransform: 'none' }}>
            取消
          </Button>
          <Button onClick={handleDelete} color="error" variant="contained" disabled={deleting} sx={{ textTransform: 'none' }}>
            {deleting ? '删除中…' : '确认删除'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ---- 新建任务 Dialog ---- */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        fullWidth
        maxWidth="xs"
        sx={{ '& .MuiDialog-paper': { margin: { xs: 2, sm: 4 } } }}
      >
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1.1rem', pb: 1 }}>新建盘点任务</DialogTitle>
        <DialogContent sx={{ pt: '8px !important' }}>
          <Stack spacing={2}>
            <Autocomplete
              freeSolo
              options={presetNames.map((p) => p.value)}
              value={form.TaskName}
              onChange={(_e, val) => setForm((f) => ({ ...f, TaskName: val ?? '' }))}
              onInputChange={(_e, val) => setForm((f) => ({ ...f, TaskName: val ?? '' }))}
              renderInput={(params) => (
                <TextField {...params} label="任务名称" required size="small" placeholder="请输入盘点任务名称" />
              )}
              fullWidth
            />

            <TextField
              select
              label="盘点方式"
              required
              size="small"
              value={form.method}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  method: e.target.value as 'by_dept' | 'by_category',
                  categories: [],
                  selectedAssetCodes: [],
                  selectedPersonNames: [],
                }))
              }
              fullWidth
            >
              <MenuItem value="by_dept">按资产责任人</MenuItem>
              <MenuItem value="by_category">按盘点类别</MenuItem>
            </TextField>

            {form.method === 'by_dept' && (
              <>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={openPersonPicker}
                  disabled={deptBusy}
                  sx={{ alignSelf: 'flex-start', borderRadius: '8px', textTransform: 'none' }}
                >
                  {Object.keys(selectedDeptMap).length > 0 || form.selectedPersonNames.length > 0
                    ? `已选 ${Object.keys(selectedDeptMap).length} 个部门 / ${form.selectedPersonNames.length} 名责任人`
                    : '选择盘点责任人'}
                </Button>
                {Object.keys(selectedDeptMap).length > 0 && (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {Object.entries(selectedDeptMap).map(([id, name]) => (
                      <Chip
                        key={id}
                        label={name}
                        size="small"
                        onDelete={() => removeDept(Number(id))}
                      />
                    ))}
                  </Box>
                )}
                {form.selectedPersonNames.length > 0 && (
                  <Chip
                    size="small"
                    color="primary"
                    label={`已选 ${form.selectedPersonNames.length} 名责任人`}
                    onDelete={() => setForm((f) => ({ ...f, selectedPersonNames: [] }))}
                  />
                )}
              </>
            )}

            {form.method === 'by_category' && (
              <>
                <Autocomplete
                  multiple
                  options={inventoryOptions.categories.map((c) => c.name)}
                  value={form.categories}
                  onChange={(_e, val) => setForm((f) => ({ ...f, categories: val, selectedAssetCodes: [] }))}
                  renderInput={(params) => (
                    <TextField {...params} label="盘点类别" size="small" placeholder="可多选" />
                  )}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip label={option} size="small" {...getTagProps({ index })} key={option} />
                    ))
                  }
                  disabled={optionsLoading}
                  fullWidth
                />
                {form.categories.length > 0 && (
                  <Box>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={openAssetPreview}
                      sx={{ alignSelf: 'flex-start', borderRadius: '8px', textTransform: 'none', mr: 1 }}
                    >
                      预览资产（{form.categories.length} 个类别）
                    </Button>
                    {form.selectedAssetCodes.length === 0 ? (
                      <Typography variant="caption" color="text.secondary">
                        已选 {form.categories.length} 个类别，点击预览资产
                      </Typography>
                    ) : (
                      <Chip
                        size="small"
                        color="primary"
                        label={`已选 ${form.selectedAssetCodes.length} 项资产`}
                        onDelete={() => setForm((f) => ({ ...f, selectedAssetCodes: [] }))}
                      />
                    )}
                  </Box>
                )}
              </>
            )}

            {/* #3 实时盘点数量 */}
            {(() => {
              const c = computeInventoryCount();
              if (c === null) return null;
              return (
                <Alert severity="info" sx={{ fontSize: '0.85rem', py: 0.5 }}>
                  本次盘点数量：{c} 项
                </Alert>
              );
            })()}

            <DeadlinePicker
              label="截止时间"
              required
              value={form.Deadline}
              onChange={(v) => setForm((f) => ({ ...f, Deadline: v }))}
            />
            <TextField
              label="创建人"
              size="small"
              value={form.CreatedBy}
              disabled
              helperText="默认当前登录用户，不可修改"
              fullWidth
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={form.NeedReview}
                  onChange={(e) => setForm((f) => ({ ...f, NeedReview: e.target.checked }))}
                />
              }
              label="需要复盘"
            />
            {form.NeedReview && (
              <TextField
                label="复盘比例 (0.1~1.0)"
                type="number"
                size="small"
                inputProps={{ min: 0.1, max: 1, step: 0.1 }}
                value={form.ReviewRatio}
                onChange={(e) => setForm((f) => ({ ...f, ReviewRatio: Number(e.target.value) }))}
                fullWidth
              />
            )}
            {feedback && (
              <Alert severity={feedback.type} sx={{ fontSize: '0.85rem' }}>
                {feedback.msg}
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)} color="inherit" sx={{ textTransform: 'none' }}>
            取消
          </Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={submitting}
            sx={purpleContainedSx}
          >
            {submitting ? '创建中...' : '确认创建'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 选择盘点责任人：部门树 + 人员多选，合并为单一界面 */}
      <Dialog
        open={personPickerOpen}
        onClose={() => setPersonPickerOpen(false)}
        fullScreen
        PaperProps={{ sx: { bgcolor: 'background.paper' } }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1.5 }}>
            <Typography variant="subtitle1" fontWeight={700}>选择盘点责任人</Typography>
            <IconButton onClick={() => setPersonPickerOpen(false)} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
          <Divider />
          <Box sx={{ display: 'flex', flex: 1, minHeight: 0 }}>
            {/* 左：部门树（多选 + 懒加载） */}
            <Box sx={{ width: '42%', borderRight: '1px solid', borderColor: 'divider', overflowY: 'auto', py: 1, px: 1.5 }}>
              <Typography variant="caption" color="text.secondary">选择部门（可多选，自动包含子部门）</Typography>
              {loadingDeptTree ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={24} /></Box>
              ) : deptTree.length === 0 ? (
                <Typography color="text.secondary" sx={{ p: 2, fontSize: '0.85rem' }}>暂无部门数据</Typography>
              ) : (
                <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                  {deptTree.map((d) => renderDeptNode(d, 0))}
                </Stack>
              )}
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                {Object.keys(selectedDeptMap).length === 0 ? (
                  <Typography variant="caption" color="text.secondary">尚未选择部门</Typography>
                ) : (
                  Object.entries(selectedDeptMap).map(([id, name]) => (
                    <Chip key={id} label={name} size="small" onDelete={() => removeDept(Number(id))} />
                  ))
                )}
              </Box>
            </Box>
            {/* 右：人员多选（来自所选部门及子部门） */}
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <Box sx={{ px: 2, py: 1.5 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="按姓名搜索人员"
                  value={personKeyword}
                  onChange={(e) => setPersonKeyword(e.target.value)}
                />
              </Box>
              <Divider />
              <Box sx={{ overflowY: 'auto', flexGrow: 1, py: 1, px: 1.5 }}>
                {Object.keys(selectedDeptMap).length === 0 ? (
                  <Typography color="text.secondary" sx={{ p: 2, fontSize: '0.85rem' }}>请先在左侧选择部门，再从本部门及子部门中勾选责任人</Typography>
                ) : personLoading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={24} /></Box>
                ) : personList.length === 0 ? (
                  <Typography color="text.secondary" sx={{ p: 2, fontSize: '0.85rem' }}>该范围暂无人员数据</Typography>
                ) : (
                  <Stack spacing={0.5}>
                    {personList
                      .filter((p) => (personKeyword || '').trim() === '' || p.name.includes((personKeyword || '').trim()))
                      .map((item) => {
                        const checked = personSelected.has(item.name);
                        return (
                          <Box
                            key={item.name}
                            onClick={() =>
                              setPersonSelected((prev) => {
                                const next = new Set(prev);
                                if (next.has(item.name)) next.delete(item.name);
                                else next.add(item.name);
                                return next;
                              })
                            }
                            sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1, py: 1, borderRadius: 1, cursor: 'pointer' }}
                          >
                            <Checkbox checked={checked} onChange={() => {}} sx={{ p: 0.5 }} />
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="body2" sx={{ fontSize: '0.9rem' }}>{item.name}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                负责 {item.assetCount} 项资产
                              </Typography>
                            </Box>
                          </Box>
                        );
                      })}
                  </Stack>
                )}
              </Box>
            </Box>
          </Box>
          <Divider />
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1.5, gap: 1 }}>
            <Typography variant="caption" color="text.secondary">
              已选 {personSelected.size} 名责任人（不选则包含所选部门全部人员）
            </Typography>
            <Button
              variant="contained"
              onClick={() => {
                setForm((f) => ({ ...f, selectedPersonNames: Array.from(personSelected) }));
                setPersonPickerOpen(false);
              }}
              sx={{ borderRadius: '10px', textTransform: 'none', whiteSpace: 'nowrap' }}
            >
              确定（{personSelected.size}）
            </Button>
          </Box>
        </Box>
      </Dialog>

      {/* 资产预览（按类别，精确多选） */}
      <Dialog
        open={assetPreviewOpen}
        onClose={() => setAssetPreviewOpen(false)}
        fullScreen
        PaperProps={{ sx: { bgcolor: 'background.paper' } }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1.5 }}>
            <Typography variant="subtitle1" fontWeight={700}>
              资产预览（已选 {assetSelected.size} / 共 {assetTotal}）
            </Typography>
            <IconButton onClick={() => setAssetPreviewOpen(false)} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
          <Divider />
          <Box sx={{ px: 2, py: 1.5 }}>
            <TextField
              fullWidth
              size="small"
              label="按资产编码 / 名称搜索"
              value={assetKeyword}
              onChange={(e) => {
                setAssetKeyword(e.target.value);
                void fetchAssetPreview(e.target.value, 1);
              }}
            />
          </Box>
          <Divider />
          <Box sx={{ overflowY: 'auto', flexGrow: 1, py: 1, px: 1.5 }}>
            {assetLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress size={24} />
              </Box>
            ) : assetList.length === 0 ? (
              <Typography color="text.secondary" sx={{ p: 2, fontSize: '0.85rem' }}>暂无资产数据</Typography>
            ) : (
              <Stack spacing={0.5}>
                {assetList.map((item) => {
                  const checked = assetSelected.has(item.assetCode);
                  return (
                    <Box
                      key={item.assetCode}
                      onClick={() =>
                        setAssetSelected((prev) => {
                          const next = new Set(prev);
                          if (next.has(item.assetCode)) next.delete(item.assetCode);
                          else next.add(item.assetCode);
                          return next;
                        })
                      }
                      sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1, py: 1, borderRadius: 1, cursor: 'pointer' }}
                    >
                      <Checkbox checked={checked} onChange={() => {}} sx={{ p: 0.5 }} />
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" sx={{ fontSize: '0.9rem' }}>
                          <strong>{item.assetCode}</strong> {item.assetName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {item.userName || '无责任人'} · {item.deptName || '无部门'} · {item.categoryName || '无类别'} · {item.assetTypeName || '无资产类型'}
                        </Typography>
                      </Box>
                    </Box>
                  );
                })}
              </Stack>
            )}
          </Box>
          <Divider />
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1.5, gap: 1 }}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                size="small"
                onClick={() => void handleSelectAllAssets()}
                disabled={assetSelectingAll || assetLoading || assetList.length === 0}
                sx={{ textTransform: 'none' }}
              >
                {assetSelectingAll ? <CircularProgress size={16} sx={{ mr: 0.5 }} /> : null}
                全选
              </Button>
              <Button
                size="small"
                onClick={() => setAssetSelected(new Set())}
                sx={{ textTransform: 'none' }}
              >
                取消全选
              </Button>
            </Box>
            <Button
              variant="contained"
              onClick={() => {
                setForm((f) => ({ ...f, selectedAssetCodes: Array.from(assetSelected) }));
                setAssetPreviewOpen(false);
              }}
              sx={{ borderRadius: '10px', textTransform: 'none', whiteSpace: 'nowrap' }}
            >
              确定（{assetSelected.size}）
            </Button>
          </Box>
        </Box>
      </Dialog>

      {/* 人员预览已合并至「选择盘点责任人」弹窗（personPickerOpen） */}

      {/* 创建任务后端校验拦截明细（empty_user / match_failed / responsible_person_anomaly） */}
      <Dialog
        open={validationError !== null}
        onClose={() => setValidationError(null)}
        fullWidth
        maxWidth="xs"
        sx={{ '& .MuiDialog-paper': { margin: { xs: 2, sm: 4 } } }}
      >
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1.05rem', color: 'error.main', pb: 1 }}>
          创建任务被拦截
        </DialogTitle>
        <DialogContent sx={{ pt: '8px !important' }}>
          {validationError?.reason === 'empty_user' && (
            <Stack spacing={1.5}>
              <Alert severity="error" sx={{ fontSize: '0.85rem' }}>
                以下资产的责任人为空，无法匹配盘点责任人，请补全责任人信息后再创建。
              </Alert>
              <Box sx={{ maxHeight: 320, overflowY: 'auto' }}>
                <Stack spacing={0.5} divider={<Divider flexItem />}>
                  {(validationError.assets ?? []).map((a) => (
                    <Box key={a.assetCode} sx={{ py: 0.5 }}>
                      <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
                        <strong>{a.assetCode}</strong> {a.assetName}
                        {a.deptName ? `（${a.deptName}）` : ''}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              </Box>
              <Typography variant="caption" color="text.secondary">
                共 {validationError.assets?.length ?? 0} 项
              </Typography>
            </Stack>
          )}

          {validationError?.reason === 'match_failed' && (
            <Stack spacing={1.5}>
              <Alert severity="error" sx={{ fontSize: '0.85rem' }}>
                以下责任人无法在钉钉中唯一匹配，请修正责任人信息后再创建。
              </Alert>
              <Box sx={{ maxHeight: 320, overflowY: 'auto' }}>
                <Stack spacing={1.5}>
                  {(validationError.failed ?? []).map((f) => (
                    <Box key={f.userName}>
                      <Typography
                        variant="body2"
                        sx={{ fontSize: '0.85rem', fontWeight: 600, color: 'error.main' }}
                      >
                        责任人「{f.userName}」— {f.type === 'not_found' ? '钉钉中不存在，疑似离职' : '存在多个同名人员，无法唯一确定'}
                      </Typography>
                      <Box sx={{ pl: 1.5, mt: 0.5 }}>
                        {(f.assets ?? []).map((a) => (
                          <Typography key={a.assetCode} variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                            {a.assetCode} {a.assetName}
                          </Typography>
                        ))}
                      </Box>
                    </Box>
                  ))}
                </Stack>
              </Box>
              <Typography variant="caption" color="text.secondary">
                共 {validationError.failed?.length ?? 0} 名责任人待处理
              </Typography>
            </Stack>
          )}

          {validationError?.reason === 'responsible_person_anomaly' && (
            <Stack spacing={1.5}>
              <Alert severity="error" sx={{ fontSize: '0.85rem' }}>
                以下资产的责任人存在异常，请处理后再创建任务。
              </Alert>
              <Box sx={{ maxHeight: 320, overflowY: 'auto' }}>
                <Stack spacing={1} divider={<Divider flexItem />}>
                  {(validationError.anomalies ?? []).map((a, idx) => (
                    <Box key={`${a.assetCode}-${idx}`} sx={{ py: 0.5 }}>
                      <Typography variant="body2" sx={{ fontSize: '0.85rem', fontWeight: 600 }}>
                        {a.assetCode} {a.assetName}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{ fontSize: '0.8rem', color: 'error.main', mt: 0.25 }}
                      >
                        {a.type === 'null' && '责任人：null'}
                        {a.type === 'empty' && '责任人：空'}
                        {a.type === 'not_in_org' && `责任人：${a.currentValue}（不在组织架构）`}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                        {a.suggestion}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              </Box>
              <Typography variant="caption" color="text.secondary">
                共 {validationError.anomalies?.length ?? 0} 项资产待处理
              </Typography>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2 }}>
          <Button
            variant="contained"
            onClick={() => setValidationError(null)}
            sx={{ borderRadius: '10px', textTransform: 'none' }}
          >
            我知道了
          </Button>
        </DialogActions>
      </Dialog>

      {/* ---- 校验①：SAP 与本地数据不一致拦截弹窗 ---- */}
      <Dialog
        open={consistencyBlockOpen}
        onClose={() => setConsistencyBlockOpen(false)}
        fullWidth
        maxWidth="sm"
        sx={{ '& .MuiDialog-paper': { margin: { xs: 2, sm: 4 } } }}
      >
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1.1rem', color: 'error.main', pb: 1 }}>
          数据不一致，禁止创建任务
        </DialogTitle>
        <DialogContent sx={{ pt: '8px !important' }}>
          <Alert severity="error" sx={{ fontSize: '0.85rem', mb: 1.5 }}>
            SAP 系统数据与本地数据存在差异，请先到「资产对比同步」执行同步后再下达盘点任务。
          </Alert>
          {(() => {
            const r = compareResult?.summary;
            const onlyInView = r?.onlyInViewCount ?? 0;
            const onlyInTable = r?.onlyInTableCount ?? 0;
            const different = r?.differentCount ?? 0;
            return (
              <Stack spacing={1.2}>
                <Typography variant="body2">
                  本地表 <strong>{r?.localCount ?? 0}</strong> 条 · SAP 视图 <strong>{r?.viewCount ?? 0}</strong> 条；
                  差异合计 <strong>{onlyInView + onlyInTable + different}</strong> 条
                  （仅本地 {onlyInTable} / 仅 SAP 视图 {onlyInView} / 字段不一致 {different}）。
                </Typography>
                {onlyInTable > 0 && (
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>仅本地存在（{onlyInTable} 条，示例）：</Typography>
                    <Box sx={{ maxHeight: 160, overflowY: 'auto', pl: 1 }}>
                      {(compareResult?.onlyInTable ?? []).slice(0, 20).map((a) => (
                        <Typography key={a.assetCode} variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                          {a.assetCode} {a.assetName}
                        </Typography>
                      ))}
                    </Box>
                  </Box>
                )}
                {onlyInView > 0 && (
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>仅 SAP 视图存在（{onlyInView} 条，示例）：</Typography>
                    <Box sx={{ maxHeight: 160, overflowY: 'auto', pl: 1 }}>
                      {(compareResult?.onlyInView ?? []).slice(0, 20).map((a) => (
                        <Typography key={a.assetCode} variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                          {a.assetCode} {a.assetName}
                        </Typography>
                      ))}
                    </Box>
                  </Box>
                )}
                {different > 0 && (
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>字段不一致（{different} 条，示例）：</Typography>
                    <Box sx={{ maxHeight: 160, overflowY: 'auto', pl: 1 }}>
                      {(compareResult?.different ?? []).slice(0, 20).map((a) => (
                        <Typography key={a.assetCode} variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                          {a.assetCode} {a.assetName}
                          {a.diffs?.length ? `（${a.diffs.map((d) => d.field).join('、')}）` : ''}
                        </Typography>
                      ))}
                    </Box>
                  </Box>
                )}
              </Stack>
            );
          })()}
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2 }}>
          <Button onClick={() => setConsistencyBlockOpen(false)} color="inherit" sx={{ textTransform: 'none' }}>
            我知道了
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              setConsistencyBlockOpen(false);
              setTab('sync');
              setRefreshNonce((n) => n + 1);
            }}
            sx={{ borderRadius: '10px', textTransform: 'none' }}
          >
            去资产对比同步
          </Button>
        </DialogActions>
      </Dialog>

      {/* ---- 校验②：by_category 责任人完整性拦截弹窗 ---- */}
      <Dialog
        open={categoryCheckError !== null}
        onClose={() => setCategoryCheckError(null)}
        fullWidth
        maxWidth="sm"
        sx={{ '& .MuiDialog-paper': { margin: { xs: 2, sm: 4 } } }}
      >
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1.1rem', color: 'error.main', pb: 1 }}>
          责任人信息不完整，禁止创建任务
        </DialogTitle>
        <DialogContent sx={{ pt: '8px !important' }}>
          <Alert severity="error" sx={{ fontSize: '0.85rem', mb: 1.5 }}>
            所选盘点类别下存在责任人缺失或无效（已不在组织/无法唯一匹配）的资产，请通过财辅更正责任人信息后再创建任务。
          </Alert>
          <Stack spacing={1} divider={<Divider flexItem />}>
            <Typography variant="body2">
              共 <strong>{categoryCheckError?.total ?? 0}</strong> 项资产；
              责任人缺失 <strong>{categoryCheckError?.missingCount ?? 0}</strong> 项；
              责任人无效 <strong>{categoryCheckError?.invalidCount ?? 0}</strong> 项。
            </Typography>
            <Typography variant="caption" color="text.secondary">
              [诊断] 后端收到资产编码: <strong>{categoryCheckError?.selectedCount ?? '?'}</strong> 个
              （前·端·已·选·资·产·数: <strong>{form.selectedAssetCodes.length}</strong> · assetTotal: <strong>{assetTotal}</strong>）
            </Typography>
            <Box sx={{ maxHeight: 360, overflowY: 'auto' }}>
              <Stack spacing={0.5}>
                {(categoryCheckError?.list ?? []).map((a, idx) => (
                  <Box key={`${a.assetCode}-${idx}`} sx={{ py: 0.5 }}>
                    <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
                      <strong>{a.assetCode}</strong> {a.assetName}
                      {a.deptName ? `（${a.deptName}）` : ''}
                    </Typography>
                    {a.issue === 'empty' ? (
                      <Typography variant="caption" color="error" sx={{ display: 'block' }}>
                        责任人缺失（user 为空）
                      </Typography>
                    ) : (
                      <Typography variant="caption" color="error" sx={{ display: 'block' }}>
                        责任人「{a.userName}」无效：已不在当前组织（疑似离职）或无法唯一匹配
                      </Typography>
                    )}
                  </Box>
                ))}
              </Stack>
            </Box>
            {categoryCheckError?.truncated && (
              <Typography variant="caption" color="text.secondary">
                仅展示前 {(categoryCheckError.list ?? []).length} 条，完整明细请在财辅系统核对。
              </Typography>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2 }}>
          <Button
            variant="contained"
            onClick={() => setCategoryCheckError(null)}
            sx={{ borderRadius: '10px', textTransform: 'none' }}
          >
            我知道了
          </Button>
        </DialogActions>
      </Dialog>
      </>
      )}

      {tab === 'sync' && <AssetSyncCompare refreshKey={refreshNonce} />}
      {tab === 'asset' && <AssetLocalTable />}
    </div>
  );
}
