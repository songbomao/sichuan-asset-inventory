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

/** 差异对比四个分类的展示元数据 */
const DIFF_TABS = [
  { key: 'onlyInView' as const, label: '仅SAP视图', color: 'success' as const },
  { key: 'onlyInTable' as const, label: '仅本地表', color: 'error' as const },
  { key: 'different' as const, label: '字段不一致', color: 'warning' as const },
  { key: 'responsiblePersonAnomalies' as const, label: '责任人异常', color: 'info' as const },
];

/** 责任人异常类型中文与 Chip 配色 */
const ANOMALY_LABEL: Record<string, string> = {
  empty: '责任人为空',
  null: '责任人为null',
  not_in_org: '责任人不在组织架构',
};
const ANOMALY_COLOR: Record<string, 'warning' | 'error'> = {
  empty: 'warning',
  null: 'warning',
  not_in_org: 'error',
};

/**
 * 固定资产对比与同步（仅管理员）
 * - 差异对比改为「Tab 切换 + 搜索 + 加载更多」统一视图
 * - 同步流程（差异对比 → 同步预览 → 确认同步）保持不变
 * （本地资产查询已拆分为独立组件 AssetLocalTable）
 */
export default function AssetSyncCompare({ refreshKey = 0 }: { refreshKey?: number }) {
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
      // 自动选中首个存在异常的 Tab，让用户第一时间看到需要处理的信息
      const counts = [
        res.summary.onlyInViewCount ?? 0,
        res.summary.onlyInTableCount ?? 0,
        res.summary.differentCount ?? 0,
        res.summary.responsiblePersonAnomalyCount ?? 0,
      ];
      const firstAbnormal = counts.findIndex((c) => c > 0);
      setDiffTab(firstAbnormal >= 0 ? firstAbnormal : 0);
    } catch (err) {
      setCompareError(err instanceof Error ? err.message : '差异对比失败');
    } finally {
      setCompareLoading(false);
    }
  };

  // 进入页面 / 父组件切换 Tab 时（refreshKey 变化）自动刷新差异对比，无需手动点击
  useEffect(() => {
    handleCompare();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

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
  // 同步成功后标记第三步为 completed，文字变为“同步完成”
  const [syncCompleted, setSyncCompleted] = useState(false);

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
      // 同步成功后：标记第三步完成，文字变为“同步完成”并变色；保持在第三步视图
      setSyncCompleted(true);
      setActiveStep(2);
      // 后台重新差异对比，刷新数据
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
    setSyncCompleted(false);
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
        ? compare.onlyInView
        : diffTab === 1
          ? compare.onlyInTable
          : diffTab === 2
            ? compare.different
            : compare.responsiblePersonAnomalies;

  const filteredActive = useMemo(() => {
    const kw = diffKeyword.trim().toLowerCase();
    if (!kw) return rawActive;
    return rawActive.filter((it: any) => {
      const code = (it.assetCode || '').toLowerCase();
      const name = (it.assetName || '').toLowerCase();
      const cur = (it.currentValue || '').toLowerCase();
      return code.includes(kw) || name.includes(kw) || cur.includes(kw);
    });
  }, [rawActive, diffKeyword]);

  const visibleItems = filteredActive.slice(0, diffVisible);
  const hasMore = filteredActive.length > diffVisible;

  return (
    <div className="space-y-4">
      {/* 三步骤 Stepper：①差异对比 ②同步预览 ③确认同步 */}
      <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 1 }}>
        <Step><StepLabel>差异对比</StepLabel></Step>
        <Step><StepLabel>同步预览</StepLabel></Step>
        <Step completed={syncCompleted}>
          <StepLabel>{syncCompleted ? '同步完成' : '确认同步'}</StepLabel>
        </Step>
      </Stepper>

      {/* ===== 步骤一：差异对比 ===== */}
      {activeStep === 0 && (
        <Stack spacing={1.5}>
          <Button
            variant="contained"
            size="small"
            startIcon={compareLoading ? <CircularProgress size={14} sx={{ color: '#fff' }} /> : <CompareArrowsIcon />}
            onClick={handleCompare}
            disabled={compareLoading}
            sx={{
              borderRadius: '10px',
              textTransform: 'none',
              alignSelf: 'flex-start',
              backgroundColor: '#6a1b9a',
              color: '#fff',
              '&:hover': { backgroundColor: '#4a148c' },
              '&.Mui-disabled': {
                backgroundColor: '#6a1b9a',
                color: '#fff',
                opacity: 0.72,
              },
            }}
          >
            {compareLoading ? '对比中...' : '差异对比'}
          </Button>

          {compareError && (
            <Alert severity="error" sx={{ fontSize: '0.85rem' }}>{compareError}</Alert>
          )}

          {compare && (() => {
            const onlyInView = compare.summary.onlyInViewCount ?? 0;
            const onlyInTable = compare.summary.onlyInTableCount ?? 0;
            const different = compare.summary.differentCount ?? 0;
            const rpAnomaly = compare.summary.responsiblePersonAnomalyCount ?? 0;
            const hasDiff = onlyInView + onlyInTable + different + rpAnomaly > 0;
            return (
              <>
                <Alert severity={hasDiff ? 'warning' : 'success'} sx={{ fontSize: '0.85rem' }}>
                  <Box>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                      SAP视图 {compare.summary.viewCount} 条 · 本地表 {compare.summary.localCount} 条
                    </div>
                    <div style={{ marginTop: 4, fontSize: '0.78rem', color: '#5f6b7a' }}>
                      仅SAP视图 {onlyInView} · 仅本地表 {onlyInTable} · 字段不一致 {different} · 责任人异常 {rpAnomaly}
                    </div>
                  </Box>
                </Alert>

              {/* 四个分类 Tab 切换（数据已一次加载，仅在前端做筛选）
                  使用响应式 flex 换行布局，避免 MUI Tabs 在窄屏/滚动按钮下截断 Tab 文字 */}
              <Box
                sx={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 1,
                  '& > button': {
                    flex: '1 1 auto',
                    minWidth: { xs: '48%', sm: '23%' },
                    fontSize: '0.8rem',
                    textTransform: 'none',
                    py: 0.5,
                    borderRadius: '8px',
                    whiteSpace: 'nowrap',
                  },
                }}
              >
                {DIFF_TABS.map((t, i) => {
                  const count =
                    i === 0 ? compare.summary.onlyInViewCount
                    : i === 1 ? compare.summary.onlyInTableCount
                    : i === 2 ? compare.summary.differentCount
                    : compare.summary.responsiblePersonAnomalyCount;
                  const selected = diffTab === i;
                  return (
                    <Button
                      key={t.key}
                      variant={selected ? 'contained' : 'outlined'}
                      size="small"
                      onClick={() => setDiffTab(i)}
                      sx={{
                        bgcolor: selected ? '#7b1fa2' : 'transparent',
                        color: selected ? '#fff' : '#7b1fa2',
                        borderColor: '#7b1fa2',
                        '&:hover': {
                          bgcolor: selected ? '#6a1b9a' : 'rgba(123, 31, 162, 0.08)',
                          borderColor: '#7b1fa2',
                        },
                      }}
                    >
                      {t.label} ({count})
                    </Button>
                  );
                })}
              </Box>

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
                    {diffTab === 3 && !diffKeyword.trim() ? '无责任人异常记录' : '无匹配记录'}
                  </Typography>
                ) : (
                  <Stack spacing={1}>
                    {diffTab === 3
                      ? visibleItems.map((it: any) => (
                          <Paper key={it.assetCode} variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className="font-mono text-xs text-gray-700 truncate">{it.assetCode}</span>
                              <Chip
                                size="small"
                                label={ANOMALY_LABEL[it.type] ?? it.type}
                                color={ANOMALY_COLOR[it.type] ?? 'default'}
                                sx={{ height: 20, fontSize: '0.7rem', flexShrink: 0 }}
                              />
                            </div>
                            <div className="text-sm text-gray-900 mb-0.5 truncate">{it.assetName}</div>
                            <div className="text-xs text-gray-500">
                              当前责任人值：<span className="font-mono">{fmt(it.currentValue)}</span>
                            </div>
                            <div className="text-xs text-gray-400 mt-1 leading-relaxed">建议：{it.suggestion}</div>
                          </Paper>
                        ))
                      : diffTab !== 2
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
            );
          })()}
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

          {preview && (() => {
            const totalChanges =
              preview.summary.insertCount + preview.summary.updateCount + preview.summary.deleteCount;
            return (
            <Card className="glow-border">
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
                  同步预览（SAP视图 → 本地表）
                </Typography>
                <Stack direction="row" spacing={1} className="mb-3">
                  <Chip color="success" size="small" label={`新增 ${preview.summary.insertCount}`} />
                  <Chip color="warning" size="small" label={`更新 ${preview.summary.updateCount}`} />
                  <Chip color="error" size="small" label={`删除 ${preview.summary.deleteCount}`} />
                </Stack>

                {totalChanges === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.82rem', mb: 1 }}>
                    无变更：SAP 视图与本地表已一致
                  </Typography>
                ) : (
                  <Box
                    sx={{
                      maxHeight: { xs: '45vh', sm: '380px' },
                      overflow: 'auto',
                      borderRadius: 1,
                      mb: 1.5,
                    }}
                  >
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
                )}

                <Button
                  variant="contained"
                  fullWidth
                  startIcon={<SyncIcon />}
                  onClick={openConfirm}
                  disabled={syncing || totalChanges === 0}
                  sx={{
                    borderRadius: '10px',
                    textTransform: 'none',
                    backgroundColor: '#6a1b9a',
                    color: '#fff',
                    fontWeight: 600,
                    '&:hover': { backgroundColor: '#4a148c' },
                    '&:disabled': { backgroundColor: '#e0e0e0', color: '#9e9e9e' },
                  }}
                >
                  {totalChanges === 0 ? '无需同步' : '确认同步'}
                </Button>
              </CardContent>
            </Card>
            );
          })()}
        </Stack>
      )}

      {/* ===== 步骤三：确认同步 / 同步完成 ===== */}
      {activeStep === 2 && (
        <Stack spacing={1.5}>
          {!syncCompleted ? (
            <Alert severity="info" sx={{ fontSize: '0.85rem' }}>
              请在弹窗中确认是否执行同步
            </Alert>
          ) : (
            <>
              <Alert
                severity="success"
                icon={<CheckCircleIcon />}
                sx={{ fontSize: '0.9rem' }}
              >
                <Box>
                  <div style={{ fontWeight: 600 }}>同步完成</div>
                  <div style={{ marginTop: 4 }}>
                    新增 {syncResult?.inserted ?? 0} · 更新 {syncResult?.updated ?? 0} · 删除 {syncResult?.deleted ?? 0}
                  </div>
                </Box>
              </Alert>
              <Button
                variant="outlined"
                size="small"
                startIcon={<CompareArrowsIcon />}
                onClick={() => {
                  setSyncCompleted(false);
                  setActiveStep(0);
                  setPreview(null);
                  handleCompare();
                }}
                sx={{ borderRadius: '10px', textTransform: 'none', alignSelf: 'flex-start' }}
              >
                重新差异对比
              </Button>
            </>
          )}
        </Stack>
      )}

      {/* 同步结果（非步骤三视图时显示） */}
      {syncResult && activeStep !== 2 && (
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
          {preview ? (
            <DialogContentText sx={{ fontSize: '0.9rem' }}>
              确认将 SAP 视图数据同步至本地资产表？本次将新增 {preview.summary.insertCount} 条、更新 {preview.summary.updateCount} 条、删除 {preview.summary.deleteCount} 条。此操作会覆盖本地快照。
            </DialogContentText>
          ) : (
            <DialogContentText sx={{ fontSize: '0.9rem' }}>
              确认将 SAP 视图数据同步至本地资产表？此操作会覆盖本地快照。
            </DialogContentText>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2 }}>
          <Button onClick={closeConfirm} color="inherit" disabled={syncing} sx={{ textTransform: 'none' }}>
            取消
          </Button>
          <Button
            onClick={handleConfirmSync}
            variant="contained"
            disabled={syncing}
            sx={{
              borderRadius: '10px',
              textTransform: 'none',
              backgroundColor: '#6a1b9a',
              color: '#fff',
              fontWeight: 600,
              '&:hover': { backgroundColor: '#4a148c' },
              '&:disabled': { backgroundColor: '#e0e0e0', color: '#9e9e9e' },
            }}
          >
            {syncing ? '同步中...' : '确认同步'}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
