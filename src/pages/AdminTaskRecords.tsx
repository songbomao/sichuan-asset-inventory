import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Skeleton from '@mui/material/Skeleton';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import InboxIcon from '@mui/icons-material/Inbox';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';
import Stack from '@mui/material/Stack';
import LinearProgress from '@mui/material/LinearProgress';
import TextField from '@mui/material/TextField';
import CircularProgress from '@mui/material/CircularProgress';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import InventoryIcon from '@mui/icons-material/Inventory';
import AssignmentIcon from '@mui/icons-material/Assignment';
import ScheduleIcon from '@mui/icons-material/Schedule';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import BadgeIcon from '@mui/icons-material/Badge';
import PeopleIcon from '@mui/icons-material/People';
import {
  getTaskRecords,
  getTaskRecordSummary,
  getRecordDetail,
  type RecordItem,
  type TaskRecordSummary,
} from '../api/inventory';
import StatusBadge from '../components/StatusBadge';
import { DetailDrawer, formatTime } from '../components/RecordDetailDrawer';

/** 筛选选项 */
const FILTERS = [
  { key: 'all', label: '全部' },
  { key: '正常', label: '正常' },
  { key: '待维修', label: '待维修' },
  { key: '报废', label: '报废' },
  { key: '丢失', label: '丢失' },
];

/**
 * 任务盘点记录（管理员视角）
 * 独立页：汇总统计 + 记录列表（含盘点人）+ 参与人列表
 */
