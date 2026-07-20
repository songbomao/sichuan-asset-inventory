import { useEffect, useState, useCallback } from 'react';
import Card from '@mui/material/Card';
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
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import {
  getAdminTaskList,
  createTask,
  startTask,
  type AdminTaskItem,
  type CreateTaskParams,
} from '../api/admin';
import { useAuth } from '../contexts/AuthContext';

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

/** 默认表单 */
const defaultForm: CreateTaskParams = {
  TaskName: '',
  ScopeType: 'all',
  ScopeConfig: '',
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
  const [form, setForm] = useState<CreateTaskParams>({ ...defaultForm });
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

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

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  /** 提交新建任务 */
  const handleCreate = async () => {
    if (!form.TaskName.trim()) {
      setFeedback({ type: 'error', msg: '任务名称不能为空' });
      return;
    }
    setSubmitting(true);
    setFeedback(null);
    try {
      const body: CreateTaskParams = {
        TaskName: form.TaskName.trim(),
        ScopeType: form.ScopeType,
        NeedReview: form.NeedReview,
      };
      if (form.ScopeConfig?.trim()) body.ScopeConfig = form.ScopeConfig.trim();
      if (form.NeedReview && form.ReviewRatio) body.ReviewRatio = form.ReviewRatio;
      if (form.Deadline) body.Deadline = form.Deadline;
      if (form.CreatedBy?.trim()) body.CreatedBy = form.CreatedBy.trim();

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

  /** 启动任务 */
  const handleStart = async (taskId: number) => {
    try {
      await startTask(taskId);
      fetchTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : '启动失败');
    }
  };

  return (
    <div className="p-4 space-y-4">
      {/* 头部 */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-gray-900">任务管理</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            创建和下发盘点任务
          </p>
        </div>
        <div className="flex gap-1 shrink-0">
          <IconButton onClick={fetchTasks} color="primary" size="small">
            <RefreshIcon />
          </IconButton>
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon />}
            onClick={() => {
              setForm({ ...defaultForm });
              setFeedback(null);
              setDialogOpen(true);
            }}
            sx={{ borderRadius: '10px', textTransform: 'none', whiteSpace: 'nowrap' }}
          >
            新建任务
          </Button>
        </div>
      </div>

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

      {/* 任务卡片列表 */}
      {!loading &&
        tasks.map((task) => {
          const st = statusMap[task.status] ?? { label: task.status, color: 'default' as const };
          return (
            <Card key={task.id}>
              <CardContent>
                <div className="flex items-start justify-between mb-2">
                  <Typography variant="subtitle1" component="h3" className="font-semibold text-gray-900" sx={{ flex: 1, mr: 1 }}>
                    {task.taskName}
                  </Typography>
                  <Chip label={st.label} color={st.color} size="small" />
                </div>

                <div className="flex items-center gap-4 text-sm text-gray-500 mb-3 flex-wrap">
                  <span>范围：{scopeTypeOptions.find((o) => o.value === task.scopeType)?.label ?? task.scopeType}</span>
                  {task.deadline && <span>截止：{new Date(task.deadline).toLocaleDateString('zh-CN')}</span>}
                  {task.needReview && <span>复盘 {(task.reviewRatio ?? 0.3) * 100}%</span>}
                </div>

                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>创建人：{task.createdBy || '--'} · {new Date(task.createdAt).toLocaleDateString('zh-CN')}</span>
                  {task.status === 'draft' && (
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<PlayArrowIcon />}
                      onClick={() => handleStart(task.id)}
                      sx={{ borderRadius: '8px', textTransform: 'none' }}
                    >
                      启动
                    </Button>
                  )}
                </div>
              </CardContent>
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
              label="任务名称"
              required
              size="small"
              value={form.TaskName}
              onChange={(e) => setForm((f) => ({ ...f, TaskName: e.target.value }))}
              fullWidth
            />
            <TextField
              select
              label="盘点范围"
              size="small"
              value={form.ScopeType}
              onChange={(e) => setForm((f) => ({ ...f, ScopeType: e.target.value }))}
              fullWidth
            >
              {scopeTypeOptions.map((o) => (
                <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
              ))}
            </TextField>
            <TextField
              label="范围配置（JSON，可选）"
              size="small"
              multiline
              rows={2}
              placeholder='{"orgCodes":["001","002"]}'
              value={form.ScopeConfig}
              onChange={(e) => setForm((f) => ({ ...f, ScopeConfig: e.target.value }))}
              fullWidth
            />
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
              placeholder="请输入创建人姓名"
              value={form.CreatedBy}
              onChange={(e) => setForm((f) => ({ ...f, CreatedBy: e.target.value }))}
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
    </div>
  );
}