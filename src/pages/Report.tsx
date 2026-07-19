import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Skeleton from '@mui/material/Skeleton';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import RefreshIcon from '@mui/icons-material/Refresh';
import Divider from '@mui/material/Divider';
import { generateReport, type ReportData } from '../api/report';

/**
 * 盘点报告页
 */
export default function ReportPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();

  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    </div>
  );
}