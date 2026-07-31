import { useRef, useState, useCallback, useEffect } from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import IconButton from '@mui/material/IconButton';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import CloseIcon from '@mui/icons-material/Close';
import FlipCameraAndroidIcon from '@mui/icons-material/FlipCameraAndroid';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';

export interface PhotoValidationResult {
  valid: boolean;
  reason?: string;
}

interface CameraCaptureProps {
  /** 照片拍摄成功回调 */
  onCapture: (dataUrl: string) => void;
  onClose?: () => void;
  /** 水印信息 */
  watermark: {
    time: string;
    location: string;
    operator: string;
    assetCode: string;
  };
  disabled?: boolean;
  /** 步骤标签（标题栏展示） */
  stepLabel: string;
  /** 拍摄引导提示（取景框内展示） */
  stepHint?: string;
  /** 拍后校验函数：传入 base64 照片，返回校验结果 */
  onValidate?: (dataUrl: string) => Promise<PhotoValidationResult> | PhotoValidationResult;
}

/**
 * 三步骤引导式水印相机组件
 * - 全屏取景 Dialog，自带水印
 * - 仅支持后置摄像头拍照（不可选相册）
 * - 支持步骤标题、引导提示、拍后校验
 * - 校验不通过时在 Dialog 内提示，允许重拍
 */
