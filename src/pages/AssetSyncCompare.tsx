import { useEffect, useRef, useState, useCallback } from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TablePagination from '@mui/material/TablePagination';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';
import IconButton from '@mui/material/IconButton';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import SyncIcon from '@mui/icons-material/Sync';
import PrintIcon from '@mui/icons-material/Print';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import {
  getAssetTable,
  compareAssets,
  previewSyncAssets,
  syncAssets,
  type AssetTableItem,
  type CompareAssetsResult,
  type PreviewSyncResult,
  type SyncAssetsResult,
  type SyncDetail,
} from '../api/admin';

/** 表格列定义 */
const COLUMNS: { key: keyof AssetTableItem; label: string; numeric?: boolean }[] = [
  { key: 'assetCode', label: '资产编号' },
  { key: 'assetName', label: '名称' },
  { key: 'categoryName', label: '类别' },
  { key: 'useStatus', label: '状态' },
  { key: 'originalValue', label: '原值', numeric: true },
  { key: 'netValue', label: '净值', numeric: true },
];

/** 变更类型中文 */
const CHANGE_LABEL: Record<string, string> = {
  insert: '新增',
  update: '更新',
  delete: '删除',
};
const CHANGE_COLOR: Record<string, 'success' | 'warning' | 'error'> = {
  insert: 'success',
  update: 'warning',
  delete: 'error',
};

/** 把值转成可读字符串（空值显示 --） */
function fmt(v: string | number | null | undefined): string {
  if (v === null || v === undefined || v === '') return '--';
  return String(v);
}

/**
 * 固定资产对比与同步（仅管理员）
 * - 本地表数据表格 + 搜索 + 分页
 * - 差异对比（本地表 / 视图 / 不一致）
 * - 手动同步（预览 → 二次确认 → 执行）
 * - 导出 PDF（浏览器打印方案，保证中文不乱码）
 */
