import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Skeleton from '@mui/material/Skeleton';
import Alert from '@mui/material/Alert';
import IconButton from '@mui/material/IconButton';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import PlaylistAddCheckIcon from '@mui/icons-material/PlaylistAddCheck';
import AssessmentIcon from '@mui/icons-material/Assessment';
import RateReviewIcon from '@mui/icons-material/RateReview';
import DescriptionIcon from '@mui/icons-material/Description';
import { getTaskDetail, getProgress } from '../api/tasks';
import { useAuth } from '../contexts/AuthContext';
import VerticalTimeline, { type TimelineEvent } from '../components/VerticalTimeline';

/** 根据任务完成百分比生成盘点里程碑时间轴数据 */
function generateTimelineEvents(percentage: number): TimelineEvent[] {
  const now = new Date();
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
  const offset = (minutes: number) => fmt(new Date(now.getTime() - minutes * 60 * 1000));

  const events: TimelineEvent[] = [
    { id: 'sync', title: '数据同步', timestamp: offset(300), status: 'completed' },
    { id: 'dispatch', title: '盘点下达（钉钉推送）', timestamp: offset(270), status: percentage > 0 ? 'completed' : 'pending' },
    { id: 'inventorying', title: '盘点中', timestamp: percentage > 0 && percentage < 100 ? fmt(now) : percentage >= 100 ? offset(180) : '--', status: percentage >= 100 ? 'completed' : percentage > 0 ? 'in-progress' : 'pending' },
    { id: 'report', title: '报告生成中', timestamp: percentage >= 100 ? offset(60) : '--', status: percentage >= 100 ? 'completed' : 'pending' },
    { id: 'end', title: '盘点结束', timestamp: percentage >= 100 ? offset(30) : '--', status: percentage >= 100 ? 'completed' : 'pending' },
    { id: 'archive', title: '盘点完成归档', timestamp: percentage >= 100 ? offset(15) : '--', status: percentage >= 100 ? 'completed' : 'pending' },
  ];
  return events;
}

/**
 * 任务详情入口页（盘点/复盘/看板/报告 分流）
 */
export default function TaskDetailPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [taskName, setTaskName] = useState('');
  const [assetCount, setAssetCount] = useState(0);
  const [progress, setProgress] = useState({ total: 0, completed: 0, percentage: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!taskId) return;
    setLoading(true);
    setError(null);
    try {
      const [detail, prog] = await Promise.all([
        getTaskDetail(taskId),
        getProgress(taskId),
      ]);
      setTaskName(detail.taskName);
      setAssetCount(detail.assets.length);
      setProgress(prog);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '加载任务详情失败';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="sticky top-0 z-10 bg-gradient-to-r from-primary to-[#4a148c] text-white px-4 py-3 flex items-center gap-3 shadow-lg">
          <IconButton color="inherit" size="small" onClick={() => navigate(-1)}>
            <ArrowBackIosNewIcon fontSize="small" />
          </IconButton>
          <h2 className="text-sm font-semibold">加载中...</h2>
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

  const inventoryMenu = {
    title: '开始盘点',
    desc: `共 ${assetCount} 件资产 · 已完成 ${progress.completed} 件`,
    icon: <PlaylistAddCheckIcon sx={{ fontSize: 32, color: '#1a237e' }} />,
    path: `/tasks/${taskId}/inventory`,
    color: 'border-l-4 border-l-primary',
  };

  // 看板 / 复盘 / 报告 仅管理员可见
  const adminMenus = user?.isAdmin
    ? [
        {
          title: '进度看板',
          desc: `完成率 ${progress.percentage}%`,
          icon: <AssessmentIcon sx={{ fontSize: 32, color: '#7c4dff' }} />,
          path: `/tasks/${taskId}/dashboard`,
          color: 'border-l-4 border-l-purple-500',
        },
        {
          title: '复盘管理',
          desc: '查看和提交复盘任务',
          icon: <RateReviewIcon sx={{ fontSize: 32, color: '#ff9800' }} />,
          path: `/tasks/${taskId}/review`,
          color: 'border-l-4 border-l-orange-500',
        },
        {
          title: '盘点报告',
          desc: '查看本次盘点统计报告',
          icon: <DescriptionIcon sx={{ fontSize: 32, color: '#4caf50' }} />,
          path: `/tasks/${taskId}/report`,
          color: 'border-l-4 border-l-green-500',
        },
      ]
    : [];

  const menus = [inventoryMenu, ...adminMenus];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="sticky top-0 z-10 bg-gradient-to-r from-primary to-[#4a148c] text-white px-4 py-3 flex items-center gap-3 shadow-lg">
        <IconButton color="inherit" size="small" onClick={() => navigate('/tasks')}>
          <ArrowBackIosNewIcon fontSize="small" />
        </IconButton>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold truncate">{taskName}</h2>
          <p className="text-xs text-white/70">{assetCount} 件资产</p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {menus.map((m) => (
          <Card key={m.title} className={`${m.color} hover:shadow-md transition-shadow`}>
            <CardActionArea onClick={() => navigate(m.path)}>
              <CardContent>
                <div className="flex items-center gap-4">
                  {m.icon}
                  <div className="flex-1 min-w-0">
                    <Typography variant="subtitle1" className="font-semibold text-gray-900">
                      {m.title}
                    </Typography>
                    <Typography variant="body2" className="text-gray-500">
                      {m.desc}
                    </Typography>
                  </div>
                </div>
              </CardContent>
            </CardActionArea>
          </Card>
        ))}

        {/* 盘点进度时间轴 */}
        <Card className="hover:shadow-md transition-shadow">
          <CardContent>
            <Typography variant="subtitle1" className="font-semibold text-gray-900 mb-3">
              盘点进度
            </Typography>
            <VerticalTimeline events={generateTimelineEvents(progress.percentage)} />
          </CardContent>
        </Card>

        <div className="h-4" />
      </div>
    </div>
  );
}