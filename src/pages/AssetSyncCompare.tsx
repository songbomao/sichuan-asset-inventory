import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
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
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';
import IconButton from '@mui/material/IconButton';
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import CircularProgress from '@mui/material/CircularProgress';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import SyncIcon from '@mui/icons-material/Sync';
import PrintIcon from '@mui/icons-material/Print';
import DownloadIcon from '@mui/icons-material/Download';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import {
  getAssetTable,
  exportAssets,
  compareAssets,
  previewSyncAssets,
  syncAssets,
  type AssetTableItem,
  type CompareAssetsResult,
  type PreviewSyncResult,
  type SyncAssetsResult,
  type SyncDetail,
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

/** 字段中文名兜底映射（与 COLUMNS 标签保持一致），后端未返回 fieldName 时使用 */
const FIELD_NAME_MAP: Record<string, string> = {
  assetCode: '资产编号',
  assetName: '名称',
  categoryName: '类别',
  useStatus: '状态',
  originalValue: '原值',
  netValue: '净值',
  location: '地址',
  userName: '责任人',
  deptName: '部门',
  companyName: '公司',
  costCenterName: '成本中心',
  standard: '规格',
};

/** 取差异字段的中文名：优先 fieldName，其次前端常量映射，最后回退到原字段 key */
function fieldLabel(f: { field: string; fieldName?: string }): string {
  return f.fieldName?.trim() || FIELD_NAME_MAP[f.field] || f.field;
}

/** 把值转成可读字符串（空值显示 --） */
function fmt(v: string | number | null | undefined): string {
  if (v === null || v === undefined || v === '') return '--';
  return String(v);
}

/** 差异对比三个分类的展示元数据 */
const DIFF_TABS = [
  { key: 'onlyInTable' as const, label: '仅本地表', color: 'error' as const },
  { key: 'onlyInView' as const, label: '仅视图', color: 'success' as const },
  { key: 'different' as const, label: '字段不一致', color: 'warning' as const },
];

/**
 * 固定资产对比与同步（仅管理员）
 * - 资产表默认展示 SAP 实时视图，可切换本地快照
 * - 搜索支持资产编号/名称 与 责任人 两种模式
 * - 差异对比改为「Tab 切换 + 搜索 + 加载更多」统一视图
 * - 同步流程（差异对比 → 同步预览 → 确认同步）保持不变
 * - 导出 PDF（浏览器打印方案，保证中文不乱码）+ 全量 CSV 导出
 */
export default function AssetSyncCompare() {
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

  /* ---------- 差异对比 ---------- */
  const [compare, setCompare] = useState<CompareAssetsResult | null>(null);
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareError, setCompareError] = useState<string | null>(null);

  // 差异分类 Tab + 分类内搜索 + 懒加载（加载更多）
  const [diffTab, setDiffTab] = useState(0);
  const [diffKeyword, setDiffKeyword] = useState('');
  const [diffVisible, setDiffVisible] = useState(50);

  // 切换分类时重置已展开的条数
  useEffect(() => {
    setDiffVisible(50);
  }, [diffTab]);

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

  /* ---------- 三步骤流程（Stepper）---------- */
  // 0 = 差异对比，1 = 同步预览，2 = 确认同步（弹窗）
  const [activeStep, setActiveStep] = useState(0);

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
      // 同步成功后：清空预览/对比、刷新表格、回到第一步并自动重新差异对比
      setPreview(null);
      setCompare(null);
      setActiveStep(0);
      fetchTable(debounced, page, pageSize, viewSource, searchMode);
      handleCompare();
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

  /** 进入下一步：同步预览 */
  const goToPreview = () => {
    setActiveStep(1);
    handlePreview();
  };

  /** 打开二次确认（进入第三步） */
  const openConfirm = () => {
    setActiveStep(2);
    setConfirmOpen(true);
  };

  /** 取消二次确认，回到第二步预览 */
  const closeConfirm = () => {
    if (syncing) return;
    setConfirmOpen(false);
    setActiveStep(1);
  };

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

  /* ---------- 差异对比分类数据（一次加载，按需筛选） ---------- */
  const rawActive =
    compare == null
      ? []
      : diffTab === 0
        ? compare.onlyInTable
        : diffTab === 1
          ? compare.onlyInView
          : compare.different;

  const filteredActive = useMemo(() => {
    const kw = diffKeyword.trim().toLowerCase();
    if (!kw) return rawActive;
    return rawActive.filter((it: any) => {
      const code = (it.assetCode || '').toLowerCase();
      const name = (it.assetName || '').toLowerCase();
      return code.includes(kw) || name.includes(kw);
    });
  }, [rawActive, diffKeyword]);

  const visibleItems = filteredActive.slice(0, diffVisible);
  const hasMore = filteredActive.length > diffVisible;

  return (
    <div className="space-y-4">
      {/* 页面标题 */}
      <Typography variant="h6" sx={{ fontWeight: 700 }}>
        资产对比同步
      </Typography>

      {/* 三步骤 Stepper：①差异对比 ②同步预览 ③确认同步 */}
      <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 1 }}>
        <Step><StepLabel>差异对比</StepLabel></Step>
        <Step><StepLabel>同步预览</StepLabel></Step>
        <Step><StepLabel>确认同步</StepLabel></Step>
      </Stepper>

      {/* 表格加载错误 */}
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ fontSize: '0.85rem' }}>
          {error}
        </Alert>
      )}

      {/* ===== 步骤一：差异对比 ===== */}
      {activeStep === 0 && (
        <Stack spacing={1.5}>
          <Button
            variant="contained"
            size="small"
            startIcon={<CompareArrowsIcon />}
            onClick={handleCompare}
            disabled={compareLoading}
            sx={{ borderRadius: '10px', textTransform: 'none', alignSelf: 'flex-start' }}
          >
            {compareLoading ? '对比中...' : '差异对比'}
          </Button>

          {compareError && (
            <Alert severity="error" sx={{ fontSize: '0.85rem' }}>{compareError}</Alert>
          )}

          {compare && (
            <>
              <Alert severity="info" sx={{ fontSize: '0.8rem' }}>
                本地表 {compare.summary.localCount} 条 · 视图 {compare.summary.viewCount} 条
              </Alert>

              {/* 三个分类 Tab 切换（数据已一次加载，仅在前端做筛选） */}
              <Tabs
                value={diffTab}
                onChange={(_e, v) => setDiffTab(v)}
                variant="fullWidth"
                sx={{ minHeight: 36, '& .MuiTab-root': { minHeight: 36, fontSize: '0.8rem', textTransform: 'none' } }}
              >
                {DIFF_TABS.map((t, i) => (
                  <Tab key={t.key} label={`${t.label} (${i === 0 ? compare.summary.onlyInTableCount : i === 1 ? compare.summary.onlyInViewCount : compare.summary.differentCount})`} />
                ))}
              </Tabs>

              {/* 分类内搜索（按资产编号 / 名称） */}
              <TextField
                size="small"
                fullWidth
                placeholder="按资产编号 / 名称 筛选当前分类"
                value={diffKeyword}
                onChange={(e) => setDiffKeyword(e.target.value)}
                InputProps={{ startAdornment: <SearchIcon fontSize="small" className="text-gray-400 mr-1" /> }}
                sx={{ borderRadius: 2 }}
              />

              {/* 分类明细列表（懒加载：加载更多） */}
              <Box sx={{ maxHeight: 360, overflow: 'auto' }}>
                {filteredActive.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.82rem', p: 1 }}>
                    无匹配记录
                  </Typography>
                ) : (
                  <Stack spacing={1}>
                    {diffTab !== 2
                      ? visibleItems.map((it: any) => (
                          <div key={it.assetCode} className="flex items-center gap-2 text-xs">
                            <span className="font-mono text-gray-600">{it.assetCode}</span>
                            <span className="text-gray-800 truncate">{it.assetName}</span>
                          </div>
                        ))
                      : visibleItems.map((d: any) => (
                          <Paper key={d.assetCode} variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-mono text-xs text-gray-700">{d.assetCode}</span>
                              <span className="text-sm font-medium text-gray-900 truncate ml-2">{d.assetName}</span>
                            </div>
                            <Stack spacing={0.5}>
                              {d.diffs.map((f: any, idx: number) => (
                                <div key={idx} className="flex items-center gap-2 text-xs flex-wrap">
                                  <Chip label={fieldLabel(f)} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.7rem' }} />
                                  <span className="text-gray-400">视图</span>
                                  <span className="font-medium" style={{ color: '#2e7d32' }}>{fmt(f.viewValue)}</span>
                                  <span className="text-gray-400">→</span>
                                  <span className="text-gray-400">本地</span>
                                  <span className="font-medium" style={{ color: '#d32f2f' }}>{fmt(f.tableValue)}</span>
                                </div>
                              ))}
                            </Stack>
                          </Paper>
                        ))}
                  </Stack>
                )}
              </Box>

              {hasMore && (
                <Button
                  variant="text"
                  size="small"
                  onClick={() => setDiffVisible((v) => v + 50)}
                  sx={{ borderRadius: '10px', textTransform: 'none', alignSelf: 'center', fontSize: '0.8rem' }}
                >
                  加载更多（已显示 {visibleItems.length} / {filteredActive.length}）
                </Button>
              )}

              <Button
                variant="outlined"
                size="small"
                startIcon={<SyncIcon />}
                onClick={goToPreview}
                disabled={previewLoading}
                sx={{ borderRadius: '10px', textTransform: 'none', alignSelf: 'flex-start' }}
              >
                {previewLoading ? '预览中...' : '下一步：同步预览'}
              </Button>
            </>
          )}
        </Stack>
      )}

      {/* ===== 步骤二：同步预览 ===== */}
      {activeStep === 1 && (
        <Stack spacing={1.5}>
          {previewError && (
            <Alert
              severity="error"
              sx={{ fontSize: '0.85rem' }}
              action={
                <Button size="small" color="inherit" onClick={handlePreview} sx={{ textTransform: 'none' }}>
                  重新预览
                </Button>
              }
            >
              {previewError}
            </Alert>
          )}

          {previewLoading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
              <CircularProgress size={24} />
            </Box>
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
                  onClick={openConfirm}
                  disabled={syncing || (preview.summary.insertCount + preview.summary.updateCount + preview.summary.deleteCount === 0)}
                  sx={{ borderRadius: '10px', textTransform: 'none', mt: 1 }}
                >
                  确认同步
                </Button>
              </CardContent>
            </Card>
          )}
        </Stack>
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

      {/* 二次确认 Dialog */}
      <Dialog open={confirmOpen} onClose={closeConfirm} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1.05rem' }}>确认同步</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ fontSize: '0.9rem' }}>
            确认将 SAP 视图数据同步至本地资产表？此操作会覆盖本地快照。
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2 }}>
          <Button onClick={closeConfirm} color="inherit" disabled={syncing} sx={{ textTransform: 'none' }}>
            取消
          </Button>
          <Button onClick={handleConfirmSync} variant="contained" disabled={syncing} sx={{ borderRadius: '10px', textTransform: 'none' }}>
            {syncing ? '同步中...' : '确认同步'}
          </Button>
        </DialogActions>
      </Dialog>

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
