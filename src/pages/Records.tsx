import { useEffect, useState, useCallback, useRef } from 'react';
import React from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Skeleton from '@mui/material/Skeleton';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import RefreshIcon from '@mui/icons-material/Refresh';
import IconButton from '@mui/material/IconButton';
import InboxIcon from '@mui/icons-material/Inbox';
import Dialog from '@mui/material/Dialog';
import Slide from '@mui/material/Slide';
import type { TransitionProps } from '@mui/material/transitions';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import CircularProgress from '@mui/material/CircularProgress';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import CloseIcon from '@mui/icons-material/Close';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import ScheduleIcon from '@mui/icons-material/Schedule';
import InventoryIcon from '@mui/icons-material/Inventory';
import CategoryIcon from '@mui/icons-material/Category';
import AssignmentIcon from '@mui/icons-material/Assignment';
import NotesIcon from '@mui/icons-material/Notes';
import { getMyRecords, getRecordDetail, type RecordItem } from '../api/inventory';
import StatusBadge from '../components/StatusBadge';

/** 筛选选项 */
const FILTERS = [
  { key: 'all', label: '全部' },
  { key: '正常', label: '正常' },
  { key: '待维修', label: '待维修' },
  { key: '报废', label: '报废' },
  { key: '丢失', label: '丢失' },
];

