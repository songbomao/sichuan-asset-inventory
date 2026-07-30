import { useRef, useState, useCallback, useEffect } from 'react';
import Button from '@mui/material/Button';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
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
}

/**
 * 水印相机组件
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
}: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    setCameraReady(false);
  }, []);

  /** 打开摄像头 */
  const openCamera = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      streamRef.current = stream;
      setCameraOpen(true);
    } catch (err) {
      console.warn('摄像头权限被拒绝', err);
      setError('摄像头权限不足，仅支持拍照上传');
    } finally {
      setLoading(false);
    }
  }, []);

  /** 摄像头开启后，将 stream 绑定到 video 元素 */
  useEffect(() => {
    const video = videoRef.current;
    if (!cameraOpen || !video || !streamRef.current) return;

    setCameraReady(false);
    video.srcObject = streamRef.current;
    video.playsInline = true;
    video.muted = true;
    video.setAttribute('webkit-playsinline', 'true');

    const handleLoaded = () => {
      // 等待视频尺寸可用
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        setCameraReady(true);
      }
    };

    const handleCanPlay = async () => {
      try {
        await video.play();
      } catch (e) {
        console.warn('video.play() 被阻止', e);
      }
    };

    video.addEventListener('loadedmetadata', handleLoaded);
    video.addEventListener('canplay', handleCanPlay);

    // 兜底：延迟再检查一次
    const timer = setTimeout(() => {
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        setCameraReady(true);
      }
    }, 800);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoaded);
      video.removeEventListener('canplay', handleCanPlay);
      clearTimeout(timer);
    };
  }, [cameraOpen]);

  /** 在照片上叠加水印 */
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

        const watermarked = canvas.toDataURL('image/jpeg', 0.7);
        setPreviewSrc(watermarked);
        setLastPhoto(watermarked);
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

    const rawDataUrl = finalCanvas.toDataURL('image/jpeg', 0.7);
    stopCamera();
    setCameraOpen(false);

    // 叠加水印
    addWatermark(rawDataUrl);
  }, [stopCamera, watermark.location, addWatermark]);

  /** 文件选择处理（降级方案） */
  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        addWatermark(dataUrl);
      };
      reader.readAsDataURL(file);
      // 清空 input 以便可重复选择同一文件
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    [addWatermark],
  );

  /** 关闭摄像头 */
  const handleClose = useCallback(() => {
    stopCamera();
    setCameraOpen(false);
  }, [stopCamera]);

  return (
    <div className="flex flex-col items-center gap-3 w-full">
      {/* 隐藏的 Canvas */}
      <canvas ref={canvasRef} className="hidden" />

      {/* 隐藏的文件选择器 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* 拍照提示 */}
      {needMore === 0 && photoCount > 0 && (
        <Chip
          label={`已拍 ${photoCount} 张${reachedMax ? '（已达上限）' : ''}`}
          color="success"
          size="small"
          sx={{ width: '100%', fontWeight: 600 }}
        />
      )}

      {/* 错误提示 */}
      {error && (
        <div className="w-full p-2 bg-red-50 text-red-600 text-sm rounded-lg text-center">
          {error}
        </div>
      )}

      {/* 摄像头预览 */}
      {cameraOpen && (
        <div className="relative w-full overflow-hidden rounded-card border-2 border-accent/30">
          <video
            ref={videoRef}
            className="w-full"
            style={{ maxHeight: '360px', background: '#000' }}
            playsInline
            muted
            autoPlay
          />
          {!cameraReady && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black text-white/80">
              <CircularProgress size={28} color="inherit" sx={{ mb: 1 }} />
              <span className="text-sm">正在启动摄像头...</span>
            </div>
          )}
          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
            <Button
              variant="contained"
              onClick={takePhoto}
              startIcon={<CameraAltIcon />}
              disabled={!cameraReady}
              sx={{ borderRadius: '24px', px: 3 }}
            >
              拍照
            </Button>
            <Button
              variant="outlined"
              onClick={handleClose}
              sx={{ borderRadius: '24px', px: 3, color: '#fff', borderColor: '#fff' }}
            >
              取消
            </Button>
          </div>
        </div>
      )}

      {/* 操作按钮 */}
      {!cameraOpen && (
        <div className="flex gap-3 w-full">
          <Button
            variant="contained"
            fullWidth
            startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <CameraAltIcon />}
            onClick={openCamera}
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
      )}

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
