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
import LinearProgress from '@mui/material/LinearProgress';
import { getDashboard, type DashboardData } from '../api/dashboard';
import { getTaskDetail } from '../api/tasks';
import { useAuth } from '../contexts/AuthContext';

/**
 * 进度监控看板
 */
export default function DashboardPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();

  const [data, setData] = useState<DashboardData | null>(null);
  const [taskName, setTaskName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!taskId) return;
    setLoading(true);
    setError(null);
    try {
      const [detail, dashboard] = await Promise.all([
        getTaskDetail(taskId),
        getDashboard(taskId),
      ]);
      setTaskName(detail.taskName);
      setData(dashboard);
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

  const { user } = useAuth();
  if (!user?.isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-50">
        <Alert severity="warning" sx={{ mb: 2, width: '100%', maxWidth: 360 }}>无权限：仅管理员可查看进度看板。</Alert>
        <Button variant="outlined" onClick={() => navigate(-1)}>返回</Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="sticky top-0 z-10 bg-gradient-to-r from-primary to-[#4a148c] text-white px-4 py-3 flex items-center gap-3 shadow-lg">
          <IconButton color="inherit" size="small" onClick={() => navigate(-1)}>
            <ArrowBackIosNewIcon fontSize="small" />
          </IconButton>
          <h2 className="text-sm font-semibold">进度看板</h2>
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
        <Button variant="text" onClick={() => navigate(-1)} sx={{ mt: 1 }}>返回</Button>
      </div>
    );
  }

  if (!data) return null;

  const { overall, deptStats, personStats } = data;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="sticky top-0 z-10 bg-gradient-to-r from-primary to-[#4a148c] text-white px-4 py-3 flex items-center gap-3 shadow-lg">
        <IconButton color="inherit" size="small" onClick={() => navigate(-1)}>
          <ArrowBackIosNewIcon fontSize="small" />
        </IconButton>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold truncate">进度看板 · {taskName}</h2>
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

        {/* 部门维度 */}
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

        {/* 个人维度 */}
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

        <div className="h-4" />
      </div>
    </div>
  );
}