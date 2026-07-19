import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import DeleteIcon from '@mui/icons-material/Delete';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import { getTaskDetail, getProgress, type AssetInfo } from '../api/tasks';
import { submitRecord, getAssetByCode } from '../api/inventory';
import { getCurrentLocation } from '../api/reverseGeocode';
import { useAuth } from '../contexts/AuthContext';
import CameraCapture from '../components/CameraCapture';
import ProgressBar from '../components/ProgressBar';
import StatusBadge from '../components/StatusBadge';

/** 盘点状态选项 */
const STATUS_OPTIONS = [
  { value: '正常', label: '✅ 正常' },
  { value: '待维修', label: '🔧 待维修' },
  { value: '报废', label: '🗑 报废' },
  { value: '丢失', label: '❌ 丢失' },
];

/** 把多张照片垂直拼接成一张长图，用于后端单字段存储 */
function combinePhotos(dataUrls: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const images: HTMLImageElement[] = [];
    let loaded = 0;

    dataUrls.forEach((url, idx) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        loaded += 1;
        images[idx] = img;
        if (loaded === dataUrls.length) {
          const maxWidth = 960;
          let totalHeight = 0;
          const sizes = images.map((img) => {
            const scale = img.width > maxWidth ? maxWidth / img.width : 1;
            const w = Math.round(img.width * scale);
            const h = Math.round(img.height * scale);
            totalHeight += h;
            return { w, h };
          });

          const canvas = document.createElement('canvas');
          canvas.width = maxWidth;
          canvas.height = totalHeight;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvas 初始化失败'));
            return;
          }

          let y = 0;
          images.forEach((img, i) => {
            ctx.drawImage(img, 0, y, sizes[i].w, sizes[i].h);
            y += sizes[i].h;
          });

          resolve(canvas.toDataURL('image/jpeg', 0.7));
        }
      };
      img.onerror = () => reject(new Error('图片加载失败'));
      img.src = url;
    });
  });
}

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

  // AI 识别弹窗
  const [scanDialogOpen, setScanDialogOpen] = useState(false);
  const [scanCode, setScanCode] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);

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
      setPhotos([]);
      updateTime();
    }
  }, [currentIndex, assets]);

  /** 处理照片捕获 */
  const handlePhotoCapture = useCallback((dataUrl: string) => {
    setPhotos((prev) => [...prev, dataUrl]);
  }, []);

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

    if (photos.length < 2) {
      setSnackbar({ open: true, message: '❌ 至少需要拍摄 2 张照片', severity: 'error' });
      return;
    }

    setSubmitting(true);
    try {
      const combined = await combinePhotos(photos);
      await submitRecord({
        taskId,
        assetCode: asset.assetCode,
        status: assetStatus,
        remark,
        photoBase64: combined,
        longitude: gpsCoords.longitude,
        latitude: gpsCoords.latitude,
        location: gpsLocation,
        operatorName: user?.name || user?.username || 'unknown',
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
      setPhotos([]);
      updateTime();

      // 自动跳到下一个
      if (currentIndex < assets.length - 1) {
        setCurrentIndex((prev) => prev + 1);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '提交失败';
      setSnackbar({ open: true, message: `❌ ${msg}`, severity: 'error' });
    } finally {
      setSubmitting(false);
    }
  }, [taskId, assets, currentIndex, photos, assetStatus, remark, gpsCoords, gpsLocation]);

  /** AI 识别资产 */
  const handleScan = useCallback(async () => {
    if (!scanCode.trim()) return;
    setScanning(true);
    setScanResult(null);
    try {
      const result = await getAssetByCode(scanCode.trim());
      setScanResult(
        `资产编码：${result.assetCode}\n名称：${result.assetName}\n分类：${result.category}\n位置：${result.location}`,
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '识别失败';
      setScanResult(`❌ ${msg}`);
    } finally {
      setScanning(false);
    }
  }, [scanCode]);

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
      className="h-dvh bg-gray-50 flex flex-col overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* 顶部导航栏 */}
      <header className="sticky top-0 z-10 bg-gradient-to-r from-primary to-[#4a148c] text-white px-3 py-2.5 flex items-center gap-2 shadow-lg shrink-0">
        <IconButton color="inherit" size="small" onClick={() => navigate('/tasks')}>
          <ArrowBackIosNewIcon fontSize="small" />
        </IconButton>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold truncate">{taskName}</h2>
          <p className="text-xs text-white/70 truncate">
            {currentAsset?.assetName} · {currentIndex + 1} / {assets.length}
          </p>
        </div>
        <Button
          size="small"
          variant="outlined"
          color="inherit"
          onClick={() => setScanDialogOpen(true)}
          startIcon={<QrCodeScannerIcon />}
          sx={{ borderRadius: '16px', borderColor: 'rgba(255,255,255,0.5)', color: '#fff', fontSize: '0.7rem', py: 0.4, px: 1 }}
        >
          AI识别
        </Button>
      </header>

      {/* 进度条 */}
      <div className="px-3 py-1.5 bg-white border-b border-gray-100 shrink-0">
        <ProgressBar
          current={completedCodes.length + (isCompleted ? 0 : 0)}
          total={assets.length}
        />
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-3 py-2 space-y-2">
        {/* 已盘点提示 */}
        {isCompleted && (
          <Alert severity="success" sx={{ fontSize: '0.8rem', py: 0.5 }}>
            该资产已盘点完成 ✅
          </Alert>
        )}

        {/* 资产基本信息卡片（超紧凑） */}
        <div className="bg-white rounded-xl p-2.5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-0.5">
            <h3 className="font-semibold text-gray-900 text-sm truncate pr-2">
              {currentAsset.assetName}
            </h3>
            <StatusBadge status={isCompleted ? '正常' : 'pending'} />
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-500">
            <span>编码：<span className="font-mono text-gray-700">{currentAsset.assetCode}</span></span>
            {currentAsset.category && <span>分类：{currentAsset.category}</span>}
            {currentAsset.location && <span>地点：{currentAsset.location}</span>}
          </div>
        </div>

        {/* 水印照片卡片 */}
        <div className="bg-white rounded-xl p-2.5 shadow-sm border border-gray-100 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 text-sm">水印照片</h3>
            <span className="text-xs text-gray-400">至少 2 张</span>
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

          {/* 相机拍照 */}
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
          />
        </div>

        {/* 盘点状态选择 */}
        <div>
          <p className="text-xs font-medium text-gray-700 mb-1.5">盘点状态</p>
          <ToggleButtonGroup
            value={assetStatus}
            exclusive
            onChange={(_e, val) => val && setAssetStatus(val)}
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

        {/* 备注输入 */}
        <TextField
          fullWidth
          label="备注"
          size="small"
          value={remark}
          onChange={(e) => setRemark(e.target.value)}
          placeholder="填写盘点备注..."
          disabled={isCompleted}
          sx={{ '& .MuiInputBase-root': { fontSize: '0.85rem' } }}
        />
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

      {/* AI 识别弹窗 */}
      <Dialog open={scanDialogOpen} onClose={() => setScanDialogOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1rem' }}>🔍 AI 识别资产</DialogTitle>
        <DialogContent>
          <p className="text-sm text-gray-500 mb-3">输入资产编码，系统将自动查询资产信息</p>
          <TextField
            fullWidth
            label="资产编码"
            value={scanCode}
            onChange={(e) => setScanCode(e.target.value)}
            autoFocus
            size="small"
            placeholder="输入资产编码如 ZC-2024-00123"
            sx={{ mb: 2 }}
          />
          {scanResult && (
            <div className="bg-gray-50 rounded-lg p-3 text-sm whitespace-pre-line">
              {scanResult}
            </div>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setScanDialogOpen(false); setScanResult(null); setScanCode(''); }}>
            关闭
          </Button>
          <Button variant="contained" onClick={handleScan} disabled={scanning || !scanCode.trim()}>
            {scanning ? <CircularProgress size={18} color="inherit" /> : '查询'}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
