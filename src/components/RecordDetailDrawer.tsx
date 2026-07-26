import { useRef, useState } from 'react';
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
import { type RecordItem } from '../api/inventory';
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
  showPhoto,
  setShowPhoto,
  setFullscreen,
}: {
  open: boolean;
  onClose: () => void;
  loading: boolean;
  error: string | null;
  record: RecordItem | null;
  showPhoto: boolean;
  setShowPhoto: (v: boolean) => void;
  setFullscreen: (v: boolean) => void;
}) {
  // 下滑关闭手势
  const startY = useRef(0);
  const currentY = useRef(0);
  const [dragOffset, setDragOffset] = useState(0);
  const dragging = useRef(false);

  // AI 差异诊断
  const [diagnoseLoading, setDiagnoseLoading] = useState(false);
  const [diagnoseResult, setDiagnoseResult] = useState<DiagnoseDifferenceResult | null>(null);
  const [diagnoseError, setDiagnoseError] = useState<string | null>(null);

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
            <span className="text-sm">正在加载照片…</span>
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2, fontSize: '0.8rem' }}>
            {error}
          </Alert>
        )}

        {!loading && record && (
          <Box className="space-y-3">
            {/* 照片区 */}
            {record.photoUrl ? (
              <Box>
                {!showPhoto ? (
                  <Box
                    onClick={() => setShowPhoto(true)}
                    className="relative w-full h-40 rounded-2xl overflow-hidden bg-gray-100 cursor-pointer"
                  >
                    <img
                      src={record.photoUrl}
                      alt="盘点照片"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                    <Box className="absolute inset-0 flex items-center justify-center bg-black/30 text-white gap-1">
                      <PhotoCameraIcon fontSize="small" />
                      <span className="text-sm font-medium">查看原图</span>
                    </Box>
                  </Box>
                ) : (
                  <Box
                    onClick={() => setFullscreen(true)}
                    className="w-full rounded-2xl overflow-hidden bg-gray-100 cursor-pointer"
                  >
                    <img
                      src={record.photoUrl}
                      alt="盘点照片"
                      className="w-full object-contain bg-gray-50"
                      style={{ maxHeight: '240px' }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                    <Box className="text-center text-xs text-gray-500 py-1.5">点击照片可放大查看</Box>
                  </Box>
                )}
              </Box>
            ) : (
              <Box className="h-32 rounded-2xl bg-gray-100 flex flex-col items-center justify-center text-gray-400 gap-1">
                <PhotoCameraIcon fontSize="small" />
                <span className="text-xs">无照片</span>
              </Box>
            )}

            {/* 主要信息 */}
            <Paper elevation={0} className="rounded-2xl p-4 bg-gray-50/60 border border-gray-100">
              <Stack spacing={2.5}>
                <InfoRow label="资产名称" value={record.assetName} bold />
                <InfoRow label="资产编码" value={record.assetCode} mono />
                <InfoRow label="任务名称" value={record.taskName} />
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
              </Stack>
            </Paper>

            {/* 次要信息 */}
            <Paper elevation={0} className="rounded-2xl p-4 bg-gray-50/60 border border-gray-100">
              <Stack spacing={2.5}>
                <InfoRow label="盘点时间" value={formatTime(record.createTime)} small />
                {record.location && (
                  <InfoRow label="位置" value={record.location} small multiline />
                )}
            {record.remark && (
              <InfoRow label="备注" value={record.remark} small multiline />
            )}
          </Stack>
        </Paper>

        {/* AI 差异诊断（异常记录） */}
        {record.status !== '正常' && (
          <Paper elevation={0} className="rounded-2xl p-4 bg-gray-50/60 border border-gray-100">
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
          </Paper>
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
    </Dialog>
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