export default function AdminTaskRecords() {
  const { taskId = '' } = useParams();
  const navigate = useNavigate();

  const [summary, setSummary] = useState<TaskRecordSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);

  const [records, setRecords] = useState<RecordItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 筛选
  const [status, setStatus] = useState('all');
  const [keyword, setKeyword] = useState('');

  // 分页
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  // 详情弹窗
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<RecordItem | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [showPhoto, setShowPhoto] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  const fetchSummary = useCallback(async () => {
    if (!taskId) return;
    setSummaryLoading(true);
    try {
      const s = await getTaskRecordSummary(taskId);
      setSummary(s);
    } catch {
      setSummary(null);
    } finally {
      setSummaryLoading(false);
    }
  }, [taskId]);

  const fetchRecords = useCallback(async (isLoadMore = false) => {
    if (isLoadMore) setLoadingMore(true);
    else setLoading(true);
    setError(null);

    try {
      const currentPage = isLoadMore ? page + 1 : 1;
      const { list, total: t } = await getTaskRecords({
        taskId,
        page: currentPage,
        pageSize,
        status: status === 'all' ? undefined : status,
        keyword: keyword.trim() || undefined,
      });
      setTotal(t);
      setHasMore(currentPage * pageSize < t);
      setPage(currentPage);
      setRecords((prev) => (isLoadMore ? [...prev, ...list] : list));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '加载盘点记录失败';
      setError(msg);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [taskId, page, pageSize, status, keyword]);

  useEffect(() => {
    void fetchSummary();
    void fetchRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyFilter = (nextStatus?: string) => {
    const targetStatus = nextStatus ?? status;
    if (nextStatus !== undefined) setStatus(nextStatus);
    setLoading(true);
    setError(null);
    getTaskRecords({
      taskId,
      page: 1,
      pageSize,
      status: targetStatus === 'all' ? undefined : targetStatus,
      keyword: keyword.trim() || undefined,
    })
      .then(({ list, total: t }) => {
        setTotal(t);
        setHasMore(1 * pageSize < t);
        setPage(1);
        setRecords(list);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : '加载盘点记录失败');
      })
      .finally(() => setLoading(false));
  };

  const loadMore = () => fetchRecords(true);

  const openDetail = async (record: RecordItem) => {
    setSelectedRecord(record);
    setShowPhoto(false);
    setFullscreen(false);
    setDetailError(null);
    setDetailLoading(true);
    setDetailOpen(true);

    try {
      const detail = await getRecordDetail(record.recordId);
      setSelectedRecord(detail);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '加载详情失败';
      setDetailError(msg);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setDetailOpen(false);
    setSelectedRecord(null);
    setShowPhoto(false);
    setFullscreen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 独立页头部 */}
      <div className="sticky top-0 z-10 bg-gradient-to-r from-primary to-[#4a148c] text-white px-4 py-3 flex items-center gap-3 shadow-lg">
        <IconButton
          size="small"
          onClick={() => navigate(-1)}
          sx={{ color: '#fff', p: 0.5 }}
          aria-label="返回"
        >
          <ArrowBackIosNewIcon fontSize="small" />
        </IconButton>
        <div className="flex-1">
          <h1 className="text-lg font-bold leading-tight">任务盘点记录</h1>
          <p className="text-xs text-white/80 mt-0.5">
            {summary?.taskName ? summary.taskName : `任务 ${taskId}`}
          </p>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* 汇总视图 */}
        {summaryLoading ? (
          <Skeleton variant="rectangular" height={140} sx={{ borderRadius: 3 }} />
        ) : summary && (
          <Card className="glow-border">
            <CardContent>
              <div className="flex items-center justify-between mb-3">
                <Typography variant="subtitle1" className="font-bold text-gray-900">
                  盘点进度概览
                </Typography>
                <Chip
                  label={`完成率 ${summary.completionRate ?? 0}%`}
                  color={(summary.completionRate ?? 0) >= 100 ? 'success' : 'primary'}
                  size="small"
                />
              </div>

              <Box className="mb-3">
                <Box className="flex items-center justify-between text-xs text-gray-500 mb-1">
                  <span>盘点进度</span>
                  <span>{summary.recordCount} / {summary.totalAssets} 项</span>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={Math.min(100, summary.completionRate ?? 0)}
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>

              <div className="grid grid-cols-4 gap-2 text-center">
                <SummaryStat label="正常" value={statusCount(summary.byStatus, '正常')} color="#4caf50" />
                <SummaryStat label="待维修" value={statusCount(summary.byStatus, '待维修')} color="#ff9800" />
                <SummaryStat label="报废" value={statusCount(summary.byStatus, '报废')} color="#f44336" />
                <SummaryStat label="丢失" value={statusCount(summary.byStatus, '丢失')} color="#9c27b0" />
              </div>

              {/* 参与人列表 */}
              {summary.byOperator && summary.byOperator.length > 0 && (
                <Box className="mt-3 pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-1 text-xs text-gray-500 mb-1.5">
                    <PeopleIcon fontSize="inherit" />
                    参与盘点人（{summary.byOperator.length}）
                  </div>
                  <Box className="flex flex-wrap gap-1">
                    {summary.byOperator.map((op) => (
                      <Chip
                        key={`${op.userName}_${op.dingtalkUserId ?? ''}`}
                        label={
                          op.abnormalCount > 0
                            ? `${op.userName} ${op.completedCount}/${op.assetCount} · 异常${op.abnormalCount}`
                            : `${op.userName} ${op.completedCount}/${op.assetCount}`
                        }
                        size="small"
                        variant="outlined"
                        color={op.abnormalCount > 0 ? 'warning' : 'default'}
                      />
                    ))}
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>
        )}

        {/* 状态筛选 */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {FILTERS.map((f) => (
            <Chip
              key={f.key}
              label={f.label}
              size="small"
              variant={status === f.key ? 'filled' : 'outlined'}
              color={status === f.key ? 'primary' : 'default'}
              onClick={() => applyFilter(f.key)}
              clickable
            />
          ))}
        </div>

        {/* 关键字筛选 */}
        <TextField
          label="关键字（资产名称/编码/盘点人）"
          size="small"
          fullWidth
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') applyFilter();
          }}
        />

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
                <Skeleton variant="text" width="50%" height={24} />
                <Skeleton variant="text" width="70%" height={20} />
                <Skeleton variant="text" width="30%" height={20} />
              </CardContent>
            </Card>
          ))}

        {/* 空状态 */}
        {!loading && !error && records.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <InboxIcon sx={{ fontSize: 64, mb: 2 }} />
            <p className="text-base font-medium">暂无盘点记录</p>
            <p className="text-sm mt-1">该任务尚未产生盘点记录</p>
          </div>
        )}

        {/* 记录列表 */}
        {!loading &&
          records.map((record) => (
            <Card
              key={record.recordId}
              className="glow-border hover:shadow-glow transition-shadow cursor-pointer border-l-4"
              sx={{ borderLeftColor: record.status === '正常' ? '#4caf50' : '#ff9800' }}
              onClick={() => openDetail(record)}
            >
              <CardContent sx={{ pb: '16px !important' }}>
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <InventoryIcon className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <Typography
                        variant="subtitle1"
                        component="h3"
                        className="font-semibold text-gray-900 truncate"
                      >
                        {record.assetName}
                      </Typography>
                      <StatusBadge status={record.status} />
                    </div>
                    <Typography variant="caption" className="text-gray-400 font-mono block">
                      {record.assetCode}
                    </Typography>
                    <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-gray-500">
                      <span className="flex items-center gap-0.5">
                        <ScheduleIcon fontSize="inherit" />
                        {formatTime(record.createTime)}
                      </span>
                      {record.operatorName && (
                        <span className="flex items-center gap-0.5">
                          <BadgeIcon fontSize="inherit" />
                          {record.operatorName}
                        </span>
                      )}
                    </div>
                    {typeof record.inventoryQty === 'number' && (
                      <div className="flex items-center gap-0.5 text-xs text-primary mt-1">
                        <AssignmentIcon fontSize="inherit" />
                        盘点数量：{record.inventoryQty}
                      </div>
                    )}
                    {record.location && (
                      <div className="flex items-center gap-0.5 text-xs text-gray-400 mt-1 truncate">
                        <LocationOnIcon fontSize="inherit" />
                        {record.location}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

        {/* 加载更多 */}
        {!loading && !loadingMore && hasMore && (
          <Button
            variant="outlined"
            fullWidth
            onClick={loadMore}
            sx={{ borderRadius: 2, textTransform: 'none', py: 1 }}
          >
            加载更多（已显示 {records.length} / {total} 条）
          </Button>
        )}
        {loadingMore && (
          <Box className="py-4 flex items-center justify-center text-gray-400 gap-2">
            <CircularProgress size={20} />
            <span className="text-sm">加载中…</span>
          </Box>
        )}

        {/* 详情弹窗 */}
        <DetailDrawer
          open={detailOpen}
          onClose={closeDetail}
          loading={detailLoading}
          error={detailError}
          record={selectedRecord}
          showPhoto={showPhoto}
          setShowPhoto={setShowPhoto}
          setFullscreen={setFullscreen}
        />

        {/* 全屏照片查看 */}
        <Dialog
          open={fullscreen}
          onClose={() => setFullscreen(false)}
          fullScreen
          PaperProps={{ sx: { bgcolor: 'rgba(0,0,0,0.95)', color: '#fff' } }}
        >
          <Box
            className="w-full h-full flex items-center justify-center"
            onClick={() => setFullscreen(false)}
          >
            {selectedRecord?.photoUrl && (
              <img
                src={selectedRecord.photoUrl}
                alt="盘点照片放大"
                className="max-w-full max-h-full object-contain"
                onClick={(e) => {
                  e.stopPropagation();
                  setFullscreen(false);
                }}
              />
            )}
          </Box>
        </Dialog>

        <div className="h-4" />
      </div>
    </div>
  );
}

/** 汇总统计单项 */
function SummaryStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-xl bg-gray-50 py-2">
      <div className="text-lg font-bold" style={{ color }}>
        {value ?? 0}
      </div>
      <div className="text-[11px] text-gray-500">{label}</div>
    </div>
  );
}

/** 从 byStatus 数组取某状态的数量 */
function statusCount(
  byStatus: { status: string; count: number }[] | undefined,
  key: string,
): number {
  if (!byStatus) return 0;
  const found = byStatus.find((s) => s.status === key);
  return found ? found.count : 0;
}
