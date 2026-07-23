import { useEffect, useState } from 'react';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Chip from '@mui/material/Chip';
import Skeleton from '@mui/material/Skeleton';
import Alert from '@mui/material/Alert';
import type { AssetDetail } from '../api/inventory';
import type { LifecycleData } from '../api/report';

interface AssetDetailTabsProps {
  asset: AssetDetail | null;
  loading?: boolean;
  error?: string | null;
  lifecycle?: LifecycleData | null;
  lifecycleLoading?: boolean;
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
  { label: '资产编码', key: 'assetCode' },
  { label: '资产名称', key: 'assetName' },
  { label: '分类编码', key: 'categoryCode' },
  { label: '分类名称', key: 'categoryName' },
  { label: '所属公司', key: 'companyName' },
  { label: '公司代码', key: 'companyCode' },
  { label: '利润中心组', key: 'profitsGroupName' },
  { label: '资产类型', key: 'assetTypeName' },
  { label: '主资产编码', key: 'mainAssetCode' },
  { label: '旧资产卡片号', key: 'oldAssetsCardCode' },
  { label: '规格型号', key: 'standard' },
  { label: '计量单位', key: 'unit' },
  { label: 'ABC 分类', key: 'abcType' },
  { label: '创建日期', key: 'createDate' },
  { label: '会计年度', key: 'accountYear' },
];

const LOCATION_FIELDS: FieldDef[] = [
  { label: '存放地点', key: 'location' },
  { label: '使用部门', key: 'deptName' },
  { label: '部门代码', key: 'deptCode' },
  { label: '成本中心', key: 'costCenterName' },
  { label: '成本中心代码', key: 'costCenterCode' },
  { label: '利润中心', key: 'profitCenterName' },
  { label: '利润中心代码', key: 'profitCenterCode' },
  { label: '省份', key: 'provinceCode' },
  { label: 'WBS 元素', key: 'wbs' },
  { label: '资产归口', key: 'assetsRelegation' },
  { label: '专业归口', key: 'specialtyRelegation' },
  { label: '资产性质', key: 'assetsNature' },
];

const USAGE_FIELDS: FieldDef[] = [
  { label: '使用人', key: 'userName' },
  { label: '使用状态', key: 'useStatus' },
  { label: '计划使用期间', key: 'planUsePeriod' },
  { label: '剩余使用期间', key: 'leaveUsePeriod' },
  { label: '转资日期', key: 'purchaseDate' },
  { label: '许可证号', key: 'licenceNumber' },
  { label: '是否超龄', key: 'isOverAge' },
  { label: '数量', key: 'menge' },
];

const FINANCE_FIELDS: FieldDef[] = [
  { label: '原值', key: 'originalValue', render: formatMoney },
  { label: '累计折旧', key: 'accDepreciation', render: formatMoney },
  { label: '净值', key: 'netValue', render: formatMoney },
  { label: '减值准备', key: 'lostValue', render: formatMoney },
  { label: '成新率', key: 'newnessRate' },
];

const MAINTENANCE_FIELDS: FieldDef[] = [
  { label: '制造商', key: 'manufacturer' },
  { label: '供应商', key: 'supplierName' },
  { label: '供应商代码', key: 'supplierCode' },
  { label: '项目号', key: 'itemNumber' },
  { label: '增加原因', key: 'increaseReson' },
  { label: '折旧码', key: 'depreciationKey' },
  { label: '标的物编码', key: 'subjectMatterCode' },
  { label: '合同编码', key: 'contractCode' },
  { label: '备注', key: 'remark' },
];

export default function AssetDetailTabs({ asset, loading, error, lifecycle, lifecycleLoading }: AssetDetailTabsProps) {
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
    { label: '使用信息', fields: USAGE_FIELDS },
    { label: '财务信息', fields: FINANCE_FIELDS },
    { label: '维护/供应商', fields: MAINTENANCE_FIELDS },
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
          <Tab label="历史变更" />
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

        <TabPanel value={activeTab} index={tabs.length}>
          <LifecyclePanel lifecycle={lifecycle} loading={lifecycleLoading} />
        </TabPanel>
      </div>
    </Paper>
  );
}

function LifecyclePanel({ lifecycle, loading }: { lifecycle?: LifecycleData | null; loading?: boolean }) {
  if (loading) {
    return (
      <div className="space-y-2">
        <Skeleton variant="text" width="60%" />
        <Skeleton variant="text" width="80%" />
        <Skeleton variant="text" width="50%" />
      </div>
    );
  }

  if (!lifecycle || !lifecycle.records || lifecycle.records.length === 0) {
    return <p className="text-sm text-gray-400 py-2">暂无历史盘点/变更记录</p>;
  }

  return (
    <div className="relative pl-6 border-l-2 border-gray-200 space-y-4">
      {lifecycle.records.map((r) => {
        const dotColor = r.operatorType === 'review' ? '#ff9800' : r.status === 'normal' ? '#4caf50' : '#f44336';
        return (
          <div key={r.id} className="relative">
            <div className="absolute w-3 h-3 rounded-full -left-[19px] top-1" style={{ backgroundColor: dotColor }} />
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
  );
}
