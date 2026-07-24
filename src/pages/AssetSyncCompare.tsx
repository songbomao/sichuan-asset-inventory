import { useEffect, useState, useMemo } from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
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
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import CircularProgress from '@mui/material/CircularProgress';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import SearchIcon from '@mui/icons-material/Search';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import SyncIcon from '@mui/icons-material/Sync';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import {
  compareAssets,
  previewSyncAssets,
  syncAssets,
  type CompareAssetsResult,
  type PreviewSyncResult,
  type SyncAssetsResult,
  type SyncDetail,
} from '../api/admin';

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

/** 字段中文名兜底映射，后端未返回 fieldName 时使用 */
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
  { key: 'onlyInView' as const, label: '仅SAP视图', color: 'success' as const },
  { key: 'different' as const, label: '字段不一致', color: 'warning' as const },
];

/**
 * 固定资产对比与同步（仅管理员）
 * - 差异对比改为「Tab 切换 + 搜索 + 加载更多」统一视图
 * - 同步流程（差异对比 → 同步预览 → 确认同步）保持不变
 * （本地资产查询已拆分为独立组件 AssetLocalTable）
 */
export default function AssetSyncCompare() {
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
      // 同步成功后：清空预览/对比、回到第一步并自动重新差异对比
      setPreview(null);
      setCompare(null);
      setActiveStep(0);
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
                本地表 {compare.summary.localCount} 条 · SAP视图 {compare.summary.viewCount} 条
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
                                  <span className="text-gray-400">SAP视图</span>
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
                  同步预览（SAP视图 → 本地表）
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
                    无变更：本地表已与 SAP 视图一致
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
    </div>
  );
}
