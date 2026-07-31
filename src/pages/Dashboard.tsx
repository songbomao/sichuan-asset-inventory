import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Skeleton from '@mui/material/Skeleton';
import Alert from '@mui/material/Alert';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import LinearProgress from '@mui/material/LinearProgress';
import { getDashboard, type DashboardData } from '../api/dashboard';
import { getTaskDetail, getTaskList, type TaskItem } from '../api/tasks';
import { useAuth } from '../contexts/AuthContext';
import ProgressBar from '../components/ProgressBar';

/**
 * 进度监控看板（所有登录用户均可访问）
 * - 任务级（/tasks/:taskId/dashboard）：部门/个人双维度
 * - 全局级（/admin/dashboard，taskId 缺省）：传 '0'，部门/类别双维度 + 本人进度 +（管理员专属）任务汇总下钻
 */
export default function DashboardPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const isGlobal = !taskId;
  const isAdmin = !!user?.isAdmin;
  // 全局视图（/admin/dashboard）渲染在 Layout 内，顶部留白已由 Layout 的 <main> 提供（pt-12）；
  // 任务级视图（/tasks/:taskId/dashboard）为独立页，无 Layout，需自身补 pt-12 避开 fixed 顶栏。
  const topPad = isGlobal ? '' : 'pt-12';

  const [data, setData] = useState<DashboardData | null>(null);
  const [taskName, setTaskName] = useState('');
  const [myTasks, setMyTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (taskId) {
        const [detail, dashboard] = await Promise.all([
          getTaskDetail(taskId),
          getDashboard(taskId),
        ]);
        setTaskName(detail.taskName);
        setData(dashboard);
      } else {
        // 全局视图：taskId='0'；同时拉取本人名下任务列表用于「本人进度」卡（失败不影响主看板）
        const [dashboard, myTasksRes] = await Promise.all([
          getDashboard('0'),
          getTaskList(true).catch(() => [] as TaskItem[]),
        ]);
        setData(dashboard);
        setMyTasks(myTasksRes);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '加载看板失败';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 本人进度汇总（仅全局视图展示，复用 getTaskList(true) 数据，无需新接口）
  const mySummary = useMemo(() => {
    const totalTasks = myTasks.length;
    const doneTasks = myTasks.filter(
      (t) => t.assetCount > 0 && t.completedCount >= t.assetCount,
    ).length;
    const totalAssets = myTasks.reduce((s, t) => s + (t.assetCount || 0), 0);
    const doneAssets = myTasks.reduce((s, t) => s + (t.completedCount || 0), 0);
    const percent = totalAssets > 0 ? Math.round((doneAssets / totalAssets) * 100) : 0;
    return { totalTasks, doneTasks, totalAssets, doneAssets, percent };
  }, [myTasks]);

  const goBack = () => {
    if (isGlobal) {
      // 按角色返回对应控制台首页
      navigate(isAdmin ? '/admin/tasks' : '/tasks');
    } else {
      navigate(-1);
    }
  };

  const drillToTask = (id: string) => {
    navigate(`/tasks/${id}/dashboard`);
  };

  if (loading) {
    return (
      <div className={`min-h-screen bg-gray-50 ${topPad}`}>
        <div className="p-4 space-y-4">
          {[1, 2, 3].map((i) => <Card key={i}><CardContent><Skeleton variant="text" /></CardContent></Card>)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-50">
        <Alert severity="error" sx={{ mb: 2, width: '100%', maxWidth: 360 }}>{error}</Alert>
        <Button variant="outlined" onClick={fetchData}>重新加载</Button>
        <Button variant="text" onClick={goBack} sx={{ mt: 1 }}>返回</Button>
      </div>
    );
  }

  if (!data) return null;

  const { overall, deptStats, personStats, categoryStats, tasks } = data;

  return (
    <div className={`min-h-screen bg-gray-50 flex flex-col ${topPad}`}>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* 全局视图：标题 + 副标题，普通用户与管理员共用入口 */}
        {isGlobal && (
          <div className="mb-1">
            <Typography variant="h6" className="font-bold text-gray-900">进度概览</Typography>
            <Typography variant="caption" className="text-gray-400">
              整体进度 · 各部门盘点完成率{isAdmin ? ' · 任务下钻' : ''} · 本人进度
            </Typography>
          </div>
        )}

        {/* 整体进度 */}
        <Card className="glow-border">
          <CardContent>
            <Typography variant="subtitle1" className="font-semibold text-gray-900 mb-3">
              整体进度
            </Typography>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">完成率</span>
              <span className="text-lg font-bold text-primary">{overall.completionRate}%</span>
            </div>
            <LinearProgress
              variant="determinate"
              value={overall.completionRate}
              sx={{
                height: 10, borderRadius: 5,
                backgroundColor: 'rgba(26,35,126,0.08)',
                '& .MuiLinearProgress-bar': {
                  borderRadius: 5,
                  background: 'linear-gradient(90deg, #1a237e 0%, #7c4dff 100%)',
                },
              }}
            />
            <div className="flex justify-between mt-3 text-sm">
              <span className="text-gray-500">
                已完成 <span className="font-semibold text-green-600">{overall.completedCount}</span>
              </span>
              <span className="text-gray-500">
                异常 <span className="font-semibold text-red-500">{overall.abnormalCount}</span>
              </span>
              <span className="text-gray-500">
                总计 <span className="font-semibold">{overall.totalAssets}</span>
              </span>
            </div>
          </CardContent>
        </Card>

        {/* 本人进度（仅全局视图，所有用户可见） */}
        {isGlobal && !loading && myTasks.length > 0 && (
          <Card className="glow-border" sx={{ cursor: 'pointer' }} onClick={() => navigate('/my-progress')}>
            <CardContent>
              <div className="flex items-center justify-between mb-2">
                <Typography variant="subtitle1" className="font-semibold text-gray-900">
                  本人进度
                </Typography>
                <span className="text-lg font-bold text-blue-600">{mySummary.percent}%</span>
              </div>
              <ProgressBar current={mySummary.doneAssets} total={mySummary.totalAssets} />
              <div className="flex items-center gap-4 text-xs text-gray-500 mt-2">
                <span>📦 资产合计 {mySummary.totalAssets} 项</span>
                <span>✅ 已盘 {mySummary.doneAssets} 项</span>
                <span className="ml-auto text-gray-400 flex items-center">
                  查看明细 <ChevronRightIcon sx={{ fontSize: 16 }} />
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 部门维度（全局 / 任务级均展示） */}
        <Card>
          <CardContent>
            <Typography variant="subtitle1" className="font-semibold text-gray-900 mb-3">
              部门维度
            </Typography>
            {deptStats.length === 0 ? (
              <p className="text-sm text-gray-400">暂无数据</p>
            ) : (
              <div className="space-y-3">
                {deptStats.map((d) => (
                  <div key={d.department}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700">{d.department}</span>
                      <span className="font-medium">
                        {d.completed}/{d.total}
                        <span className="text-gray-400 ml-1">
                          ({d.total > 0 ? Math.round((d.completed / d.total) * 100) : 0}%)
                        </span>
                      </span>
                    </div>
                    <LinearProgress
                      variant="determinate"
                      value={d.total > 0 ? (d.completed / d.total) * 100 : 0}
                      sx={{
                        height: 6, borderRadius: 3,
                        backgroundColor: 'rgba(26,35,126,0.06)',
                        '& .MuiLinearProgress-bar': {
                          borderRadius: 3,
                          background: 'linear-gradient(90deg, #1a237e 0%, #7c4dff 100%)',
                        },
                      }}
                    />
                    {isAdmin && (((d.deficit ?? 0) > 0) || ((d.difference ?? 0) > 0)) && (
                      <div className="text-xs text-gray-400 mt-1">
                        {(d.deficit ?? 0) > 0 && <span className="text-red-500">盘亏 {d.deficit}</span>}
                        {(d.deficit ?? 0) > 0 && (d.difference ?? 0) > 0 && <span className="mx-1 text-gray-300">·</span>}
                        {(d.difference ?? 0) > 0 && <span>差异 {d.difference}</span>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 类别维度（仅全局视图） */}
        {categoryStats && categoryStats.length > 0 && (
          <Card>
            <CardContent>
              <Typography variant="subtitle1" className="font-semibold text-gray-900 mb-3">
                类别维度
              </Typography>
              <div className="space-y-3">
                {categoryStats.map((c) => (
                  <div key={c.category}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700">{c.category}</span>
                      <span className="font-medium">
                        {c.completed}/{c.total}
                        <span className="text-gray-400 ml-1">
                          ({c.total > 0 ? Math.round((c.completed / c.total) * 100) : 0}%)
                        </span>
                      </span>
                    </div>
                    <LinearProgress
                      variant="determinate"
                      value={c.total > 0 ? (c.completed / c.total) * 100 : 0}
                      sx={{
                        height: 6, borderRadius: 3,
                        backgroundColor: 'rgba(26,35,126,0.06)',
                        '& .MuiLinearProgress-bar': {
                          borderRadius: 3,
                          background: 'linear-gradient(90deg, #1a237e 0%, #7c4dff 100%)',
                        },
                      }}
                    />
                    {isAdmin && (((c.deficit ?? 0) > 0) || ((c.difference ?? 0) > 0)) && (
                      <div className="text-xs text-gray-400 mt-1">
                        {(c.deficit ?? 0) > 0 && <span className="text-red-500">盘亏 {c.deficit}</span>}
                        {(c.deficit ?? 0) > 0 && (c.difference ?? 0) > 0 && <span className="mx-1 text-gray-300">·</span>}
                        {(c.difference ?? 0) > 0 && <span>差异 {c.difference}</span>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 个人维度（仅任务级视图） */}
        {!isGlobal && (
          <Card>
            <CardContent>
              <Typography variant="subtitle1" className="font-semibold text-gray-900 mb-3">
                个人维度
              </Typography>
              {personStats.length === 0 ? (
                <p className="text-sm text-gray-400">暂无盘点记录</p>
              ) : (
                <div className="space-y-2">
                  {personStats.map((p) => (
                    <div key={p.name} className="flex justify-between items-center py-1 border-b border-gray-100 last:border-0">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                          {p.name.charAt(0)}
                        </div>
                        <span className="text-sm font-medium text-gray-700">{p.name}</span>
                      </div>
                      <span className="text-sm">
                        <span className="font-semibold text-primary">{p.completed}</span>
                        <span className="text-gray-400"> 件已完成</span>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* 任务汇总（仅全局视图 + 管理员可见，可下钻到任务级看板） */}
        {isAdmin && tasks && tasks.length > 0 && (
          <Card>
            <CardContent>
              <Typography variant="subtitle1" className="font-semibold text-gray-900 mb-3">
                任务汇总（点击下钻）
              </Typography>
              <div className="divide-y divide-gray-100">
                {tasks.map((t) => (
                  <button
                    key={t.taskId}
                    onClick={() => drillToTask(t.taskId)}
                    className="w-full flex items-center justify-between py-3 text-left hover:bg-gray-50 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-gray-800 truncate">{t.taskName}</div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        已完成 {t.completedCount}/{t.totalAssets} · 异常 {t.abnormalCount}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span className="text-sm font-semibold text-primary">{t.completionRate}%</span>
                      <ChevronRightIcon fontSize="small" className="text-gray-400" />
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="h-4" />
      </div>
    </div>
  );
}
