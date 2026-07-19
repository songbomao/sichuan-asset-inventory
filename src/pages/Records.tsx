import { useEffect, useState, useCallback } from 'react';
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
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import CircularProgress from '@mui/material/CircularProgress';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
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

/** 状态对应颜色 */
const STATUS_COLORS: Record<string, 'success' | 'warning' | 'error' | 'default' | 'info'> = {
  '正常': 'success',
  '待维修': 'warning',
  '报废': 'error',
  '丢失': 'error',
};

/**
 * 盘点记录页
 */
export default function RecordsPage() {
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('all');

  // 详情弹窗
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<RecordItem | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [showPhoto, setShowPhoto] = useState(false);

  const fetchRecords = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const data = await getMyRecords();
      setRecords(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '加载盘点记录失败';
      setError(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  /** 根据筛选条件过滤记录 */
  const filteredRecords = filter === 'all'
    ? records
    : records.filter((r) => r.status === filter);

  /** 格式化时间 */
  const formatTime = (time: string): string => {
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
  };

  /** 打开详情弹窗（列表不带照片，单独拉详情） */
  const openDetail = async (record: RecordItem) => {
    setSelectedRecord(record);
    setShowPhoto(false);
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
  };

  return (
    <div className="p-4 space-y-4 bg-gray-50 min-h-screen">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">盘点记录</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {records.length > 0 ? `共 ${records.length} 条记录` : '暂无盘点记录'}
          </p>
        </div>
        <IconButton onClick={() => fetchRecords(true)} disabled={refreshing} color="primary">
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

      {/* 详情弹窗 */}
      <Dialog
        open={detailOpen}
        onClose={closeDetail}
        fullWidth
        maxWidth="xs"
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1.1rem', pb: 1 }}>
          盘点详情
        </DialogTitle>
        <DialogContent sx={{ pt: '8px !important' }}>
          {detailLoading && (
            <Box className="py-8 flex flex-col items-center justify-center text-gray-400">
              <CircularProgress size={32} sx={{ mb: 2 }} />
              <span className="text-sm">正在加载照片…</span>
            </Box>
          )}

          {detailError && (
            <Alert severity="error" sx={{ mb: 2, fontSize: '0.85rem' }}>
              {detailError}
            </Alert>
          )}

          {!detailLoading && selectedRecord && (
            <Box className="space-y-3">
              {/* 照片预览区（默认不加载） */}
              {selectedRecord.photoUrl ? (
                <Paper
                  elevation={0}
                  className="overflow-hidden rounded-xl border border-gray-100"
                >
                  {!showPhoto ? (
                    <button
                      onClick={() => setShowPhoto(true)}
                      className="w-full py-10 flex flex-col items-center justify-center text-gray-400 hover:bg-gray-50 transition-colors"
                    >
                      <PhotoCameraIcon sx={{ fontSize: 48, mb: 1, color: 'primary.main' }} />
                      <span className="text-sm font-medium">点击预览照片</span>
                      <span className="text-xs text-gray-300 mt-1">加载原图可能消耗较多流量</span>
                    </button>
                  ) : (
                    <img
                      src={selectedRecord.photoUrl}
                      alt="盘点照片"
                      className="w-full object-contain bg-gray-50"
                      style={{ maxHeight: '360px' }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  )}
                </Paper>
              ) : (
                <Paper
                  elevation={0}
                  className="rounded-xl border border-dashed border-gray-200 py-8 flex flex-col items-center justify-center text-gray-400"
                >
                  <PhotoCameraIcon sx={{ fontSize: 40, mb: 1 }} />
                  <span className="text-sm">无照片</span>
                </Paper>
              )}

              {/* 信息卡片 */}
              <Paper elevation={0} className="rounded-xl p-3 bg-gray-50/50 border border-gray-100">
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <DetailItem
                      icon={<InventoryIcon fontSize="small" color="action" />}
                      label="资产名称"
                      value={selectedRecord.assetName}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <DetailItem
                      icon={<CategoryIcon fontSize="small" color="action" />}
                      label="资产编码"
                      value={selectedRecord.assetCode}
                      mono
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <DetailItem
                      icon={<AssignmentIcon fontSize="small" color="action" />}
                      label="任务名称"
                      value={selectedRecord.taskName}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <DetailItem
                      label="盘点状态"
                      value={<StatusBadge status={selectedRecord.status} />}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <DetailItem
                      icon={<ScheduleIcon fontSize="small" color="action" />}
                      label="盘点时间"
                      value={formatTime(selectedRecord.createTime)}
                    />
                  </Grid>
                  {selectedRecord.location && (
                    <Grid item xs={12}>
                      <DetailItem
                        icon={<LocationOnIcon fontSize="small" color="action" />}
                        label="位置"
                        value={selectedRecord.location}
                      />
                    </Grid>
                  )}
                  {selectedRecord.remark && (
                    <Grid item xs={12}>
                      <DetailItem
                        icon={<NotesIcon fontSize="small" color="action" />}
                        label="备注"
                        value={selectedRecord.remark}
                      />
                    </Grid>
                  )}
                </Grid>
              </Paper>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={closeDetail} variant="contained" fullWidth sx={{ borderRadius: 2 }}>
            关闭
          </Button>
        </DialogActions>
      </Dialog>

      <div className="h-4" />
    </div>
  );
}

/** 详情项小组件 */
function DetailItem({
  icon,
  label,
  value,
  mono = false,
}: {
  icon?: React.ReactNode;
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-gray-400 flex items-center gap-1">
        {icon}
        {label}
      </span>
      <span className={`text-sm text-gray-800 break-words ${mono ? 'font-mono' : 'font-medium'}`}>
        {value}
      </span>
    </div>
  );
}
