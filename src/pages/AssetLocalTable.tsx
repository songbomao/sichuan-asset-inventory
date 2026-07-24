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
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import PrintIcon from '@mui/icons-material/Print';
import DownloadIcon from '@mui/icons-material/Download';
import {
  getAssetTable,
  exportAssets,
  type AssetTableItem,
} from '../api/admin';

/** 表格列定义（含地址 / 责任人 / 部门 / 成本中心） */
const COLUMNS: { key: keyof AssetTableItem; label: string; numeric?: boolean }[] = [
  { key: 'assetCode', label: '资产编号' },
  { key: 'assetName', label: '名称' },
  { key: 'categoryName', label: '类别' },
  { key: 'useStatus', label: '状态' },
  { key: 'location', label: '地址' },
  { key: 'userName', label: '责任人' },
  { key: 'deptName', label: '部门' },
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
 * - 资产表默认展示 SAP 实时视图，可切换本地快照
 * - 搜索支持资产编号/名称 与 责任人 两种模式
 * - 导出 PDF（浏览器打印方案，保证中文不乱码）+ 全量 CSV 导出
 */
export default function AssetLocalTable() {
  /* ---------- 表格 + 搜索 + 分页 ---------- */
  // 默认展示 SAP 实时视图
  const [viewSource, setViewSource] = useState<'sap' | 'local'>('sap');
  // 搜索字段：全部（编号/名称/责任人）或仅责任人
  const [searchMode, setSearchMode] = useState<'all' | 'responsible'>('all');
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
    async (
      kw: string,
      p: number,
      ps: number,
      vs: 'sap' | 'local',
      sf: 'all' | 'responsible',
    ) => {
      setLoading(true);
      setError(null);
      try {
        // 后端从 1 开始分页；viewSource 默认 sap，searchField 默认 all
        const res = await getAssetTable({
          keyword: kw,
          page: p + 1,
          pageSize: ps,
          viewSource: vs,
          searchField: sf,
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

  // 关键字 / 每页条数 / 视图来源 / 搜索字段变化后回到第一页并重新拉取
  useEffect(() => {
    setPage(0);
    fetchTable(debounced, 0, pageSize, viewSource, searchMode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced, pageSize, viewSource, searchMode]);

  /* ---------- 导出 PDF（浏览器打印） ---------- */
  // 钉钉 WebView 中直接 window.print() 偶发不调起，延迟一帧再触发以提升成功率
  const handlePrint = () => {
    window.requestAnimationFrame(() => {
      setTimeout(() => {
        window.print();
      }, 120);
    });
  };

  /* ---------- 导出全量 CSV ---------- */
  const [exporting, setExporting] = useState(false);

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const res = await exportAssets({ viewSource });
      // 前置 BOM，保证 Excel 打开中文不乱码
      const blob = new Blob(['\uFEFF' + res.csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = res.filename || `assets_${viewSource}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : '导出CSV失败');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* 页面标题 */}
      <Typography variant="h6" sx={{ fontWeight: 700 }}>固资查询</Typography>

      {/* 资产表（搜索 / 刷新 / 导出PDF / 导出CSV 已移入卡片头部） */}
      <Card className="glow-border">
        <CardContent sx={{ p: '8px !important' }}>
          {/* 头部：标题 + 视图来源切换 */}
          <div className="flex items-center justify-between px-2 pt-2 pb-2 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                本地资产表
              </Typography>
              <Typography variant="caption" color="text.secondary">
                共 {total} 条 · {viewSource === 'sap' ? 'SAP实时视图' : '本地快照'}
              </Typography>
            </div>
            <ToggleButtonGroup
              size="small"
              value={viewSource}
              exclusive
              onChange={(_e, v) => v && setViewSource(v)}
              sx={{ flexWrap: 'wrap' }}
            >
              <ToggleButton value="sap" sx={{ px: 1.5, py: 0.5, fontSize: '0.75rem', textTransform: 'none' }}>SAP视图</ToggleButton>
              <ToggleButton value="local" sx={{ px: 1.5, py: 0.5, fontSize: '0.75rem', textTransform: 'none' }}>本地快照</ToggleButton>
            </ToggleButtonGroup>
          </div>

          {/* 头部：搜索 + 搜索字段切换 + 刷新 + 导出 */}
          <div className="flex items-center gap-1 px-2 pb-2 flex-wrap">
            <TextField
              size="small"
              placeholder={searchMode === 'responsible' ? '搜索责任人姓名' : '搜索资产编号 / 名称'}
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              InputProps={{ startAdornment: <SearchIcon fontSize="small" className="text-gray-400 mr-1" /> }}
              sx={{ width: 180, borderRadius: 2 }}
            />
            <ToggleButtonGroup
              size="small"
              value={searchMode}
              exclusive
              onChange={(_e, v) => v && setSearchMode(v)}
            >
              <ToggleButton value="all" sx={{ px: 1, py: 0.5, fontSize: '0.72rem', textTransform: 'none' }}>全部</ToggleButton>
              <ToggleButton value="responsible" sx={{ px: 1, py: 0.5, fontSize: '0.72rem', textTransform: 'none' }}>责任人</ToggleButton>
            </ToggleButtonGroup>
            <IconButton onClick={() => fetchTable(debounced, page, pageSize, viewSource, searchMode)} color="primary" size="small" disabled={loading}>
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
                fetchTable(debounced, newPage, pageSize, viewSource, searchMode);
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

      {/* 打印区域（平时隐藏，打印时显示，纯 HTML 表格保证中文正常） */}
      <div className="print-area">
        <h2 style={{ textAlign: 'center', margin: '8px 0 12px' }}>固定资产表（{viewSource === 'sap' ? 'SAP实时视图' : '本地快照'}）</h2>
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
