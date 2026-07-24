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
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import SendIcon from '@mui/icons-material/Send';
import SyncIcon from '@mui/icons-material/Sync';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import {
  getAdminTaskList,
  createTask,
  dispatchTask,
  getSyncStatus,
  getScopeOptions,
  type AdminTaskItem,
  type CreateTaskParams,
  type ScopeOptionsResult,
  type SyncStatusResult,
} from '../api/admin';
import { useAuth } from '../contexts/AuthContext';
import AssetSyncCompare from './AssetSyncCompare';
import AssetLocalTable from './AssetLocalTable';

const scopeTypeOptions = [
  { value: 'all', label: '全部资产' },
  { value: 'by_org', label: '按组织' },
  { value: 'by_category', label: '按类别' },
  { value: 'by_cost_center', label: '按成本中心' },
];

const statusMap: Record<string, { label: string; color: 'default' | 'primary' | 'success' | 'warning' | 'error' }> = {
  draft: { label: '草稿', color: 'default' },
  running: { label: '运行中', color: 'primary' },
  completed: { label: '已完成', color: 'success' },
  cancelled: { label: '已取消', color: 'error' },
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

/** 根据三维度选中情况推导 ScopeType（兼容旧字段） */
function deriveScopeType(org: string[], cat: string[], cc: string[]): string {
  if (org.length) return 'by_org';
  if (cat.length) return 'by_category';
  if (cc.length) return 'by_cost_center';
  return 'all';
}

/** 新建任务 Dialog 本地表单（比提交参数多几个维度字段） */
interface DialogForm {
  TaskName: string;
  /** 当前选中的预设（仅用于回填空文本，不直接提交） */
  preset: string;
  orgCodes: string[];
  categoryCodes: string[];
  costCenterCodes: string[];
  NeedReview: boolean;
  ReviewRatio: number;
  Deadline: string;
  CreatedBy: string;
}

const defaultForm: DialogForm = {
  TaskName: '',
  preset: '',
  orgCodes: [],
  categoryCodes: [],
  costCenterCodes: [],
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

  // 数据同步状态（下达任务前置校验）
  const [syncStatus, setSyncStatus] = useState<SyncStatusResult | null>(null);
  const [syncLoading, setSyncLoading] = useState(false);

  // 下达任务的页面级反馈
  const [dispatchMsg, setDispatchMsg] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

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
  const [scopeOptions, setScopeOptions] = useState<ScopeOptionsResult>({ orgs: [], categories: [], costCenters: [] });
  const [scopeLoading, setScopeLoading] = useState(false);

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
    setSyncLoading(true);
    try {
      const s = await getSyncStatus();
      setSyncStatus(s);
    } catch {
      // 获取失败时不阻塞页面，syncReady 保持 false
    } finally {
      setSyncLoading(false);
    }
  }, []);

  const fetchScopeOptions = useCallback(async () => {
    setScopeLoading(true);
    try {
      const o = await getScopeOptions();
      setScopeOptions(o);
    } catch {
      setScopeOptions({ orgs: [], categories: [], costCenters: [] });
    } finally {
      setScopeLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
    fetchSyncStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchTasks]);

  const syncReady = !!syncStatus?.isLatest;

  /** 打开新建任务弹窗 */
  const openDialog = () => {
    setForm({ ...defaultForm, CreatedBy: user?.name ?? '' });
    setFeedback(null);
    setDialogOpen(true);
    fetchScopeOptions();
  };

  /** 提交新建任务 */
  const handleCreate = async () => {
    if (!form.TaskName.trim()) {
      setFeedback({ type: 'error', msg: '任务名称不能为空' });
      return;
    }
    setSubmitting(true);
    setFeedback(null);
    try {
      const scopeConfig = JSON.stringify({
        orgCodes: form.orgCodes,
        categoryCodes: form.categoryCodes,
        costCenterCodes: form.costCenterCodes,
      });
      const body: CreateTaskParams = {
        TaskName: form.TaskName.trim(),
        ScopeType: deriveScopeType(form.orgCodes, form.categoryCodes, form.costCenterCodes),
        ScopeConfig: scopeConfig,
        NeedReview: form.NeedReview,
        CreatedBy: form.CreatedBy.trim(),
      };
      if (form.NeedReview && form.ReviewRatio) body.ReviewRatio = form.ReviewRatio;
      if (form.Deadline) body.Deadline = form.Deadline;

      await createTask(body);
      setFeedback({ type: 'success', msg: '任务创建成功！' });
      setDialogOpen(false);
      setForm({ ...defaultForm });
      fetchTasks();
    } catch (err) {
      setFeedback({ type: 'error', msg: err instanceof Error ? err.message : '创建失败' });
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
      fetchTasks();
    } catch (err) {
      setDispatchMsg({ type: 'error', msg: err instanceof Error ? err.message : '下达任务失败' });
    }
  };

  return (
    <div className="p-4 space-y-4">
      {/* 版块切换 */}
      <Tabs
        value={tab}
        onChange={(_e, v) => setTab(v)}
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
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-gray-900">任务管理</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            创建和下发盘点任务
          </p>
        </div>
        <div className="flex gap-1 shrink-0">
          <IconButton onClick={fetchSyncStatus} color="primary" size="small" title="刷新同步状态">
            <SyncIcon />
          </IconButton>
          <IconButton onClick={fetchTasks} color="primary" size="small">
            <RefreshIcon />
          </IconButton>
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon />}
            onClick={openDialog}
            sx={{ borderRadius: '10px', textTransform: 'none', whiteSpace: 'nowrap' }}
          >
            新建任务
          </Button>
        </div>
      </div>

      {/* 数据同步状态条 */}
      {syncLoading && <Skeleton variant="rectangular" height={56} sx={{ borderRadius: 2 }} />}
      {!syncLoading && syncStatus && (
        <Alert
          severity={syncStatus.isLatest ? 'success' : 'warning'}
          sx={{ fontSize: '0.82rem', alignItems: 'center' }}
        >
          <strong>数据同步状态：</strong>
          {syncStatus.isLatest ? '已是最新' : '未同步或非最新'}
          {' · '}最后同步：{syncStatus.lastSyncTime ? new Date(syncStatus.lastSyncTime).toLocaleString('zh-CN') : '从未'}
          {' · '}本地 {syncStatus.localCount} 行 / 视图 {syncStatus.viewCount} 行
          {!syncStatus.isLatest && ' —— 请先到「资产对比同步」完成数据同步后再下达任务。'}
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
          <p className="text-sm mt-1">点击右上角"新建任务"开始</p>
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
          const st = statusMap[task.status] ?? { label: task.status, color: 'default' as const };
          return (
            <Card key={task.id} className="glow-border hover:shadow-glow transition-shadow">
              <CardActionArea onClick={() => navigate(`/tasks/${task.id}`)}>
                <CardContent>
                  <div className="flex items-start justify-between mb-2">
                    <Typography variant="subtitle1" component="h3" className="font-semibold text-gray-900" sx={{ flex: 1, mr: 1 }}>
                      {task.taskName}
                    </Typography>
                    <Chip label={st.label} color={st.color} size="small" />
                  </div>

                  <div className="flex items-center gap-4 text-sm text-gray-500 mb-3 flex-wrap">
                    <span>范围：{scopeTypeOptions.find((o) => o.value === task.scopeType)?.label ?? task.scopeType}</span>
                    {task.assetCount !== undefined && <span>资产：{task.assetCount}</span>}
                    {task.deadline && <span>截止：{new Date(task.deadline).toLocaleDateString('zh-CN')}</span>}
                    {task.needReview && <span>复盘 {(task.reviewRatio ?? 0.3) * 100}%</span>}
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>{task.createdBy || '--'}{task.createdAt ? ` · ${new Date(task.createdAt).toLocaleDateString('zh-CN')}` : ''}</span>
                    {task.status === 'draft' && (
                      <Tooltip title={!syncReady ? '请先完成数据同步后再下达任务' : ''}>
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
                </CardContent>
              </CardActionArea>
            </Card>
          );
        })}

      {/* 底部间距 */}
      <div className="h-4" />

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
            <TextField
              select
              label="快速预设（可选）"
              size="small"
              value={form.preset}
              onChange={(e) => {
                const v = e.target.value;
                setForm((f) => ({ ...f, preset: v, TaskName: v }));
              }}
              fullWidth
            >
              {presetNames.map((p) => (
                <MenuItem key={p.value} value={p.value}>{p.label}</MenuItem>
              ))}
            </TextField>
            <TextField
              label="任务名称"
              required
              size="small"
              value={form.TaskName}
              onChange={(e) => setForm((f) => ({ ...f, TaskName: e.target.value, preset: '' }))}
              fullWidth
            />

            <TextField
              select
              label="盘点组织"
              size="small"
              SelectProps={{
                multiple: true,
                renderValue: (selected) => `已选 ${(selected as string[]).length} 项`,
              }}
              value={form.orgCodes}
              onChange={(e) => setForm((f) => ({ ...f, orgCodes: Array.isArray(e.target.value) ? e.target.value : [] }))}
              fullWidth
              disabled={scopeLoading}
            >
              {scopeOptions.orgs.map((o) => (
                <MenuItem key={o.code} value={o.code}>{o.name}</MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="盘点类别"
              size="small"
              SelectProps={{
                multiple: true,
                renderValue: (selected) => `已选 ${(selected as string[]).length} 项`,
              }}
              value={form.categoryCodes}
              onChange={(e) => setForm((f) => ({ ...f, categoryCodes: Array.isArray(e.target.value) ? e.target.value : [] }))}
              fullWidth
              disabled={scopeLoading}
            >
              {scopeOptions.categories.map((o) => (
                <MenuItem key={o.code} value={o.code}>{o.name}</MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="成本中心"
              size="small"
              SelectProps={{
                multiple: true,
                renderValue: (selected) => `已选 ${(selected as string[]).length} 项`,
              }}
              value={form.costCenterCodes}
              onChange={(e) => setForm((f) => ({ ...f, costCenterCodes: Array.isArray(e.target.value) ? e.target.value : [] }))}
              fullWidth
              disabled={scopeLoading}
            >
              {scopeOptions.costCenters.map((o) => (
                <MenuItem key={o.code} value={o.code}>{o.name}</MenuItem>
              ))}
            </TextField>

            <TextField
              label="截止日期"
              type="date"
              size="small"
              InputLabelProps={{ shrink: true }}
              value={form.Deadline}
              onChange={(e) => setForm((f) => ({ ...f, Deadline: e.target.value }))}
              fullWidth
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
            sx={{ borderRadius: '10px', textTransform: 'none' }}
          >
            {submitting ? '创建中...' : '确认创建'}
          </Button>
        </DialogActions>
      </Dialog>
      </>
      )}

      {tab === 'sync' && <AssetSyncCompare />}
      {tab === 'asset' && <AssetLocalTable />}
    </div>
  );
}
