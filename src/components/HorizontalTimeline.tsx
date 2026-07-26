import Box from '@mui/material/Box';
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import Typography from '@mui/material/Typography';

export interface MilestoneNode {
  id: string;
  title: string;
  /** 真实时间戳；null 表示尚未到达该节点 */
  timestamp: string | null;
}

interface HorizontalTimelineProps {
  nodes: MilestoneNode[];
}

/**
 * 横向任务进度轴（参考管理页「资产对比同步」tab 的 Stepper 样式）。
 * 已完成节点 = timestamp 存在；首个未完成节点高亮为当前进行中；余下为待到达。
 */
export default function HorizontalTimeline({ nodes }: HorizontalTimelineProps) {
  const completedCount = nodes.filter((n) => n.timestamp).length;
  const activeStep = completedCount >= nodes.length ? nodes.length : completedCount;

  return (
    <Box sx={{ width: '100%', overflowX: 'auto' }}>
      <Stepper activeStep={activeStep} alternativeLabel sx={{ minWidth: 520, py: 1 }}>
        {nodes.map((n) => {
          const done = Boolean(n.timestamp);
          return (
            <Step key={n.id} completed={done}>
              <StepLabel
                optional={
                  !done ? (
                    <Typography variant="caption" color="text.secondary">
                      待到达
                    </Typography>
                  ) : undefined
                }
              >
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    lineHeight: 1.2,
                  }}
                >
                  <Typography variant="body2" fontWeight={600} color="text.primary">
                    {n.title}
                  </Typography>
                  <Typography
                    variant="caption"
                    color={done ? 'text.primary' : 'text.secondary'}
                    sx={{ fontSize: '0.7rem', whiteSpace: 'nowrap' }}
                  >
                    {n.timestamp ?? '—'}
                  </Typography>
                </Box>
              </StepLabel>
            </Step>
          );
        })}
      </Stepper>
    </Box>
  );
}
