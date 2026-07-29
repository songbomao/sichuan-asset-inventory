import { useEffect, useState, useCallback } from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Skeleton from '@mui/material/Skeleton';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import SearchIcon from '@mui/icons-material/Search';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { getLifecycle, type LifecycleData } from '../api/report';
import { DiagnoseDifference, type DiagnoseDifferenceResult } from '../api/ai';

/**
 * 资产全生命周期查询页
 */
export default function AssetLifecyclePage() {
  const [assetCode, setAssetCode] = useState('');
  const [data, setData] = useState<LifecycleData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // AI 差异诊断
  const [diagnoseTaskId, setDiagnoseTaskId] = useState('');
  const [diagnoseLoading, setDiagnoseLoading] = useState(false);
  const [diagnoseResult, setDiagnoseResult] = useState<DiagnoseDifferenceResult | null>(null);
  const [diagnoseError, setDiagnoseError] = useState<string | null>(null);

  const handleSearch = useCallback(async () => {
    if (!assetCode.trim()) return;
    setLoading(true);
    setError(null);
    setData(null);
    setDiagnoseResult(null);
    setDiagnoseError(null);
    setDiagnoseTaskId('');
    try {
      const result = await getLifecycle(assetCode.trim());
      setData(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '查询失败';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [assetCode]);

  /** AI 差异诊断：对当前资产给出原因与处理建议 */
  const handleDiagnose = useCallback(async () => {
    if (!data) return;
    setDiagnoseLoading(true);
    setDiagnoseError(null);
    setDiagnoseResult(null);
    try {
      const result = await DiagnoseDifference({
        taskId: diagnoseTaskId.trim(),
        assetCode: data.assetCode,
      });
      setDiagnoseResult(result);
    } catch {
      setDiagnoseError('AI 服务暂不可用');
    } finally {
      setDiagnoseLoading(false);
    }
  }, [data, diagnoseTaskId]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pt-12">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* 搜索框 */}
        <Card>
          <CardContent>
            <div className="flex gap-2">
              <TextField
                size="small"
                fullWidth
                placeholder="输入资产编码如 ZC-2024-00123"
                value={assetCode}
                onChange={(e) => setAssetCode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Button
                variant="contained"
                onClick={handleSearch}
                disabled={loading || !assetCode.trim()}
                startIcon={<SearchIcon />}
                sx={{ borderRadius: '10px', textTransform: 'none', whiteSpace: 'nowrap' }}
              >
                查询
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 加载 */}
        {loading && (
          <Card><CardContent>
            <Skeleton variant="text" width="60%" /><Skeleton variant="text" width="40%" />
            <Skeleton variant="text" width="50%" /><Skeleton variant="text" width="30%" />
          </CardContent></Card>
        )}

        {/* 错误 */}
        {error && (
          <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>
        )}

        {/* 资产详情 */}
        {data && (
          <>
            <Card className="glow-border">
              <CardContent>
                <Typography variant="subtitle1" className="font-semibold text-gray-900 mb-3">
                  {data.assetName}
                </Typography>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-gray-400">资产编码</span><br /><span className="font-mono font-medium">{data.assetCode}</span></div>
                  <div><span className="text-gray-400">分类</span><br /><span>{data.categoryName}</span></div>
                  <div><span className="text-gray-400">使用人</span><br /><span>{data.userName || '-'}</span></div>
                  <div><span className="text-gray-400">使用部门</span><br /><span>{data.deptName || data.costCenter || '-'}</span></div>
                  <div><span className="text-gray-400">成本中心</span><br /><span>{data.costCenterName || data.costCenter || '-'}</span></div>
                  <div><span className="text-gray-400">利润中心</span><br /><span>{data.profitCenterName || '-'}</span></div>
                  <div><span className="text-gray-400">存放地点</span><br /><span>{data.location}</span></div>
                  <div><span className="text-gray-400">当前状态</span><br /><Chip label={data.currentStatus} size="small" color={data.currentStatus === '报废' ? 'error' : 'success'} /></div>
                  <div><span className="text-gray-400">规格型号</span><br /><span>{data.standard || '-'}</span></div>
                  <div><span className="text-gray-400">制造商</span><br /><span>{data.manufacturer || '-'}</span></div>
                  <div><span className="text-gray-400">供应商</span><br /><span>{data.supplierName || '-'}</span></div>
                  <div><span className="text-gray-400">所属公司</span><br /><span>{data.companyName || '-'}</span></div>
                  <div><span className="text-gray-400">原值</span><br /><span className="font-medium">¥{Number(data.originalValue || 0).toLocaleString()}</span></div>
                  <div><span className="text-gray-400">净值</span><br /><span className="font-medium">¥{Number(data.netValue || 0).toLocaleString()}</span></div>
                </div>
              </CardContent>
            </Card>

            {/* 盘点历史时间线 */}
            <Card>
              <CardContent>
                <Typography variant="subtitle1" className="font-semibold text-gray-900 mb-2">
                  盘点历史
                </Typography>
                {data.records.length === 0 ? (
                  <p className="text-sm text-gray-400">暂无盘点记录</p>
                ) : (
                  <div className="relative pl-6 border-l-2 border-gray-200 space-y-4">
                    {data.records.map((r) => {
                      const dotColor = r.operatorType === 'review' ? '#ff9800' : (r.status === 'normal' ? '#4caf50' : '#f44336');
                      return (
                        <div key={r.id} className="relative">
                          <div
                            className="absolute w-3 h-3 rounded-full -left-[19px] top-1"
                            style={{ backgroundColor: dotColor }}
                          />
                          <div className="text-sm">
                            <div className="font-medium text-gray-900">
                              {r.operatorType === 'review' ? '复盘' : '自盘'} · {r.statusText}
                            </div>
                            <div className="text-xs text-gray-400 mt-0.5">
                              {r.operatorName} · {new Date(r.createdAt).toLocaleString('zh-CN')}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* AI 差异诊断 */}
            <Card>
              <CardContent>
                <Typography variant="subtitle1" className="font-semibold text-gray-900 mb-3">
                  AI 差异诊断
                </Typography>
                <TextField
                  size="small"
                  fullWidth
                  label="盘点任务ID（可选）"
                  placeholder="如 T-2024-001，留空按资产全局诊断"
                  value={diagnoseTaskId}
                  onChange={(e) => setDiagnoseTaskId(e.target.value)}
                  sx={{ mb: 2 }}
                />
                <Button
                  variant="contained"
                  color="secondary"
                  fullWidth
                  startIcon={diagnoseLoading ? <CircularProgress size={18} color="inherit" /> : <AutoAwesomeIcon />}
                  onClick={handleDiagnose}
                  disabled={diagnoseLoading}
                  sx={{ py: 1, borderRadius: 2 }}
                >
                  {diagnoseLoading ? '诊断中...' : '✨ 诊断差异'}
                </Button>
                {diagnoseResult && (
                  <Alert severity="info" sx={{ mt: 2, fontSize: '0.8rem', whiteSpace: 'pre-line' }}>
                    {`原因：${diagnoseResult.reason}\n建议：${diagnoseResult.suggestion}\n责任人提示：${diagnoseResult.ownerHint}`}
                  </Alert>
                )}
                {diagnoseError && (
                  <Alert severity="warning" sx={{ mt: 2, fontSize: '0.8rem' }}>
                    {diagnoseError}
                  </Alert>
                )}
              </CardContent>
            </Card>
          </>
        )}

        <div className="h-4" />
      </div>
    </div>
  );
}