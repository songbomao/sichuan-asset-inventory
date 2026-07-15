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
import { getTaskDetail, getProgress, type AssetInfo } from '../api/tasks';
import { submitRecord, getAssetByCode } from '../api/inventory';
import { useAuth } from '../contexts/AuthContext';
import CameraCapture from '../components/CameraCapture';
import ProgressBar from '../components/ProgressBar';
import StatusBadge from '../components/StatusBadge';
import WatermarkOverlay from '../components/WatermarkOverlay';

/** 盘点状态选项 */
const STATUS_OPTIONS = [
  { value: '正常', label: '✅ 正常' },
  { value: '待维修', label: '🔧 待维修' },
  { value: '报废', label: '🗑 报废' },
  { value: '丢失', label: '❌ 丢失' },
];

/**
 * 盘点操作页面
 * 核心功能：刷卡切换资产、拍照、选状态、提交
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
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);

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

  // GPS 位置
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

  /** 获取 GPS 位置 */
  const getGPS = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsLocation('设备不支持定位');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setGpsCoords({
          latitude: latitude.toFixed(6),
          longitude: longitude.toFixed(6),
        });
        setGpsLocation(`${longitude.toFixed(4)}, ${latitude.toFixed(4)}`);
      },
      () => {
        setGpsLocation('定位失败');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 },
    );
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
      setPhotoDataUrl(null);
      updateTime();
    }
  }, [currentIndex, assets]);

  /** 处理照片捕获 */
  const handlePhotoCapture = useCallback((dataUrl: string) => {
    setPhotoDataUrl(dataUrl);
  }, []);

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

    setSubmitting(true);
    try {
      await submitRecord({
        taskId,
        assetCode: asset.assetCode,
        status: assetStatus,
        remark,
        photoBase64: photoDataUrl || '',
        longitude: gpsCoords.longitude,
        latitude: gpsCoords.latitude,
        location: gpsLocation,
      });
      setSnackbar({ open: true, message: '✅ 盘点提交成功！', severity: 'success' });

      // 更新已完成列表和进度
      setCompletedCodes((prev) => [...prev, asset.assetCode]);
      setProgress((prev) => ({
        ...prev,
        completed: prev.completed + 1,
        percentage: Math.round(((prev.completed + 1) / prev.total) * 100),
      }));

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
  }, [taskId, assets, currentIndex, assetStatus, remark, photoDataUrl, gpsCoords, gpsLocation]);

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
      className="min-h-screen bg-gray-50 flex flex-col"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* 顶部导航栏 */}
      <header className="sticky top-0 z-10 bg-gradient-to-r from-primary to-[#4a148c] text-white px-4 py-3 flex items-center gap-3 shadow-lg">
        <IconButton color="inherit" size="small" onClick={() => navigate('/tasks')}>
          <ArrowBackIosNewIcon fontSize="small" />
        </IconButton>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold truncate">{taskName}</h2>
          <p className="text-xs text-white/70 truncate">
            {currentIndex + 1} / {assets.length}
          </p>
        </div>
        <Button
          size="small"
          variant="outlined"
          color="inherit"
          onClick={() => setScanDialogOpen(true)}
          startIcon={<QrCodeScannerIcon />}
          sx={{ borderRadius: '20px', borderColor: 'rgba(255,255,255,0.5)', color: '#fff', fontSize: '0.75rem' }}
        >
          AI识别
        </Button>
      </header>

      {/* 进度条 */}
      <div className="px-4 py-2 bg-white border-b border-gray-100">
        <ProgressBar
          current={completedCodes.length + (isCompleted ? 0 : 0)}
          total={assets.length}
        />
      </div>

      {/* 主内容区 - 刷卡区域 */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* 已盘点提示 */}
        {isCompleted && (
          <Alert severity="success" sx={{ fontSize: '0.85rem' }}>
            该资产已盘点完成 ✅
          </Alert>
        )}

        {/* 资产基本信息卡片 */}
        <div className="bg-white rounded-card p-4 shadow-card glow-border">
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-semibold text-gray-900 text-base">
              {currentAsset.assetName}
            </h3>
            <StatusBadge status={isCompleted ? '正常' : 'pending'} />
          </div>
          <div className="space-y-1.5 text-sm text-gray-600">
            <div className="flex gap-2">
              <span className="text-gray-400 w-16 shrink-0">资产编码</span>
              <span className="font-mono text-primary font-medium">{currentAsset.assetCode}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-gray-400 w-16 shrink-0">分类</span>
              <span>{currentAsset.category || '--'}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-gray-400 w-16 shrink-0">存放地点</span>
              <span>{currentAsset.location || '--'}</span>
            </div>
            {currentAsset.department && (
              <div className="flex gap-2">
                <span className="text-gray-400 w-16 shrink-0">部门</span>
                <span>{currentAsset.department}</span>
              </div>
            )}
          </div>
        </div>

        {/* 盘点信息卡片 */}
        <div className="bg-white rounded-card p-4 shadow-card glow-border space-y-4">
          <h3 className="font-semibold text-gray-900">盘点信息</h3>

          {/* 水印预览 */}
          <WatermarkOverlay
            time={watermarkTime}
            location={gpsLocation}
            operator={user?.name || user?.username || '--'}
            assetCode={currentAsset.assetCode}
          />

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
          />

          {/* 盘点状态选择 */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">盘点状态</p>
            <ToggleButtonGroup
              value={assetStatus}
              exclusive
              onChange={(_e, val) => val && setAssetStatus(val)}
              size="small"
              fullWidth
              disabled={isCompleted}
              sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}
            >
              {STATUS_OPTIONS.map((opt) => (
                <ToggleButton
                  key={opt.value}
                  value={opt.value}
                  sx={{
                    borderRadius: '8px !important',
                    border: '1px solid rgba(0,0,0,0.12) !important',
                    fontSize: '0.8rem',
                    py: 1,
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
            multiline
            rows={3}
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            placeholder="填写盘点备注..."
            disabled={isCompleted}
            size="small"
          />
        </div>

        {/* 导航按钮 */}
        <div className="flex items-center justify-between gap-2">
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={goPrev}
            disabled={currentIndex === 0}
            size="small"
            sx={{ flex: 1 }}
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
            sx={{ flex: 1 }}
          >
            下一个
          </Button>
        </div>

        {/* 提交按钮 */}
        <Button
          variant="contained"
          fullWidth
          size="large"
          onClick={handleSubmit}
          disabled={submitting || isCompleted}
          sx={{ py: 1.5, fontWeight: 700, fontSize: '1rem' }}
        >
          {submitting ? (
            <CircularProgress size={24} color="inherit" />
          ) : isCompleted ? (
            '✅ 已完成盘点'
          ) : (
            '📤 提交盘点记录'
          )}
        </Button>

        {/* 底部安全间距 */}
        <div className="h-4" />
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
