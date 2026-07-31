import { useEffect, useState, useCallback, useMemo } from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Skeleton from '@mui/material/Skeleton';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import InboxIcon from '@mui/icons-material/Inbox';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import CircularProgress from '@mui/material/CircularProgress';
import SearchIcon from '@mui/icons-material/Search';
import InventoryIcon from '@mui/icons-material/Inventory';
import ScheduleIcon from '@mui/icons-material/Schedule';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import BadgeIcon from '@mui/icons-material/Badge';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { getMyRecordsFiltered, getRecordDetail, type RecordItem } from '../api/inventory';
import { getTaskList, type TaskItem } from '../api/tasks';
import StatusBadge from '../components/StatusBadge';
import ProgressBar from '../components/ProgressBar';
import { DetailDrawer, formatTime } from '../components/RecordDetailDrawer';

/** 筛选选项 */
const FILTERS = [
  { key: 'all', label: '全部' },
  { key: '正常', label: '正常' },
  { key: '待维修', label: '待维修' },
  { key: '报废', label: '报废' },
  { key: '丢失', label: '丢失' },
];

/** 派生卡片状态：本人名下资产全部盘点完成 → 已完成；否则沿用任务级状态 */
function deriveTaskStatus(t: TaskItem): string {
  if (t.assetCount > 0 && t.completedCount >= t.assetCount) return 'completed';
  return t.status;
}

/** 格式化截止时间（精确到秒） */
function formatDeadline(deadline: string): string {
  if (!deadline) return '--';
  try {
    const date = new Date(deadline);
    const datePart = date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
    const timePart = date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    const formatted = `${datePart} ${timePart}`;
    return formatted;
  } catch {
    return deadline;
  }
}

