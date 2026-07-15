import LinearProgress from '@mui/material/LinearProgress';

interface ProgressBarProps {
  current: number;
  total: number;
  showLabel?: boolean;
}

/**
 * 盘点进度条组件
 */
export default function ProgressBar({
  current,
  total,
  showLabel = true,
}: ProgressBarProps) {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs text-gray-500">盘点进度</span>
          <span className="text-xs font-semibold text-primary">
            {current}/{total} ({percentage}%)
          </span>
        </div>
      )}
      <LinearProgress
        variant="determinate"
        value={percentage}
        sx={{
          height: 8,
          borderRadius: 4,
          backgroundColor: 'rgba(26, 35, 126, 0.08)',
          '& .MuiLinearProgress-bar': {
            borderRadius: 4,
            background: 'linear-gradient(90deg, #1a237e 0%, #7c4dff 100%)',
          },
        }}
      />
    </div>
  );
}
