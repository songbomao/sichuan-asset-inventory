import Chip from '@mui/material/Chip';

interface StatusBadgeProps {
  status: string;
  size?: 'small' | 'medium';
}

/** 状态 → 颜色映射 */
const STATUS_MAP: Record<string, { label: string; color: 'success' | 'warning' | 'error' | 'default' }> = {
  '正常': { label: '正常', color: 'success' },
  '待维修': { label: '待维修', color: 'warning' },
  '报废': { label: '报废', color: 'error' },
  '丢失': { label: '丢失', color: 'error' },
  'pending': { label: '待盘点', color: 'warning' },
  'completed': { label: '已完成', color: 'success' },
  'in_progress': { label: '进行中', color: 'warning' },
};

/**
 * 状态标签组件
 */
export default function StatusBadge({ status, size = 'small' }: StatusBadgeProps) {
  const config = STATUS_MAP[status] || { label: status, color: 'default' as const };

  return (
    <Chip
      label={config.label}
      color={config.color}
      size={size}
      variant={size === 'small' ? 'filled' : 'outlined'}
      sx={{
        fontWeight: 600,
        fontSize: size === 'small' ? '0.75rem' : '0.85rem',
      }}
    />
  );
}
