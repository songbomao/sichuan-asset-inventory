import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Skeleton from '@mui/material/Skeleton';
import Alert from '@mui/material/Alert';
import RefreshIcon from '@mui/icons-material/Refresh';
import IconButton from '@mui/material/IconButton';
import InboxIcon from '@mui/icons-material/Inbox';
import { getTaskList, type TaskItem } from '../api/tasks';
import StatusBadge from '../components/StatusBadge';
import ProgressBar from '../components/ProgressBar';

/**
 * 盘点任务列表页
 */
export default function TaskListPage() {
  const navigate = useNavigate();

  useEffect(() => {
    alert('TaskList mounted!');
  }, []);

  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      alert('开始请求 getTaskList...');
      const data = await getTaskList();
      alert('getTaskList 成功！data.length=' + data.length);
      setTasks(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '加载任务列表失败';
      alert('getTaskList 失败: ' + msg);
      setError(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  /** 格式化截止时间 */
  const formatDeadline = (deadline: string): string => {
    if (!deadline) return '--';
    try {
      const date = new Date(deadline);
      const now = new Date();
      const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const formatted = date.toLocaleDateString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
      });
      if (diffDays < 0) return `已过期 ${formatted}`;
      if (diffDays === 0) return `今日截止 ${formatted}`;
      if (diffDays <= 3) return `剩余 ${diffDays} 天 · ${formatted}`;
      return formatted;
    } catch {
      return deadline;
    }
  };

  /** 判断是否临近/逾期 */
  const isUrgent = (deadline: string): boolean => {
    try {
      const date = new Date(deadline);
      const now = new Date();
      return date.getTime() - now.getTime() < 3 * 24 * 60 * 60 * 1000;
    } catch {
      return false;
    }
  };

  return (
    <div className="p-4 space-y-4">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">盘点任务</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {tasks.length > 0 ? `共 ${tasks.length} 个任务待处理` : '当前没有盘点任务'}
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
          <InboxIcon sx={{ fontSize: 64, mb: 2 }} />
          <p className="text-base font-medium">暂无盘点任务</p>
          <p className="text-sm mt-1">下拉刷新或联系管理员分配任务</p>
        </div>
      )}

      {/* 任务卡片列表 */}
      {!loading &&
        tasks.map((task) => (
          <Card key={task.taskId} className="glow-border hover:shadow-glow transition-shadow">
            <CardActionArea onClick={() => navigate(`/tasks/${task.taskId}/inventory`)}>
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
                  <span>📦 资产 {task.assetCount} 项</span>
                  <span
                    className={isUrgent(task.deadline) ? 'text-red-500 font-medium' : ''}
                  >
                    ⏰ {formatDeadline(task.deadline)}
                  </span>
                </div>

                {task.location && (
                  <div className="text-xs text-gray-400 mb-2">📍 {task.location}</div>
                )}

                <ProgressBar current={task.completedCount} total={task.assetCount} />
              </CardContent>
            </CardActionArea>
          </Card>
        ))}

      {/* 底部间距 */}
      <div className="h-4" />
    </div>
  );
}
