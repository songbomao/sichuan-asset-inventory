import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Skeleton from '@mui/material/Skeleton';
import Alert from '@mui/material/Alert';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import InboxIcon from '@mui/icons-material/Inbox';
import { getTaskList, type TaskItem } from '../api/tasks';
import MyRecords from './MyRecords';
import AssetLocalTable from './AssetLocalTable';
import StatusBadge from '../components/StatusBadge';
import ProgressBar from '../components/ProgressBar';

/** 未盘点（新任务）状态 */
const PENDING_STATUS = 'pending';

/**
 * 盘点任务列表页（责任人视角）
 * 仅展示「责任人为当前登录用户 + 状态为未盘点(pending)」的新任务。
 */
export default function TaskListPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tab, setTab] = useState<'tasks' | 'records' | 'assets'>('tasks');

  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      // onlyMine=true：后端按 sai_inventory_task_assets.DingtalkUserId 过滤当前用户名下任务
      const data = await getTaskList(true);
      setTasks(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '加载任务列表失败';
      setError(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  /** 切换 Tab 时自动触发对应页数据刷新：tasks 调 fetchTasks(true)；records 因条件渲染重挂载，MyRecords 挂载即拉取最新数据 */
  const prevTab = useRef(tab);
  useEffect(() => {
    if (prevTab.current === tab) return;
    prevTab.current = tab;
    if (tab === 'tasks') fetchTasks(true);
  }, [tab]);

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

  /** 展示待盘点的新任务（pending）与进行中（running）的任务
   *  注意：DispatchTask 下达后任务状态为 running，若仅过滤 pending 会导致责任人永远看不到已下达任务 */
  const visibleTasks = useMemo(
    () => tasks.filter((t) => t.status === PENDING_STATUS || t.status === 'running'),
    [tasks],
  );

  return (
    <div className="p-4 space-y-4">
      {/* 版块切换（样式参照管理员 AdminTasks 3-Tab） */}
      <Tabs
        value={tab}
        onChange={(_e, v) => setTab(v)}
        variant="fullWidth"
        sx={{ mb: 1, minHeight: 40, '& .MuiTab-root': { minHeight: 40, textTransform: 'none', fontSize: '0.9rem' } }}
      >
        <Tab value="tasks" label="我的盘点任务" />
        <Tab value="records" label="我的盘点记录" />
        <Tab value="assets" label="我的资产" />
      </Tabs>

      {tab === 'tasks' && (
      <>
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 mt-0.5">
            {visibleTasks.length > 0 ? `共 ${visibleTasks.length} 个待盘点任务` : '当前没有待盘点任务'}
          </p>
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
          <Card key={i} className="glow-border">
            <CardContent>
              <Skeleton variant="text" width="60%" height={28} />
              <Skeleton variant="text" width="40%" height={20} />
              <Skeleton variant="rounded" height={8} sx={{ mt: 1 }} />
            </CardContent>
          </Card>
        ))}

      {/* 空状态 */}
      {!loading && !error && visibleTasks.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <InboxIcon sx={{ fontSize: 64, mb: 2 }} />
          <p className="text-base font-medium">暂无待盘点任务</p>
          <p className="text-sm mt-1">下拉刷新或联系管理员分配任务</p>
        </div>
      )}

      {/* 任务卡片列表 */}
      {!loading &&
        visibleTasks.map((task) => (
          <Card key={task.taskId} className="glow-border hover:shadow-glow transition-shadow">
            <CardActionArea onClick={() => navigate(`/tasks/${task.taskId}`)}>
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
      </>
      )}

      {tab === 'records' && (
        <MyRecords embedded />
      )}

      {tab === 'assets' && (
        <AssetLocalTable ownerName={user?.name} />
      )}
    </div>
  );
}