export default function AssetSyncCompare() {
  /* ---------- 表格 + 搜索 + 分页 ---------- */
  const [keyword, setKeyword] = useState('');
  const [debounced, setDebounced] = useState('');
  const [page, setPage] = useState(0); // MUI TablePagination 从 0 开始
  const [pageSize, setPageSize] = useState(20);
  const [rows, setRows] = useState<AssetTableItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchTable = useCallback(
    async (kw: string, p: number, ps: number) => {
      setLoading(true);
      setError(null);
      try {
        const res = await getAssetTable({ keyword: kw, page: p + 1, pageSize: ps }); // 后端从 1 开始
        setRows(res.list || []);
        setTotal(res.total || 0);
      } catch (err) {
        setError(err instanceof Error ? err.message : '加载资产表失败');
        setRows([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  // 防抖搜索（参考 AdminConfigDialog 的 debounce 写法）
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setDebounced(keyword.trim()), 400);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [keyword]);

  // 关键字变化后回到第一页并重新拉取
  useEffect(() => {
    setPage(0);
    fetchTable(debounced, 0, pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced, pageSize]);

  /* ---------- 差异对比 ---------- */
  const [compare, setCompare] = useState<CompareAssetsResult | null>(null);
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareError, setCompareError] = useState<string | null>(null);

  const handleCompare = async () => {
    setCompareLoading(true);
    setCompareError(null);
    try {
      const res = await compareAssets();
      setCompare(res);
    } catch (err) {
      setCompareError(err instanceof Error ? err.message : '差异对比失败');
    } finally {
      setCompareLoading(false);
    }
  };

  /* ---------- 同步预览 ---------- */
  const [preview, setPreview] = useState<PreviewSyncResult | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const handlePreview = async () => {
    setPreviewLoading(true);
    setPreviewError(null);
    try {
      const res = await previewSyncAssets();
      setPreview(res);
    } catch (err) {
      setPreviewError(err instanceof Error ? err.message : '同步预览失败');
    } finally {
      setPreviewLoading(false);
    }
  };

  /* ---------- 确认同步 ---------- */
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncAssetsResult | null>(null);

  const handleConfirmSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await syncAssets();
      setSyncResult(res);
      setConfirmOpen(false);
      // 同步成功后刷新表格与对比
      setPreview(null);
      setCompare(null);
      fetchTable(debounced, page, pageSize);
    } catch (err) {
      setSyncResult({
        inserted: 0,
        updated: 0,
        deleted: 0,
        success: false,
        message: err instanceof Error ? err.message : '同步失败',
      });
      setConfirmOpen(false);
    } finally {
      setSyncing(false);
    }
  };

  /* ---------- 导出 PDF（浏览器打印） ---------- */
  const handlePrint = () => window.print();

  return (
    <div className="space-y-4">
      {/* 操作工具条 */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <TextField
          size="small"
          placeholder="搜索资产编号 / 名称"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          InputProps={{ startAdornment: <SearchIcon fontSize="small" className="text-gray-400 mr-1" /> }}
          sx={{ flex: 1, minWidth: 160, borderRadius: 2 }}
        />
        <div className="flex gap-1 shrink-0">
          <IconButton onClick={() => fetchTable(debounced, page, pageSize)} color="primary" size="small" disabled={loading}>
            <RefreshIcon className={loading ? 'animate-spin-refresh' : ''} />
          </IconButton>
          <Button
            variant="outlined"
            size="small"
            startIcon={<PrintIcon />}
            onClick={handlePrint}
            sx={{ borderRadius: '10px', textTransform: 'none', whiteSpace: 'nowrap' }}
          >
            导出PDF
          </Button>
        </div>
      </div>

      {/* 对比 / 同步 入口 */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
        <Button
          variant="contained"
          size="small"
          startIcon={<CompareArrowsIcon />}
          onClick={handleCompare}
          disabled={compareLoading}
          sx={{ borderRadius: '10px', textTransform: 'none', flex: 1 }}
        >
          {compareLoading ? '对比中...' : '差异对比'}
        </Button>
        <Button
          variant="outlined"
          size="small"
          startIcon={<SyncIcon />}
          onClick={handlePreview}
          disabled={previewLoading}
          sx={{ borderRadius: '10px', textTransform: 'none', flex: 1 }}
        >
          {previewLoading ? '预览中...' : '同步预览'}
        </Button>
      </Stack>

      {/* 错误提示 */}
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ fontSize: '0.85rem' }}>
          {error}
        </Alert>
      )}

      {/* 差异对比结果 */}
      {compareError && (
        <Alert severity="error" sx={{ fontSize: '0.85rem' }}>
          {compareError}
        </Alert>
      )}
      {compare && (
        <Stack spacing={1.5}>
          <Alert severity="info" sx={{ fontSize: '0.8rem' }}>
            本地表 {compare.summary.localCount} 条 · 视图 {compare.summary.viewCount} 条
          </Alert>

          {/* 仅本地表存在 */}
          <Accordion disableGutters elevation={0} sx={{ borderRadius: 2, '&:before': { display: 'none' } }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ bgcolor: 'rgba(244,67,54,0.06)' }}>
              <Typography sx={{ fontWeight: 600, fontSize: '0.9rem' }} color="error">
                仅本地表存在（{compare.summary.onlyInTableCount} 条）
              </Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ p: 0 }}>
              <DiffList
                items={compare.onlyInTable.map((i) => ({ assetCode: i.assetCode, assetName: i.assetName }))}
                emptyText="无：本地表记录均能在视图中找到"
              />
            </AccordionDetails>
          </Accordion>

          {/* 仅视图存在 */}
          <Accordion disableGutters elevation={0} sx={{ borderRadius: 2, '&:before': { display: 'none' } }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ bgcolor: 'rgba(76,175,80,0.06)' }}>
              <Typography sx={{ fontWeight: 600, fontSize: '0.9rem' }} color="success.main">
                仅视图存在（{compare.summary.onlyInViewCount} 条）
              </Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ p: 0 }}>
              <DiffList
                items={compare.onlyInView.map((i) => ({ assetCode: i.assetCode, assetName: i.assetName }))}
                emptyText="无：视图记录均已同步到本地表"
              />
            </AccordionDetails>
          </Accordion>

          {/* 字段不一致 */}
          <Accordion defaultExpanded disableGutters elevation={0} sx={{ borderRadius: 2, '&:before': { display: 'none' } }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ bgcolor: 'rgba(255,152,0,0.06)' }}>
              <Typography sx={{ fontWeight: 600, fontSize: '0.9rem' }} color="warning.main">
                字段不一致（{compare.summary.differentCount} 条）
              </Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ p: 1 }}>
              {compare.different.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.82rem' }}>
                  无：两边字段值完全一致
                </Typography>
              ) : (
                <Stack spacing={1.5}>
                  {compare.different.map((d) => (
                    <Paper key={d.assetCode} variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono text-xs text-gray-700">{d.assetCode}</span>
                        <span className="text-sm font-medium text-gray-900 truncate ml-2">{d.assetName}</span>
                      </div>
                      <Stack spacing={0.5}>
                        {d.diffs.map((f, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-xs flex-wrap">
                            <Chip label={f.field} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.7rem' }} />
                            <span className="text-gray-400">本地</span>
                            <span className="font-medium" style={{ color: '#d32f2f' }}>{fmt(f.tableValue)}</span>
                            <span className="text-gray-400">→</span>
                            <span className="text-gray-400">视图</span>
                            <span className="font-medium" style={{ color: '#2e7d32' }}>{fmt(f.viewValue)}</span>
                          </div>
                        ))}
                      </Stack>
                    </Paper>
                  ))}
                </Stack>
              )}
            </AccordionDetails>
          </Accordion>
        </Stack>
      )}

      {/* 同步预览结果 */}
      {previewError && (
        <Alert severity="error" sx={{ fontSize: '0.85rem' }}>
          {previewError}
        </Alert>
      )}
      {preview && (
        <Card className="glow-border">
          <CardContent>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
              同步预览（视图 → 本地表）
            </Typography>
            <Stack direction="row" spacing={1} className="mb-3">
              <Chip color="success" size="small" label={`新增 ${preview.summary.insertCount}`} />
              <Chip color="warning" size="small" label={`更新 ${preview.summary.updateCount}`} />
              <Chip color="error" size="small" label={`删除 ${preview.summary.deleteCount}`} />
            </Stack>

            {preview.details.length > 0 ? (
              <Box sx={{ maxHeight: 220, overflow: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontSize: '0.72rem', py: 0.5 }}>资产编号</TableCell>
                      <TableCell sx={{ fontSize: '0.72rem', py: 0.5 }}>变更类型</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {preview.details.map((d: SyncDetail, i) => (
                      <TableRow key={`${d.assetCode}-${i}`}>
                        <TableCell sx={{ fontSize: '0.75rem', fontFamily: 'monospace', py: 0.5 }}>{d.assetCode}</TableCell>
                        <TableCell sx={{ py: 0.5 }}>
                          <Chip
                            size="small"
                            label={CHANGE_LABEL[d.changeType] ?? d.changeType}
                            color={CHANGE_COLOR[d.changeType] ?? 'default'}
                            sx={{ height: 20, fontSize: '0.7rem' }}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.82rem', mb: 1 }}>
                无变更：本地表已与视图一致
              </Typography>
            )}

            <Button
              variant="contained"
              fullWidth
              startIcon={<SyncIcon />}
              onClick={() => setConfirmOpen(true)}
              disabled={syncing || (preview.summary.insertCount + preview.summary.updateCount + preview.summary.deleteCount === 0)}
              sx={{ borderRadius: '10px', textTransform: 'none', mt: 1 }}
            >
              确认同步
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 同步结果 */}
      {syncResult && (
        <Alert
          severity={syncResult.success ? 'success' : 'error'}
          icon={syncResult.success ? <CheckCircleIcon /> : <ErrorIcon />}
          sx={{ fontSize: '0.85rem' }}
        >
          同步{syncResult.success ? '成功' : '失败'}：新增 {syncResult.inserted} · 更新 {syncResult.updated} · 删除 {syncResult.deleted}
          {syncResult.message ? `（${syncResult.message}）` : ''}
        </Alert>
      )}

      {/* 资产表 */}
      <Card className="glow-border">
        <CardContent sx={{ p: '8px !important' }}>
          <div className="flex items-center justify-between px-2 pt-1 pb-2">
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              本地资产表
            </Typography>
            <Typography variant="caption" color="text.secondary">
              共 {total} 条
            </Typography>
          </div>

          {loading && (
            <Box sx={{ p: 1 }}>
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} variant="text" height={32} />
              ))}
            </Box>
          )}

          {!loading && rows.length === 0 && (
            <Box className="py-10 flex flex-col items-center justify-center text-gray-400">
              <SearchIcon sx={{ fontSize: 40, mb: 1 }} />
              <span className="text-sm">{debounced ? '无匹配资产' : '暂无资产数据'}</span>
            </Box>
          )}

          {!loading && rows.length > 0 && (
            <TableContainer>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    {COLUMNS.map((c) => (
                      <TableCell
                        key={c.key}
                        align={c.numeric ? 'right' : 'left'}
                        sx={{ fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap' }}
                      >
                        {c.label}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.assetCode} hover>
                      {COLUMNS.map((c) => (
                        <TableCell
                          key={c.key}
                          align={c.numeric ? 'right' : 'left'}
                          sx={{
                            fontSize: '0.78rem',
                            whiteSpace: 'nowrap',
                            fontFamily: c.key === 'assetCode' ? 'monospace' : undefined,
                          }}
                        >
                          {fmt(row[c.key])}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {!loading && rows.length > 0 && (
            <TablePagination
              component="div"
              count={total}
              page={page}
              onPageChange={(_e, newPage) => {
                setPage(newPage);
                fetchTable(debounced, newPage, pageSize);
              }}
              rowsPerPage={pageSize}
              onRowsPerPageChange={(e) => {
                const ps = parseInt(e.target.value, 10);
                setPageSize(ps);
              }}
              rowsPerPageOptions={[10, 20, 50]}
              labelRowsPerPage="每页"
              labelDisplayedRows={({ from, to, count }) => `${from}-${to} / 共 ${count}`}
              size="small"
            />
          )}
        </CardContent>
      </Card>

      {/* 二次确认 Dialog */}
      <Dialog open={confirmOpen} onClose={() => !syncing && setConfirmOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1.05rem' }}>确认同步</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ fontSize: '0.9rem' }}>
            确认将 SAP 视图数据同步至本地资产表？此操作会覆盖本地快照。
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2 }}>
          <Button onClick={() => setConfirmOpen(false)} color="inherit" disabled={syncing} sx={{ textTransform: 'none' }}>
            取消
          </Button>
          <Button onClick={handleConfirmSync} variant="contained" disabled={syncing} sx={{ borderRadius: '10px', textTransform: 'none' }}>
            {syncing ? '同步中...' : '确认同步'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 打印区域（平时隐藏，打印时显示，纯 HTML 表格保证中文正常） */}
      <div className="print-area">
        <h2 style={{ textAlign: 'center', margin: '8px 0 12px' }}>固定资产表</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr>
              {COLUMNS.map((c) => (
                <th
                  key={c.key}
                  style={{ border: '1px solid #999', padding: '4px 6px', textAlign: c.numeric ? 'right' : 'left', background: '#f0f0f0' }}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.assetCode}>
                {COLUMNS.map((c) => (
                  <td key={c.key} style={{ border: '1px solid #ccc', padding: '4px 6px', textAlign: c.numeric ? 'right' : 'left' }}>
                    {fmt(row[c.key])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <p style={{ fontSize: '11px', color: '#666', marginTop: 8 }}>
          共 {rows.length} 条（当前页）· 导出时间 {new Date().toLocaleString('zh-CN')}
        </p>
      </div>
    </div>
  );
}

/** 简单的「仅本地表 / 仅视图」列表 */
function DiffList({
  items,
  emptyText,
}: {
  items: { assetCode: string; assetName: string }[];
  emptyText: string;
}) {
  if (items.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.82rem', p: 1 }}>
        {emptyText}
      </Typography>
    );
  }
  return (
    <Box sx={{ maxHeight: 200, overflow: 'auto', p: 1 }}>
      <Stack spacing={0.5}>
        {items.map((i) => (
          <div key={i.assetCode} className="flex items-center gap-2 text-xs">
            <span className="font-mono text-gray-600">{i.assetCode}</span>
            <span className="text-gray-800 truncate">{i.assetName}</span>
          </div>
        ))}
      </Stack>
    </Box>
  );
}
