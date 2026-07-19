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
import Button from '@mui/material/Button';
import { getMyRecords, type RecordItem } from '../api/inventory';
import StatusBadge from '../components/StatusBadge';

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

  return (
    <div className="p-4 space-y-4">
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
            className="hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => { setSelectedRecord(record); setDetailOpen(true); }}
          >
            <CardContent>
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0 mr-2">
                  <Typography
                    variant="subtitle1"
                    component="h3"
                    className="font-semibold text-gray-900 truncate"
                  >
                    {record.assetName}
                  </Typography>
                  <Typography variant="caption" className="text-gray-400 font-mono">
                    {record.assetCode}
                  </Typography>
                </div>
                <StatusBadge status={record.status} />
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span>📋 {record.taskName}</span>
                <span>🕐 {formatTime(record.createTime)}</span>
              </div>
              {record.location && (
                <div className="text-xs text-gray-400 mt-1">📍 {record.location}</div>
              )}
            </CardContent>
          </Card>
        ))}

      {/* 详情弹窗 */}
      <Dialog
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1rem' }}>
          盘点详情
        </DialogTitle>
        <DialogContent>
          {selectedRecord && (
            <div className="space-y-3 text-sm">
              {/* 水印照片 */}
              {selectedRecord.photoUrl && (
                <div className="rounded-lg overflow-hidden border border-gray-100">
                  <img
                    src={selectedRecord.photoUrl}
                    alt="盘点照片"
                    className="w-full object-contain max-h-60 bg-gray-50"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">资产名称</span>
                <span className="font-medium">{selectedRecord.assetName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">资产编码</span>
                <span className="font-mono">{selectedRecord.assetCode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">任务名称</span>
                <span>{selectedRecord.taskName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">盘点状态</span>
                <StatusBadge status={selectedRecord.status} />
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">盘点时间</span>
                <span>{formatTime(selectedRecord.createTime)}</span>
              </div>
              {selectedRecord.location && (
                <div className="flex justify-between">
                  <span className="text-gray-500">位置</span>
                  <span className="text-right max-w-[60%]">{selectedRecord.location}</span>
                </div>
              )}
              {selectedRecord.remark && (
                <div className="flex justify-between">
                  <span className="text-gray-500">备注</span>
                  <span className="text-right max-w-[60%]">{selectedRecord.remark}</span>
                </div>
              )}
            </div>
          )}
        </DialogContent>
        <div className="px-4 pb-4 flex justify-end">
          <Button onClick={() => setDetailOpen(false)}>关闭</Button>
        </div>
      </Dialog>

      <div className="h-4" />
    </div>
  );
}
