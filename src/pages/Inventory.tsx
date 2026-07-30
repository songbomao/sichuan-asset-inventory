import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Button from '@mui/material/Button';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CircularProgress from '@mui/material/CircularProgress';
import Skeleton from '@mui/material/Skeleton';
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import TextField from '@mui/material/TextField';
import DeleteIcon from '@mui/icons-material/Delete';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
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

/** 从照片 Base64 解码二维码（固定资产编号） */
function decodeQRCode(dataUrl: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0);
        const { data, width, height } = ctx.getImageData(0, 0, img.width, img.height);
        const code = jsQR(data, width, height);
        resolve(code?.data ?? null);
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
  // 统一照片列表：每张照片带有类型标记（qr = 二维码，unknown = 待分类）
  interface PhotoItem {
    dataUrl: string;
    type: 'qr' | 'unknown';
    decodedCode?: string; // 二维码解码结果
  }
  const [allPhotos, setAllPhotos] = useState<PhotoItem[]>([]);
  /** 前端 jsQR 从照片中解码出的第一个固资编号（用于 AI 识别） */
  const qrDecodedCode = useMemo(() => {
    const qr = allPhotos.find((p) => p.type === 'qr' && p.decodedCode);
    return qr?.decodedCode ?? '';
  }, [allPhotos]);
  /** 二维码照片列表 */
  const qrPhotos = useMemo(() => allPhotos.filter((p) => p.type === 'qr'), [allPhotos]);
  /** 非二维码照片列表（实物照） */
  const frontPhotos = useMemo(() => allPhotos.filter((p) => p.type === 'unknown'), [allPhotos]);
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

  /** 统一照片捕获：新照片自动解码二维码并分类（qr/unknown） */
  const handlePhotoCapture = useCallback(async (dataUrl: string) => {
    // 先以 unknown 类型加入列表（乐观更新）
    const newItem: PhotoItem = { dataUrl, type: 'unknown' };
    setAllPhotos((prev) => [...prev, newItem]);
    // 异步解码二维码
    const code = await decodeQRCode(dataUrl);
    if (code) {
      // 解码成功 → 标记为二维码照
      setAllPhotos((prev) =>
        prev.map((p) => (p.dataUrl === dataUrl ? { ...p, type: 'qr', decodedCode: code } : p)),
      );
    }
  }, []);

  /** 删除指定索引照片 */
  const handleRemovePhoto = useCallback((idx: number) => {
    setAllPhotos((prev) => prev.filter((_, i) => i !== idx));
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

  return (
    <div
      className="h-dvh bg-gray-50 flex flex-col overflow-hidden pt-12"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* 进度条：根据实际盘点完成比例动态更新 */}
      <div className="px-3 py-1.5 bg-white border-b border-gray-100 shrink-0">
        <ProgressBar
          current={progress.completed}
          total={progress.total}
        />
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-3 py-2 space-y-2">
        {/* 固定资产详情 */}
        {assetDetailLoading ? (
          <div className="bg-white rounded-xl p-2.5 shadow-sm border border-gray-100 space-y-1.5">
            <h3 className="font-semibold text-gray-900 text-sm">固定资产详情</h3>
            <Skeleton variant="text" width="40%" />
            <Skeleton variant="text" width="70%" />
            <Skeleton variant="text" width="60%" />
          </div>
        ) : assetDetailError && !assetDetail ? (
          /* 获取详情失败时 fallback 到原来的简化展示 */
          <div className="bg-white rounded-xl p-2.5 shadow-sm border border-gray-100 space-y-1.5">
            <h3 className="font-semibold text-gray-900 text-sm">固定资产详情</h3>
            <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
              <div>
                <dt className="text-gray-400">资产名称</dt>
                <dd className="text-gray-800 break-words">{currentAsset.assetName}</dd>
              </div>
              <div>
                <dt className="text-gray-400">类别</dt>
                <dd className="text-gray-800">{currentAsset.category || '—'}</dd>
              </div>
              <div>
                <dt className="text-gray-400">使用部门</dt>
                <dd className="text-gray-800">{currentAsset.department || '—'}</dd>
              </div>
              <div>
                <dt className="text-gray-400">责任人</dt>
                <dd className="text-gray-800">{currentAsset.userName || '—'}</dd>
              </div>
              <div>
                <dt className="text-gray-400">存放地点</dt>
                <dd className="text-gray-800 break-words">{currentAsset.location || '—'}</dd>
              </div>
              {currentAsset.costCenterName ? (
                <div>
                  <dt className="text-gray-400">成本中心</dt>
                  <dd className="text-gray-800 break-words">{currentAsset.costCenterName}</dd>
                </div>
              ) : null}
              {currentAsset.standard ? (
                <div>
                  <dt className="text-gray-400">规格型号</dt>
                  <dd className="text-gray-800 break-words">{currentAsset.standard}</dd>
                </div>
              ) : null}
            </dl>
          </div>
        ) : assetDetail ? (
          /* 完整资产详情（AssetDetailTabs 自带 Paper 包裹） */
          <div>
            <h3 className="font-semibold text-gray-900 text-sm mb-2">固定资产详情</h3>
            <AssetDetailTabs asset={assetDetail} />
          </div>
        ) : (
          /* 首次加载未完成时的 fallback */
          <div className="bg-white rounded-xl p-2.5 shadow-sm border border-gray-100 space-y-1.5">
            <h3 className="font-semibold text-gray-900 text-sm">固定资产详情</h3>
            <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
              <div>
                <dt className="text-gray-400">资产名称</dt>
                <dd className="text-gray-800 break-words">{currentAsset.assetName}</dd>
              </div>
              <div>
                <dt className="text-gray-400">类别</dt>
                <dd className="text-gray-800">{currentAsset.category || '—'}</dd>
              </div>
              <div>
                <dt className="text-gray-400">使用部门</dt>
                <dd className="text-gray-800">{currentAsset.department || '—'}</dd>
              </div>
              <div>
                <dt className="text-gray-400">责任人</dt>
                <dd className="text-gray-800">{currentAsset.userName || '—'}</dd>
              </div>
              <div>
                <dt className="text-gray-400">存放地点</dt>
                <dd className="text-gray-800 break-words">{currentAsset.location || '—'}</dd>
              </div>
              {currentAsset.costCenterName ? (
                <div>
                  <dt className="text-gray-400">成本中心</dt>
                  <dd className="text-gray-800 break-words">{currentAsset.costCenterName}</dd>
                </div>
              ) : null}
              {currentAsset.standard ? (
                <div>
                  <dt className="text-gray-400">规格型号</dt>
                  <dd className="text-gray-800 break-words">{currentAsset.standard}</dd>
                </div>
              ) : null}
            </dl>
          </div>
        )}

        {/* 盘点状态选择 */}
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

        {/* 已盘点提示 */}
        {isCompleted && (
          <Alert severity="success" sx={{ fontSize: '0.8rem', py: 0.5 }}>
            该资产已盘点完成
          </Alert>
        )}

        {/* 统一资产信息采集模块：拍摄 2 张+照片，系统自动识别二维码与实物照 */}
        {!IS_LOST(assetStatus) && (
        <div className="bg-white rounded-xl p-2.5 shadow-sm border border-gray-100 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 text-sm">📷 资产信息采集</h3>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span className={qrPhotoCount >= 1 ? 'text-green-600 font-medium' : ''}>二维码 {qrPhotoCount}</span>
              <span className="text-gray-300">|</span>
              <span className={allPhotos.length >= 2 ? 'text-green-600 font-medium' : ''}>实物照 {frontPhotoCount}</span>
            </div>
          </div>
          <p className="text-xs text-gray-400">任意顺序拍摄 2 张及以上照片，系统自动识别二维码与实物</p>
          {allPhotos.length > 0 ? (
            <div className="grid grid-cols-5 gap-1.5">
              {allPhotos.map((photo, idx) => (
                <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-gray-100">
                  <img src={photo.dataUrl} alt={`照片${idx + 1}`} className="w-full h-full object-cover" />
                  {/* 类型标记 */}
                  <span
                    className={`absolute top-0.5 left-0.5 text-[10px] px-1 py-0.5 rounded-full font-medium ${
                      photo.type === 'qr' ? 'bg-green-500 text-white' : 'bg-blue-500 text-white'
                    }`}
                  >
                    {photo.type === 'qr' ? '码' : '物'}
                  </span>
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
          {qrDecodedCode ? (
            <Alert severity="success" sx={{ fontSize: '0.8rem', py: 0.5 }}>二维码识别：{qrDecodedCode}</Alert>
          ) : allPhotos.length > 0 && qrPhotoCount === 0 ? (
            <Alert severity="warning" sx={{ fontSize: '0.8rem', py: 0.5 }}>未检测到二维码标签，请拍摄固定资产标签上的二维码</Alert>
          ) : null}
          <CameraCapture
            onCapture={handlePhotoCapture}
            noWatermark
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
        </div>
        )}

        {/* AI 识别资产 — 独立模块，放在照片之后 */}
        {!IS_LOST(assetStatus) && aiCandidates.length > 0 && (
          <div className="bg-white rounded-xl p-2.5 shadow-sm border border-gray-100 space-y-2">
            <h3 className="font-semibold text-gray-900 text-sm">AI 识别资产</h3>
            <Button
              variant="contained"
              fullWidth
              color="secondary"
              startIcon={aiLoading ? <CircularProgress size={18} color="inherit" /> : <span>✨</span>}
              onClick={handleAIRecognize}
              disabled={aiLoading || isCompleted || qrPhotoCount === 0 || frontPhotoCount === 0 || !qrDecodedCode}
              sx={{ py: 1.2, borderRadius: 2 }}
            >
              {aiLoading ? 'AI 识别中...' : '✨ AI 识别资产'}
            </Button>
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

        {/* 备注输入 */}
        <TextField
          fullWidth
          label={NEED_REMARK_STATUSES.has(assetStatus) ? '备注（必填）' : '备注（可选）'}
          size="small"
          value={remark}
          onChange={(e) => setRemark(e.target.value)}
          placeholder={NEED_REMARK_STATUSES.has(assetStatus) ? '该状态必须填写备注说明...' : '填写盘点备注（选填）...'}
          disabled={isCompleted}
          required={NEED_REMARK_STATUSES.has(assetStatus)}
          error={NEED_REMARK_STATUSES.has(assetStatus) && remark.trim() === ''}
          helperText={NEED_REMARK_STATUSES.has(assetStatus) && remark.trim() === '' ? '必须填写备注说明' : undefined}
          sx={{ '& .MuiInputBase-root': { fontSize: '0.85rem' } }}
        />

        {/* 盘点数量 */}
        <div className="bg-white rounded-xl p-2.5 shadow-sm border border-gray-100 space-y-1.5">
          <h3 className="font-semibold text-gray-900 text-sm">盘点数量</h3>
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
          {/* 差异提示 */}
          {assetDetail?.menge && inventoryQty.trim() !== '' && (() => {
            const bookQty = Number(assetDetail.menge);
            const actualQty = Number(inventoryQty);
            const diff = actualQty - bookQty;
            if (diff === 0) {
              return <div className="text-xs text-green-600 font-medium">✅ 数量一致，无差异</div>;
            }
            return <div className="text-xs text-red-600 font-medium">⚠ 差异：{diff > 0 ? '+' : ''}{diff}（盘{actualQty > bookQty ? '盈' : '亏'}）</div>;
          })()}
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
