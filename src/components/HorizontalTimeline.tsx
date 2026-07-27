import Box from '@mui/material/Box';
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';

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
 * 响应式任务进度轴。
 * 宽屏（≥600px）横向 5 节点；窄屏自动切换纵向，保证标题、时间戳、状态完整可见，无需滚动。
 * 已完成节点 = timestamp 存在；首个未完成节点高亮为当前进行中；余下为待到达。
 */
export default function HorizontalTimeline({ nodes }: HorizontalTimelineProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const completedCount = nodes.filter((n) => n.timestamp).length;
  const activeStep = completedCount >= nodes.length ? nodes.length : completedCount;

  return (
    <Box sx={{ width: '100%' }}>
      <Stepper
        activeStep={activeStep}
        orientation={isMobile ? 'vertical' : 'horizontal'}
        alternativeLabel={!isMobile}
        sx={{ py: isMobile ? 0 : 1 }}
      >
        {nodes.map((n) => {
          const done = Boolean(n.timestamp);
          return (
            <Step key={n.id} completed={done}>
              <StepLabel
                optional={
                  <Typography
                    variant="caption"
                    color={done ? 'text.primary' : 'text.secondary'}
                    sx={{ fontSize: '0.7rem', lineHeight: 1.3 }}
                  >
                    {done ? (n.timestamp ?? '—') : '待到达'}
                  </Typography>
                }
              >
                <Typography
                  variant="body2"
                  fontWeight={600}
                  color="text.primary"
                  sx={{
                    lineHeight: 1.3,
                    whiteSpace: isMobile ? 'normal' : 'nowrap',
                    fontSize: isMobile ? '0.85rem' : '0.875rem',
                  }}
                >
                  {n.title}
                </Typography>
              </StepLabel>
            </Step>
          );
        })}
      </Stepper>
    </Box>
  );
}
