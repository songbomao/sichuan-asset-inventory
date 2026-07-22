import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import CheckIcon from '@mui/icons-material/Check';
import { keyframes } from '@mui/system';

export type TimelineStatus = 'completed' | 'in-progress' | 'pending';

export interface TimelineEvent {
  id: string;
  title: string;
  timestamp: string;
  status: TimelineStatus;
}

interface VerticalTimelineProps {
  events: TimelineEvent[];
}

const pulse = keyframes`
  0% {
    transform: scale(1);
    opacity: 0.6;
  }
  100% {
    transform: scale(2.4);
    opacity: 0;
  }
`;

const statusMeta: Record<TimelineStatus, { label: string; chipColor: 'success' | 'primary' | 'default'; dotColor: string }> = {
  completed: { label: '已完成', chipColor: 'success', dotColor: '#22c55e' },
  'in-progress': { label: '进行中', chipColor: 'primary', dotColor: '#2563eb' },
  pending: { label: '待处理', chipColor: 'default', dotColor: '#9ca3af' },
};

export default function VerticalTimeline({ events }: VerticalTimelineProps) {
  return (
    <Box sx={{ position: 'relative', pl: 3.5, py: 1 }}>
      {/* 竖向连接线 */}
      <Box
        sx={{
          position: 'absolute',
          left: 19,
          top: 24,
          bottom: 24,
          width: 2,
          bgcolor: '#e5e7eb',
          zIndex: 0,
        }}
      />

      <Stack spacing={3}>
        {events.map((event) => {
          const meta = statusMeta[event.status];
          const isCompleted = event.status === 'completed';
          const isInProgress = event.status === 'in-progress';

          return (
            <Box key={event.id} sx={{ position: 'relative', zIndex: 1 }}>
              {/* 节点圆点 */}
              <Box
                sx={{
                  position: 'absolute',
                  left: -27,
                  top: 2,
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  bgcolor: isCompleted || isInProgress ? meta.dotColor : '#fff',
                  border: isCompleted || isInProgress ? 'none' : `2px solid ${meta.dotColor}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: isInProgress ? '0 0 0 4px rgba(37,99,235,0.12)' : 'none',
                }}
              >
                {isCompleted && <CheckIcon sx={{ fontSize: 14, color: '#fff' }} />}
                {isInProgress && (
                  <>
                    <Box
                      sx={{
                        position: 'absolute',
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        bgcolor: 'rgba(37,99,235,0.35)',
                        animation: `${pulse} 1.6s infinite ease-out`,
                      }}
                    />
                    <Box
                      sx={{
                        position: 'absolute',
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        bgcolor: 'rgba(37,99,235,0.25)',
                        animation: `${pulse} 1.6s infinite ease-out 0.5s`,
                      }}
                    />
                  </>
                )}
              </Box>

              {/* 内容区 */}
              <Stack spacing={0.75}>
                <Stack direction="row" alignItems="center" spacing={1.5} flexWrap="wrap">
                  <Typography variant="subtitle1" fontWeight={600} color="text.primary">
                    {event.title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                    {event.timestamp}
                  </Typography>
                </Stack>
                <Chip
                  label={meta.label}
                  color={meta.chipColor}
                  size="small"
                  sx={{
                    width: 'fit-content',
                    height: 22,
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    borderRadius: '4px',
                    '& .MuiChip-label': { px: 1 },
                  }}
                />
              </Stack>
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
}