export default function CameraCapture({
  onCapture,
  onClose,
  watermark,
  disabled = false,
  stepLabel,
  stepHint,
  onValidate,
}: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  /** 停止摄像头 */
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraReady(false);
  }, []);

  /** 绑定 stream 到 video 元素，带重试 */
  const bindStreamToVideo = useCallback(() => {
    const video = videoRef.current;
    if (!video || !streamRef.current) return;

    if (video.srcObject === streamRef.current && video.videoWidth > 0 && video.videoHeight > 0) {
      setCameraReady(true);
      return;
    }

    video.srcObject = streamRef.current;
    video.playsInline = true;
    video.muted = true;
    video.setAttribute('webkit-playsinline', 'true');

    try { video.load(); } catch (e) { console.warn('video.load() 失败', e); }

    const tryPlay = () => {
      if (!videoRef.current) return;
      videoRef.current.play().then(() => console.log('[Camera] play 成功')).catch((e) => console.warn('[Camera] play 被阻止', e));
    };

    // 轮询兜底
    const checkTimer = setInterval(() => {
      const v = videoRef.current;
      if (!v) return;
      if (v.videoWidth > 0 && v.videoHeight > 0) {
        setCameraReady(true);
        clearInterval(checkTimer);
      }
    }, 300);

    const timeoutTimer = setTimeout(() => {
      clearInterval(checkTimer);
      const v = videoRef.current;
      if (!v || v.videoWidth === 0 || v.videoHeight === 0) {
        setError('摄像头画面未能加载，可尝试切换前后摄像头或重试');
      }
    }, 5000);

    const handleLoaded = () => {
      const v = videoRef.current;
      if (v && v.videoWidth > 0 && v.videoHeight > 0) {
        setCameraReady(true);
        clearInterval(checkTimer);
        clearTimeout(timeoutTimer);
      }
    };
    const handleCanPlay = () => {
      tryPlay();
      handleLoaded();
    };

    video.addEventListener('loadedmetadata', handleLoaded);
    video.addEventListener('canplay', handleCanPlay);
    tryPlay();

    return () => {
      video.removeEventListener('loadedmetadata', handleLoaded);
      video.removeEventListener('canplay', handleCanPlay);
      clearInterval(checkTimer);
      clearTimeout(timeoutTimer);
    };
  }, []);

  /** 打开摄像头 */
  const openCamera = useCallback(async (mode: 'environment' | 'user' = 'environment') => {
    setError(null);
    setValidationError(null);
    setLoading(true);
    setCameraReady(false);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode },
        audio: false,
      });
      streamRef.current = stream;
      setCameraOpen(true);
      setFacingMode(mode);
      setTimeout(() => bindStreamToVideo(), 200);
    } catch (err) {
      console.warn('摄像头权限被拒绝', err);
      setError('摄像头权限不足，请在系统设置中允许相机权限后重试');
    } finally {
      setLoading(false);
    }
  }, [bindStreamToVideo]);

  /** 切换前后摄像头 */
  const handleFlipCamera = useCallback(async () => {
    const next = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(next);
    await openCamera(next);
  }, [facingMode, openCamera]);

  useEffect(() => {
    if (!cameraOpen) return;
    const cleanup = bindStreamToVideo();
    return () => { if (cleanup) cleanup(); };
  }, [cameraOpen, bindStreamToVideo]);

  /** 叠加水印 */
  const addWatermark = useCallback(
    (rawDataUrl: string) => {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        // 底部水印背景
        const wmHeight = Math.floor(canvas.height * 0.22);
        const yStart = canvas.height - wmHeight;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
        ctx.fillRect(0, yStart, canvas.width, wmHeight);

        const fontSize = Math.max(14, Math.floor(canvas.width / 30));
        const lineHeight = fontSize * 1.6;
        const xPadding = fontSize * 1.2;

        ctx.fillStyle = '#ffffff';
        ctx.font = `${fontSize}px "Noto Sans SC", "Roboto", sans-serif`;
        ctx.textBaseline = 'middle';

        const lines = [
          `🕐 ${watermark.time}`,
          `📍 ${watermark.location}`,
          `👤 ${watermark.operator}`,
          `🏷 ${watermark.assetCode}`,
        ];
        lines.forEach((line, i) => {
          ctx.fillText(line, xPadding, yStart + wmHeight * 0.15 + i * lineHeight);
        });

        // 右上角防伪水印
        ctx.save();
        ctx.globalAlpha = 0.25;
        ctx.fillStyle = '#ffffff';
        const cornerFontSize = Math.max(10, Math.floor(canvas.width / 45));
        ctx.font = `${cornerFontSize}px "Noto Sans SC", sans-serif`;
        ctx.textAlign = 'right';
        ctx.fillText(`${watermark.operator} | ${watermark.time}`, canvas.width - cornerFontSize, cornerFontSize * 3);
        ctx.restore();

        const watermarked = canvas.toDataURL('image/jpeg', 0.7);
        onCapture(watermarked);
      };
      img.src = rawDataUrl;
    },
    [watermark, onCapture],
  );

  /** 拍照 */
  const takePhoto = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    if (video.paused) {
      try { await video.play(); } catch (e) { console.warn('拍照前 play 失败', e); }
    }

    await new Promise((r) => requestAnimationFrame(() => r(null)));

    if (video.videoWidth === 0 || video.videoHeight === 0) {
      setError('摄像头尚未就绪，请稍等片刻');
      return;
    }

    // 等待逆地理编码（最多 3 秒）
    const isCoordLike = (loc?: string) => !!loc && /^\d+\.\d+,\s*\d+\.\d+$/.test(loc);
    let waited = 0;
    while (isCoordLike(watermark.location) && waited < 3000) {
      await new Promise((r) => setTimeout(r, 300));
      waited += 300;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    // 限制最大宽度 1280px
    let finalCanvas: HTMLCanvasElement = canvas;
    if (canvas.width > 1280) {
      const scale = 1280 / canvas.width;
      const scaled = document.createElement('canvas');
      scaled.width = 1280;
      scaled.height = Math.round(canvas.height * scale);
      const sctx = scaled.getContext('2d');
      if (sctx) {
        sctx.drawImage(canvas, 0, 0, scaled.width, scaled.height);
        finalCanvas = scaled;
      }
    }

    const rawDataUrl = finalCanvas.toDataURL('image/jpeg', 0.7);

    // 拍后校验
    if (onValidate) {
      try {
        const result = await onValidate(rawDataUrl);
        if (!result.valid) {
          setValidationError(result.reason || '照片校验未通过，请重新拍摄');
          return; // 校验不通过，不关闭取景框，允许重拍
        }
      } catch (e) {
        console.warn('校验函数执行异常', e);
        // 校验异常不阻断流程
      }
    }

    // 通过 → 关摄像头，加水印
    stopCamera();
    setCameraOpen(false);
    addWatermark(rawDataUrl);
  }, [stopCamera, watermark.location, addWatermark, onValidate]);

  /** 关闭取景框 */
  const handleClose = useCallback(() => {
    stopCamera();
    setCameraOpen(false);
    setError(null);
    setValidationError(null);
    setCameraReady(false);
    onClose?.();
  }, [stopCamera, onClose]);

  const hasStream = !!streamRef.current;

  return (
    <div className="flex flex-col items-center gap-3 w-full">
      {/* 隐藏 Canvas */}
      <canvas ref={canvasRef} className="hidden" />

      {/* 拍照入口按钮 */}
      <Button
        variant="contained"
        fullWidth
        startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <CameraAltIcon />}
        onClick={() => openCamera('environment')}
        disabled={disabled || loading}
        size="small"
        sx={{ py: 0.8, fontSize: '0.8rem' }}
      >
        {loading ? '正在打开摄像头...' : `📷 拍摄${stepLabel}`}
      </Button>

      {/* ========== 全屏取景 Dialog ========== */}
      <Dialog
        open={cameraOpen}
        onClose={handleClose}
        fullScreen
        PaperProps={{
          sx: { bgcolor: '#000', maxWidth: '100%', maxHeight: '100%', margin: 0 },
        }}
      >
        <div className="relative w-full h-full flex flex-col bg-black">
          {/* 顶部操作栏 */}
          <div
            className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-3 py-2"
            style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.6) 0%, transparent 100%)' }}
          >
            <IconButton onClick={handleClose} sx={{ color: '#fff' }}>
              <CloseIcon />
            </IconButton>
            <span className="text-white text-sm font-medium">{stepLabel}</span>
            <IconButton onClick={handleFlipCamera} sx={{ color: '#fff' }}>
              <FlipCameraAndroidIcon />
            </IconButton>
          </div>

          {/* 取景画面 */}
          <div className="flex-1 flex items-center justify-center overflow-hidden relative">
            {/* 加载中遮罩 */}
            {!cameraReady && !error && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 text-white/80 bg-black/60">
                <CircularProgress size={36} color="inherit" />
                <span className="text-sm">正在启动摄像头...</span>
              </div>
            )}
            {/* 权限错误 */}
            {error && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 px-8 text-center bg-black/80">
                <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center">
                  <CameraAltIcon sx={{ color: '#fff', fontSize: 32 }} />
                </div>
                <p className="text-white/80 text-sm leading-relaxed">{error}</p>
                <div className="flex gap-3">
                  <Button
                    variant="outlined"
                    onClick={handleClose}
                    sx={{ color: '#fff', borderColor: 'rgba(255,255,255,0.3)', borderRadius: '24px', px: 3 }}
                  >
                    关闭
                  </Button>
                  <Button
                    variant="contained"
                    onClick={() => openCamera(facingMode)}
                    sx={{ borderRadius: '24px', px: 3 }}
                  >
                    重试
                  </Button>
                </div>
              </div>
            )}
            {/* 拍摄引导提示 */}
            {stepHint && cameraReady && !error && (
              <div className="absolute top-14 left-0 right-0 z-10 mx-auto w-fit">
                <div className="bg-black/50 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-full text-center">
                  {stepHint}
                </div>
              </div>
            )}
            {/* 校验错误提示 */}
            {validationError && cameraReady && !error && (
              <div className="absolute top-24 left-0 right-0 z-10 mx-4">
                <Alert
                  severity="warning"
                  sx={{ fontSize: '0.78rem', py: 0.5, opacity: 0.95 }}
                >
                  {validationError}
                </Alert>
              </div>
            )}
            {/* 视频流 */}
            <video
              ref={videoRef}
              className="w-full h-full"
              style={{ objectFit: 'cover', backgroundColor: '#000' }}
              playsInline
              muted
              autoPlay
              onLoadedMetadata={() => {
                const v = videoRef.current;
                if (v && v.videoWidth > 0 && v.videoHeight > 0) setCameraReady(true);
              }}
              onCanPlay={() => {
                const v = videoRef.current;
                if (v) {
                  v.play().catch((e) => console.warn('inline play 失败', e));
                  if (v.videoWidth > 0 && v.videoHeight > 0) setCameraReady(true);
                }
              }}
            />
          </div>

          {/* 底部拍照栏 */}
          {hasStream && (
            <div
              className="absolute left-0 right-0 z-20"
              style={{
                bottom: 0,
                height: 130,
                background: 'linear-gradient(0deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 60%, transparent 100%)',
                paddingBottom: 'env(safe-area-inset-bottom)',
              }}
            >
              {/* 取消 */}
              <button
                type="button"
                onClick={handleClose}
                style={{
                  position: 'absolute',
                  left: 24,
                  bottom: 'calc(env(safe-area-inset-bottom) + 36px)',
                  color: '#fff',
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.45)',
                  borderRadius: 24,
                  padding: '10px 20px',
                  fontSize: 15,
                  lineHeight: 1,
                  cursor: 'pointer',
                }}
              >
                取消
              </button>

              {/* 快门 */}
              <div
                onClick={cameraReady ? takePhoto : undefined}
                role="button"
                tabIndex={cameraReady ? 0 : -1}
                aria-label="拍照"
                style={{
                  position: 'absolute',
                  left: '50%',
                  bottom: 'calc(env(safe-area-inset-bottom) + 27px)',
                  transform: 'translateX(-50%)',
                  width: 76,
                  height: 76,
                  borderRadius: '50%',
                  backgroundColor: 'rgba(255,255,255,0.15)',
                  border: '4px solid #fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: cameraReady ? 'pointer' : 'not-allowed',
                  touchAction: 'manipulation',
                  opacity: cameraReady ? 1 : 0.5,
                }}
                onMouseDown={(e) => {
                  if (cameraReady && e.currentTarget) e.currentTarget.style.transform = 'translateX(-50%) scale(0.92)';
                }}
                onMouseUp={(e) => {
                  if (e.currentTarget) e.currentTarget.style.transform = 'translateX(-50%) scale(1)';
                }}
                onTouchStart={(e) => {
                  if (cameraReady && e.currentTarget) e.currentTarget.style.transform = 'translateX(-50%) scale(0.92)';
                }}
                onTouchEnd={(e) => {
                  if (e.currentTarget) e.currentTarget.style.transform = 'translateX(-50%) scale(1)';
                }}
              >
                <div
                  style={{
                    width: 58,
                    height: 58,
                    borderRadius: '50%',
                    backgroundColor: '#fff',
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </Dialog>
    </div>
  );
}
