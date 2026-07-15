interface WatermarkOverlayProps {
  time: string;
  location: string;
  operator: string;
  assetCode: string;
}

/**
 * 水印信息展示组件（预览用）
 * 显示将叠加在照片上的水印字段
 */
export default function WatermarkOverlay({
  time,
  location,
  operator,
  assetCode,
}: WatermarkOverlayProps) {
  return (
    <div className="w-full bg-black/60 backdrop-blur-sm rounded-card p-3 text-sm text-white space-y-1">
      <div className="flex items-center gap-2">
        <span>🕐</span>
        <span>{time || '--'}</span>
      </div>
      <div className="flex items-center gap-2">
        <span>📍</span>
        <span>{location || '定位中...'}</span>
      </div>
      <div className="flex items-center gap-2">
        <span>👤</span>
        <span>{operator || '--'}</span>
      </div>
      <div className="flex items-center gap-2">
        <span>🏷</span>
        <span>{assetCode || '--'}</span>
      </div>
    </div>
  );
}
