import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Skeleton from '@mui/material/Skeleton';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import SearchIcon from '@mui/icons-material/Search';
import { getLifecycle, type LifecycleData } from '../api/report';

/**
 * 资产全生命周期查询页
 */
export default function AssetLifecyclePage() {
  const navigate = useNavigate();

  const [assetCode, setAssetCode] = useState('');
  const [data, setData] = useState<LifecycleData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = useCallback(async () => {
    if (!assetCode.trim()) return;
    setLoading(true);
    setError(null);
    setData(null);
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

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="sticky top-0 z-10 bg-gradient-to-r from-primary to-[#4a148c] text-white px-4 py-3 flex items-center gap-3 shadow-lg">
        <IconButton color="inherit" size="small" onClick={() => navigate(-1)}>
          <ArrowBackIosNewIcon fontSize="small" />
        </IconButton>
        <h2 className="text-sm font-semibold">资产全生命周期</h2>
      </header>

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
                  <div><span className="text-gray-400">使用人</span><br /><span>{data.userName}</span></div>
                  <div><span className="text-gray-400">成本中心</span><br /><span>{data.costCenter}</span></div>
                  <div><span className="text-gray-400">存放地点</span><br /><span>{data.location}</span></div>
                  <div><span className="text-gray-400">当前状态</span><br /><Chip label={data.currentStatus} size="small" color={data.currentStatus === '报废' ? 'error' : 'success'} /></div>
                  <div><span className="text-gray-400">原值</span><br /><span className="font-medium">¥{(data.originalValue ?? 0).toLocaleString()}</span></div>
                  <div><span className="text-gray-400">净值</span><br /><span className="font-medium">¥{(data.netValue ?? 0).toLocaleString()}</span></div>
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
          </>
        )}

        <div className="h-4" />
      </div>
    </div>
  );
}