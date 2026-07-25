import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Skeleton from '@mui/material/Skeleton';
import Alert from '@mui/material/Alert';
import IconButton from '@mui/material/IconButton';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import RefreshIcon from '@mui/icons-material/Refresh';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import LinearProgress from '@mui/material/LinearProgress';
import { getDashboard, type DashboardData } from '../api/dashboard';
import { getTaskDetail } from '../api/tasks';
import { useAuth } from '../contexts/AuthContext';

/**
 * 进度监控看板
 * - 任务级（/tasks/:taskId/dashboard）：部门/个人双维度
 * - 全局级（/admin/dashboard，taskId 缺省）：传 '0'，部门/类别双维度 + 任务汇总，可下钻
 */
export default function DashboardPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const isGlobal = !taskId;

  const [data, setData] = useState<DashboardData | null>(null);
  const [taskName, setTaskName] = useState('');
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
        // 全局视图：taskId='0'
        const dashboard = await getDashboard('0');
        setData(dashboard);
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

  // 全局聚合视图（任务级看板 taskId 存在）仅管理员可见；任务级进度看板对所有责任人开放
  if (isGlobal && !user?.isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-50">
        <Alert severity="warning" sx={{ mb: 2, width: '100%', maxWidth: 360 }}>无权限：仅管理员可查看全局进度监控。</Alert>
        <Button variant="outlined" onClick={() => navigate(-1)}>返回</Button>
      </div>
    );
  }

  const goBack = () => {
    if (isGlobal) {
      navigate('/admin/tasks');
    } else {
      navigate(-1);
    }
  };

  const drillToTask = (id: string) => {
    navigate(`/tasks/${id}/dashboard`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="sticky top-0 z-10 bg-gradient-to-r from-primary to-[#4a148c] text-white px-4 py-3 flex items-center gap-3 shadow-lg">
          <IconButton color="inherit" size="small" onClick={goBack}>
            <ArrowBackIosNewIcon fontSize="small" />
          </IconButton>
          <h2 className="text-sm font-semibold">{isGlobal ? '进度监控 · 全局' : '进度看板'}</h2>
        </header>
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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="sticky top-0 z-10 bg-gradient-to-r from-primary to-[#4a148c] text-white px-4 py-3 flex items-center gap-3 shadow-lg">
        <IconButton color="inherit" size="small" onClick={goBack}>
          <ArrowBackIosNewIcon fontSize="small" />
        </IconButton>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold truncate">
            {isGlobal ? '进度监控 · 全局' : `进度看板 · ${taskName}`}
          </h2>
        </div>
        <IconButton color="inherit" size="small" onClick={fetchData}>
          <RefreshIcon fontSize="small" />
        </IconButton>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
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

        {/* 任务汇总（仅全局视图，可下钻） */}
        {tasks && tasks.length > 0 && (
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
