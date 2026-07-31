import { useRef, useState, useCallback, useEffect } from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import IconButton from '@mui/material/IconButton';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CloseIcon from '@mui/icons-material/Close';
import FlipCameraAndroidIcon from '@mui/icons-material/FlipCameraAndroid';
import CircularProgress from '@mui/material/CircularProgress';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import {
  RecognizeAsset,
  type RecognizeAssetCandidate,
  type RecognizeAssetResult,
} from '../api/ai';

interface CameraCaptureProps {
  onCapture: (dataUrl: string) => void;
  watermark: {
    time: string;
    location: string;
    operator: string;
    assetCode: string;
  };
  disabled?: boolean;
  /** 已拍张数，用于按钮文案提示 */
  photoCount?: number;
  /** 最少需要拍几张 */
  minPhotos?: number;
  /** 最多允许拍几张 */
  maxPhotos?: number;
  /** AI 识别候选资产（提供后显示「AI 识别」按钮） */
  candidates?: RecognizeAssetCandidate[];
  /** AI 识别完成回调 */
  onAIRecognized?: (result: RecognizeAssetResult) => void;
  /** 隐藏内置 AI 识别按钮（父组件自行渲染） */
  hideAI?: boolean;
  /** 不叠加水印（用于二维码照，避免干扰解码） */
  noWatermark?: boolean;
}

/**
 * 水印相机组件
 * - 点击拍照 → 弹出全屏取景 Dialog，居中自适应屏幕
 * - 仅支持后置摄像头拍照（已禁用相册选取）
 * - 摄像头权限不足时提示用户，不降级为文件选择
 * - 拍照后自动叠加水印
 * - 支持多次调用，由父组件维护照片数组
 */
