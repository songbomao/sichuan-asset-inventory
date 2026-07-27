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
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';
import IconButton from '@mui/material/IconButton';
import Snackbar from '@mui/material/Snackbar';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import DownloadIcon from '@mui/icons-material/Download';
import {
  getAssetTable,
  exportAssets,
  buildExportAssetsFileUrl,
  type AssetTableItem,
} from '../api/admin';
import { exportAndDownloadCsv } from '../utils/download';

/** 表格列定义（含地址 / 责任人 / 部门 / 成本中心） */
const COLUMNS: { key: keyof AssetTableItem; label: string; numeric?: boolean }[] = [
  { key: 'assetCode', label: '资产编号' },
  { key: 'assetName', label: '名称' },
  { key: 'categoryName', label: '类别' },
  { key: 'location', label: '地址' },
  { key: 'userName', label: '责任人' },
  { key: 'costCenterName', label: '成本中心' },
  { key: 'originalValue', label: '原值', numeric: true },
  { key: 'netValue', label: '净值', numeric: true },
];

/** 把值转成可读字符串（空值显示 --） */
function fmt(v: string | number | null | undefined): string {
  if (v === null || v === undefined || v === '') return '--';
  return String(v);
}

/**
 * 固定资产查询（本地资产表）
 * - 资产表固定使用本地快照（viewSource = 'local'）
 * - 搜索按资产编号 / 名称 / 责任人三字段模糊匹配
 * - 全量 CSV 导出（移动端钉钉兼容，见 utils/download）
 * - 可选 props：
 *   ownerName       初始关键字（按责任人模糊匹配，默认空 = 全部）
 *   lockToOwner     锁定为 ownerName：隐藏搜索框、仅展示当前用户名下资产
 *   hideDownload    隐藏「下载全量CSV」按钮
 *   pageSize        每页条数（默认 20）
 *   pageSizeOptions 分页下拉可选项（默认 [10,20,50]）
 */
interface AssetLocalTableProps {
  ownerName?: string;
  lockToOwner?: boolean;
  hideDownload?: boolean;
  pageSize?: number;
  pageSizeOptions?: number[];
}

export default function AssetLocalTable({
  ownerName,
  lockToOwner = false,
  hideDownload = false,
  pageSize: pageSizeProp = 20,
  pageSizeOptions = [10, 20, 50],
}: AssetLocalTableProps) {
  /* ---------- 表格 + 搜索 + 分页 ---------- */
  const [keyword, setKeyword] = useState(ownerName ?? '');
  const [debounced, setDebounced] = useState('');
  const [page, setPage] = useState(0); // MUI TablePagination 从 0 开始
  const [pageSize, setPageSize] = useState(pageSizeProp);
  const [rows, setRows] = useState<AssetTableItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // lockToOwner：锁定关键字为当前用户姓名，禁止搜索切换（仅展示本人名下资产）
  useEffect(() => {
    if (lockToOwner) setKeyword(ownerName ?? '');
  }, [lockToOwner, ownerName]);

  const fetchTable = useCallback(
    async (
      kw: string,
      p: number,
      ps: number,
      vs: 'sap' | 'local',
    ) => {
      setLoading(true);
      setError(null);
      try {
        // 后端从 1 开始分页；viewSource 默认 sap，searchField 固定 all（编号/名称/责任人三字段）
        const res = await getAssetTable({
          keyword: kw,
          page: p + 1,
          pageSize: ps,
          viewSource: vs,
          searchField: 'all',
        });
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

  // 关键字 / 每页条数变化后回到第一页并重新拉取（固定使用本地快照）
  useEffect(() => {
    setPage(0);
    fetchTable(debounced, 0, pageSize, 'local');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced, pageSize]);

  /* ---------- 导出全量 CSV ---------- */
  const [exporting, setExporting] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      await exportAndDownloadCsv(() => exportAssets({ viewSource: 'local' }), buildExportAssetsFileUrl('local'));
      setSnackbar({ open: true, message: 'CSV 导出已开始，请留意钉钉下载/预览窗口', severity: 'success' });
    } catch (err) {
      setError(err instanceof Error ? err.message : '导出CSV失败');
      setSnackbar({ open: true, message: '导出CSV失败', severity: 'error' });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* 资产表（搜索 / 刷新 / 导出CSV 已移入卡片头部） */}
      <Card className="glow-border">
        <CardContent sx={{ p: '8px !important' }}>
          {/* 头部：标题 + 视图来源说明 */}
          <div className="flex items-center justify-between px-2 pt-2 pb-2 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                本地资产表
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {lockToOwner ? `共 ${total} 条 · 仅显示本人名下资产` : `共 ${total} 条 · 本地快照`}
              </Typography>
            </div>
          </div>

          {/* 头部：搜索 + 刷新 + 导出 */}
          <div className="flex items-center gap-1 px-2 pb-2 flex-wrap">
            {lockToOwner ? (
              <Typography variant="caption" color="text.secondary" className="flex items-center gap-1">
                <SearchIcon fontSize="small" className="text-gray-400" />
                仅显示本人名下固定资产
              </Typography>
            ) : (
              <TextField
                size="small"
                placeholder="搜索资产编号 / 名称 / 责任人"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                InputProps={{ startAdornment: <SearchIcon fontSize="small" className="text-gray-400 mr-1" /> }}
                sx={{ width: 180, borderRadius: 2 }}
              />
            )}
            <IconButton onClick={() => fetchTable(debounced, page, pageSize, 'local')} color="primary" size="small" disabled={loading}>
              <RefreshIcon className={loading ? 'animate-spin-refresh' : ''} />
            </IconButton>
            {!hideDownload && (
              <Button
                variant="outlined"
                size="small"
                startIcon={<DownloadIcon />}
                onClick={handleExportCsv}
                disabled={exporting}
                sx={{ borderRadius: '10px', textTransform: 'none', whiteSpace: 'nowrap' }}
              >
                {exporting ? '导出中...' : '下载全量CSV'}
              </Button>
            )}
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
                fetchTable(debounced, newPage, pageSize, 'local');
              }}
              rowsPerPage={pageSize}
              onRowsPerPageChange={(e) => {
                const ps = parseInt(e.target.value, 10);
                setPageSize(ps);
              }}
              rowsPerPageOptions={pageSizeOptions}
              labelRowsPerPage="每页"
              labelDisplayedRows={({ from, to, count }) => `${from}-${to} / 共 ${count}`}
              size="small"
            />
          )}
        </CardContent>
      </Card>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar((s) => ({ ...s, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </div>
  );
}
