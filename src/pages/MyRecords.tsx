import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
import TextField from '@mui/material/TextField';
import CircularProgress from '@mui/material/CircularProgress';
import SearchIcon from '@mui/icons-material/Search';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import InventoryIcon from '@mui/icons-material/Inventory';
import AssignmentIcon from '@mui/icons-material/Assignment';
import ScheduleIcon from '@mui/icons-material/Schedule';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import BadgeIcon from '@mui/icons-material/Badge';
import { getMyRecordsFiltered, getRecordDetail, type RecordItem } from '../api/inventory';
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
 * 我的盘点记录（责任人视角）
 * 独立页：筛选（状态/起止日期/关键字）+ 列表（含盘点数量）+ 分页 + 复用详情抽屉
 */
export default function MyRecords() {
  const navigate = useNavigate();

  const [records, setRecords] = useState<RecordItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 筛选条件
  const [status, setStatus] = useState('all');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
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

  const fetchRecords = useCallback(async (isLoadMore = false) => {
    if (isLoadMore) setLoadingMore(true);
    else setLoading(true);
    setError(null);

    try {
      const currentPage = isLoadMore ? page + 1 : 1;
      const { list, total: t } = await getMyRecordsFiltered({
        page: currentPage,
        pageSize,
        status: status === 'all' ? undefined : status,
        startTime: startTime || undefined,
        endTime: endTime || undefined,
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
  }, [page, pageSize, status, startTime, endTime, keyword]);

  useEffect(() => {
    fetchRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** 切换筛选条件后重新查询（重置分页） */
  const applyFilter = (nextStatus?: string) => {
    const targetStatus = nextStatus ?? status;
    if (nextStatus !== undefined) setStatus(nextStatus);
    setLoading(true);
    setError(null);
    getMyRecordsFiltered({
      page: 1,
      pageSize,
      status: targetStatus === 'all' ? undefined : targetStatus,
      startTime: startTime || undefined,
      endTime: endTime || undefined,
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

  /** 打开详情弹窗 */
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

  /** 关闭详情弹窗 */
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
          <h1 className="text-lg font-bold leading-tight">我的盘点记录</h1>
          <p className="text-xs text-white/80 mt-0.5">
            {records.length > 0 ? `已显示 ${records.length} / 共 ${total} 条` : '按条件筛选你的盘点记录'}
          </p>
        </div>
      </div>

      <div className="p-4 space-y-4">
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

        {/* 日期 + 关键字筛选 */}
        <PaperFilter>
          <Stack spacing={1.5}>
            <div className="flex gap-2">
              <TextField
                label="开始日期"
                type="date"
                size="small"
                fullWidth
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="结束日期"
                type="date"
                size="small"
                fullWidth
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </div>
            <div className="flex gap-2">
              <TextField
                label="关键字（资产名称/编码）"
                size="small"
                fullWidth
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') applyFilter();
                }}
              />
              <Button
                variant="contained"
                onClick={() => applyFilter()}
                sx={{ borderRadius: 2, textTransform: 'none', px: 2, whiteSpace: 'nowrap' }}
                startIcon={<SearchIcon />}
              >
                查询
              </Button>
            </div>
          </Stack>
        </PaperFilter>

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
            <p className="text-sm mt-1">调整筛选条件，或完成盘点任务后记录将显示在此处</p>
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
                        <AssignmentIcon fontSize="inherit" />
                        {record.taskName}
                      </span>
                      <span className="flex items-center gap-0.5">
                        <ScheduleIcon fontSize="inherit" />
                        {formatTime(record.createTime)}
                      </span>
                    </div>
                    {typeof record.inventoryQty === 'number' && (
                      <div className="flex items-center gap-0.5 text-xs text-primary mt-1">
                        <BadgeIcon fontSize="inherit" />
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

/** 筛选卡片容器（轻封装，避免重复 className） */
function PaperFilter({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white/80 border border-gray-100 shadow-sm p-3">
      {children}
    </div>
  );
}