/** 判断是否临近/逾期 */
function isUrgent(deadline: string): boolean {
  try {
    const date = new Date(deadline);
    const now = new Date();
    return date.getTime() - now.getTime() < 3 * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

interface TaskGroup {
  task: TaskItem;
  records: RecordItem[];
}

/**
 * 我的盘点记录（责任人视角）— 按盘点任务维度组织
 * 外层按任务分组（卡片样式/内容对齐「我的盘点任务」），组内平铺该任务下所有固定资产盘点记录。
 * 顶部保留关键字（资产名称/编码）+ 状态筛选，可跨任务查询某一类物资的全部盘点记录。
 */
export default function MyRecords({ embedded = false }: { embedded?: boolean }) {
  // 平铺记录（来自 GetMyRecords，每条带 taskId/taskName）
  const [records, setRecords] = useState<RecordItem[]>([]);
  // 任务元数据（来自 GetTaskList，用于分组卡片展示进度/截止/位置等）
  const [tasks, setTasks] = useState<TaskItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 筛选条件
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

  /** 拉取任务元数据（仅一次，不随记录筛选变化） */
  const loadTasks = useCallback(async () => {
    try {
      const list = await getTaskList(true);
      setTasks(list);
    } catch {
      // 任务元数据拉取失败不阻断记录展示，分组时按记录内 taskName 兜底
    }
  }, []);

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
  }, [page, pageSize, status, keyword]);

  useEffect(() => {
    void loadTasks();
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
  };

  /** 按 taskId 分组（任务顺序对齐 GetTaskList，记录中出现的未知任务兜底补到末尾） */
  const groups = useMemo<TaskGroup[]>(() => {
    const byTask = new Map<string, RecordItem[]>();
    for (const r of records) {
      const arr = byTask.get(r.taskId);
      if (arr) arr.push(r);
      else byTask.set(r.taskId, [r]);
    }

    const result: TaskGroup[] = [];
    for (const t of tasks) {
      const recs = byTask.get(t.taskId);
      if (recs) {
        result.push({ task: t, records: recs });
        byTask.delete(t.taskId);
      }
    }
    // 兜底：记录所属任务不在 GetTaskList 返回中（如已归档/移除），用记录内信息构造最小任务卡
    for (const [taskId, recs] of byTask.entries()) {
      result.push({
        task: {
          taskId,
          taskName: recs[0]?.taskName ?? '盘点任务',
          assetCount: recs.length,
          completedCount: recs.length,
          deadline: '',
          status: 'completed',
          createTime: '',
          location: '',
        },
        records: recs,
      });
    }
    return result;
  }, [records, tasks]);

  return (
    <div className={embedded ? 'space-y-4' : 'min-h-screen bg-gray-50 pt-12'}>
      <div className={embedded ? 'space-y-4' : 'p-4 space-y-4'}>
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

        {/* 关键字筛选（资产名称/编码），跨任务查询某一类物资全部盘点记录 */}
        <PaperFilter>
          <Stack spacing={1.5}>
            <div className="flex gap-2">
              <TextField
                label="关键字 / 资产编码"
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
                <Skeleton variant="rounded" height={8} sx={{ mt: 1 }} />
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

        {/* 按任务分组的记录列表 */}
        {!loading &&
          groups.map((group) => (
            <TaskRecordGroup
              key={group.task.taskId}
              group={group}
              onOpenRecord={openDetail}
            />
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
        />

        <div className="h-4" />
      </div>
    </div>
  );
}

/**
 * 单个盘点任务分组卡片（样式/内容对齐「我的盘点任务」任务卡片）
 * 头部展示任务信息 + 进度；下方平铺该任务下的资产盘点记录。
 */
function TaskRecordGroup({
  group,
  onOpenRecord,
}: {
  group: TaskGroup;
  onOpenRecord: (r: RecordItem) => void;
}) {
  const task = group.task;
  const [expanded, setExpanded] = useState(false);
  const hasMeta = !!task.deadline || !!task.location || task.assetCount > 0;

  return (
    <Card className="glow-border">
      <CardContent>
        {/* 任务头部：名称 + 状态（点击整行展开/折叠所属盘点记录） */}
        <div
          className="flex items-start justify-between mb-2 cursor-pointer select-none"
          onClick={() => setExpanded((v) => !v)}
        >
          <Typography
            variant="subtitle1"
            component="h3"
            className="font-semibold text-gray-900"
            sx={{ flex: 1, mr: 1 }}
          >
            {task.taskName}
          </Typography>
          <div className="flex items-center gap-1 shrink-0">
            <StatusBadge status={deriveTaskStatus(task)} />
            <ChevronRightIcon
              sx={{
                fontSize: 20,
                color: 'gray',
                transition: 'transform 0.2s',
                transform: expanded ? 'rotate(90deg)' : 'none',
              }}
            />
          </div>
        </div>

        {/* 任务元信息：资产数 + 截止时间 */}
        {hasMeta && (
          <div className="flex items-center gap-4 text-sm text-gray-500 mb-2">
            {task.assetCount > 0 && <span>📦 资产 {task.assetCount} 项</span>}
            {task.deadline && (
              <span className={isUrgent(task.deadline) ? 'text-red-500 font-medium' : ''}>
                ⏰ 盘点截止日期 {formatDeadline(task.deadline)}
              </span>
            )}
          </div>
        )}

        {task.location && (
          <div className="text-xs text-gray-400 mb-2">📍 {task.location}</div>
        )}

        {/* 进度条（有真实任务元数据时展示整体进度，否则展示已盘记录数） */}
        {task.assetCount > 0 ? (
          <ProgressBar current={task.completedCount} total={task.assetCount} />
        ) : (
          <div className="text-xs text-gray-400 mb-1">本任务已盘 {group.records.length} 条记录</div>
        )}

        {/* 组内资产盘点记录（默认折叠，点击任务头部展开） */}
        {expanded ? (
          <div className="mt-3 space-y-2 border-t border-gray-100 pt-3">
            {group.records.map((r) => (
              <RecordRow key={r.recordId} record={r} onClick={() => onOpenRecord(r)} />
            ))}
          </div>
        ) : (
          <div className="mt-3 text-xs text-gray-400 border-t border-gray-100 pt-3">
            共 {group.records.length} 条盘点记录，点击上方任务名展开
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** 组内单条资产盘点记录 */
function RecordRow({ record, onClick }: { record: RecordItem; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer border border-gray-100 transition-colors"
    >
      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
        <InventoryIcon className="text-primary" sx={{ fontSize: 18 }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <Typography
            variant="subtitle2"
            component="h4"
            className="font-semibold text-gray-900 truncate"
          >
            {record.assetName}
          </Typography>
          <StatusBadge status={record.status} />
        </div>
        <Typography variant="caption" className="text-gray-400 font-mono block">
          {record.assetCode}
        </Typography>
        <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-gray-500">
          <span className="flex items-center gap-0.5">
            <ScheduleIcon fontSize="inherit" />
            {formatTime(record.createTime)}
          </span>
          {typeof record.inventoryQty === 'number' && (
            <span className="flex items-center gap-0.5 text-primary">
              <BadgeIcon fontSize="inherit" />
              盘点数量：{record.inventoryQty}
            </span>
          )}
        </div>
        {record.location && (
          <div className="flex items-center gap-0.5 text-xs text-gray-400 mt-0.5 truncate">
            <LocationOnIcon fontSize="inherit" />
            {record.location}
          </div>
        )}
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
