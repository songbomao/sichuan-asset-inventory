import { useEffect, useState, useCallback, useRef, useMemo, Fragment } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Button from '@mui/material/Button';
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
import DeleteIcon from '@mui/icons-material/Delete';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import AssignmentIcon from '@mui/icons-material/Assignment';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import LabelIcon from '@mui/icons-material/Label';
import PhotoCameraBackIcon from '@mui/icons-material/PhotoCameraBack';
import PhotoCameraFrontIcon from '@mui/icons-material/PhotoCameraFront';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import { getTaskDetail, getProgress, type AssetInfo } from '../api/tasks';
import { submitRecord, type AssetDetail, getAssetByCode } from '../api/inventory';
import { getCurrentLocation } from '../api/reverseGeocode';
import { useAuth } from '../contexts/AuthContext';
import CameraCapture, { type PhotoValidationResult } from '../components/CameraCapture';
import AssetDetailTabs from '../components/AssetDetailTabs';
import ProgressBar from '../components/ProgressBar';
import type { RecognizeAssetResult } from '../api/ai';
import { RecognizeAsset } from '../api/ai';
import dd from 'dingtalk-jsapi';

/** 盘点状态选项 */
const STATUS_OPTIONS = [
  { value: '正常', label: '✅ 正常' },
  { value: '丢失', label: '❌ 丢失' },
  { value: '损坏', label: '⚠ 损坏' },
];
/** 需要强制备注的状态 */
const NEED_REMARK_STATUSES = new Set<string | null>(['丢失', '损坏']);
/** 丢失状态 */
const IS_LOST = (status: string | null) => status === '丢失';

/** 🚨 HOTFIX v202607301419 - React Hooks 顺序修复 */
const HOTFIX_202607301419 = (() => {
  const marker = '🚨v202607301419-HooksOrderFix';
  if (typeof window !== 'undefined') {
    (window as any).__HOTFIX_202607301419 = marker;
  }
  return marker;
})();

/**
 * ============================================================
 * 三步骤拍照校验函数（纯函数，不依赖组件状态）
 * ============================================================
 */

/** 标签照校验：检测照片是否有实际内容（非纯黑/纯白/纯灰） */
function validateTagPhoto(dataUrl: string): Promise<PhotoValidationResult> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const maxW = 200;
        const scale = Math.min(1, maxW / Math.max(img.width, img.height));
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return resolve({ valid: true }); // 读不到像素放行
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        // 计算颜色方差（太接近说明是纯色/模糊黑块）
        let rSum = 0, gSum = 0, bSum = 0;
        const total = canvas.width * canvas.height;
        for (let i = 0; i < data.length; i += 4) {
          rSum += data[i];
          gSum += data[i + 1];
          bSum += data[i + 2];
        }
        const avgR = rSum / total, avgG = gSum / total, avgB = bSum / total;
        let varianceSum = 0;
        for (let i = 0; i < data.length; i += 4) {
          varianceSum +=
            (data[i] - avgR) ** 2 + (data[i + 1] - avgG) ** 2 + (data[i + 2] - avgB) ** 2;
        }
        const variance = varianceSum / total;
        // 方差 < 80 → 画面几乎纯色/极度模糊
        if (variance < 80) {
          return resolve({ valid: false, reason: '照片内容过于模糊或纯色，请对准固定资产标签重新拍摄' });
        }
        // 平均亮度太低或太高 → 可能全黑或过曝
        const avgBright = (avgR + avgG + avgB) / 3;
        if (avgBright < 20) {
          return resolve({ valid: false, reason: '照片太暗，请确保标签光照充足后重新拍摄' });
        }
        if (avgBright > 245) {
          return resolve({ valid: false, reason: '照片过亮（可能对着天空/灯光），请对准标签重新拍摄' });
        }
        // 边缘检测：计算水平+垂直的相邻像素差异，纹理太弱说明无实际内容
        let edgeSum = 0;
        const w = canvas.width, h = canvas.height;
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w - 1; x++) {
            const i1 = (y * w + x) * 4;
            const i2 = (y * w + x + 1) * 4;
            edgeSum += Math.abs(data[i1] - data[i2]) + Math.abs(data[i1 + 1] - data[i2 + 1]) + Math.abs(data[i1 + 2] - data[i2 + 2]);
          }
        }
        for (let y = 0; y < h - 1; y++) {
          for (let x = 0; x < w; x++) {
            const i1 = (y * w + x) * 4;
            const i2 = ((y + 1) * w + x) * 4;
            edgeSum += Math.abs(data[i1] - data[i2]) + Math.abs(data[i1 + 1] - data[i2 + 1]) + Math.abs(data[i1 + 2] - data[i2 + 2]);
          }
        }
        const edgeAvg = edgeSum / (w * h);
        if (edgeAvg < 3) {
          return resolve({ valid: false, reason: '未能检测到标签文本或图案，请确保标签清晰可见' });
        }
        resolve({ valid: true });
      } catch {
        resolve({ valid: true }); // 异常放行
      }
    };
    img.onerror = () => resolve({ valid: true });
    img.src = dataUrl;
  });
}

