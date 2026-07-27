import { useEffect, useState } from 'react';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';

interface DeadlinePickerProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  required?: boolean;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function getNowParts(): { date: string; time: string } {
  const now = new Date();
  return {
    date: `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`,
    time: `${pad2(now.getHours())}:${pad2(now.getMinutes())}:${pad2(now.getSeconds())}`,
  };
}

function parseDateTime(value: string): { date: string; time: string } {
  const date = value.slice(0, 10) || '';
  const time = value.length >= 19 ? value.slice(11, 19) : value.split('T')[1] || '';
  return { date, time };
}

function formatDisplay(value: string): string {
  if (!value) return '';
  return value.replace('T', ' ');
}

export default function DeadlinePicker({
  value,
  onChange,
  label = '截止时间',
  required = false,
}: DeadlinePickerProps) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');

  useEffect(() => {
    if (open) {
      const { date: d, time: t } = parseDateTime(value);
      const now = getNowParts();
      setDate(d || now.date);
      setTime(t || now.time);
    }
  }, [open, value]);

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  const handleConfirm = () => {
    if (!date || !time) return;
    // 部分浏览器在 time 输入中可能只返回 HH:mm，补全秒
    const normalizedTime = time.length === 5 ? `${time}:00` : time;
    onChange(`${date}T${normalizedTime}`);
    setOpen(false);
  };

  return (
    <>
      <TextField
        label={label}
        value={formatDisplay(value)}
        placeholder="请选择截止时间"
        required={required}
        fullWidth
        size="small"
        InputLabelProps={{ shrink: true }}
        InputProps={{
          readOnly: true,
          endAdornment: (
            <InputAdornment position="end">
              <IconButton edge="end" size="small" onClick={handleOpen}>
                <CalendarTodayIcon fontSize="small" />
              </IconButton>
            </InputAdornment>
          ),
        }}
        onClick={handleOpen}
      />
      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xs">
        <DialogTitle>{label}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="日期"
              type="date"
              size="small"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              label="时间"
              type="time"
              size="small"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              inputProps={{ step: 1 }}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} color="inherit">
            取消
          </Button>
          <Button onClick={handleConfirm} variant="contained">
            完成
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
