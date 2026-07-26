import { useEffect, useRef, useState } from 'react';
import React from 'react';
import Dialog from '@mui/material/Dialog';
import Slide from '@mui/material/Slide';
import type { TransitionProps } from '@mui/material/transitions';
import IconButton from '@mui/material/IconButton';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import CloseIcon from '@mui/icons-material/Close';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import BadgeIcon from '@mui/icons-material/Badge';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import { type RecordItem, getAssetByCode, type AssetDetail } from '../api/inventory';
import { DiagnoseDifference, type DiagnoseDifferenceResult } from '../api/ai';
import StatusBadge from './StatusBadge';

/** 底部抽屉过渡 */
export const SlideUp = React.forwardRef(function SlideUp(
  props: TransitionProps & { children: React.ReactElement },
  ref: React.Ref<unknown>
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

/** 格式化时间 */
export function formatTime(time: string): string {
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
}

/** 移动端详情抽屉 */
export function DetailDrawer({
  open,
  onClose,
  loading,
  error,
  record,
}: {
  open: boolean;
  onClose: () => void;
  loading: boolean;
  error: string | null;
  record: RecordItem | null;
}) {
  // 照片灯箱
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  // 基本信息（来自 sai_assets）
  const [asset, setAsset] = useState<AssetDetail | null>(null);
  const [assetLoading, setAssetLoading] = useState(false);

  // 下滑关闭手势
  const startY = useRef(0);
  const currentY = useRef(0);
  const [dragOffset, setDragOffset] = useState(0);
  const dragging = useRef(false);

  // AI 差异诊断
  const [diagnoseLoading, setDiagnoseLoading] = useState(false);
  const [diagnoseResult, setDiagnoseResult] = useState<DiagnoseDifferenceResult | null>(null);
  const [diagnoseError, setDiagnoseError] = useState<string | null>(null);

  // 拉取资产基本信息（sai_assets）
  useEffect(() => {
    if (!record?.assetCode) {
      setAsset(null);
      return;
    }
    let cancelled = false;
    setAssetLoading(true);
    setAsset(null);
    getAssetByCode(record.assetCode)
      .then((d) => {
        if (!cancelled) setAsset(d);
      })
      .catch(() => {
        if (!cancelled) setAsset(null);
      })
      .finally(() => {
        if (!cancelled) setAssetLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [record]);

  // 重置灯箱与诊断（打开新记录时）
  useEffect(() => {
    setLightboxOpen(false);
    setActiveIndex(0);
    setDiagnoseResult(null);
    setDiagnoseError(null);
  }, [record]);

  const photos = (record?.photoUrls && record.photoUrls.length > 0
    ? record.photoUrls
    : record?.photoUrl
      ? [record.photoUrl]
      : []) as string[];

  const openLightbox = (index: number) => {
    setActiveIndex(index);
    setLightboxOpen(true);
  };
  const closeLightbox = () => setLightboxOpen(false);
  const goPrev = () => setActiveIndex((i) => (i - 1 + photos.length) % photos.length);
  const goNext = () => setActiveIndex((i) => (i + 1) % photos.length);

  // 键盘左右切换（灯箱打开时）
  useEffect(() => {
    if (!lightboxOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'Escape') closeLightbox();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lightboxOpen, photos.length]);

  const handleDiagnose = async () => {
    if (!record) return;
    setDiagnoseLoading(true);
    setDiagnoseError(null);
    setDiagnoseResult(null);
    try {
      const result = await DiagnoseDifference({
        taskId: record.taskId,
        assetCode: record.assetCode,
      });
      setDiagnoseResult(result);
    } catch {
      setDiagnoseError('AI 服务暂不可用');
    } finally {
      setDiagnoseLoading(false);
    }
  };

  const onTouchStart = (e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
    currentY.current = startY.current;
    dragging.current = true;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (!dragging.current) return;
    currentY.current = e.touches[0].clientY;
    const offset = Math.max(0, currentY.current - startY.current);
    setDragOffset(offset);
  };
  const onTouchEnd = () => {
    dragging.current = false;
    if (dragOffset > 80) {
      onClose();
    }
    setDragOffset(0);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen
      TransitionComponent={SlideUp}
      PaperProps={{
        sx: {
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          top: 'auto',
          m: 0,
          maxWidth: '100%',
          maxHeight: '92vh',
          borderRadius: '24px 24px 0 0',
          bgcolor: 'background.paper',
          transform: `translateY(${dragOffset}px)`,
          transition: dragging.current ? 'none' : 'transform 0.3s ease',
          display: 'flex',
          flexDirection: 'column',
        },
      }}
      hideBackdrop={false}
      BackdropProps={{ sx: { bgcolor: 'rgba(0,0,0,0.45)' } }}
    >
      {/* 拖拽条 */}
      <Box
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        sx={{
          width: '100%',
          pt: 1.5,
          pb: 0.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          cursor: 'grab',
        }}
      >
        <Box sx={{ width: 40, height: 4, borderRadius: 2, bgcolor: 'rgba(0,0,0,0.2)' }} />
      </Box>

      {/* 头部 */}
      <Box sx={{ px: 2.5, pb: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.05rem' }}>
          盘点详情
        </Typography>
        <IconButton size="small" onClick={onClose} sx={{ color: 'text.secondary' }}>
          <CloseIcon />
        </IconButton>
      </Box>

      {/* 内容区 */}
      <Box sx={{ flex: 1, overflow: 'auto', px: 2.5, pb: 2 }}>
        {loading && (
          <Box className="py-8 flex flex-col items-center justify-center text-gray-400">
            <CircularProgress size={28} sx={{ mb: 1.5 }} />
            <span className="text-sm">正在加载详情…</span>
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2, fontSize: '0.8rem' }}>
            {error}
          </Alert>
        )}

        {!loading && record && (
          <Box className="space-y-4">
            {/* ===== 基本信息（蓝） ===== */}
            <SectionCard
              title="基本信息"
              accent="blue"
              icon={<Inventory2Icon fontSize="small" />}
            >
              {assetLoading ? (
                <Box className="py-2 flex items-center gap-2 text-gray-400 text-sm">
                  <CircularProgress size={16} />
                  正在加载资产档案…
                </Box>
              ) : asset ? (
                <Stack spacing={2.2}>
                  <InfoRow label="资产名称" value={asset.assetName} bold />
                  <InfoRow label="资产编码" value={asset.assetCode} mono />
                  {asset.categoryName && <InfoRow label="资产类别" value={asset.categoryName} />}
                  {asset.deptName && <InfoRow label="使用部门" value={asset.deptName} />}
                  {asset.userName && <InfoRow label="责任人" value={asset.userName} />}
                  {asset.location && <InfoRow label="存放地点" value={asset.location} small multiline />}
                  {(asset.costCenterName || asset.costCenterCode) && (
                    <InfoRow label="成本中心" value={asset.costCenterName || asset.costCenterCode} small />
                  )}
                  {asset.useStatus && <InfoRow label="使用状态" value={asset.useStatus} small />}
                  {asset.originalValue && <InfoRow label="资产原值" value={asset.originalValue} small />}
                  {asset.netValue && <InfoRow label="资产净值" value={asset.netValue} small />}
                </Stack>
              ) : (
                <Box className="py-2 text-gray-400 text-sm">未查询到资产档案信息</Box>
              )}
            </SectionCard>

            {/* ===== 盘点信息（紫） ===== */}
            <SectionCard
              title="盘点信息"
              accent="purple"
              icon={<BadgeIcon fontSize="small" />}
            >
              <Stack spacing={2.2}>
                <InfoRow label="盘点状态" value={<StatusBadge status={record.status} />} />
                {typeof record.inventoryQty === 'number' && (
                  <InfoRow label="盘点数量" value={`${record.inventoryQty}`} />
                )}
                {record.operatorName && (
                  <InfoRow label="盘点人" value={record.operatorName} />
                )}
                {record.functionStatus && (
                  <InfoRow label="功能状态" value={record.functionStatus} />
                )}
                {record.appearanceStatus && (
                  <InfoRow label="外观状态" value={record.appearanceStatus} />
                )}
                <InfoRow label="盘点时间" value={formatTime(record.createTime)} small />
                {record.location && (
                  <InfoRow label="盘点地点" value={record.location} small multiline />
                )}
                {record.remark && (
                  <InfoRow label="备注" value={record.remark} small multiline />
                )}

                {/* 盘点照片：缩略图网格 -> 点击放大灯箱 */}
                <div>
                  <div className="text-[11px] text-gray-400 mb-1.5">盘点照片</div>
                  {photos.length > 0 ? (
                    <div className="grid grid-cols-4 gap-2">
                      {photos.map((src, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => openLightbox(i)}
                          className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 cursor-pointer border border-gray-200 hover:opacity-90 transition"
                        >
                          <img
                            src={src}
                            alt={`盘点照片${i + 1}`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.visibility = 'hidden';
                            }}
                          />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="h-24 rounded-xl bg-gray-100 flex flex-col items-center justify-center text-gray-400 gap-1">
                      <PhotoCameraIcon fontSize="small" />
                      <span className="text-xs">无照片</span>
                    </div>
                  )}
                </div>
              </Stack>
            </SectionCard>

            {/* AI 差异诊断（异常记录） */}
            {record.status !== '正常' && (
              <SectionCard title="智能诊断" accent="purple" icon={<AutoAwesomeIcon fontSize="small" />} noPadding>
                <Box className="p-3">
                  <Button
                    variant="contained"
                    color="secondary"
                    fullWidth
                    startIcon={diagnoseLoading ? <CircularProgress size={18} color="inherit" /> : <AutoAwesomeIcon />}
                    onClick={handleDiagnose}
                    disabled={diagnoseLoading}
                    sx={{ py: 1, borderRadius: 2 }}
                  >
                    {diagnoseLoading ? 'AI 诊断中...' : '✨ AI 差异诊断'}
                  </Button>
                  {diagnoseResult && (
                    <Alert severity="info" sx={{ mt: 2, fontSize: '0.8rem', whiteSpace: 'pre-line' }}>
                      {`原因：${diagnoseResult.reason}\n建议：${diagnoseResult.suggestion}\n责任人提示：${diagnoseResult.ownerHint}`}
                    </Alert>
                  )}
                  {diagnoseError && (
                    <Alert severity="warning" sx={{ mt: 2, fontSize: '0.8rem' }}>{diagnoseError}</Alert>
                  )}
                </Box>
              </SectionCard>
            )}
          </Box>
        )}
      </Box>

      {/* 底部关闭按钮 */}
      <Box sx={{ px: 2.5, pb: 2, pt: 0.5 }}>
        <Button onClick={onClose} variant="contained" fullWidth sx={{ borderRadius: 2, py: 1.1 }}>
          关闭
        </Button>
      </Box>

      {/* 照片放大灯箱（全屏） */}
      <Dialog
        open={lightboxOpen}
        onClose={closeLightbox}
        fullScreen
        PaperProps={{ sx: { bgcolor: 'rgba(0,0,0,0.96)', color: '#fff' } }}
      >
        <Box
          className="relative w-full h-full flex items-center justify-center"
          onClick={closeLightbox}
        >
          {photos[activeIndex] && (
            <img
              src={photos[activeIndex]}
              alt={`放大照片${activeIndex + 1}`}
              className="max-w-full max-h-full object-contain select-none"
              onClick={closeLightbox}
            />
          )}

          {/* 关闭 */}
          <IconButton
            onClick={closeLightbox}
            sx={{ position: 'absolute', top: 12, right: 12, color: '#fff', bgcolor: 'rgba(255,255,255,0.12)' }}
          >
            <CloseIcon />
          </IconButton>

          {/* 多图翻页 */}
          {photos.length > 1 && (
            <>
              <IconButton
                onClick={(e) => { e.stopPropagation(); goPrev(); }}
                sx={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#fff', bgcolor: 'rgba(255,255,255,0.12)' }}
              >
                <ChevronLeftIcon />
              </IconButton>
              <IconButton
                onClick={(e) => { e.stopPropagation(); goNext(); }}
                sx={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#fff', bgcolor: 'rgba(255,255,255,0.12)' }}
              >
                <ChevronRightIcon />
              </IconButton>
              <Box
                sx={{
                  position: 'absolute',
                  bottom: 20,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  px: 2,
                  py: 0.5,
                  borderRadius: 3,
                  bgcolor: 'rgba(0,0,0,0.5)',
                  fontSize: '0.8rem',
                }}
              >
                {activeIndex + 1} / {photos.length}
              </Box>
            </>
          )}
        </Box>
      </Dialog>
    </Dialog>
  );
}

/** 区块卡片：蓝色=基本信息，紫色=盘点信息，视觉强区分 */
function SectionCard({
  title,
  accent,
  icon,
  children,
  noPadding = false,
}: {
  title: string;
  accent: 'blue' | 'purple';
  icon: React.ReactNode;
  children: React.ReactNode;
  noPadding?: boolean;
}) {
  const head = accent === 'blue'
    ? 'bg-blue-50 text-blue-700 border-blue-100'
    : 'bg-purple-50 text-purple-700 border-purple-100';
  const leftBorder = accent === 'blue' ? 'border-l-blue-500' : 'border-l-purple-500';
  return (
    <Paper elevation={0} className="rounded-2xl overflow-hidden border border-gray-100">
      <Box className={`flex items-center gap-1.5 px-4 py-2.5 border-b ${head}`}>
        {icon}
        <Typography sx={{ fontWeight: 700, fontSize: '0.95rem' }}>{title}</Typography>
      </Box>
      <Box className={`px-4 border-l-4 ${leftBorder} bg-white ${noPadding ? '' : 'py-3'}`}>
        {children}
      </Box>
    </Paper>
  );
}

/** 详情行：标签 + 值，同水平线，最紧凑 */
export function InfoRow({
  label,
  value,
  bold = false,
  mono = false,
  small = false,
  multiline = false,
}: {
  label: string;
  value: React.ReactNode;
  bold?: boolean;
  mono?: boolean;
  small?: boolean;
  multiline?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className={`text-gray-400 shrink-0 pt-0.5 ${small ? 'text-[11px] w-12' : 'text-xs w-16'}`}>
        {label}
      </div>
      <div
        className={`flex-1 min-w-0 ${small ? 'text-xs' : 'text-sm'} ${
          mono ? 'font-mono' : bold ? 'font-bold text-gray-900' : 'text-gray-800'
        } ${multiline ? 'leading-relaxed' : 'break-words'}`}
      >
        {value}
      </div>
    </div>
  );
}