/** 正/反面照校验：检测是否有实物轮廓（非纯色，有纹理变化） */
function validateFacePhoto(dataUrl: string, faceLabel: string): Promise<PhotoValidationResult> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const maxW = 200;
        const scale = Math.min(1, maxW / Math.max(img.width, img.height));
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return resolve({ valid: true });
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        const total = canvas.width * canvas.height;

        // 边缘检测
        let edgeSum = 0;
        const w = canvas.width, h = canvas.height;
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w - 1; x++) {
            const i1 = (y * w + x) * 4;
            const i2 = (y * w + x + 1) * 4;
            edgeSum += Math.abs(data[i1] - data[i2]) + Math.abs(data[i1 + 1] - data[i2 + 1]) + Math.abs(data[i1 + 2] - data[i2 + 2]);
          }
        }
        const edgeAvg = edgeSum / (w * h);

        // 平均亮度
        let brightSum = 0;
        for (let i = 0; i < data.length; i += 4) {
          brightSum += data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
        }
        const avgBright = brightSum / total;

        if (avgBright < 15) {
          return resolve({ valid: false, reason: `照片太暗无法看清${faceLabel}，请保证光照充足后重新拍摄` });
        }
        if (avgBright > 248) {
          return resolve({ valid: false, reason: `照片过亮（可能对着天空/灯光），请对准资产${faceLabel}重新拍摄` });
        }
        if (edgeAvg < 4) {
          return resolve({ valid: false, reason: `未能检测到${faceLabel}实物轮廓，请确保资产在画面中清晰可见` });
        }
        resolve({ valid: true });
      } catch {
        resolve({ valid: true });
      }
    };
    img.onerror = () => resolve({ valid: true });
    img.src = dataUrl;
  });
}

/**
 * 盘点操作页面（v202607311515 四节点）
 *
 * 核心流程：
 * ① 资产状态（正常/丢失/损坏）
 * ② 钉钉扫码识别（dd.biz.util.scan 扫二维码核对资产）
 * ③ 拍照采集（3 张：固定资产标签照 → 正面照 → 反面照，每步拍前提示+拍后校验）
 * ④ 盘点信息（备注+提交）
 * AI 识别在 3 张拍完后可选执行，结果仅作建议不阻断流程
 */
