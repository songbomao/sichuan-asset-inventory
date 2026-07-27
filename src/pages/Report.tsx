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
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import RefreshIcon from '@mui/icons-material/Refresh';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import { generateReport, getReportArchive, type ReportData, type ReportArchiveEntry } from '../api/report';
import { WriteReport } from '../api/ai';
import { getTaskList, type TaskItem } from '../api/tasks';
import { useAuth } from '../contexts/AuthContext';

/**
 * 盘点报告页
 * - 任务级（/tasks/:taskId/report）：查看/生成该任务报告
 * - 管理员入口（/admin/report，无 taskId）：先选择任务再查看
 */
export default function ReportPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = Boolean(user?.isAdmin);

  const [data, setData] = useState<ReportData | null>(null);
  const [archive, setArchive] = useState<ReportArchiveEntry[]>([]);
  const [hasArchive, setHasArchive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  // 管理员无 taskId 时：任务选择器
  const [taskOptions, setTaskOptions] = useState<TaskItem[]>([]);
  const [taskOptionsLoading, setTaskOptionsLoading] = useState(false);

  // AI 生成汇报文案
  const [aiLoading, setAiLoading] = useState(false);
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [aiMarkdown, setAiMarkdown] = useState('');
  const [aiError, setAiError] = useState<string | null>(null);

  const loadReport = useCallback(async (tid: string) => {
    setLoading(true);
    setError(null);
    try {
      const list = await getReportArchive(tid);
      setArchive(list);
      if (list.length > 0) {
        setHasArchive(true);
        // 取最新一条归档，content 为 ReportData 的 JSON
        try {
          const parsed = JSON.parse(list[0].content) as ReportData;
          setData(parsed);
        } catch {
          setData(null);
        }
      } else {
        setHasArchive(false);
        setData(null);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '查询报告失败';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

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
      loadReport(taskId);
    } else {
      loadTaskOptions();
    }
  }, [taskId, loadReport, loadTaskOptions]);

  /** 管理员生成报告 */
  const handleGenerate = useCallback(async () => {
    if (!taskId || !isAdmin) return;
    setGenerating(true);
    setError(null);
    try {
      const report = await generateReport(taskId);
      setData(report);
      setHasArchive(true);
      await loadReport(taskId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '生成报告失败';
      setError(msg);
    } finally {
      setGenerating(false);
    }
  }, [taskId, isAdmin, loadReport]);

  /** AI 生成盘点汇报文案（调用后端 WriteReport，走天翼云大模型） */
  const handleGenerateReport = useCallback(async () => {
    if (!taskId) return;
    setAiLoading(true);
    setAiError(null);
    setAiMarkdown('');
    try {
      const result = await WriteReport({ taskId });
      setAiMarkdown(result.markdown || result.actionCardText || '');
      setAiDialogOpen(true);
    } catch (err: unknown) {
      setAiError(err instanceof Error ? err.message : 'AI服务暂不可用，已回退人工流程');
    } finally {
      setAiLoading(false);
    }
  }, [taskId]);

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
        <Button variant="outlined" onClick={() => loadReport(taskId)}>重新加载</Button>
        <Button variant="text" onClick={() => navigate(-1)} sx={{ mt: 1 }}>返回</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="sticky top-0 z-10 bg-gradient-to-r from-primary to-[#4a148c] text-white px-4 py-3 flex items-center gap-3 shadow-lg">
        <IconButton color="inherit" size="small" onClick={() => navigate(-1)}>
          <ArrowBackIosNewIcon fontSize="small" />
        </IconButton>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold truncate">盘点报告</h2>
        </div>
        <IconButton color="inherit" size="small" onClick={() => loadReport(taskId)}>
          <RefreshIcon fontSize="small" />
        </IconButton>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* 生成权限控制 + 空状态 */}
        {!hasArchive && (
          <Card className="border-l-4 border-l-amber-400">
            <CardContent>
              {isAdmin ? (
                <Box className="flex flex-col items-center gap-3 py-2">
                  <DescriptionOutlinedIcon sx={{ fontSize: 40, color: '#f59e0b' }} />
                  <Typography variant="body2" className="text-gray-600 text-center">
                    暂无报告，点击下方按钮生成盘点报告
                  </Typography>
                  <Button
                    variant="contained"
                    color="warning"
                    startIcon={generating ? <CircularProgress size={18} color="inherit" /> : <AutoAwesomeIcon />}
                    onClick={handleGenerate}
                    disabled={generating}
                    sx={{ py: 1.1, borderRadius: 2 }}
                  >
                    {generating ? '生成中...' : '生成盘点报告'}
                  </Button>
                </Box>
              ) : (
                <Box className="flex flex-col items-center gap-2 py-2">
                  <DescriptionOutlinedIcon sx={{ fontSize: 40, color: '#9ca3af' }} />
                  <Typography variant="body2" className="text-gray-500 text-center">
                    暂无报告，请联系管理员生成
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        )}

        {/* 管理员操作区（已存在报告时） */}
        {hasArchive && isAdmin && (
          <div className="flex gap-2">
            <Button
              variant="outlined"
              color="warning"
              fullWidth
              startIcon={generating ? <CircularProgress size={18} color="inherit" /> : <AutoAwesomeIcon />}
              onClick={handleGenerate}
              disabled={generating}
              sx={{ py: 1, borderRadius: 2 }}
            >
              {generating ? '重新生成中...' : '重新生成报告'}
            </Button>
            <Button
              variant="contained"
              color="secondary"
              fullWidth
              startIcon={aiLoading ? <CircularProgress size={18} color="inherit" /> : <AutoAwesomeIcon />}
              onClick={handleGenerateReport}
              disabled={aiLoading}
              sx={{ py: 1, borderRadius: 2 }}
            >
              {aiLoading ? 'AI 生成中...' : '✨ AI 汇报'}
            </Button>
          </div>
        )}
        {aiError && (
          <Alert severity="warning" sx={{ fontSize: '0.8rem' }}>{aiError}</Alert>
        )}

        {data && (
          <>
            {/* 报告头：名称 / 盘点日期 / 盘点范围 */}
            <Card className="glow-border">
              <CardContent>
                <Typography variant="h6" className="font-bold text-gray-900 mb-3">
                  {data.taskName}
                </Typography>
                <div className="grid grid-cols-1 gap-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">盘点日期</span>
                    <span className="text-gray-700 font-medium">{data.createdAt}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">截止日期</span>
                    <span className="text-gray-700 font-medium">{data.deadline || '--'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">创建人</span>
                    <span className="text-gray-700 font-medium">{data.createdBy || '--'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">盘点范围</span>
                    <span className="text-gray-700 font-medium text-right max-w-[70%]">{data.scopeText}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 汇总统计（独立区块） */}
            <Card>
              <CardContent>
                <Typography variant="subtitle1" className="font-semibold text-gray-900 mb-3">
                  盘点结果统计
                </Typography>
                <div className="grid grid-cols-2 gap-3">
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

            {/* 资产差异明细表 */}
            <Card>
              <CardContent>
                <Typography variant="subtitle1" className="font-semibold text-gray-900 mb-2">
                  资产盘点明细
                </Typography>
                <Typography variant="caption" className="text-gray-400">
                  共 {data.items.length} 项 · 账面数量与实盘数量差异已标注（盘盈绿色 / 盘亏红色）
                </Typography>
                <TableContainer sx={{ mt: 1.5, maxHeight: 480 }}>
                  <Table stickyHeader size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>序号</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>物品名称</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>账面数量</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>实盘数量</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>差异数量</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>备注</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {data.items.map((it) => {
                        const diffColor =
                          it.diffQty > 0 ? 'text-green-600 font-bold' : it.diffQty < 0 ? 'text-red-500 font-bold' : 'text-gray-500';
                        const diffLabel =
                          it.diffQty > 0 ? `盘盈 +${it.diffQty}` : it.diffQty < 0 ? `盘亏 ${it.diffQty}` : '0';
                        return (
                          <TableRow key={it.index} hover>
                            <TableCell>{it.index}</TableCell>
                            <TableCell>
                              <div className="font-medium text-gray-800">{it.assetName || it.assetCode}</div>
                              <div className="text-xs text-gray-400 font-mono">{it.assetCode}</div>
                            </TableCell>
                            <TableCell align="right">{it.bookQty}</TableCell>
                            <TableCell align="right">{it.actualQty}</TableCell>
                            <TableCell align="right" className={diffColor}>{diffLabel}</TableCell>
                            <TableCell className="text-gray-500 max-w-[140px] truncate" title={it.remark}>
                              {it.remark || '--'}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
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

            {/* 异常资产清单 */}
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
          </>
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
