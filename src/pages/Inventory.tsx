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
  const [photos, setPhotos] = useState<string[]>([]);

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
      setPhotos([]);
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
      setPhotos([]);
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

  /** 处理照片捕获 */
  const handlePhotoCapture = useCallback((dataUrl: string) => {
    setPhotos((prev) => [...prev, dataUrl]);
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

  /** AI 识别命中后：若识别到的资产与当前展示资产不同，自动切换到该资产 */
  const handleAIRecognized = useCallback(
    (result: RecognizeAssetResult) => {
      setAiMsg({ type: 'success', text: `识别命中：${result.assetCode}（置信度 ${result.confidence}%）` });
      const idx = assets.findIndex((a) => a.assetCode === result.assetCode);
      if (idx >= 0 && idx !== currentIndex) {
        setCurrentIndex(idx);
      }
    },
    [assets, currentIndex],
  );

  /** 独立 AI 识别按钮逻辑 */
  const lastPhoto = photos.length > 0 ? photos[photos.length - 1] : null;
  const handleAIRecognize = useCallback(async () => {
    if (!lastPhoto || aiCandidates.length === 0) return;
    setAiLoading(true);
    setAiMsg(null);
    try {
      const result = await RecognizeAsset({ image: lastPhoto, candidates: aiCandidates });
      handleAIRecognized(result);
    } catch {
      setAiMsg({ type: 'error', text: 'AI 服务暂不可用' });
    } finally {
      setAiLoading(false);
    }
  }, [lastPhoto, aiCandidates, handleAIRecognized]);

  /** 删除某张照片 */
  const handleRemovePhoto = useCallback((idx: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== idx));
  }, []);

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

    // 丢失状态：跳过拍照
    if (!lost && photos.length < 2) {
      setSnackbar({ open: true, message: '❌ 至少需要拍摄 2 张照片', severity: 'error' });
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
        photoUrls: photos,
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
      setPhotos([]);
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
  }, [taskId, assets, currentIndex, photos, assetStatus, remark, gpsCoords, gpsLocation]);

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
        {/* 盘点状态选择 — 最高优先级 */}
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

        {/* 水印照片卡片：丢失状态可跳过拍照 */}
        {!IS_LOST(assetStatus) && (
        <div className="bg-white rounded-xl p-2.5 shadow-sm border border-gray-100 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 text-sm">水印照片</h3>
            <span className="text-xs text-gray-400">至少 2 张，一张包含固资标签，另一张为固资正面照片</span>
          </div>

          {/* 照片缩略图网格 / 空占位 */}
          {photos.length > 0 ? (
            <div className="grid grid-cols-5 gap-1.5">
              {photos.map((url, idx) => (
                <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-gray-100">
                  <img src={url} alt={`照片${idx + 1}`} className="w-full h-full object-cover" />
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
              <span className="text-xs">尚未拍照，点击下方按钮拍摄（至少 2 张）</span>
            </div>
          )}

          <CameraCapture
            onCapture={handlePhotoCapture}
            watermark={{
              time: watermarkTime,
              location: gpsLocation,
              operator: user?.name || user?.username || '--',
              assetCode: currentAsset.assetCode,
            }}
            disabled={isCompleted}
            photoCount={photos.length}
            minPhotos={2}
            maxPhotos={4}
            candidates={aiCandidates}
            onAIRecognized={handleAIRecognized}
            hideAI
          />
        </div>
        )}

        {/* AI 识别资产 — 独立模块，放在水印照片之后 */}
        {!IS_LOST(assetStatus) && aiCandidates.length > 0 && (
          <div className="bg-white rounded-xl p-2.5 shadow-sm border border-gray-100 space-y-2">
            <h3 className="font-semibold text-gray-900 text-sm">AI 识别资产</h3>
            <Button
              variant="contained"
              fullWidth
              color="secondary"
              startIcon={aiLoading ? <CircularProgress size={18} color="inherit" /> : <span>✨</span>}
              onClick={handleAIRecognize}
              disabled={aiLoading || isCompleted || !lastPhoto}
              sx={{ py: 1.2, borderRadius: 2 }}
            >
              {aiLoading ? 'AI 识别中...' : '✨ AI 识别资产'}
            </Button>
            {aiMsg && (
              <Alert severity={aiMsg.type === 'success' ? 'success' : aiMsg.type === 'error' ? 'error' : 'info'} sx={{ fontSize: '0.8rem' }}>
                {aiMsg.text}
              </Alert>
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
