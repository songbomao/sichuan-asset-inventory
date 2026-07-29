import { useEffect, useState } from 'react';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Chip from '@mui/material/Chip';
import Skeleton from '@mui/material/Skeleton';
import Alert from '@mui/material/Alert';
import type { AssetDetail } from '../api/inventory';

interface AssetDetailTabsProps {
  asset: AssetDetail | null;
  loading?: boolean;
  error?: string | null;
}

interface FieldDef {
  label: string;
  key: keyof AssetDetail;
  render?: (value: string | undefined) => React.ReactNode;
}

const formatMoney = (value?: string) => {
  if (!value || value === '0' || value === '0.00') return '¥0.00';
  const num = Number(value);
  if (Number.isNaN(num)) return value;
  return `¥${num.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const renderValue = (value: string | undefined) => {
  if (value === undefined || value === null || value === '') return <span className="text-gray-300">—</span>;
  return <span className="text-gray-800 font-medium">{value}</span>;
};

const FieldItem = ({ label, value, render }: { label: string; value?: string; render?: (v: string | undefined) => React.ReactNode }) => (
  <div className="py-2 border-b border-gray-50 last:border-b-0">
    <div className="text-xs text-gray-400 mb-0.5">{label}</div>
    <div className="text-sm break-words">{render ? render(value) : renderValue(value)}</div>
  </div>
);

const TabPanel = ({ children, value, index }: { children: React.ReactNode; value: number; index: number }) => {
  if (value !== index) return null;
  return <div className="py-3">{children}</div>;
};

const BASIC_FIELDS: FieldDef[] = [
  { label: '所属公司', key: 'companyName' },
  { label: '资产类型', key: 'assetTypeName' },
  { label: '规格型号', key: 'standard' },
  { label: '创建日期', key: 'createDate' },
  { label: '会计年度', key: 'accountYear' },
];

const LOCATION_FIELDS: FieldDef[] = [
  { label: '存放地点', key: 'location' },
  { label: '使用部门', key: 'deptName' },
  { label: '部门代码', key: 'deptCode' },
  { label: '成本中心', key: 'costCenterName' },
  { label: '成本中心代码', key: 'costCenterCode' },
  { label: '利润中心代码', key: 'profitCenterCode' },
  { label: 'WBS 元素', key: 'wbs' },
];

const FINANCE_FIELDS: FieldDef[] = [
  { label: '使用人', key: 'userName' },
  { label: '计划使用期间', key: 'planUsePeriod' },
  { label: '剩余使用期间', key: 'leaveUsePeriod' },
  { label: '转资日期', key: 'purchaseDate' },
  { label: '是否超龄', key: 'isOverAge' },
  { label: '原值', key: 'originalValue', render: formatMoney },
  { label: '净值', key: 'netValue', render: formatMoney },
];

export default function AssetDetailTabs({ asset, loading, error }: AssetDetailTabsProps) {
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    // 切换资产时重置到第一个 Tab
    setActiveTab(0);
  }, [asset?.assetCode]);

  if (loading) {
    return (
      <Paper className="rounded-xl p-3 shadow-sm border border-gray-100">
        <Skeleton variant="text" width="40%" />
        <Skeleton variant="text" width="70%" />
        <Skeleton variant="text" width="60%" />
      </Paper>
    );
  }

  if (error) {
    return (
      <Paper className="rounded-xl p-3 shadow-sm border border-gray-100">
        <Alert severity="warning" sx={{ fontSize: '0.8rem' }}>
          {error}
        </Alert>
      </Paper>
    );
  }

  if (!asset) return null;

  const tabs = [
    { label: '基本信息', fields: BASIC_FIELDS },
    { label: '位置信息', fields: LOCATION_FIELDS },
    { label: '财务与使用', fields: FINANCE_FIELDS },
  ];

  return (
    <Paper className="rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* 顶部资产标识 */}
      <div className="bg-gradient-to-r from-primary/5 to-transparent px-4 py-3 border-b border-gray-100">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-xs text-gray-400 mb-0.5">资产编号</div>
            <div className="font-mono text-base font-bold text-primary truncate">{asset.assetCode}</div>
            <div className="text-sm font-semibold text-gray-900 mt-1 truncate">{asset.assetName}</div>
          </div>
          <div className="shrink-0 text-right">
            <Chip
              label={asset.useStatus || '未知状态'}
              size="small"
              sx={{
                bgcolor: 'rgba(26, 35, 126, 0.08)',
                color: '#1a237e',
                fontWeight: 600,
                fontSize: '0.7rem',
              }}
            />
            <div className="text-xs text-gray-400 mt-1.5">{asset.categoryName || '—'}</div>
          </div>
        </div>
      </div>

      {/* Tab 导航 */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          value={activeTab}
          onChange={(_e, v) => setActiveTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          textColor="primary"
          indicatorColor="primary"
          sx={{
            minHeight: '44px',
            '& .MuiTabs-scrollableX': { scrollbarWidth: 'none' },
            '& .MuiTab-root': {
              minHeight: '44px',
              py: 0.8,
              px: 1.5,
              fontSize: '0.75rem',
              fontWeight: 600,
              textTransform: 'none',
            },
          }}
        >
          {tabs.map((t) => (
            <Tab key={t.label} label={t.label} />
          ))}
        </Tabs>
      </Box>

      {/* Tab 内容 */}
      <div className="px-3 pb-3">
        {tabs.map((tab, idx) => (
          <TabPanel key={tab.label} value={activeTab} index={idx}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
              {tab.fields.map((f) => (
                <FieldItem key={f.key} label={f.label} value={asset[f.key] as string | undefined} render={f.render} />
              ))}
            </div>
          </TabPanel>
        ))}
      </div>
    </Paper>
  );
}
