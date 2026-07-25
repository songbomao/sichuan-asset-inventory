import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Skeleton from '@mui/material/Skeleton';
import Alert from '@mui/material/Alert';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';
import InboxIcon from '@mui/icons-material/Inbox';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import BusinessIcon from '@mui/icons-material/Business';
import PersonIcon from '@mui/icons-material/Person';
import CategoryIcon from '@mui/icons-material/Category';
import { getAssetTable, type AssetTableItem } from '../api/admin';
import { useAuth } from '../contexts/AuthContext';
import StatusBadge from '../components/StatusBadge';
import RecordsPage from './Records';

type ArchiveTab = 'overview' | 'timeline';

/**
 * 资产档案容器页
 * - 概览：归属当前责任人的资产（GetAssetTable searchField=responsible）
 * - 盘点时间线：复用盘点记录列表
 * tab 由 query ?tab=overview|timeline 控制，默认 overview
 */
export default function AssetsArchive() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();

  const tabParam = searchParams.get('tab');
  const tab: ArchiveTab = tabParam === 'timeline' ? 'timeline' : 'overview';

  const [assets, setAssets] = useState<AssetTableItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAssets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getAssetTable({
        keyword: user?.name ?? '',
        page: 1,
        pageSize: 50,
        searchField: 'responsible',
      });
      setAssets(result.list ?? []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '加载资产失败';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [user?.name]);

  useEffect(() => {
    if (tab === 'overview') {
      fetchAssets();
    }
  }, [tab, fetchAssets]);

  const handleTabChange = (_e: React.SyntheticEvent, value: ArchiveTab) => {
    setSearchParams(value === 'overview' ? {} : { tab: 'timeline' });
  };

  return (
    <div className="p-4 space-y-4 bg-gray-50 min-h-screen">
      {/* 头部 */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">资产档案</h1>
        <p className="text-sm text-gray-500 mt-0.5">归集你名下的固定资产与盘点轨迹</p>
      </div>

      {/* 子 Tab */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          value={tab}
          onChange={handleTabChange}
          variant="fullWidth"
          textColor="primary"
          indicatorColor="primary"
        >
          <Tab label="资产概览" value="overview" />
          <Tab label="盘点时间线" value="timeline" />
        </Tabs>
      </Box>

      {/* 概览：归属当前用户的资产 */}
      {tab === 'overview' && (
        <>
          {error && (
            <Alert severity="error" onClose={() => setError(null)} sx={{ fontSize: '0.85rem' }}>
              {error}
            </Alert>
          )}

          {loading &&
            [1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent>
                  <Skeleton variant="text" width="60%" height={24} />
                  <Skeleton variant="text" width="40%" height={20} />
                  <Skeleton variant="text" width="80%" height={20} />
                </CardContent>
              </Card>
            ))}

          {!loading && !error && assets.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <InboxIcon sx={{ fontSize: 64, mb: 2 }} />
              <p className="text-base font-medium">暂无名下资产</p>
              <p className="text-sm mt-1">系统未匹配到以你为责任人的固定资产</p>
            </div>
          )}

          {!loading &&
            assets.map((asset) => (
              <Card key={asset.assetCode} className="hover:shadow-lg transition-shadow">
                <CardContent>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <Typography
                      variant="subtitle1"
                      component="h3"
                      className="font-semibold text-gray-900 truncate"
                    >
                      {asset.assetName}
                    </Typography>
                    <StatusBadge status={asset.useStatus} />
                  </div>
                  <Typography variant="caption" className="text-gray-400 font-mono block mb-2">
                    {asset.assetCode}
                  </Typography>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                    {asset.categoryName && (
                      <span className="flex items-center gap-0.5">
                        <CategoryIcon fontSize="inherit" />
                        {asset.categoryName}
                      </span>
                    )}
                    {asset.userName && (
                      <span className="flex items-center gap-0.5">
                        <PersonIcon fontSize="inherit" />
                        {asset.userName}
                      </span>
                    )}
                    {asset.deptName && (
                      <span className="flex items-center gap-0.5">
                        <BusinessIcon fontSize="inherit" />
                        {asset.deptName}
                      </span>
                    )}
                    {asset.location && (
                      <span className="flex items-center gap-0.5">
                        <LocationOnIcon fontSize="inherit" />
                        {asset.location}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}

          <div className="h-4" />
        </>
      )}

      {/* 盘点时间线：复用盘点记录列表 */}
      {tab === 'timeline' && (
        <Box sx={{ mx: -2, mt: -2 }}>
          <RecordsPage embedded />
        </Box>
      )}
    </div>
  );
}
