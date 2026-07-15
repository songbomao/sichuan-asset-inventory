import { useRef, useState, useCallback } from 'react';
import Button from '@mui/material/Button';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary';
import CircularProgress from '@mui/material/CircularProgress';

interface CameraCaptureProps {
  onCapture: (dataUrl: string) => void;
  watermark: {
    time: string;
    location: string;
    operator: string;
    assetCode: string;
  };
  disabled?: boolean;
}

/**
 * 水印相机组件
 * - 优先调用后置摄像头拍照
 * - 降级方案：文件上传（相册选取）
 * - 拍照后自动叠加水印
 */
export default function CameraCapture({
  onCapture,
  watermark,
  disabled = false,
}: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraOpen, setCameraOpen] = useState(false);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** 停止摄像头 */
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
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
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraOpen(true);
    } catch (err) {
      console.warn('摄像头权限被拒绝，降级为文件上传', err);
      // 降级：直接触发文件选择
      fileInputRef.current?.click();
    } finally {
      setLoading(false);
    }
  }, []);

  /** 拍照 */
  const takePhoto = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    const rawDataUrl = canvas.toDataURL('image/jpeg', 0.9);
    stopCamera();
    setCameraOpen(false);

    // 叠加水印
    addWatermark(rawDataUrl);
  }, [stopCamera]);

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

        const watermarked = canvas.toDataURL('image/jpeg', 0.85);
        setPreviewSrc(watermarked);
        onCapture(watermarked);
      };
      img.src = rawDataUrl;
    },
    [watermark, onCapture],
  );

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
    <div className="flex flex-col items-center gap-3">
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

      {/* 错误提示 */}
      {error && (
        <div className="w-full p-2 bg-red-50 text-red-600 text-sm rounded-lg text-center">
          {error}
        </div>
      )}

      {/* 预览照片 */}
      {previewSrc && (
        <div className="relative w-full overflow-hidden rounded-card border-2 border-accent/30 shadow-glow">
          <img
            src={previewSrc}
            alt="盘点照片"
            className="w-full object-contain"
            style={{ maxHeight: '320px' }}
          />
          <button
            onClick={() => setPreviewSrc(null)}
            className="absolute top-2 right-2 bg-black/50 text-white w-7 h-7 rounded-full flex items-center justify-center text-sm"
          >
            ✕
          </button>
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
          />
          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
            <Button
              variant="contained"
              onClick={takePhoto}
              startIcon={<CameraAltIcon />}
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
            disabled={disabled || loading}
            sx={{ py: 1.2 }}
          >
            {loading ? '正在打开摄像头...' : previewSrc ? '重新拍照' : '📷 拍照'}
          </Button>
          <Button
            variant="outlined"
            fullWidth
            startIcon={<PhotoLibraryIcon />}
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            sx={{ py: 1.2 }}
          >
            相册选取
          </Button>
        </div>
      )}
    </div>
  );
}
