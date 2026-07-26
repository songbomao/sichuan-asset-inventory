import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Skeleton from '@mui/material/Skeleton';
import Alert from '@mui/material/Alert';
import RefreshIcon from '@mui/icons-material/Refresh';
import IconButton from '@mui/material/IconButton';
import InsightsIcon from '@mui/icons-material/Insights';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { getTaskList, type TaskItem } from '../api/tasks';
import StatusBadge from '../components/StatusBadge';
import ProgressBar from '../components/ProgressBar';

/**
 * 我的进度页（所有角色通用）
 * 展示当前登录用户名下全部盘点任务（不限状态）的完成进度，
 * 用于快速追踪个人盘点任务状态。点击卡片进入该任务的进度看板。
 */
export default function MyProgressPage() {
  const navigate = useNavigate();

  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      // onlyMine=true：后端按当前用户过滤名下任务（全部状态）
      const data = await getTaskList(true);
      setTasks(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '加载任务进度失败';
      setError(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  /** 汇总统计：总任务数 / 已完成任务数 / 总资产完成率 */
  const summary = useMemo(() => {
    const totalTasks = tasks.length;
    const doneTasks = tasks.filter(
      (t) => t.assetCount > 0 && t.completedCount >= t.assetCount,
    ).length;
    const totalAssets = tasks.reduce((s, t) => s + (t.assetCount || 0), 0);
    const doneAssets = tasks.reduce((s, t) => s + (t.completedCount || 0), 0);
    const percent = totalAssets > 0 ? Math.round((doneAssets / totalAssets) * 100) : 0;
    return { totalTasks, doneTasks, totalAssets, doneAssets, percent };
  }, [tasks]);

  /** 任务完成率（单任务） */
  const taskPercent = (t: TaskItem): number =>
    t.assetCount > 0 ? Math.round((t.completedCount / t.assetCount) * 100) : 0;

  return (
    <div className="p-4 space-y-4">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">我的进度</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {tasks.length > 0
              ? `共 ${summary.totalTasks} 个任务 · 已完成 ${summary.doneTasks} 个`
              : '当前没有名下盘点任务'}
          </p>
        </div>
        <IconButton onClick={() => fetchTasks(true)} disabled={refreshing} color="primary">
          <RefreshIcon className={refreshing ? 'animate-spin-refresh' : ''} />
        </IconButton>
      </div>

      {/* 错误提示 */}
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ fontSize: '0.85rem' }}>
          {error}
        </Alert>
      )}

      {/* 汇总卡片 */}
      {!loading && !error && tasks.length > 0 && (
        <Card className="glow-border">
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <Typography variant="subtitle1" className="font-semibold text-gray-900">
                总体完成率
              </Typography>
              <span className="text-lg font-bold text-blue-600">{summary.percent}%</span>
            </div>
            <ProgressBar current={summary.doneAssets} total={summary.totalAssets} />
            <div className="flex items-center gap-4 text-xs text-gray-500 mt-2">
              <span>📦 资产合计 {summary.totalAssets} 项</span>
              <span>✅ 已盘 {summary.doneAssets} 项</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 加载骨架 */}
      {loading &&
        [1, 2, 3].map((i) => (
          <Card key={i} className="glow-border">
            <CardContent>
              <Skeleton variant="text" width="60%" height={28} />
              <Skeleton variant="text" width="40%" height={20} />
              <Skeleton variant="rounded" height={8} sx={{ mt: 1 }} />
            </CardContent>
          </Card>
        ))}

      {/* 空状态 */}
      {!loading && !error && tasks.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <InsightsIcon sx={{ fontSize: 64, mb: 2 }} />
          <p className="text-base font-medium">暂无名下盘点任务</p>
          <p className="text-sm mt-1">任务下达后可在此追踪个人盘点进度</p>
        </div>
      )}

      {/* 任务进度卡片列表 */}
      {!loading &&
        tasks.map((task) => (
          <Card key={task.taskId} className="glow-border hover:shadow-glow transition-shadow">
            <CardActionArea onClick={() => navigate(`/tasks/${task.taskId}/dashboard`)}>
              <CardContent>
                <div className="flex items-start justify-between mb-2">
                  <Typography
                    variant="subtitle1"
                    component="h3"
                    className="font-semibold text-gray-900"
                    sx={{ flex: 1, mr: 1 }}
                  >
                    {task.taskName}
                  </Typography>
                  <StatusBadge status={task.status} />
                </div>

                <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                  <span>
                    📦 已盘 {task.completedCount}/{task.assetCount} 项
                  </span>
                  <span className="font-medium text-blue-600">{taskPercent(task)}%</span>
                </div>

                {task.location && (
                  <div className="text-xs text-gray-400 mb-2">📍 {task.location}</div>
                )}

                <ProgressBar current={task.completedCount} total={task.assetCount} />

                <div className="flex items-center justify-end text-xs text-gray-400 mt-2">
                  查看进度看板
                  <ChevronRightIcon sx={{ fontSize: 16 }} />
                </div>
              </CardContent>
            </CardActionArea>
          </Card>
        ))}

      {/* 底部间距 */}
      <div className="h-4" />
    </div>
  );
}
