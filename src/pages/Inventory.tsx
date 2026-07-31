import { useEffect, useState, useCallback, useRef, useMemo, Fragment } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import Skeleton from '@mui/material/Skeleton';
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import DeleteIcon from '@mui/icons-material/Delete';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import AssignmentIcon from '@mui/icons-material/Assignment';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import EditIcon from '@mui/icons-material/Edit';
import { getTaskDetail, getProgress, type AssetInfo } from '../api/tasks';
import { submitRecord, type AssetDetail, getAssetByCode } from '../api/inventory';
import { getCurrentLocation } from '../api/reverseGeocode';
import { useAuth } from '../contexts/AuthContext';
import CameraCapture from '../components/CameraCapture';
import AssetDetailTabs from '../components/AssetDetailTabs';
import ProgressBar from '../components/ProgressBar';
import type { RecognizeAssetResult } from '../api/ai';
import { RecognizeAsset } from '../api/ai';
import jsQR from 'jsqr';

/** 从照片 Base64 解码二维码（固定资产编号）
 *  jsQR 对全尺寸大图+低对比度/轻微模糊的二维码鲁棒性较差，这里用多尺度 + 中心裁剪 + 灰度增强
 *  组合策略，尽可能把用户随手拍的标签二维码识别出来。
 */
function decodeQRCode(dataUrl: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = async () => {
      try {
        // 尝试对大图分档缩小：640px / 960px / 1280px 三档，覆盖不同手机分辨率
        const sizes = [640, 960, 1280, 1600];
        const maxLongSide = Math.max(img.width, img.height);
        const targetSize = sizes.find((s) => maxLongSide <= s) ?? sizes[sizes.length - 1];
        const scale = Math.min(1, targetSize / maxLongSide);
        const baseW = Math.round(img.width * scale);
        const baseH = Math.round(img.height * scale);

        // 解码器：对给定 canvas 像素尝试 jsQR
        const tryDecode = (canvas: HTMLCanvasElement, width: number, height: number): string | null => {
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (!ctx) return null;
          const raw = ctx.getImageData(0, 0, width, height);
          const code = jsQR(raw.data, raw.width, raw.height, { inversionAttempts: 'dontInvert' });
          if (code?.data) return code.data;
          // 反转尝试（白底黑码→反转成黑底白码有时更好识别）
          const c2 = jsQR(raw.data, raw.width, raw.height, { inversionAttempts: 'attemptBoth' });
          return c2?.data ?? null;
        };

        // 灰度 + 自适应二值化（Otsu 大津法），对 QR 码最友好
        const tryBinary = (canvas: HTMLCanvasElement, width: number, height: number): string | null => {
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (!ctx) return null;
          const raw = ctx.getImageData(0, 0, width, height);
          const px = raw.data;
          const total = width * height;
          // 灰度化
          const gray = new Uint8Array(total);
          for (let i = 0, j = 0; i < px.length; i += 4, j++) {
            gray[j] = px[i] * 0.299 + px[i + 1] * 0.587 + px[i + 2] * 0.114;
          }
          // Otsu 阈值
          const hist = new Int32Array(256);
          for (let j = 0; j < total; j++) hist[Math.round(gray[j])]++;
          let sum = 0;
          for (let t = 0; t < 256; t++) sum += t * hist[t];
          let wB = 0, wF = 0, sumB = 0;
          let maxVariance = 0, otsuThreshold = 128;
          for (let t = 0; t < 256; t++) {
            wB += hist[t];
            if (wB === 0) continue;
            wF = total - wB;
            if (wF === 0) break;
            sumB += t * hist[t];
            const mB = sumB / wB;
            const mF = (sum - sumB) / wF;
            const between = wB * wF * (mB - mF) * (mB - mF);
            if (between > maxVariance) {
              maxVariance = between;
              otsuThreshold = t;
            }
          }
          // 二值化
          for (let i = 0, j = 0; i < px.length; i += 4, j++) {
            const v = gray[j] < otsuThreshold ? 0 : 255;
            px[i] = v; px[i + 1] = v; px[i + 2] = v;
          }
          ctx.putImageData(raw, 0, 0);
          const code = jsQR(raw.data, raw.width, raw.height, { inversionAttempts: 'attemptBoth' });
          return code?.data ?? null;
        };

        const decodeAtScale = (s: number, crop?: { x: number; y: number; w: number; h: number }): string | null => {
          const canvas = document.createElement('canvas');
          const w = crop ? Math.round(crop.w * s) : Math.round(baseW * s);
          const h = crop ? Math.round(crop.h * s) : Math.round(baseH * s);
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (!ctx) return null;
          ctx.drawImage(
            img,
            crop ? Math.round(crop.x * scale) : 0,
            crop ? Math.round(crop.y * scale) : 0,
            crop ? Math.round(crop.w * scale) : baseW,
            crop ? Math.round(crop.h * scale) : baseH,
            0, 0, w, h
          );
          return tryDecode(canvas, w, h) || tryBinary(canvas, w, h);
        };

        let result: string | null = null;

        // 1) 全图默认尺寸
        result = decodeAtScale(1);
        if (result) return resolve(result);

        // 2) 底部 50% 区域裁剪（手机拍二维码大概率在画面下半部）
        const halfCrop = { x: 0, y: Math.round(img.height * 0.5), w: img.width, h: Math.round(img.height * 0.5) };
        result = decodeAtScale(1, halfCrop);
        if (result) return resolve(result);

        // 3) 多尺度重试（放大 + 缩小均尝试，覆盖不同分辨率）
        for (const s of [1.25, 1.5, 0.8, 0.65, 0.5, 0.35]) {
          result = decodeAtScale(s);
          if (result) return resolve(result);
          result = decodeAtScale(s, halfCrop);
          if (result) return resolve(result);
        }

        // 4) 后端 ZXing.Net 兜底（原图 base64 原样传，后端多尺度解码）
        if (!result) {
          try {
            const resp = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/Account/UniGetToken?action=DecodeQr`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ image: dataUrl }),
            });
            const json = await resp.json();
            if (json.success && json.code) {
              return resolve(json.code);
            }
          } catch {
            // 后端不可达，静默
          }
        }

        resolve(result);
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}

/** 盘点状态选项 */
const STATUS_OPTIONS = [
  { value: '正常', label: '✅ 正常' },
  { value: '丢失', label: '❌ 丢失' },
  { value: '损坏', label: '⚠ 损坏' },
  { value: '其他', label: '📋 其他' },
];
/** 需要强制备注的状态 */
const NEED_REMARK_STATUSES = new Set(['丢失', '损坏', '其他']);
/** 丢失状态 */
const IS_LOST = (status: string) => status === '丢失';
/** 🚨 HOTFIX v202607301419 - React Hooks 顺序修复，防止页面崩溃 */
const HOTFIX_202607301419 = (() => {
  // 这个 IIFE 会在模块加载时执行，确保构建产物包含此标记，强制改变 JS hash
  const marker = '🚨v202607301419-HooksOrderFix';
  if (typeof window !== 'undefined') {
    (window as any).__HOTFIX_202607301419 = marker;
  }
  return marker;
})();

/**
 * 盘点操作页面
 * 核心功能：刷卡切换资产、拍照（至少2张）、选状态、提交
 */
export default function InventoryPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [assets, setAssets] = useState<AssetInfo[]>([]);
  const [completedCodes, setCompletedCodes] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [taskName, setTaskName] = useState('');

  // 当前资产的盘点状态
  const [assetStatus, setAssetStatus] = useState('正常');
  const [remark, setRemark] = useState('');
  /** 盘点数量（可选，留空表示不填） */
  const [inventoryQty, setInventoryQty] = useState('');
  const [assetDetail, setAssetDetail] = useState<AssetDetail | null>(null);
  const [assetDetailLoading, setAssetDetailLoading] = useState(false);
  const [assetDetailError, setAssetDetailError] = useState<string | null>(null);
  // 照片拆为二维码照（不水印，用于识别固资编号）与正面照（水印，用于外观识别）
  // 统一照片列表：每张照片带有类型标记（qr = 二维码，front = 实物照，unknown = 待分类）
  interface PhotoItem {
    dataUrl: string;
    type: 'qr' | 'front' | 'unknown';
    decodedCode?: string; // 二维码解码结果
  }
  const [allPhotos, setAllPhotos] = useState<PhotoItem[]>([]);
  /** 当前拍照模式：null=未选择，qr=拍二维码，front=拍实物照 */
  const [cameraOpen, setCameraOpen] = useState(false);
  /** 前端 jsQR 从照片中解码出的第一个固资编号（用于 AI 识别） */
  const qrDecodedCode = useMemo(() => {
    const qr = allPhotos.find((p) => p.type === 'qr' && p.decodedCode);
    return qr?.decodedCode ?? '';
  }, [allPhotos]);
  /** 二维码照片列表 */
  const qrPhotos = useMemo(() => allPhotos.filter((p) => p.type === 'qr'), [allPhotos]);
  /** 实物照照片列表 */
  const frontPhotos = useMemo(() => allPhotos.filter((p) => p.type === 'front' || p.type === 'unknown'), [allPhotos]);
  /** 二维码照片数量 */
  const qrPhotoCount = qrPhotos.length;
  /** 非二维码照片数量（实物照） */
  const frontPhotoCount = frontPhotos.length;
  /** AI 识别完整结果（含二维码校验与置信度），用于 UI 展示与二次确认 */
  const [aiResult, setAiResult] = useState<RecognizeAssetResult | null>(null);

  // 加载状态
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  // 进度
  const [progress, setProgress] = useState({ total: 0, completed: 0, percentage: 0 });

  // GPS 位置与解析状态
  const [gpsLocation, setGpsLocation] = useState('定位中...');
  const [gpsCoords, setGpsCoords] = useState({ longitude: '', latitude: '' });

  // 水印时间
  const [watermarkTime, setWatermarkTime] = useState('');

  // AI 识别独立状态
  const [aiLoading, setAiLoading] = useState(false);
  const [aiMsg, setAiMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // 资产信息折叠：默认展开，让用户一眼看到资产详情
  const [assetInfoExpanded, setAssetInfoExpanded] = useState(true);

  // 手动标记二维码弹窗
  const [manualQrDialogOpen, setManualQrDialogOpen] = useState(false);
  const [manualQrTargetIdx, setManualQrTargetIdx] = useState<number>(-1);
  const [manualQrCode, setManualQrCode] = useState('');

  // 触控滑动跟踪
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  /** 更新水印时间 */
  const updateTime = useCallback(() => {
    const now = new Date();
    setWatermarkTime(
      now.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }),
    );
  }, []);

  /** 获取 GPS 位置（优先钉钉带地址，否则浏览器定位+逆地理编码） */
  const getGPS = useCallback(async () => {
    try {
      const { longitude, latitude, address } = await getCurrentLocation();
      setGpsCoords({
        longitude: longitude ? longitude.toFixed(6) : '',
        latitude: latitude ? latitude.toFixed(6) : '',
      });
      setGpsLocation(address || '定位失败');
    } catch {
      setGpsLocation('定位失败');
    }
  }, []);

  /** 加载任务详情 */
  const fetchData = useCallback(async () => {
    if (!taskId) return;
    setLoading(true);
    setError(null);
    try {
      const detail = await getTaskDetail(taskId);
      setTaskName(detail.taskName);
      setAssets(detail.assets);
      setCompletedCodes(detail.completedCodes || []);

      // 跳到第一个未盘资产
      const firstUncompleted = detail.assets.findIndex(
        (a) => !(detail.completedCodes || []).includes(a.assetCode),
      );
      setCurrentIndex(firstUncompleted >= 0 ? firstUncompleted : 0);

      // 加载进度
      const prog = await getProgress(taskId);
      setProgress(prog);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '加载任务详情失败';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    fetchData();
    updateTime();
    getGPS();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** 切换资产时重置当前盘点状态 */
  useEffect(() => {
    const currentAsset = assets[currentIndex];
    if (currentAsset) {
      setAssetStatus('正常');
      setRemark('');
      setInventoryQty('');
      setAllPhotos([]);
      setAiResult(null);
      updateTime();
      // 获取资产完整详情
      setAssetDetailLoading(true);
      setAssetDetailError(null);
      setAssetDetail(null);
      getAssetByCode(currentAsset.assetCode)
        .then((detail) => {
          setAssetDetail(detail);
          setAssetDetailError(null);
        })
        .catch((err) => {
          console.warn('获取资产详情失败，回退到简化展示:', err);
          setAssetDetailError(err instanceof Error ? err.message : '获取资产详情失败');
          setAssetDetail(null);
        })
        .finally(() => setAssetDetailLoading(false));
    }
  }, [currentIndex, assets]);

  /** 状态切换：丢失→强制数量0+清照片；损坏/其他→清备注提醒；正常→清备注 */
  const handleStatusChange = useCallback((_e: unknown, val: string | null) => {
    if (!val) return;
    const prev = assetStatus;
    setAssetStatus(val);
    // 切换到丢失：清照片、数量强制0
    if (val === '丢失' && prev !== '丢失') {
      setAllPhotos([]);
      setAiResult(null);
      setInventoryQty('0');
    }
    // 切出丢失：恢复数量为空
    if (prev === '丢失' && val !== '丢失') {
      setInventoryQty('');
    }
    // 切换到非正常：清备注（提醒用户填写）
    if (val !== '正常' && prev === '正常') {
      setRemark('');
    }
  }, [assetStatus]);

  /** 统一照片捕获：所有照片先以 unknown 入库，再异步识别二维码决定类型 */
  const handlePhotoCapture = useCallback(async (dataUrl: string) => {
    // 先以 unknown 类型加入（乐观更新）
    const idx = allPhotos.length;
    setAllPhotos((prev) => [...prev, { dataUrl, type: 'unknown' as const }]);
    // 异步解码二维码
    const code = await decodeQRCode(dataUrl);
    if (code) {
      // 解码成功 → 标记为二维码照
      setAllPhotos((prev) => prev.map((p, i) => (i === idx ? { ...p, type: 'qr' as const, decodedCode: code } : p)));
    } else {
      // 解码失败 → 标记为实物照
      setAllPhotos((prev) => prev.map((p, i) => (i === idx ? { ...p, type: 'front' as const } : p)));
    }
  }, [allPhotos]);

  /** 删除指定索引照片 */
  const handleRemovePhoto = useCallback((idx: number) => {
    setAllPhotos((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  /** 手动标记某张照片为二维码 */
  const handleManualQrOpen = useCallback((idx: number) => {
    setManualQrTargetIdx(idx);
    setManualQrCode(allPhotos[idx]?.decodedCode ?? '');
    setManualQrDialogOpen(true);
  }, [allPhotos]);

  const handleManualQrConfirm = useCallback(() => {
    if (manualQrTargetIdx < 0 || manualQrTargetIdx >= allPhotos.length) return;
    setAllPhotos((prev) =>
      prev.map((p, i) =>
        i === manualQrTargetIdx
          ? { ...p, type: 'qr', decodedCode: manualQrCode.trim() || undefined }
          : p,
      ),
    );
    setManualQrDialogOpen(false);
    setManualQrTargetIdx(-1);
  }, [manualQrTargetIdx, manualQrCode, allPhotos]);

  const handleManualQrClose = useCallback(() => {
    setManualQrDialogOpen(false);
    setManualQrTargetIdx(-1);
  }, []);

  /** AI 识别候选：当前任务全部资产（传入后相机组件显示「AI 识别资产」按钮） */
  const aiCandidates = useMemo(
    () =>
      assets.map((a) => ({
        assetCode: a.assetCode,
        name: a.assetName,
        spec: a.standard || '',
      })),
    [assets],
  );

  /** AI 识别完成后：依二维码硬校验 + 置信度决定自动切换或人工确认 */
  const handleAIRecognized = useCallback(
    (result: RecognizeAssetResult) => {
      setAiResult(result);
      if (result.qrMatched && !result.lowConfidence) {
        // 二维码硬校验通过 + 外观置信度足够 → 可信，自动切换
        const idx = assets.findIndex((a) => a.assetCode === result.assetCode);
        if (idx >= 0 && idx !== currentIndex) setCurrentIndex(idx);
        setAiMsg({
          type: 'success',
          text: `二维码校验通过 · 识别为 ${result.name}（${result.assetCode}）· 置信度 ${Math.round((result.confidence ?? 0) * 100)}%`,
        });
      } else {
        // 不可信：二维码不符或低置信 → 不切换，提示人工
        const reason = !result.qrDecoded
          ? '未能识别二维码，请重拍固定资产标签'
          : !result.qrMatched
          ? `二维码编号[${result.qrAssetCode}]与当前盘点资产不符，请核对`
          : '外观识别置信度偏低，请人工确认';
        setAiMsg({ type: 'error', text: reason });
      }
    },
    [assets, currentIndex],
  );

  /** 独立 AI 识别按钮逻辑（统一照片智能分类） */
  const lastFrontPhoto = frontPhotos.length > 0 ? frontPhotos[frontPhotos.length - 1].dataUrl : null;
  const handleAIRecognize = useCallback(async () => {
    if (qrPhotos.length === 0 || frontPhotos.length === 0 || !qrDecodedCode || !lastFrontPhoto || aiCandidates.length === 0) return;
    setAiLoading(true);
    setAiMsg(null);
    try {
      const result = await RecognizeAsset({
        image: lastFrontPhoto,
        candidates: aiCandidates,
        qrAssetCode: qrDecodedCode,
        qrImage: qrPhotos[0].dataUrl,
        currentAssetCode: assets[currentIndex]?.assetCode ?? '',
      });
      handleAIRecognized(result);
    } catch {
      setAiMsg({ type: 'error', text: 'AI 服务暂不可用' });
    } finally {
      setAiLoading(false);
    }
  }, [qrPhotos, frontPhotos, qrDecodedCode, lastFrontPhoto, aiCandidates, assets, currentIndex, handleAIRecognized]);

  // 照片删除逻辑见 handleRemoveQR / handleRemoveFront

  /** 切换上一个资产 */
  const goPrev = useCallback(() => {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  }, []);

  /** 切换下一个资产 */
  const goNext = useCallback(() => {
    setCurrentIndex((prev) => Math.min(assets.length - 1, prev));
  }, [assets.length]);

  /** 触控滑动处理 */
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const dx = e.changedTouches[0].clientX - touchStartX.current;
      const dy = e.changedTouches[0].clientY - touchStartY.current;
      // 仅水平滑动超过 50px 且水平大于垂直时触发
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
        if (dx > 0) goPrev();
        else goNext();
      }
    },
    [goPrev, goNext],
  );

  /** 提交盘点记录 */
  const handleSubmit = useCallback(async () => {
    if (!taskId) return;
    const asset = assets[currentIndex];
    if (!asset) return;

    const lost = IS_LOST(assetStatus);

    // 丢失状态：跳过拍照；其余需至少 2 张照片（含至少 1 张二维码照）
    if (!lost && (allPhotos.length < 2 || qrPhotoCount < 1)) {
      setSnackbar({ open: true, message: '❌ 需拍摄至少 2 张照片（含固定资产二维码）', severity: 'error' });
      return;
    }

    // 强制 AI 识别：已拍摄照片但未完成 AI 识别，禁止跳过该步骤
    if (!lost && allPhotos.length >= 2 && qrPhotoCount >= 1 && !aiResult) {
      if (!qrDecodedCode) {
        setSnackbar({ open: true, message: '❌ 请先识别固定资产二维码（点击照片上的「码?」手动标记编号）', severity: 'error' });
      } else {
        setSnackbar({ open: true, message: '❌ 请先点击「AI 识别」完成资产外观识别，不能跳过该步骤', severity: 'error' });
      }
      return;
    }

    // 非正常状态：备注必填
    if (NEED_REMARK_STATUSES.has(assetStatus) && remark.trim() === '') {
      setSnackbar({ open: true, message: '❌ 该状态必须填写备注说明', severity: 'error' });
      return;
    }

    setSubmitting(true);
    try {
      await submitRecord({
        taskId,
        assetCode: asset.assetCode,
        status: assetStatus,
        remark,
        photoUrls: allPhotos.map((p) => p.dataUrl),
        longitude: gpsCoords.longitude,
        latitude: gpsCoords.latitude,
        location: gpsLocation,
        operatorName: user?.name || user?.username || 'unknown',
        inventoryQty: lost ? 0 : (inventoryQty.trim() === '' ? undefined : Number(inventoryQty)),
      });
      setSnackbar({ open: true, message: '✅ 盘点提交成功！', severity: 'success' });

      // 更新已完成列表和进度
      setCompletedCodes((prev) => [...prev, asset.assetCode]);
      setProgress((prev) => ({
        ...prev,
        completed: prev.completed + 1,
        percentage: Math.round(((prev.completed + 1) / prev.total) * 100),
      }));

      // 重置当前盘点表单（照片/备注/状态/水印时间），避免带入下一个资产
      setAssetStatus('正常');
      setRemark('');
      setInventoryQty('');
      setAllPhotos([]);
      setAiResult(null);
      updateTime();

      // 全部盘点项完成 → 自动跳回任务卡片页（/tasks）；否则跳到下一个
      const newCompletedCount = completedCodes.length + 1;
      if (newCompletedCount >= assets.length) {
        setTimeout(() => navigate('/tasks'), 1000);
      } else if (currentIndex < assets.length - 1) {
        setCurrentIndex((prev) => prev + 1);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '提交失败';
      setSnackbar({ open: true, message: `❌ ${msg}`, severity: 'error' });
    } finally {
      setSubmitting(false);
    }
  }, [taskId, assets, currentIndex, qrPhotos, frontPhotos, assetStatus, remark, gpsCoords, gpsLocation]);

  // ---------- 加载态 ----------
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <CircularProgress />
          <p className="mt-3 text-gray-500 text-sm">加载盘点任务...</p>
        </div>
      </div>
    );
  }

  // ---------- 错误态 ----------
  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-50">
        <Alert severity="error" sx={{ mb: 2, width: '100%', maxWidth: 360 }}>
          {error}
        </Alert>
        <Button variant="outlined" onClick={fetchData}>
          重新加载
        </Button>
        <Button variant="text" onClick={() => navigate('/tasks')} sx={{ mt: 1 }}>
          返回任务列表
        </Button>
      </div>
    );
  }

  // ---------- 空资产 ----------
  if (assets.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-50">
        <p className="text-gray-500 text-lg mb-3">该任务暂无资产数据</p>
        <Button variant="contained" onClick={() => navigate('/tasks')}>
          返回任务列表
        </Button>
      </div>
    );
  }

  const currentAsset = assets[currentIndex];
  const isCompleted = currentAsset ? completedCodes.includes(currentAsset.assetCode) : false;

  // 操作步骤定义
  const STEP_PHOTO = 0;
  const STEP_RESULT = 1;
  const STEP_SUBMIT = 2;
  // 当前步骤：照片未拍完 → 步骤0；照片拍完 → 步骤1
  const currentStep = !IS_LOST(assetStatus) && (allPhotos.length < 2 || qrPhotoCount < 1) ? STEP_PHOTO : STEP_RESULT;

  return (
    <div
      className="h-dvh bg-gray-50 flex flex-col overflow-hidden pt-12"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* 进度条 */}
      <div className="px-3 py-2 bg-white border-b border-gray-100 shrink-0">
        <ProgressBar current={progress.completed} total={progress.total} />
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-3 py-2 space-y-2">
        {/* ── 卡A：资产信息（可折叠，默认展开）── */}
        <Accordion
          expanded={assetInfoExpanded}
          onChange={() => setAssetInfoExpanded((v) => !v)}
          disableGutters
          elevation={0}
          sx={{
            borderRadius: '12px',
            border: '1px solid rgb(243,244,246)',
            '&:before': { display: 'none' },
          }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ minHeight: 40, '& .MuiAccordionSummary-content': { my: 0.5 } }}>
            <Typography variant="body2" fontWeight={600} className="text-gray-900">
              📋 {currentAsset.assetName || '固定资产详情'}
              <span className="ml-2 text-xs font-normal text-gray-400">{currentAsset.assetCode}</span>
            </Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ pt: 0 }}>
            {assetDetailLoading ? (
              <div className="space-y-1.5">
                <Skeleton variant="text" width="40%" />
                <Skeleton variant="text" width="70%" />
                <Skeleton variant="text" width="60%" />
              </div>
            ) : assetDetailError && !assetDetail ? (
              <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                <div><dt className="text-gray-400">类别</dt><dd className="text-gray-800">{currentAsset.category || '—'}</dd></div>
                <div><dt className="text-gray-400">使用部门</dt><dd className="text-gray-800">{currentAsset.department || '—'}</dd></div>
                <div><dt className="text-gray-400">责任人</dt><dd className="text-gray-800">{currentAsset.userName || '—'}</dd></div>
                <div><dt className="text-gray-400">存放地点</dt><dd className="text-gray-800 break-words">{currentAsset.location || '—'}</dd></div>
                {currentAsset.costCenterName ? <div><dt className="text-gray-400">成本中心</dt><dd className="text-gray-800 break-words">{currentAsset.costCenterName}</dd></div> : null}
                {currentAsset.standard ? <div><dt className="text-gray-400">规格型号</dt><dd className="text-gray-800 break-words">{currentAsset.standard}</dd></div> : null}
              </dl>
            ) : assetDetail ? (
              <AssetDetailTabs asset={assetDetail} />
            ) : (
              <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                <div><dt className="text-gray-400">类别</dt><dd className="text-gray-800">{currentAsset.category || '—'}</dd></div>
                <div><dt className="text-gray-400">使用部门</dt><dd className="text-gray-800">{currentAsset.department || '—'}</dd></div>
                <div><dt className="text-gray-400">责任人</dt><dd className="text-gray-800">{currentAsset.userName || '—'}</dd></div>
                <div><dt className="text-gray-400">存放地点</dt><dd className="text-gray-800 break-words">{currentAsset.location || '—'}</dd></div>
                {currentAsset.costCenterName ? <div><dt className="text-gray-400">成本中心</dt><dd className="text-gray-800 break-words">{currentAsset.costCenterName}</dd></div> : null}
                {currentAsset.standard ? <div><dt className="text-gray-400">规格型号</dt><dd className="text-gray-800 break-words">{currentAsset.standard}</dd></div> : null}
              </dl>
            )}
          </AccordionDetails>
        </Accordion>

        {/* 微型步骤条：放在基础信息卡和拍照采集卡之间，提示操作流程 */}
        <div className="flex items-center justify-center gap-2 text-xs bg-white rounded-xl p-2 border border-gray-100">
          {[
            { label: '拍照采集', icon: <CameraAltIcon sx={{ fontSize: 14 }} />, active: currentStep === STEP_PHOTO, done: qrPhotoCount >= 1 && allPhotos.length >= 2 },
            { label: '填写结果', icon: <AssignmentIcon sx={{ fontSize: 14 }} />, active: currentStep === STEP_RESULT && (qrPhotoCount >= 1 && allPhotos.length >= 2), done: false },
            { label: '提交', icon: <CheckCircleOutlineIcon sx={{ fontSize: 14 }} />, active: false, done: false },
          ].map((s, i) => (
            <Fragment key={s.label}>
              {i > 0 && <span className="w-6 border-t border-gray-300" />}
              <div className={`flex items-center gap-1 ${s.done ? 'text-green-600' : s.active ? 'text-indigo-700 font-semibold' : 'text-gray-400'}`}>
                {s.done ? <CheckCircleOutlineIcon sx={{ fontSize: 14 }} /> : s.icon}
                <span>{s.label}</span>
              </div>
            </Fragment>
          ))}
        </div>

        {isCompleted && (
          <Alert severity="success" sx={{ fontSize: '0.8rem', py: 0.5 }}>该资产已盘点完成</Alert>
        )}

        {/* ── 卡B：照片采集（视觉最重）── */}
        {!IS_LOST(assetStatus) && (
        <div className={`rounded-xl p-2.5 shadow-sm border space-y-2 transition-all ${currentStep === STEP_PHOTO ? 'bg-white border-indigo-200 ring-1 ring-indigo-100' : 'bg-white border-gray-100'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white ${currentStep === STEP_PHOTO ? 'bg-indigo-600' : 'bg-gray-300'}`}>1</span>
              <h3 className="font-semibold text-gray-900 text-sm">拍摄照片</h3>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span className={qrPhotoCount >= 1 ? 'text-green-600 font-medium' : ''}>二维码标签 {qrPhotoCount}</span>
              <span className="text-gray-300">|</span>
              <span className={allPhotos.length >= 2 ? 'text-green-600 font-medium' : ''}>实物照 {frontPhotoCount}</span>
            </div>
          </div>
          <p className="text-xs text-gray-400">拍摄 2 张及以上照片（含固定资产标签二维码），系统自动识别；也可手动标记或钉钉扫码</p>
          {allPhotos.length > 0 ? (
            <div className="grid grid-cols-5 gap-1.5">
              {allPhotos.map((photo, idx) => (
                <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-gray-100">
                  {photo.dataUrl ? (
                    <img src={photo.dataUrl} alt={`照片${idx + 1}`} className="w-full h-full object-cover" />
                  ) : (
                    /* 钉钉扫码生成的虚拟照片（无图片） */
                    <div className="w-full h-full flex items-center justify-center bg-green-50">
                      <QrCodeScannerIcon sx={{ fontSize: 20, color: '#16a34a' }} />
                    </div>
                  )}
                  <span className={`absolute top-0.5 left-0.5 text-[10px] px-1 py-0.5 rounded-full font-medium ${photo.type === 'qr' ? (photo.decodedCode ? 'bg-green-500' : 'bg-orange-500') : 'bg-blue-500'} text-white`}>
                    {photo.type === 'qr' ? (photo.decodedCode ? '码' : '码?') : '物'}
                  </span>
                  {/* 手动标记二维码 按钮：允许将 unknown/front 改为 qr */}
                  {!isCompleted && photo.type !== 'qr' && photo.dataUrl && (
                    <button
                      onClick={() => handleManualQrOpen(idx)}
                      className="absolute top-0.5 left-8 text-[10px] bg-orange-500 text-white w-4 h-4 rounded-full flex items-center justify-center"
                      title="标记为二维码"
                    >
                      <EditIcon sx={{ fontSize: 10 }} />
                    </button>
                  )}
                  {!isCompleted && (
                    <button
                      onClick={() => handleRemovePhoto(idx)}
                      className="absolute top-0.5 right-0.5 bg-red-500 text-white w-4 h-4 rounded-full flex items-center justify-center text-[10px]"
                    >
                      <DeleteIcon fontSize="inherit" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-1 py-5 rounded-xl border-2 border-dashed border-gray-200 text-gray-300">
              <CameraAltIcon sx={{ fontSize: 28 }} />
              <span className="text-xs">点击下方按钮拍摄（至少 2 张）</span>
            </div>
          )}
          {/* 二维码状态提示 */}
          {qrDecodedCode ? (
            <Alert severity="success" sx={{ fontSize: '0.8rem', py: 0.5 }}>二维码识别：{qrDecodedCode}</Alert>
          ) : qrPhotoCount > 0 && !qrDecodedCode ? (
            <Alert severity="warning" sx={{ fontSize: '0.8rem', py: 0.5 }} icon={<QrCodeScannerIcon fontSize="inherit" />}>
              已拍摄二维码但未能自动识别编号，请点击照片上的「码?」手动标记，或重拍更清晰的二维码
            </Alert>
          ) : allPhotos.length > 0 && qrPhotoCount === 0 ? (
            <Alert severity="warning" sx={{ fontSize: '0.8rem', py: 0.5 }} icon={<QrCodeScannerIcon fontSize="inherit" />}>
              未检测到二维码标签，请拍摄固定资产标签（系统会自动识别）
            </Alert>
          ) : null}
          {/* 统一拍照入口：一个按钮打开取景框，拍完自动识别二维码/实物照；钉钉扫码为辅助小按钮 */}
          {cameraOpen ? (
            <CameraCapture
              onCapture={(dataUrl) => {
                handlePhotoCapture(dataUrl);
                setCameraOpen(false);
              }}
              onClose={() => setCameraOpen(false)}
              watermark={{
                time: watermarkTime,
                location: gpsLocation,
                operator: user?.name || user?.username || '--',
                assetCode: currentAsset.assetCode,
              }}
              disabled={isCompleted}
              photoCount={allPhotos.length}
              minPhotos={2}
              maxPhotos={5}
            />
          ) : (
            <Button
              variant="contained"
              fullWidth
              size="small"
              startIcon={<CameraAltIcon />}
              onClick={() => setCameraOpen(true)}
              disabled={isCompleted || allPhotos.length >= 5}
              sx={{ py: 0.8, fontSize: '0.8rem' }}
            >
              拍摄照片
            </Button>
          )}

          {/* 强制 AI 识别提示：已拍摄照片但未完成 AI 识别时，要求用户必须先点击 AI 识别 */}
          {!isCompleted && !IS_LOST(assetStatus) && qrPhotoCount >= 1 && frontPhotoCount >= 1 && qrDecodedCode && !aiResult && (
            <Alert severity="warning" sx={{ fontSize: '0.78rem', py: 0.5 }}>
              已拍摄照片，请先点击右侧「AI 识别」完成资产外观识别（必做步骤，未识别无法提交）
            </Alert>
          )}

          <div className="flex gap-2">
            <Button
              variant="contained"
              fullWidth
              size="small"
              color="secondary"
              startIcon={aiLoading ? <CircularProgress size={14} color="inherit" /> : <span>✨</span>}
              onClick={handleAIRecognize}
              disabled={aiLoading || isCompleted || qrPhotoCount === 0 || frontPhotoCount === 0 || !qrDecodedCode || !!aiResult}
              sx={{ fontSize: '0.78rem', py: 0.5 }}
            >
              {aiLoading ? '识别中...' : aiResult ? '✅ 已识别' : 'AI 识别（必做）'}
            </Button>
          </div>
          {aiMsg && (
            <Alert severity={aiMsg.type === 'success' ? 'success' : aiMsg.type === 'error' ? 'error' : 'info'} sx={{ fontSize: '0.8rem' }}>
              {aiMsg.text}
            </Alert>
          )}
          {aiResult && (
            <div className="text-xs space-y-1 border-t border-gray-100 pt-2">
              <div className="flex justify-between">
                <span className="text-gray-400">二维码校验</span>
                <span className={aiResult.qrMatched ? 'text-green-600 font-medium' : 'text-red-500 font-medium'}>
                  {!aiResult.qrDecoded ? '未识别' : aiResult.qrMatched ? '✅ 一致' : '❌ 不符'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">外观识别</span>
                <span className="text-gray-800">{aiResult.name || '—'}（{Math.round((aiResult.confidence ?? 0) * 100)}%）</span>
              </div>
              {aiResult.needManualConfirm && (
                <Alert severity="warning" sx={{ fontSize: '0.75rem', py: 0.5 }}>
                  需人工确认：二维码不符或置信度偏低，未自动切换资产
                </Alert>
              )}
            </div>
          )}
        </div>
        )}

        {/* ── 卡C：盘点结果（状态 + 数量 + 备注）── */}
        <div className="bg-white rounded-xl p-2.5 shadow-sm border border-gray-100 space-y-2">
          <div className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white bg-indigo-600">2</span>
            <h3 className="font-semibold text-gray-900 text-sm">盘点结果</h3>
          </div>
          {/* 状态选择 */}
          <div>
            <p className="text-xs font-medium text-gray-700 mb-1.5">盘点状态</p>
            <ToggleButtonGroup
              value={assetStatus}
              exclusive
              onChange={handleStatusChange}
              size="small"
              fullWidth
              disabled={isCompleted}
              sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.75 }}
            >
              {STATUS_OPTIONS.map((opt) => (
                <ToggleButton
                  key={opt.value}
                  value={opt.value}
                  sx={{
                    borderRadius: '6px !important',
                    border: '1px solid rgba(0,0,0,0.12) !important',
                    fontSize: '0.75rem',
                    py: 0.75,
                    '&.Mui-selected': {
                      bgcolor: 'rgba(26, 35, 126, 0.08)',
                      borderColor: '#1a237e !important',
                    },
                  }}
                >
                  {opt.label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </div>
          {/* 盘点数量 */}
          <div>
            <p className="text-xs font-medium text-gray-700 mb-1.5">盘点数量</p>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1">
              <div>
                <div className="text-xs text-gray-400 mb-0.5">账面数量</div>
                <div className="text-sm font-semibold text-gray-700">
                  {assetDetail?.menge ? `${assetDetail.menge}` : '—'}
                </div>
              </div>
              <div>
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  label={IS_LOST(assetStatus) ? '盘点数量（丢失=0）' : '实际盘点数量'}
                  value={inventoryQty}
                  onChange={(e) => setInventoryQty(e.target.value)}
                  placeholder={IS_LOST(assetStatus) ? '丢失，数量强制为0' : '填写实盘数量'}
                  disabled={isCompleted || IS_LOST(assetStatus)}
                  inputProps={{ min: 0, step: 1 }}
                  sx={{ '& .MuiInputBase-root': { fontSize: '0.85rem' } }}
                />
              </div>
            </div>
            {assetDetail?.menge && inventoryQty.trim() !== '' && (() => {
              const bookQty = Number(assetDetail.menge);
              const actualQty = Number(inventoryQty);
              const diff = actualQty - bookQty;
              if (diff === 0) {
                return <div className="text-xs text-green-600 font-medium mt-1">✅ 数量一致，无差异</div>;
              }
              return <div className="text-xs text-red-600 font-medium mt-1">⚠ 差异：{diff > 0 ? '+' : ''}{diff}（盘{actualQty > bookQty ? '盈' : '亏'}）</div>;
            })()}
          </div>
          {/* 备注 */}
          <TextField
            fullWidth
            size="small"
            label={NEED_REMARK_STATUSES.has(assetStatus) ? '备注（必填）' : '备注（可选）'}
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            placeholder={NEED_REMARK_STATUSES.has(assetStatus) ? '该状态必须填写备注说明...' : '填写盘点备注（选填）...'}
            disabled={isCompleted}
            required={NEED_REMARK_STATUSES.has(assetStatus)}
            error={NEED_REMARK_STATUSES.has(assetStatus) && remark.trim() === ''}
            helperText={NEED_REMARK_STATUSES.has(assetStatus) && remark.trim() === '' ? '必须填写备注说明' : undefined}
            sx={{ '& .MuiInputBase-root': { fontSize: '0.85rem' } }}
          />
        </div>
      </div>

      {/* 底部操作区 - 始终可见 */}
      <div className="px-3 py-2 bg-white border-t border-gray-100 shrink-0 space-y-2">
        {/* 导航按钮 */}
        <div className="flex items-center justify-between gap-2">
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={goPrev}
            disabled={currentIndex === 0}
            size="small"
            sx={{ flex: 1, py: 0.75, fontSize: '0.8rem' }}
          >
            上一个
          </Button>
          <span className="text-xs text-gray-400 shrink-0">
            {currentIndex + 1}/{assets.length}
          </span>
          <Button
            variant="outlined"
            endIcon={<ArrowForwardIcon />}
            onClick={goNext}
            disabled={currentIndex >= assets.length - 1}
            size="small"
            sx={{ flex: 1, py: 0.75, fontSize: '0.8rem' }}
          >
            下一个
          </Button>
        </div>

        {/* 提交按钮 */}
        {currentStep === STEP_PHOTO && !IS_LOST(assetStatus) ? (
          <Button
            variant="contained"
            fullWidth
            size="medium"
            disabled
            sx={{ py: 1.2, fontWeight: 700, fontSize: '0.95rem', bgcolor: 'grey.400', '&.Mui-disabled': { bgcolor: 'grey.300', color: 'grey.500' } }}
          >
            请先拍摄照片
          </Button>
        ) : (
          <Button
            variant="contained"
            fullWidth
            size="medium"
            onClick={handleSubmit}
            disabled={submitting || isCompleted || !!(!IS_LOST(assetStatus) && qrPhotoCount >= 1 && frontPhotoCount >= 1 && qrDecodedCode && !aiResult)}
            sx={{ py: 1.2, fontWeight: 700, fontSize: '0.95rem' }}
          >
            {submitting ? (
              <CircularProgress size={22} color="inherit" />
            ) : isCompleted ? (
              '已完成盘点'
            ) : (
              '提交盘点记录'
            )}
          </Button>
        )}
      </div>

      {/* 手动标记二维码弹窗 */}
      <Dialog open={manualQrDialogOpen} onClose={handleManualQrClose} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontSize: '1rem' }}>标记为二维码</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="固定资产编号"
            value={manualQrCode}
            onChange={(e) => setManualQrCode(e.target.value)}
            placeholder="例如：102000000653"
            size="small"
            helperText="从标签上或资产卡片上查看固定资产编号"
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleManualQrClose} size="small">取消</Button>
          <Button onClick={handleManualQrConfirm} variant="contained" size="small">确认标记</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar 提示 */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          sx={{ width: '100%', maxWidth: 400 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </div>
  );
}