export default function CameraCapture({
  onCapture,
  watermark,
  disabled = false,
  photoCount = 0,
  minPhotos = 2,
  maxPhotos = 4,
  candidates,
  onAIRecognized,
  hideAI = false,
  noWatermark = false,
}: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const bindAttemptsRef = useRef(0);

  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** 当前摄像头 facingMode（支持切换前后摄） */
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  // AI 识别相关
  const [lastPhoto, setLastPhoto] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiMsg, setAiMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const reachedMax = photoCount >= maxPhotos;
  const needMore = Math.max(0, minPhotos - photoCount);

  /** 触发 AI 资产识别 */
  const handleAIRecognize = useCallback(async () => {
    if (!lastPhoto || !candidates || candidates.length === 0) return;
    setAiLoading(true);
    setAiMsg(null);
    try {
      const result = await RecognizeAsset({ image: lastPhoto, candidates });
      setAiMsg({
        type: 'success',
        text: `识别为 ${result.name}（${result.assetCode}）· 置信度 ${Math.round(result.confidence * 100)}%`,
      });
      onAIRecognized?.(result);
    } catch {
      setAiMsg({ type: 'error', text: 'AI 服务暂不可用' });
    } finally {
      setAiLoading(false);
    }
  }, [lastPhoto, candidates, onAIRecognized]);

  /** 停止摄像头 */
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    bindAttemptsRef.current = 0;
    setCameraReady(false);
  }, []);

  /** 绑定 stream 到 video 元素，带重试 */
  const bindStreamToVideo = useCallback(() => {
    const video = videoRef.current;
    if (!video || !streamRef.current) return;

    // 如果已经绑定且视频有尺寸，直接标记 ready
    if (video.srcObject === streamRef.current && video.videoWidth > 0 && video.videoHeight > 0) {
      setCameraReady(true);
      return;
    }

    video.srcObject = streamRef.current;
    video.playsInline = true;
    video.muted = true;
    video.setAttribute('webkit-playsinline', 'true');

    // 部分浏览器需要显式 load() 才会触发 loadedmetadata
    try {
      video.load();
    } catch (e) {
      console.warn('video.load() 失败', e);
    }

    // 尝试播放（用户已通过点击触发，应满足自动播放策略）
    const tryPlay = () => {
      if (!videoRef.current) return;
      videoRef.current
        .play()
        .then(() => console.log('[Camera] video.play() 成功'))
        .catch((e) => console.warn('[Camera] video.play() 被阻止', e));
    };

    // iOS Safari 上 loadedmetadata 可能不触发，加一个轮询兜底
    const checkTimer = setInterval(() => {
      const v = videoRef.current;
      if (!v) return;
      if (v.videoWidth > 0 && v.videoHeight > 0) {
        setCameraReady(true);
        clearInterval(checkTimer);
      }
    }, 300);

    // 5 秒后仍不 ready，给出提示但不关闭
    const timeoutTimer = setTimeout(() => {
      clearInterval(checkTimer);
      const v = videoRef.current;
      if (!v || v.videoWidth === 0 || v.videoHeight === 0) {
        console.warn('[Camera] 视频未能就绪');
        setError('摄像头画面未能加载，可尝试切换前后摄像头或重试');
      }
    }, 5000);

    const handleLoaded = () => {
      console.log('[Camera] loadedmetadata', video.videoWidth, video.videoHeight);
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        setCameraReady(true);
        clearInterval(checkTimer);
        clearTimeout(timeoutTimer);
      }
    };

    const handleCanPlay = () => {
      console.log('[Camera] canplay');
      tryPlay();
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        setCameraReady(true);
        clearInterval(checkTimer);
        clearTimeout(timeoutTimer);
      }
    };

    video.addEventListener('loadedmetadata', handleLoaded);
    video.addEventListener('canplay', handleCanPlay);

    // 立即尝试一次播放
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
    setLoading(true);
    setCameraReady(false);
    // 先关掉旧的
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    try {
      // 部分浏览器对 ideal 宽度/高度支持不好，使用更宽松的约束
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: mode,
        },
        audio: false,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      setCameraOpen(true);
      setFacingMode(mode);
      // Dialog 打开有动画，延迟一点再绑定 stream
      setTimeout(() => {
        bindStreamToVideo();
      }, 200);
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

  /** 摄像头开启后，将 stream 绑定到 video 元素 */
  useEffect(() => {
    if (!cameraOpen) return;
    // 组件 mount / Dialog 打开后绑定
    const cleanup = bindStreamToVideo();
    return () => {
      if (cleanup) cleanup();
    };
  }, [cameraOpen, bindStreamToVideo]);

  /** 在照片上叠加水印 */
  const addWatermark = useCallback(
    (rawDataUrl: string) => {
      const img = new Image();
      img.onload = () => {
        if (noWatermark) {
          setPreviewSrc(rawDataUrl);
          setLastPhoto(rawDataUrl);
          onCapture(rawDataUrl);
          return;
        }
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        // 绘制底部水印背景
        const wmHeight = Math.floor(canvas.height * 0.22);
        const yStart = canvas.height - wmHeight;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
        ctx.fillRect(0, yStart, canvas.width, wmHeight);

        // 绘制水印文字
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

        // 在右上角也打一个半透明水印作为防伪
        ctx.save();
        ctx.globalAlpha = 0.25;
        ctx.fillStyle = '#ffffff';
        const cornerFontSize = Math.max(10, Math.floor(canvas.width / 45));
        ctx.font = `${cornerFontSize}px "Noto Sans SC", sans-serif`;
        ctx.textAlign = 'right';
        ctx.fillText(
          `${watermark.operator} | ${watermark.time}`,
          canvas.width - cornerFontSize,
          cornerFontSize * 3,
        );
        ctx.restore();

        const watermarked = canvas.toDataURL('image/jpeg', noWatermark ? 0.92 : 0.7);
        setPreviewSrc(watermarked);
        setLastPhoto(watermarked);
        onCapture(watermarked);
      };
      img.src = rawDataUrl;
    },
    [watermark, onCapture, noWatermark],
  );

  /** 拍照 */
  const takePhoto = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    // 如果视频还没播放，尝试播放一下
    if (video.paused) {
      try {
        await video.play();
      } catch (e) {
        console.warn('拍照前 play 失败', e);
      }
    }

    // 等一帧确保画面可用
    await new Promise((r) => requestAnimationFrame(() => r(null)));

    if (video.videoWidth === 0 || video.videoHeight === 0) {
      setError('摄像头尚未就绪，请稍等片刻');
      return;
    }

    // 如果水印地址还是经纬度，最多等待 3 秒让逆地理编码完成
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

    // 限制最大宽度 1280px，等比缩放
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

    const rawDataUrl = finalCanvas.toDataURL('image/jpeg', noWatermark ? 0.92 : 0.7);
    stopCamera();
    setCameraOpen(false);

    addWatermark(rawDataUrl);
  }, [stopCamera, watermark.location, addWatermark, noWatermark]);

  /** 关闭取景框 */
  const handleClose = useCallback(() => {
    stopCamera();
    setCameraOpen(false);
    setError(null);
    setCameraReady(false);
  }, [stopCamera]);

  // 只要有流就允许显示快门按钮，不必等 cameraReady
  const hasStream = !!streamRef.current;

  return (
    <div className="flex flex-col items-center gap-3 w-full">
      {/* 隐藏的 Canvas */}
      <canvas ref={canvasRef} className="hidden" />

      {/* 拍照提示 */}
      {needMore === 0 && photoCount > 0 && (
        <Chip
          label={`已拍 ${photoCount} 张${reachedMax ? '（已达上限）' : ''}`}
          color="success"
          size="small"
          sx={{ width: '100%', fontWeight: 600 }}
        />
      )}

      {/* 操作按钮 */}
      <div className="flex gap-3 w-full">
        <Button
          variant="contained"
          fullWidth
          startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <CameraAltIcon />}
          onClick={() => openCamera('environment')}
          disabled={disabled || loading || reachedMax}
          sx={{ py: 1.2 }}
        >
          {loading
            ? '正在打开摄像头...'
            : photoCount === 0
            ? '📷 拍照'
            : `📷 再拍一张（${photoCount}/${maxPhotos}）`}
        </Button>
      </div>

      {/* ========== 全屏取景 Dialog ========== */}
      <Dialog
        open={cameraOpen}
        onClose={handleClose}
        fullScreen
        PaperProps={{
          sx: {
            bgcolor: '#000',
            maxWidth: '100%',
            maxHeight: '100%',
            margin: 0,
          },
        }}
      >
        <div className="relative w-full h-full flex flex-col bg-black">
          {/* 顶部操作栏 */}
          <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-3 py-2"
            style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.6) 0%, transparent 100%)' }}>
            <IconButton onClick={handleClose} sx={{ color: '#fff' }}>
              <CloseIcon />
            </IconButton>
            <span className="text-white text-sm font-medium">
              {noWatermark ? '拍摄二维码' : '拍摄资产照片'}
            </span>
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
                if (v && v.videoWidth > 0 && v.videoHeight > 0) {
                  console.log('[Camera] onLoadedMetadata inline', v.videoWidth, v.videoHeight);
                  setCameraReady(true);
                }
              }}
              onCanPlay={() => {
                const v = videoRef.current;
                if (v) {
                  console.log('[Camera] onCanPlay inline');
                  v.play().catch((e) => console.warn('inline play 失败', e));
                  if (v.videoWidth > 0 && v.videoHeight > 0) {
                    setCameraReady(true);
                  }
                }
              }}
            />
          </div>

          {/* 底部拍照按钮 — 只要有流就显示，不必等 cameraReady */}
          {hasStream && (
            <div className="absolute bottom-0 left-0 right-0 z-20 flex justify-center pb-8 pt-4"
              style={{ background: 'linear-gradient(0deg, rgba(0,0,0,0.6) 0%, transparent 100%)' }}>
              <div className="flex items-center gap-6">
                <Button
                  variant="outlined"
                  onClick={handleClose}
                  sx={{
                    color: '#fff',
                    borderColor: 'rgba(255,255,255,0.4)',
                    borderRadius: '24px',
                    px: 3,
                    '&:hover': { borderColor: '#fff' },
                  }}
                >
                  取消
                </Button>
                <button
                  type="button"
                  onClick={takePhoto}
                  disabled={!cameraReady}
                  className="relative cursor-pointer bg-transparent border-none p-0"
                  style={{ touchAction: 'manipulation', opacity: cameraReady ? 1 : 0.5 }}
                  aria-label="拍照"
                >
                  {/* 外圈 */}
                  <div className="w-20 h-20 rounded-full border-4 border-white/80 flex items-center justify-center">
                    {/* 内圈 */}
                    <div className="w-16 h-16 rounded-full bg-white" />
                  </div>
                </button>
                <div style={{ width: 80 }} />
              </div>
            </div>
          )}
        </div>
      </Dialog>

      {/* AI 资产识别（提供候选后常驻显示，未拍照时禁用；可通过 hideAI 交由父组件自行渲染） */}
      {!hideAI && !cameraOpen && candidates && candidates.length > 0 && (
        <div className="w-full space-y-2">
          <Button
            variant="contained"
            fullWidth
            color="secondary"
            startIcon={aiLoading ? <CircularProgress size={18} color="inherit" /> : <AutoAwesomeIcon />}
            onClick={handleAIRecognize}
            disabled={aiLoading || disabled || !lastPhoto}
            sx={{ py: 1.2, borderRadius: 2 }}
          >
            {aiLoading ? 'AI 识别中...' : '✨ AI 识别资产'}
          </Button>
          {aiMsg && (
            <Alert severity={aiMsg.type === 'success' ? 'success' : 'info'} sx={{ fontSize: '0.8rem' }}>
              {aiMsg.text}
            </Alert>
          )}
        </div>
      )}
    </div>
  );
}