/** 底部抽屉过渡 */
const SlideUp = React.forwardRef(function SlideUp(
  props: TransitionProps & { children: React.ReactElement },
  ref: React.Ref<unknown>
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

/** 格式化时间 */
function formatTime(time: string): string {
  if (!time) return '--';
  try {
    return new Date(time).toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return time;
  }
}

/** 移动端详情抽屉 */
function DetailDrawer({
  open,
  onClose,
  loading,
  error,
  record,
  showPhoto,
  setShowPhoto,
  setFullscreen,
}: {
  open: boolean;
  onClose: () => void;
  loading: boolean;
  error: string | null;
  record: RecordItem | null;
  showPhoto: boolean;
  setShowPhoto: (v: boolean) => void;
  setFullscreen: (v: boolean) => void;
}) {
  // 下滑关闭手势
  const startY = useRef(0);
  const currentY = useRef(0);
  const [dragOffset, setDragOffset] = useState(0);
  const dragging = useRef(false);

  const onTouchStart = (e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
    currentY.current = startY.current;
    dragging.current = true;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (!dragging.current) return;
    currentY.current = e.touches[0].clientY;
    const offset = Math.max(0, currentY.current - startY.current);
    setDragOffset(offset);
  };
  const onTouchEnd = () => {
    dragging.current = false;
    if (dragOffset > 80) {
      onClose();
    }
    setDragOffset(0);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen
      TransitionComponent={SlideUp}
      PaperProps={{
        sx: {
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          top: 'auto',
          m: 0,
          maxWidth: '100%',
          maxHeight: '92vh',
          borderRadius: '24px 24px 0 0',
          bgcolor: 'background.paper',
          transform: `translateY(${dragOffset}px)`,
          transition: dragging.current ? 'none' : 'transform 0.3s ease',
          display: 'flex',
          flexDirection: 'column',
        },
      }}
      hideBackdrop={false}
      BackdropProps={{ sx: { bgcolor: 'rgba(0,0,0,0.45)' } }}
    >
      {/* 拖拽条 */}
      <Box
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        sx={{
          width: '100%',
          pt: 1.5,
          pb: 0.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          cursor: 'grab',
        }}
      >
        <Box sx={{ width: 40, height: 4, borderRadius: 2, bgcolor: 'rgba(0,0,0,0.2)' }} />
      </Box>

      {/* 头部 */}
      <Box sx={{ px: 2.5, pb: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.05rem' }}>
          盘点详情
        </Typography>
        <IconButton size="small" onClick={onClose} sx={{ color: 'text.secondary' }}>
          <CloseIcon />
        </IconButton>
      </Box>

      {/* 内容区 */}
      <Box sx={{ flex: 1, overflow: 'auto', px: 2.5, pb: 2 }}>
        {loading && (
          <Box className="py-8 flex flex-col items-center justify-center text-gray-400">
            <CircularProgress size={28} sx={{ mb: 1.5 }} />
            <span className="text-sm">正在加载照片…</span>
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2, fontSize: '0.8rem' }}>
            {error}
          </Alert>
        )}

        {!loading && record && (
          <Box className="space-y-3">
            {/* 照片区 */}
            {record.photoUrl ? (
              <Box>
                {!showPhoto ? (
                  <Box
                    onClick={() => setShowPhoto(true)}
                    className="relative w-full h-40 rounded-2xl overflow-hidden bg-gray-100 cursor-pointer"
                  >
                    <img
                      src={record.photoUrl}
                      alt="盘点照片"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                    <Box className="absolute inset-0 flex items-center justify-center bg-black/30 text-white gap-1">
                      <PhotoCameraIcon fontSize="small" />
                      <span className="text-sm font-medium">查看原图</span>
                    </Box>
                  </Box>
                ) : (
                  <Box
                    onClick={() => setFullscreen(true)}
                    className="w-full rounded-2xl overflow-hidden bg-gray-100 cursor-pointer"
                  >
                    <img
                      src={record.photoUrl}
                      alt="盘点照片"
                      className="w-full object-contain bg-gray-50"
                      style={{ maxHeight: '240px' }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                    <Box className="text-center text-xs text-gray-500 py-1.5">点击照片可放大查看</Box>
                  </Box>
                )}
              </Box>
            ) : (
              <Box className="h-32 rounded-2xl bg-gray-100 flex flex-col items-center justify-center text-gray-400 gap-1">
                <PhotoCameraIcon fontSize="small" />
                <span className="text-xs">无照片</span>
              </Box>
            )}

            {/* 主要信息 */}
            <Paper elevation={0} className="rounded-2xl p-4 bg-gray-50/60 border border-gray-100">
              <Stack spacing={2.5}>
                <InfoRow label="资产名称" value={record.assetName} bold />
                <InfoRow label="资产编码" value={record.assetCode} mono />
                <InfoRow label="任务名称" value={record.taskName} />
                <InfoRow label="盘点状态" value={<StatusBadge status={record.status} />} />
              </Stack>
            </Paper>

            {/* 次要信息 */}
            <Paper elevation={0} className="rounded-2xl p-4 bg-gray-50/60 border border-gray-100">
              <Stack spacing={2.5}>
                <InfoRow label="盘点时间" value={formatTime(record.createTime)} small />
                {record.location && (
                  <InfoRow label="位置" value={record.location} small multiline />
                )}
                {record.remark && (
                  <InfoRow label="备注" value={record.remark} small multiline />
                )}
              </Stack>
            </Paper>
          </Box>
        )}
      </Box>

      {/* 底部关闭按钮 */}
      <Box sx={{ px: 2.5, pb: 2, pt: 0.5 }}>
        <Button onClick={onClose} variant="contained" fullWidth sx={{ borderRadius: 2, py: 1.1 }}>
          关闭
        </Button>
      </Box>
    </Dialog>
  );
}

/** 详情行：标签 + 值，同水平线，最紧凑 */
function InfoRow({
  label,
  value,
  bold = false,
  mono = false,
  small = false,
  multiline = false,
}: {
  label: string;
  value: React.ReactNode;
  bold?: boolean;
  mono?: boolean;
  small?: boolean;
  multiline?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className={`text-gray-400 shrink-0 pt-0.5 ${small ? 'text-[11px] w-12' : 'text-xs w-16'}`}>
        {label}
      </div>
      <div
        className={`flex-1 min-w-0 ${small ? 'text-xs' : 'text-sm'} ${
          mono ? 'font-mono' : bold ? 'font-bold text-gray-900' : 'text-gray-800'
        } ${multiline ? 'leading-relaxed' : 'break-words'}`}
      >
        {value}
      </div>
    </div>
  );
}

/**
 * 盘点记录页
 */
export default function RecordsPage() {
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  // 详情弹窗
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<RecordItem | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [showPhoto, setShowPhoto] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  const fetchRecords = useCallback(async (isRefresh = false, isLoadMore = false) => {
    if (isRefresh) setRefreshing(true);
    else if (isLoadMore) setLoadingMore(true);
    else setLoading(true);
    setError(null);

    try {
      const currentPage = isLoadMore ? page + 1 : 1;
      const { list, total: t } = await getMyRecords(currentPage, pageSize);
      setTotal(t);
      setHasMore(currentPage * pageSize < t);
      setPage(currentPage);
      setRecords((prev) => (isLoadMore ? [...prev, ...list] : list));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '加载盘点记录失败';
      setError(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [page, pageSize]);

  const loadMore = () => fetchRecords(false, true);

  useEffect(() => {
    fetchRecords();
  }, []);

  /** 根据筛选条件过滤记录 */
  const filteredRecords = filter === 'all'
    ? records
    : records.filter((r) => r.status === filter);

  /** 打开详情弹窗（列表不带照片，单独拉详情） */
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
    <div className="p-4 space-y-4 bg-gray-50 min-h-screen">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">盘点记录</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {records.length > 0 ? `共 ${records.length} 条记录${total > records.length ? ` / 总计 ${total} 条` : ''}` : '暂无盘点记录'}
          </p>
        </div>
        <IconButton onClick={() => fetchRecords(true)} disabled={refreshing || loadingMore} color="primary">
          <RefreshIcon className={refreshing ? 'animate-spin-refresh' : ''} />
        </IconButton>
      </div>

      {/* 筛选标签 */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <Chip
            key={f.key}
            label={f.label}
            size="small"
            variant={filter === f.key ? 'filled' : 'outlined'}
            color={filter === f.key ? 'primary' : 'default'}
            onClick={() => setFilter(f.key)}
            clickable
          />
        ))}
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
          <Card key={i}>
            <CardContent>
              <Skeleton variant="text" width="50%" height={24} />
              <Skeleton variant="text" width="70%" height={20} />
              <Skeleton variant="text" width="30%" height={20} />
            </CardContent>
          </Card>
        ))}

      {/* 空状态 */}
      {!loading && !error && filteredRecords.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <InboxIcon sx={{ fontSize: 64, mb: 2 }} />
          <p className="text-base font-medium">
            {records.length === 0 ? '暂无盘点记录' : '无匹配记录'}
          </p>
          <p className="text-sm mt-1">
            {records.length === 0 ? '完成盘点任务后记录将显示在此处' : '尝试切换筛选条件'}
          </p>
        </div>
      )}

      {/* 记录列表 */}
      {!loading &&
        filteredRecords.map((record) => (
          <Card
            key={record.recordId}
            className="hover:shadow-lg transition-shadow cursor-pointer border-l-4"
            sx={{ borderLeftColor: record.status === '正常' ? '#4caf50' : '#ff9800' }}
            onClick={() => openDetail(record)}
          >
            <CardContent sx={{ pb: '16px !important' }}>
              <div className="flex items-start gap-3">
                {/* 左侧图标 */}
                <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <InventoryIcon className="text-primary" />
                </div>
                {/* 中间内容 */}
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
  );
}