export default function InventoryPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [assets, setAssets] = useState<AssetInfo[]>([]);
  const [completedCodes, setCompletedCodes] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [taskName, setTaskName] = useState('');

  // 当前资产的盘点状态（默认 null：必须先主动选择，才能解锁后续步骤）
  const [assetStatus, setAssetStatus] = useState<string | null>(null);
  const [remark, setRemark] = useState('');
  const [assetDetail, setAssetDetail] = useState<AssetDetail | null>(null);
  const [assetDetailLoading, setAssetDetailLoading] = useState(false);
  const [assetDetailError, setAssetDetailError] = useState<string | null>(null);

  // ── 三步骤照片（各自独立）──
  /** 固定资产标签照（第1张） */
  const [tagPhoto, setTagPhoto] = useState<string | null>(null);
  /** 资产正面照（第2张） */
  const [frontPhoto, setFrontPhoto] = useState<string | null>(null);
  /** 资产反面照（第3张） */
  const [backPhoto, setBackPhoto] = useState<string | null>(null);

  /** 当前正在拍摄的步骤：'tag' | 'front' | 'back' | null */
  const [currentStepMode, setCurrentStepMode] = useState<'tag' | 'front' | 'back' | null>(null);

  // ── 钉钉扫码状态 ──
  /** 扫码是否已验证通过 */
  const [scanVerified, setScanVerified] = useState(false);
  /** 扫码加载中 */
  const [scanLoading, setScanLoading] = useState(false);
  /** 扫码错误 */
  const [scanError, setScanError] = useState<string | null>(null);
  /** 扫码核对不匹配弹窗 */
  const [scanMismatchOpen, setScanMismatchOpen] = useState(false);
  /** 扫码结果信息（用于不匹配弹窗展示） */
  const [scanResultInfo, setScanResultInfo] = useState<{ code: string; name?: string } | null>(null);

  /** AI 识别完整结果（3 张拍完后可选执行，建议性不阻断） */
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

  // 资产信息折叠：默认展开
  const [assetInfoExpanded, setAssetInfoExpanded] = useState(true);

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

  /** 三张照片是否全部就绪 */
  const allPhotosReady = tagPhoto !== null && frontPhoto !== null && backPhoto !== null;

  /** 拍摄步骤：1→标签, 2→正面, 3→反面, 0→全部完成 */
  const photoStep = !tagPhoto ? 1 : !frontPhoto ? 2 : !backPhoto ? 3 : 0;

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

      const firstUncompleted = detail.assets.findIndex(
        (a) => !(detail.completedCodes || []).includes(a.assetCode),
      );
      setCurrentIndex(firstUncompleted >= 0 ? firstUncompleted : 0);

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
      setAssetStatus(null);
      setRemark('');
      setTagPhoto(null);
      setFrontPhoto(null);
      setBackPhoto(null);
      setCurrentStepMode(null);
      setScanVerified(false);
      setScanLoading(false);
      setScanError(null);
      setScanMismatchOpen(false);
      setScanResultInfo(null);
      setAiResult(null);
      setAiMsg(null);
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

  /** 状态切换：丢失→清照片；损坏/其他→清备注提醒；正常→清备注 */
  const handleStatusChange = useCallback((_e: unknown, val: string | null) => {
    if (!val) return;
    const prev = assetStatus;
    setAssetStatus(val);
    if (val === '丢失' && prev !== '丢失') {
      setTagPhoto(null);
      setFrontPhoto(null);
      setBackPhoto(null);
      setCurrentStepMode(null);
      setScanVerified(false);
      setScanError(null);
      setAiResult(null);
    }
    if (val !== '正常' && prev === '正常') {
      setRemark('');
    }
  }, [assetStatus]);

  /** 拍照回调：根据当前 stepMode 存入对应照片并前进 */
  const handlePhotoCapture = useCallback((dataUrl: string) => {
    if (currentStepMode === 'tag') {
      setTagPhoto(dataUrl);
      setCurrentStepMode('front'); // 自动前进到正面照
    } else if (currentStepMode === 'front') {
      setFrontPhoto(dataUrl);
      setCurrentStepMode('back'); // 自动前进到反面照
    } else if (currentStepMode === 'back') {
      setBackPhoto(dataUrl);
      setCurrentStepMode(null); // 全部完成
    }
  }, [currentStepMode]);

  /** 删除指定照片 */
  const handleRemovePhoto = useCallback((type: 'tag' | 'front' | 'back') => {
    if (type === 'back') { setBackPhoto(null); return; }
    if (type === 'front') { setFrontPhoto(null); return; }
    if (type === 'tag') {
      // 删除标签照（含已扫码）→ 同时清空正反面，回到扫码步骤
      setTagPhoto(null);
      setFrontPhoto(null);
      setBackPhoto(null);
      setScanVerified(false);
      setCurrentStepMode(null);
      setAiResult(null);
    }
  }, []);

  /** ── 钉钉扫码：调用 dd.biz.util.scan 扫二维码核对资产 ── */
  const handleDingtalkScan = useCallback(() => {
    setScanLoading(true);
    setScanError(null);
    setScanResultInfo(null);
    try {
      dd.ready(() => {
        dd.biz.util.scan({
          type: 'qrCode',
          onSuccess: (res: { text: string; scanType: string }) => {
            const code = (res?.text ?? '').trim();
            if (!code) {
              setScanError('未识别到二维码内容，请重试');
              setScanLoading(false);
              return;
            }
            const current = assets[currentIndex];
            // 精确匹配当前任务资产（避免模糊匹配误跳到其他资产）
            const matched = assets.find((a) => a.assetCode.trim() === code);
            if (matched) {
              const isExactMatch = matched.assetCode === current?.assetCode;
              if (isExactMatch) {
                // 完全匹配当前资产：标记标签照已扫码 + 解锁拍照步骤（不跳转，停留当前资产）
                setTagPhoto('__SCANNED__');
                setScanVerified(true);
                setScanError(null);
                setCurrentStepMode('front'); // 自动进入正面照拍摄
              } else {
                // 匹配到任务内其他资产但非当前资产 → 提示不匹配，停留当前资产
                setScanResultInfo({ code });
                setScanMismatchOpen(true);
              }
            } else {
              // 扫描到不在当前任务中的资产
              setScanResultInfo({ code });
              setScanMismatchOpen(true);
            }
            setScanLoading(false);
          },
          onFail: (err: unknown) => {
            const msg = err instanceof Error ? err.message : String(err ?? '');
            setScanError(msg || '扫码失败，请重试');
            setScanLoading(false);
          },
        });
      });
      dd.error((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err ?? '');
        setScanError(`钉钉扫码初始化失败：${msg}`);
        setScanLoading(false);
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err ?? '');
      setScanError(`扫码异常：${msg}`);
      setScanLoading(false);
    }
  }, [assets, currentIndex]);

  /** 重新拍摄某一步照片 */
  const handleRetakePhoto = useCallback((type: 'tag' | 'front' | 'back') => {
    setCurrentStepMode(type);
    if (type === 'tag') {
      setTagPhoto(null);
      setFrontPhoto(null);
      setBackPhoto(null);
      setAiResult(null);
    } else if (type === 'front') {
      setFrontPhoto(null);
      setAiResult(null);
    } else {
      setBackPhoto(null);
      setAiResult(null);
    }
  }, []);

  /** AI 识别候选 */
  const aiCandidates = useMemo(
    () =>
      assets.map((a) => ({
        assetCode: a.assetCode,
        name: a.assetName,
        spec: a.standard || '',
      })),
    [assets],
  );

  /** AI 识别完成后 */
  const handleAIRecognized = useCallback(
    (result: RecognizeAssetResult) => {
      setAiResult(result);
      if (result.confidence >= 0.5) {
        const idx = assets.findIndex((a) => a.assetCode === result.assetCode);
        if (idx >= 0 && idx !== currentIndex) setCurrentIndex(idx);
        setAiMsg({
          type: 'success',
          text: `AI 识别为 ${result.name}（${result.assetCode}）· 置信度 ${Math.round((result.confidence ?? 0) * 100)}%`,
        });
      } else {
        setAiMsg({
          type: 'info',
          text: `AI 识别置信度较低（${Math.round((result.confidence ?? 0) * 100)}%），建议人工核对`,
        });
      }
    },
    [assets, currentIndex],
  );

  /** AI 识别按钮 */
  const handleAIRecognize = useCallback(async () => {
    if (!frontPhoto || !backPhoto || aiCandidates.length === 0) return;
    setAiLoading(true);
    setAiMsg(null);
    try {
      const result = await RecognizeAsset({
        image: frontPhoto,       // 正面照用于外观识别
        candidates: aiCandidates,
        currentAssetCode: assets[currentIndex]?.assetCode ?? '',
      });
      handleAIRecognized(result);
    } catch {
      setAiMsg({ type: 'error', text: 'AI 服务暂不可用' });
    } finally {
      setAiLoading(false);
    }
  }, [frontPhoto, backPhoto, aiCandidates, assets, currentIndex, handleAIRecognized]);

  /** 切换上一个资产 */
  const goPrev = useCallback(() => {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  }, []);

  /** 切换下一个资产 */
  const goNext = useCallback(() => {
    setCurrentIndex((prev) => Math.min(assets.length - 1, prev + 1));
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

    // 非丢失状态：必须先扫码通过
    if (!lost && !scanVerified) {
      setSnackbar({ open: true, message: '❌ 请先完成钉钉扫码识别', severity: 'error' });
      return;
    }

    // 非丢失状态：3 张照片必须全部拍完
    if (!lost && !allPhotosReady) {
      setSnackbar({ open: true, message: '❌ 需完成拍摄 3 张照片（标签+正面+反面）', severity: 'error' });
      return;
    }

    // 非正常状态：备注必填
    if (NEED_REMARK_STATUSES.has(assetStatus) && remark.trim() === '') {
      setSnackbar({ open: true, message: '❌ 该状态必须填写备注说明', severity: 'error' });
      return;
    }

    setSubmitting(true);
    try {
      const photoUrls: string[] = [];
      if (tagPhoto && tagPhoto !== '__SCANNED__') photoUrls.push(tagPhoto);
      if (frontPhoto) photoUrls.push(frontPhoto);
      if (backPhoto) photoUrls.push(backPhoto);

      await submitRecord({
        taskId,
        assetCode: asset.assetCode,
        status: assetStatus ?? '',
        remark,
        photoUrls,
        longitude: gpsCoords.longitude,
        latitude: gpsCoords.latitude,
        location: gpsLocation,
        operatorName: user?.name || user?.username || 'unknown',
        inventoryQty: lost ? -1 : 1,
      });
      setSnackbar({ open: true, message: '✅ 盘点提交成功！', severity: 'success' });

      setCompletedCodes((prev) => [...prev, asset.assetCode]);
      setProgress((prev) => ({
        ...prev,
        completed: prev.completed + 1,
        percentage: Math.round(((prev.completed + 1) / prev.total) * 100),
      }));

      // 重置
      setAssetStatus(null);
      setRemark('');
      setTagPhoto(null);
      setFrontPhoto(null);
      setBackPhoto(null);
      setCurrentStepMode(null);
      setScanVerified(false);
      setScanError(null);
      setAiResult(null);
      updateTime();

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
  }, [taskId, assets, currentIndex, assetStatus, remark, allPhotosReady, tagPhoto, frontPhoto, backPhoto, gpsCoords, gpsLocation, completedCodes, user, navigate, updateTime]);

  // ===================== 渲染 =====================

  // 步骤定义（全局）
  const STEP_STATUS = 0;   // 资产状态
  const STEP_SCAN = 1;     // 钉钉扫码
  const STEP_PHOTO = 2;    // 拍照采集
  const STEP_SUBMIT = 3;   // 盘点信息+提交

  const currentStep: number = (() => {
    if (!assetStatus) return STEP_STATUS;        // 未选择状态 → 停留第1步，引导用户先选
    if (IS_LOST(assetStatus)) return STEP_SUBMIT; // 丢失 → 跳过扫码/拍照，直达提交
    if (!scanVerified) return STEP_SCAN;          // 未扫码 → 第2步
    if (!allPhotosReady) return STEP_PHOTO;       // 未完成拍照 → 第3步
    return STEP_SUBMIT;                            // 全部完成 → 第4步提交
  })();

  // ===================== 加载态 =====================
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

  // ===================== 错误态 =====================
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

  // ===================== 空资产 =====================
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

  // 水印数据
  const wmData = {
    time: watermarkTime,
    location: gpsLocation,
    operator: user?.name || user?.username || '--',
    assetCode: currentAsset.assetCode,
  };

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
        {/* ── 卡A：资产信息 ── */}
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

        {/* 微型步骤条 */}
        <div className="flex items-center justify-center gap-1.5 text-[11px] bg-white rounded-xl p-2 border border-gray-100">
          {[
            { label: '资产状态', icon: <RadioButtonUncheckedIcon sx={{ fontSize: 13 }} />, active: currentStep === STEP_STATUS, done: !!assetStatus },
            { label: '扫码识别', icon: <QrCodeScannerIcon sx={{ fontSize: 13 }} />, active: currentStep === STEP_SCAN, done: scanVerified },
            { label: '拍照采集', icon: <CameraAltIcon sx={{ fontSize: 13 }} />, active: currentStep === STEP_PHOTO, done: allPhotosReady },
            { label: '提交信息', icon: <AssignmentIcon sx={{ fontSize: 13 }} />, active: currentStep === STEP_SUBMIT, done: false },
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

        {/* ── 卡B：资产状态 ── */}
        <div className={`rounded-xl p-2.5 shadow-sm border space-y-2 transition-all ${currentStep === STEP_STATUS ? 'bg-white border-indigo-200 ring-1 ring-indigo-100' : 'bg-white border-gray-100'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white ${currentStep === STEP_STATUS ? 'bg-indigo-600' : assetStatus ? 'bg-green-500' : 'bg-gray-300'}`}>{assetStatus ? <CheckCircleOutlineIcon sx={{ fontSize: 14 }} /> : 1}</span>
              <h3 className="font-semibold text-gray-900 text-sm">资产状态</h3>
            </div>
            <span className="text-xs text-gray-400">{assetStatus ? '✅' : '0/1'}</span>
          </div>
          <div>
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
          {IS_LOST(assetStatus) && (
            <Alert severity="warning" sx={{ fontSize: '0.78rem', py: 0.5 }}>资产已标记为丢失，将跳过扫码识别和拍照采集</Alert>
          )}
        </div>

        {/* ── 卡C：钉钉扫码识别 ── */}
        {!IS_LOST(assetStatus) && (
        <div className={`rounded-xl p-2.5 shadow-sm border space-y-2.5 transition-all ${currentStep === STEP_SCAN ? 'bg-white border-indigo-200 ring-1 ring-indigo-100' : scanVerified ? 'bg-white border-green-200' : 'bg-white border-gray-100'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white ${currentStep === STEP_SCAN ? 'bg-indigo-600' : scanVerified ? 'bg-green-500' : 'bg-gray-300'}`}>{scanVerified ? <CheckCircleOutlineIcon sx={{ fontSize: 14 }} /> : 2}</span>
              <h3 className="font-semibold text-gray-900 text-sm">扫码识别</h3>
            </div>
            {!scanVerified && <span className="text-xs text-gray-400">0/1</span>}
          </div>

          {scanVerified ? (
            <div className="text-xs text-green-700 bg-green-50 rounded-lg p-2">
              二维码扫描已通过核对，资产信息匹配成功
            </div>
          ) : (
            <>
              <p className="text-xs text-gray-500">使用钉钉扫描固定资产标签上的二维码，系统将自动核对资产信息</p>
              <Button
                variant="contained"
                fullWidth
                size="small"
                startIcon={scanLoading ? <CircularProgress size={14} color="inherit" /> : <QrCodeScannerIcon />}
                onClick={handleDingtalkScan}
                disabled={scanLoading || isCompleted || !assetStatus}
                sx={{ py: 0.75, fontWeight: 600, fontSize: '0.85rem' }}
              >
                {!assetStatus ? '请先选择资产状态' : scanLoading ? '扫描中...' : '钉钉扫码'}
              </Button>
              {!assetStatus && !scanVerified && (
                <Alert severity="info" sx={{ fontSize: '0.78rem', py: 0.5 }}>请先在上方选择资产盘点状态</Alert>
              )}
              {scanError && (
                <Alert severity="error" sx={{ fontSize: '0.78rem', py: 0.5 }}>{scanError}</Alert>
              )}
            </>
          )}

          {/* 不匹配弹窗 */}
          <Dialog open={scanMismatchOpen} onClose={() => setScanMismatchOpen(false)} maxWidth="xs" fullWidth>
            <DialogTitle sx={{ fontSize: '0.95rem', fontWeight: 600 }}>扫码不匹配</DialogTitle>
            <DialogContent>
              <p className="text-sm text-gray-700 mb-2">
                扫描到的二维码 <span className="font-mono font-semibold text-red-600 bg-red-50 px-1 rounded">{scanResultInfo?.code}</span> 与当前资产不匹配，请确认是否为正确资产。
              </p>
              <p className="text-xs text-gray-500">当前资产编号：{currentAsset.assetCode}（{currentAsset.assetName}）</p>
            </DialogContent>
            <DialogActions sx={{ px: 2, pb: 2 }}>
              <Button size="small" variant="outlined" onClick={() => setScanMismatchOpen(false)}>重新扫码</Button>
              <Button size="small" variant="contained" color="warning" onClick={() => { setScanMismatchOpen(false); setAssetStatus('丢失'); }}>
                上报丢失
              </Button>
            </DialogActions>
          </Dialog>
        </div>
        )}

        {/* ── 卡D：拍照采集（三步骤引导：标签照→正面照→反面照）── */}
        {!IS_LOST(assetStatus) && (
        <div className={`rounded-xl p-2.5 shadow-sm border space-y-2.5 transition-all ${
          scanVerified
            ? (currentStep === STEP_PHOTO ? 'bg-white border-indigo-200 ring-1 ring-indigo-100' : 'bg-white border-gray-100')
            : 'bg-gray-50 border-gray-100'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white ${scanVerified ? (currentStep === STEP_PHOTO ? 'bg-indigo-600' : allPhotosReady ? 'bg-green-500' : 'bg-gray-300') : 'bg-gray-300'}`}>{allPhotosReady ? <CheckCircleOutlineIcon sx={{ fontSize: 14 }} /> : 3}</span>
              <h3 className={`font-semibold text-sm ${scanVerified ? 'text-gray-900' : 'text-gray-400'}`}>拍照采集</h3>
            </div>
            {scanVerified && photoStep > 0 && photoStep <= 3 && <span className="text-xs text-gray-400">{photoStep}/3</span>}
          </div>

          {scanVerified ? (
          <>
          {/* ── 拍照步骤引导条 ── */}
          <div className="flex items-center justify-center gap-1 text-[11px]">
            {[
              { label: '标签', icon: <LabelIcon sx={{ fontSize: 13 }} />, done: !!tagPhoto, current: photoStep === 1 },
              { label: '正面', icon: <PhotoCameraFrontIcon sx={{ fontSize: 13 }} />, done: !!frontPhoto, current: photoStep === 2 },
              { label: '反面', icon: <PhotoCameraBackIcon sx={{ fontSize: 13 }} />, done: !!backPhoto, current: photoStep === 3 },
            ].map((s, i) => (
              <Fragment key={s.label}>
                {i > 0 && <span className="w-4 border-t border-gray-300" />}
                <div className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full ${
                  s.done ? 'bg-green-100 text-green-700' : s.current ? 'bg-indigo-100 text-indigo-700 font-semibold' : 'text-gray-400'
                }`}>
                  {s.done ? <CheckCircleOutlineIcon sx={{ fontSize: 12 }} /> : s.icon}
                  <span>{s.label}</span>
                </div>
              </Fragment>
            ))}
          </div>

          {/* ── 三步骤照片行 ── */}
          <div className="grid grid-cols-3 gap-1.5">
            {/* 标签照 */}
            <div className="relative aspect-square rounded-lg overflow-hidden border border-gray-100">
              {tagPhoto && tagPhoto !== '__SCANNED__' ? (
                <>
                  <img src={tagPhoto} alt="标签照" className="w-full h-full object-cover" />
                  <span className="absolute top-0.5 left-0.5 text-[10px] px-1 py-0.5 rounded-full bg-green-500 text-white">标签</span>
                  {!isCompleted && (
                    <>
                      <button onClick={() => handleRemovePhoto('tag')} className="absolute top-0.5 right-0.5 bg-red-500 text-white w-4 h-4 rounded-full flex items-center justify-center text-[10px]"><DeleteIcon fontSize="inherit" /></button>
                      <button onClick={() => handleRetakePhoto('tag')} className="absolute bottom-0.5 right-0.5 bg-indigo-500 text-white text-[10px] px-1 py-0.5 rounded">重拍</button>
                    </>
                  )}
                </>
              ) : tagPhoto === '__SCANNED__' ? (
                <>
                  <div className="w-full h-full flex flex-col items-center justify-center gap-1 bg-green-50">
                    <QrCodeScannerIcon sx={{ fontSize: 28, color: '#16a34a' }} />
                    <span className="text-[10px] text-green-600 font-medium">已扫码</span>
                  </div>
                  {!isCompleted && (
                    <button onClick={() => handleRemovePhoto('tag')} className="absolute top-0.5 right-0.5 bg-red-500 text-white w-4 h-4 rounded-full flex items-center justify-center text-[10px]"><DeleteIcon fontSize="inherit" /></button>
                  )}
                </>
              ) : photoStep === 1 && !currentStepMode ? (
                <button onClick={() => setCurrentStepMode('tag')} className="w-full h-full flex flex-col items-center justify-center gap-1 bg-indigo-50 hover:bg-indigo-100 transition-colors">
                  <LabelIcon sx={{ fontSize: 24, color: '#6366f1' }} />
                  <span className="text-[10px] text-indigo-600 font-medium">点击拍摄</span>
                </button>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-1 bg-gray-100">
                  <LabelIcon sx={{ fontSize: 22, color: '#d1d5db' }} />
                  <span className="text-[10px] text-gray-400">未拍摄</span>
                </div>
              )}
            </div>

            {/* 正面照 */}
            <div className="relative aspect-square rounded-lg overflow-hidden border border-gray-100">
              {frontPhoto ? (
                <>
                  <img src={frontPhoto} alt="正面照" className="w-full h-full object-cover" />
                  <span className="absolute top-0.5 left-0.5 text-[10px] px-1 py-0.5 rounded-full bg-blue-500 text-white">正面</span>
                  {!isCompleted && (
                    <>
                      <button onClick={() => handleRemovePhoto('front')} className="absolute top-0.5 right-0.5 bg-red-500 text-white w-4 h-4 rounded-full flex items-center justify-center text-[10px]"><DeleteIcon fontSize="inherit" /></button>
                      <button onClick={() => handleRetakePhoto('front')} className="absolute bottom-0.5 right-0.5 bg-indigo-500 text-white text-[10px] px-1 py-0.5 rounded">重拍</button>
                    </>
                  )}
                </>
              ) : photoStep === 2 && !currentStepMode ? (
                <button onClick={() => setCurrentStepMode('front')} className="w-full h-full flex flex-col items-center justify-center gap-1 bg-indigo-50 hover:bg-indigo-100 transition-colors">
                  <PhotoCameraFrontIcon sx={{ fontSize: 24, color: '#6366f1' }} />
                  <span className="text-[10px] text-indigo-600 font-medium">点击拍摄</span>
                </button>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-1 bg-gray-100">
                  <PhotoCameraFrontIcon sx={{ fontSize: 22, color: '#d1d5db' }} />
                  <span className="text-[10px] text-gray-400">未拍摄</span>
                </div>
              )}
            </div>

            {/* 反面照 */}
            <div className="relative aspect-square rounded-lg overflow-hidden border border-gray-100">
              {backPhoto ? (
                <>
                  <img src={backPhoto} alt="反面照" className="w-full h-full object-cover" />
                  <span className="absolute top-0.5 left-0.5 text-[10px] px-1 py-0.5 rounded-full bg-purple-500 text-white">反面</span>
                  {!isCompleted && (
                    <>
                      <button onClick={() => handleRemovePhoto('back')} className="absolute top-0.5 right-0.5 bg-red-500 text-white w-4 h-4 rounded-full flex items-center justify-center text-[10px]"><DeleteIcon fontSize="inherit" /></button>
                      <button onClick={() => handleRetakePhoto('back')} className="absolute bottom-0.5 right-0.5 bg-indigo-500 text-white text-[10px] px-1 py-0.5 rounded">重拍</button>
                    </>
                  )}
                </>
              ) : photoStep === 3 && !currentStepMode ? (
                <button onClick={() => setCurrentStepMode('back')} className="w-full h-full flex flex-col items-center justify-center gap-1 bg-indigo-50 hover:bg-indigo-100 transition-colors">
                  <PhotoCameraBackIcon sx={{ fontSize: 24, color: '#6366f1' }} />
                  <span className="text-[10px] text-indigo-600 font-medium">点击拍摄</span>
                </button>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-1 bg-gray-100">
                  <PhotoCameraBackIcon sx={{ fontSize: 22, color: '#d1d5db' }} />
                  <span className="text-[10px] text-gray-400">未拍摄</span>
                </div>
              )}
            </div>
          </div>

          {/* ── CameraCapture 实例 ── */}
          {currentStepMode && (
            <CameraCapture
              onCapture={(dataUrl: string) => handlePhotoCapture(dataUrl)}
              onClose={() => setCurrentStepMode(null)}
              watermark={wmData}
              disabled={isCompleted}
              stepLabel={currentStepMode === 'tag' ? '固定资产标签' : currentStepMode === 'front' ? '资产正面' : '资产反面'}
              stepHint={currentStepMode === 'tag'
                ? '请对准固定资产标签上的条形码/编号区域拍摄，确保文字清晰可辨'
                : currentStepMode === 'front'
                ? '请拍摄资产正面全貌，确保实物在画面中央'
                : '请拍摄资产反面全貌（铭牌/接口面），确保实物在画面中央'}
              onValidate={currentStepMode === 'tag'
                ? (d) => validateTagPhoto(d)
                : (d) => validateFacePhoto(d, currentStepMode === 'front' ? '正面' : '反面')}
            />
          )}

          {/* ── AI 识别（3 张拍完后可选）── */}
          {allPhotosReady && (
            <div className="border-t border-gray-100 pt-2 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-700">AI 资产识别</span>
                <span className="text-[10px] text-gray-400">（可选，仅作建议）</span>
              </div>
              <Button
                variant="outlined"
                fullWidth
                size="small"
                color="secondary"
                startIcon={aiLoading ? <CircularProgress size={14} color="inherit" /> : <span>✨</span>}
                onClick={handleAIRecognize}
                disabled={aiLoading || isCompleted || !!aiResult}
                sx={{ fontSize: '0.78rem', py: 0.5 }}
              >
                {aiLoading ? '识别中...' : aiResult ? '✅ 已识别' : 'AI 识别（可选）'}
              </Button>
              {aiMsg && (
                <Alert severity={aiMsg.type === 'success' ? 'success' : aiMsg.type === 'error' ? 'error' : 'info'} sx={{ fontSize: '0.78rem' }}>
                  {aiMsg.text}
                </Alert>
              )}
              {aiResult && (
                <div className="text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-400">识别结果</span>
                    <span className="text-gray-800 font-medium">{aiResult.name || '—'}（{aiResult.assetCode || '—'}）</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">置信度</span>
                    <span className={aiResult.confidence >= 0.5 ? 'text-green-600' : 'text-orange-600'}>{Math.round((aiResult.confidence ?? 0) * 100)}%</span>
                  </div>
                </div>
              )}
            </div>
          )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center gap-1.5 py-4 text-gray-400">
            <CameraAltIcon sx={{ fontSize: 26, color: '#d1d5db' }} />
            <span className="text-xs">请先完成上方「扫码识别」后采集照片</span>
          </div>
        )}
        </div>
        )}

        {/* ── 卡E：盘点信息（备注）── */}
        <div className="bg-white rounded-xl p-2.5 shadow-sm border border-gray-100 space-y-2">
          <div className="flex items-center gap-1.5">
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white ${currentStep === STEP_SUBMIT ? 'bg-indigo-600' : 'bg-gray-300'}`}>4</span>
            <h3 className="font-semibold text-gray-900 text-sm">盘点信息</h3>
          </div>
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
        {currentStep === STEP_STATUS && !IS_LOST(assetStatus) ? (
          <Button variant="contained" fullWidth size="medium" disabled
            sx={{ py: 1.2, fontWeight: 700, fontSize: '0.95rem', bgcolor: 'grey.400', '&.Mui-disabled': { bgcolor: 'grey.300', color: 'grey.500' } }}>
            请先选择资产状态
          </Button>
        ) : currentStep === STEP_SCAN && !IS_LOST(assetStatus) ? (
          <Button variant="contained" fullWidth size="medium" disabled
            sx={{ py: 1.2, fontWeight: 700, fontSize: '0.95rem', bgcolor: 'grey.400', '&.Mui-disabled': { bgcolor: 'grey.300', color: 'grey.500' } }}>
            请先完成扫码识别
          </Button>
        ) : currentStep === STEP_PHOTO ? (
          <Button variant="contained" fullWidth size="medium" disabled
            sx={{ py: 1.2, fontWeight: 700, fontSize: '0.95rem', bgcolor: 'grey.400', '&.Mui-disabled': { bgcolor: 'grey.300', color: 'grey.500' } }}>
            {photoStep === 1 ? '请先拍摄固定资产标签' : photoStep === 2 ? '请先拍摄资产正面' : '请先拍摄资产反面'}
          </Button>
        ) : (
          <Button
            variant="contained"
            fullWidth
            size="medium"
            onClick={handleSubmit}
            disabled={submitting || isCompleted}
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