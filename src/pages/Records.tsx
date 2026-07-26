import { useEffect, useState, useCallback } from 'react';
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
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import ScheduleIcon from '@mui/icons-material/Schedule';
import InventoryIcon from '@mui/icons-material/Inventory';
import CategoryIcon from '@mui/icons-material/Category';
import AssignmentIcon from '@mui/icons-material/Assignment';
import NotesIcon from '@mui/icons-material/Notes';
import { getMyRecords, getRecordDetail, type RecordItem } from '../api/inventory';
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
 * 盘点记录页
 * @param embedded 嵌入模式（如资产档案-盘点时间线子 tab 复用），隐藏独立页头
 */
export default function RecordsPage({ embedded = false }: { embedded?: boolean }) {
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
    <div className={embedded ? 'space-y-4' : 'p-4 space-y-4 bg-gray-50 min-h-screen'}>
      {/* 头部（仅独立页显示） */}
      {!embedded && (
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
      )}

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
