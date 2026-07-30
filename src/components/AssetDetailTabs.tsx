import Skeleton from '@mui/material/Skeleton';
import Alert from '@mui/material/Alert';
import Paper from '@mui/material/Paper';
import type { AssetDetail } from '../api/inventory';

interface AssetDetailTabsProps {
  asset: AssetDetail | null;
  loading?: boolean;
  error?: string | null;
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

const ALL_FIELDS: Array<{ label: string; key: keyof AssetDetail; render?: (value: string | undefined) => React.ReactNode }> = [
  { label: '所属公司', key: 'companyName' },
  { label: '资产名称', key: 'assetName' },
  { label: '资产类型', key: 'assetTypeName' },
  { label: '规格型号', key: 'standard' },
  { label: '存放地点', key: 'location' },
  { label: '使用部门', key: 'deptName' },
  { label: '成本中心', key: 'costCenterName' },
  { label: '成本中心代码', key: 'costCenterCode' },
  { label: '使用人', key: 'userName' },
  { label: '计划使用期间', key: 'planUsePeriod' },
  { label: '剩余使用期间', key: 'leaveUsePeriod' },
  { label: '转资日期', key: 'purchaseDate' },
  { label: '是否超龄', key: 'isOverAge' },
  { label: '原值', key: 'originalValue', render: formatMoney },
  { label: '净值', key: 'netValue', render: formatMoney },
];

export default function AssetDetailTabs({ asset, loading, error }: AssetDetailTabsProps) {
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

  return (
    <Paper className="rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-3 py-2.5 space-y-1">
        {ALL_FIELDS.map((f) => (
          <div key={f.key} className="flex items-baseline justify-between gap-2 text-xs border-b border-gray-50 last:border-b-0 py-1.5">
            <span className="text-gray-400 shrink-0">{f.label}</span>
            <span className="text-right break-words min-w-0">
              {f.render ? f.render(asset[f.key] as string | undefined) : renderValue(asset[f.key] as string | undefined)}
            </span>
          </div>
        ))}
      </div>
    </Paper>
  );
}
