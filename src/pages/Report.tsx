import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Skeleton from '@mui/material/Skeleton';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import RefreshIcon from '@mui/icons-material/Refresh';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Divider from '@mui/material/Divider';
import { generateReport, type ReportData } from '../api/report';
import { getTaskList, type TaskItem } from '../api/tasks';
import { useAuth } from '../contexts/AuthContext';

/**
 * 盘点报告页
 * - 任务级（/tasks/:taskId/report）：展示该任务报告
 * - 管理员入口（/admin/report，无 taskId）：先选择任务再查看
 */
export default function ReportPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();

  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 管理员无 taskId 时：任务选择器
  const [taskOptions, setTaskOptions] = useState<TaskItem[]>([]);
  const [taskOptionsLoading, setTaskOptionsLoading] = useState(false);

  // AI 生成汇报文案
  const [aiLoading, setAiLoading] = useState(false);
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [aiMarkdown, setAiMarkdown] = useState('');
  const [aiError, setAiError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!taskId) return;
    setLoading(true);
    setError(null);
    try {
      const report = await generateReport(taskId);
      setData(report);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '生成报告失败';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  const loadTaskOptions = useCallback(async () => {
    setTaskOptionsLoading(true);
    try {
      const list = await getTaskList();
      setTaskOptions(list);
    } catch {
      setTaskOptions([]);
    } finally {
      setTaskOptionsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (taskId) {
      fetchData();
    } else {
      loadTaskOptions();
    }
  }, [taskId, fetchData, loadTaskOptions]);

  const { user } = useAuth();
  if (!user?.isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-50">
        <Alert severity="warning" sx={{ mb: 2, width: '100%', maxWidth: 360 }}>无权限：仅管理员可查看盘点报告。</Alert>
        <Button variant="outlined" onClick={() => navigate(-1)}>返回</Button>
      </div>
    );
  }

  /** 管理员入口：选择任务后跳转任务级报告 */
  if (!taskId) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <header className="sticky top-0 z-10 bg-gradient-to-r from-primary to-[#4a148c] text-white px-4 py-3 flex items-center gap-3 shadow-lg">
          <IconButton color="inherit" size="small" onClick={() => navigate('/admin/tasks')}>
            <ArrowBackIosNewIcon fontSize="small" />
          </IconButton>
          <h2 className="text-sm font-semibold">盘点报告</h2>
        </header>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <p className="text-sm text-gray-500">请选择要生成报告的盘点任务</p>
          {taskOptionsLoading && <CircularProgress size={24} />}
          {!taskOptionsLoading && taskOptions.length === 0 && (
            <p className="text-sm text-gray-400">暂无可用任务</p>
          )}
          {taskOptions.map((t) => (
            <Card key={t.taskId} className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent onClick={() => navigate(`/tasks/${t.taskId}/report`)}>
                <Typography variant="subtitle1" className="font-semibold text-gray-900">
                  {t.taskName}
                </Typography>
                <div className="text-xs text-gray-400 mt-1">资产 {t.assetCount} 项 · {t.status}</div>
              </CardContent>
            </Card>
          ))}
          <div className="h-4" />
        </div>
      </div>
    );
  }

  /** AI 生成盘点报告（当前服务暂不可用，点击即提示已回退人工流程） */
  const handleGenerateReport = useCallback(async () => {
    if (!taskId) return;
    setAiLoading(true);
    setAiError(null);
    setAiMarkdown('');
    try {
      // AI 服务当前不可用，统一提示已回退人工流程，不再请求后端
      await new Promise((resolve) => setTimeout(resolve, 300));
      setAiError('AI服务暂不可用，已回退人工流程');
    } catch (err: unknown) {
      setAiError(err instanceof Error ? err.message : 'AI服务暂不可用，已回退人工流程');
    } finally {
      setAiLoading(false);
    }
  }, [taskId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="sticky top-0 z-10 bg-gradient-to-r from-primary to-[#4a148c] text-white px-4 py-3 flex items-center gap-3 shadow-lg">
          <IconButton color="inherit" size="small" onClick={() => navigate(-1)}>
            <ArrowBackIosNewIcon fontSize="small" />
          </IconButton>
          <h2 className="text-sm font-semibold">盘点报告</h2>
        </header>
        <div className="p-4 space-y-4">
          {[1, 2, 3].map((i) => <Card key={i}><CardContent><Skeleton variant="text" width="60%" /><Skeleton variant="text" width="40%" /></CardContent></Card>)}
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

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="sticky top-0 z-10 bg-gradient-to-r from-primary to-[#4a148c] text-white px-4 py-3 flex items-center gap-3 shadow-lg">
        <IconButton color="inherit" size="small" onClick={() => navigate(-1)}>
          <ArrowBackIosNewIcon fontSize="small" />
        </IconButton>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold truncate">盘点报告</h2>
        </div>
        <IconButton color="inherit" size="small" onClick={fetchData}>
          <RefreshIcon fontSize="small" />
        </IconButton>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* AI 生成汇报文案 */}
        <Button
          variant="contained"
          color="secondary"
          fullWidth
          startIcon={aiLoading ? <CircularProgress size={18} color="inherit" /> : <AutoAwesomeIcon />}
          onClick={handleGenerateReport}
          disabled={aiLoading}
          sx={{ py: 1.1, borderRadius: 2 }}
        >
          {aiLoading ? 'AI 生成中...' : '✨ AI 生成盘点报告'}
        </Button>
        {aiError && (
          <Alert severity="warning" sx={{ fontSize: '0.8rem' }}>{aiError}</Alert>
        )}

        {/* 报告头 */}
        <Card className="glow-border">
          <CardContent>
            <Typography variant="h6" className="font-bold text-gray-900 mb-2">
              {data.taskName}
            </Typography>
            <div className="grid grid-cols-2 gap-2 text-sm text-gray-500">
              <div>创建人：{data.createdBy}</div>
              <div>截止日期：{data.deadline || '--'}</div>
              <div>创建时间：{data.createdAt}</div>
              <div>资产总数：{data.totalAssets} 件</div>
            </div>
          </CardContent>
        </Card>

        {/* 盘点统计 */}
        <Card>
          <CardContent>
            <Typography variant="subtitle1" className="font-semibold text-gray-900 mb-3">
              盘点统计
            </Typography>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-green-50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-green-600">{data.completionRate}%</div>
                <div className="text-xs text-green-500 mt-1">完成率</div>
              </div>
              <div className="bg-red-50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-red-500">{data.abnormalRate}%</div>
                <div className="text-xs text-red-500 mt-1">异常率</div>
              </div>
              <div className="bg-blue-50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-blue-600">{data.normalCount}</div>
                <div className="text-xs text-blue-500 mt-1">正常件</div>
              </div>
              <div className="bg-orange-50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-orange-500">{data.abnormalCount}</div>
                <div className="text-xs text-orange-500 mt-1">异常件</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 复盘统计 */}
        {data.review.total > 0 && (
          <Card>
            <CardContent>
              <Typography variant="subtitle1" className="font-semibold text-gray-900 mb-3">
                复盘统计
              </Typography>
              <div className="flex gap-3">
                <Chip label={`总计 ${data.review.total} 件`} size="small" />
                <Chip label={`完成 ${data.review.completed} 件`} size="small" color="success" />
                {data.review.conflict > 0 && (
                  <Chip label={`冲突 ${data.review.conflict} 件`} size="small" color="error" />
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 异常清单 */}
        {data.abnormalList.length > 0 && (
          <Card>
            <CardContent>
              <Typography variant="subtitle1" className="font-semibold text-gray-900 mb-3">
                异常资产清单
              </Typography>
              <div className="space-y-2">
                {data.abnormalList.map((item, idx) => (
                  <div key={idx} className="py-2 border-b border-gray-100 last:border-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-mono text-gray-700">{item.assetCode}</span>
                      <Chip
                        label={item.status}
                        size="small"
                        color={item.status === '丢失' ? 'error' : 'warning'}
                      />
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {item.operatorName} · {item.time}
                    </div>
                    {item.remark && (
                      <div className="text-xs text-gray-500 mt-1 bg-gray-50 p-2 rounded">
                        {item.remark}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="h-4" />
      </div>

      {/* AI 汇报文案弹窗 */}
      <Dialog open={aiDialogOpen} onClose={() => setAiDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 700 }}>✨ AI 生成的盘点报告</DialogTitle>
        <DialogContent>
          <div className="text-sm text-gray-700 whitespace-pre-line bg-gray-50 rounded-lg p-3 max-h-80 overflow-auto">
            {aiMarkdown}
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAiDialogOpen(false)}>关闭</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}