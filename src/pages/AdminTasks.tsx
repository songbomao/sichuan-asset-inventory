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
import {
  getAdminTaskList,
  createTask,
  startTask,
  type AdminTaskItem,
  type CreateTaskParams,
} from '../api/admin';

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
          const st = statusMap[task.Status] ?? { label: task.Status, color: 'default' as const };
          return (
            <Card key={task.Id}>
              <CardContent>
                <div className="flex items-start justify-between mb-2">
                  <Typography variant="subtitle1" component="h3" className="font-semibold text-gray-900" sx={{ flex: 1, mr: 1 }}>
                    {task.TaskName}
                  </Typography>
                  <Chip label={st.label} color={st.color} size="small" />
                </div>

                <div className="flex items-center gap-4 text-sm text-gray-500 mb-3 flex-wrap">
                  <span>范围：{scopeTypeOptions.find((o) => o.value === task.ScopeType)?.label ?? task.ScopeType}</span>
                  {task.Deadline && <span>截止：{new Date(task.Deadline).toLocaleDateString('zh-CN')}</span>}
                  {task.NeedReview && <span>复盘 {(task.ReviewRatio ?? 0.3) * 100}%</span>}
                </div>

                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>创建人：{task.CreatedBy || '--'} · {new Date(task.CreatedAt).toLocaleDateString('zh-CN')}</span>
                  {task.Status === 'draft' && (
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<PlayArrowIcon />}
                      onClick={() => handleStart(task.Id)}
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
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 700, px: { xs: 2, sm: 3 } }}>新建盘点任务</DialogTitle>
        <DialogContent dividers sx={{ px: { xs: 2, sm: 3 } }}>
          <div className="space-y-4 pt-1">
            <TextField
              label="任务名称"
              fullWidth
              required
              size="small"
              value={form.TaskName}
              onChange={(e) => setForm((f) => ({ ...f, TaskName: e.target.value }))}
            />

            <TextField
              select
              label="盘点范围"
              fullWidth
              size="small"
              value={form.ScopeType}
              onChange={(e) => setForm((f) => ({ ...f, ScopeType: e.target.value }))}
            >
              {scopeTypeOptions.map((o) => (
                <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
              ))}
            </TextField>

            <TextField
              label="范围配置（JSON，可选）"
              fullWidth
              size="small"
              multiline
              rows={2}
              placeholder='{"orgCodes":["001","002"]}'
              value={form.ScopeConfig}
              onChange={(e) => setForm((f) => ({ ...f, ScopeConfig: e.target.value }))}
            />

            <TextField
              label="截止日期"
              type="date"
              fullWidth
              size="small"
              InputLabelProps={{ shrink: true }}
              value={form.Deadline}
              onChange={(e) => setForm((f) => ({ ...f, Deadline: e.target.value }))}
            />

            <TextField
              label="创建人"
              fullWidth
              size="small"
              placeholder="请输入创建人姓名"
              value={form.CreatedBy}
              onChange={(e) => setForm((f) => ({ ...f, CreatedBy: e.target.value }))}
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
                fullWidth
                size="small"
                inputProps={{ min: 0.1, max: 1, step: 0.1 }}
                value={form.ReviewRatio}
                onChange={(e) => setForm((f) => ({ ...f, ReviewRatio: Number(e.target.value) }))}
              />
            )}

            {feedback && (
              <Alert severity={feedback.type} sx={{ fontSize: '0.85rem' }}>
                {feedback.msg}
              </Alert>
            )}
          </div>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
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