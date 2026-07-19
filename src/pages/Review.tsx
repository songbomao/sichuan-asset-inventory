import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Skeleton from '@mui/material/Skeleton';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import RefreshIcon from '@mui/icons-material/Refresh';
import InboxIcon from '@mui/icons-material/Inbox';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import CircularProgress from '@mui/material/CircularProgress';
import { getAssignments, type ReviewAssignment } from '../api/review';
import { getTaskDetail, type AssetInfo } from '../api/tasks';
import { useAuth } from '../contexts/AuthContext';
import StatusBadge from '../components/StatusBadge';
import CameraCapture from '../components/CameraCapture';

const STATUS_OPTIONS = [
  { value: '正常', label: '正常' },
  { value: '待维修', label: '待维修' },
  { value: '报废', label: '报废' },
  { value: '丢失', label: '丢失' },
];

/**
 * 复盘页面
 */
export default function ReviewPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [assignments, setAssignments] = useState<ReviewAssignment[]>([]);
  const [assets, setAssets] = useState<AssetInfo[]>([]);
  const [taskName, setTaskName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 复盘弹窗
  const [reviewOpen, setReviewOpen] = useState(false);
  const [currentAssignment, setCurrentAssignment] = useState<ReviewAssignment | null>(null);
  const [reviewStatus, setReviewStatus] = useState('正常');
  const [reviewRemark, setReviewRemark] = useState('');
  const [reviewPhoto, setReviewPhoto] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    if (!taskId) return;
    setLoading(true);
    setError(null);
    try {
      const [detail, list] = await Promise.all([
        getTaskDetail(taskId),
        getAssignments(taskId),
      ]);
      setTaskName(detail.taskName);
      setAssets(detail.assets);
      setAssignments(list);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '加载复盘数据失败';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /** 打开复盘弹窗 */
  const openReview = (assignment: ReviewAssignment) => {
    setCurrentAssignment(assignment);
    setReviewStatus('正常');
    setReviewRemark('');
    setReviewPhoto(null);
    setReviewOpen(true);
  };

  // ---------- 加载态 ----------
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="sticky top-0 z-10 bg-gradient-to-r from-primary to-[#4a148c] text-white px-4 py-3 flex items-center gap-3 shadow-lg">
          <IconButton color="inherit" size="small" onClick={() => navigate(-1)}>
            <ArrowBackIosNewIcon fontSize="small" />
          </IconButton>
          <h2 className="text-sm font-semibold">复盘管理</h2>
        </header>
        <div className="p-4 space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}><CardContent><Skeleton variant="text" width="60%" /><Skeleton variant="text" width="40%" /></CardContent></Card>
          ))}
        </div>
      </div>
    );
  }

  // ---------- 错误态 ----------
  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-50">
        <Alert severity="error" sx={{ mb: 2, width: '100%', maxWidth: 360 }}>{error}</Alert>
        <Button variant="outlined" onClick={fetchData}>重新加载</Button>
        <Button variant="text" onClick={() => navigate(-1)} sx={{ mt: 1 }}>返回</Button>
      </div>
    );
  }

  const pendingAssignments = assignments.filter((a) => a.status === 'pending');
  const completedAssignments = assignments.filter((a) => a.status === 'completed');
  const conflictAssignments = assignments.filter((a) => a.status === 'conflict');

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="sticky top-0 z-10 bg-gradient-to-r from-primary to-[#4a148c] text-white px-4 py-3 flex items-center gap-3 shadow-lg">
        <IconButton color="inherit" size="small" onClick={() => navigate(-1)}>
          <ArrowBackIosNewIcon fontSize="small" />
        </IconButton>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold truncate">复盘管理 · {taskName}</h2>
          <p className="text-xs text-white/70">
            {pendingAssignments.length} 待复盘 · {completedAssignments.length} 已完成
            {conflictAssignments.length > 0 && ` · ${conflictAssignments.length} 冲突`}
          </p>
        </div>
        <IconButton color="inherit" size="small" onClick={fetchData}>
          <RefreshIcon fontSize="small" />
        </IconButton>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {assignments.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <InboxIcon sx={{ fontSize: 64, mb: 2 }} />
            <p className="text-base font-medium">暂无复盘任务</p>
            <p className="text-sm mt-1">管理员尚未抽取复盘清单</p>
          </div>
        )}

        {pendingAssignments.map((a) => {
          const asset = assets.find((x) => x.assetCode !== '');
          return (
            <Card key={a.id} className="glow-border">
              <CardContent>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <Typography variant="subtitle1" className="font-semibold text-gray-900">
                      复盘资产 #{a.recordId}
                    </Typography>
                    <Typography variant="caption" className="text-gray-400">
                      复盘人：{a.reviewerName}
                    </Typography>
                  </div>
                  <Chip label="待复盘" color="warning" size="small" />
                </div>
                <Button
                  variant="contained"
                  size="small"
                  fullWidth
                  onClick={() => openReview(a)}
                  sx={{ borderRadius: '10px', textTransform: 'none' }}
                >
                  开始复盘
                </Button>
              </CardContent>
            </Card>
          );
        })}

        {completedAssignments.map((a) => (
          <Card key={a.id} className="opacity-70">
            <CardContent>
              <div className="flex items-start justify-between">
                <div>
                  <Typography variant="subtitle1" className="font-semibold text-gray-900">
                    复盘资产 #{a.recordId}
                  </Typography>
                  <Typography variant="caption" className="text-gray-400">
                    复盘人：{a.reviewerName}
                  </Typography>
                </div>
                <Chip label="已完成" color="success" size="small" />
              </div>
            </CardContent>
          </Card>
        ))}

        {conflictAssignments.map((a) => (
          <Card key={a.id} className="border-2 border-red-300">
            <CardContent>
              <div className="flex items-start justify-between">
                <div>
                  <Typography variant="subtitle1" className="font-semibold text-gray-900">
                    复盘资产 #{a.recordId}
                  </Typography>
                  <Typography variant="caption" className="text-gray-400">
                    复盘人：{a.reviewerName}
                  </Typography>
                </div>
                <Chip label="冲突" color="error" size="small" />
              </div>
              <Alert severity="warning" sx={{ mt: 1, fontSize: '0.8rem' }}>
                复盘结果与自盘不一致，需资产管理部门领导审批
              </Alert>
            </CardContent>
          </Card>
        ))}

        <div className="h-4" />
      </div>

      {/* 复盘提交弹窗 */}
      <Dialog
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1rem' }}>
          复盘确认
        </DialogTitle>
        <DialogContent>
          <div className="space-y-3 text-sm">
            <p className="text-gray-500">复盘资产 #{currentAssignment?.recordId}</p>

            <CameraCapture
              onCapture={(dataUrl) => setReviewPhoto(dataUrl)}
              watermark={{
                time: new Date().toLocaleString('zh-CN'),
                location: '复盘',
                operator: user?.name || user?.username || '--',
                assetCode: `#${currentAssignment?.recordId}`,
              }}
            />

            <TextField
              select
              label="盘点状态"
              size="small"
              fullWidth
              value={reviewStatus}
              onChange={(e) => setReviewStatus(e.target.value)}
            >
              {STATUS_OPTIONS.map((o) => (
                <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
              ))}
            </TextField>

            <TextField
              label="备注"
              size="small"
              fullWidth
              multiline
              rows={2}
              value={reviewRemark}
              onChange={(e) => setReviewRemark(e.target.value)}
            />
          </div>
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2 }}>
          <Button onClick={() => setReviewOpen(false)} color="inherit" sx={{ textTransform: 'none' }}>
            取消
          </Button>
          <Button
            variant="contained"
            disabled={submitting}
            onClick={async () => {
              if (!currentAssignment) return;
              setSubmitting(true);
              try {
                const { submitReview } = await import('../api/review');
                await submitReview({
                  assignmentId: currentAssignment.id,
                  assetCode: `#${currentAssignment.recordId}`,
                  status: reviewStatus,
                  remark: reviewRemark,
                  photoBase64: reviewPhoto || '',
                  operatorName: user?.name || user?.username || 'unknown',
                });
                setReviewOpen(false);
                fetchData();
              } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : '提交失败';
                alert(msg);
              } finally {
                setSubmitting(false);
              }
            }}
            sx={{ borderRadius: '10px', textTransform: 'none' }}
          >
            {submitting ? <CircularProgress size={20} color="inherit" /> : '提交复盘'}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}