import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ProgressBar from './ProgressBar';

describe('ProgressBar', () => {
  it('should render progress bar with percentage', () => {
    render(<ProgressBar current={5} total={10} />);
    expect(screen.getByText('盘点进度')).toBeDefined();
    // Text is in format "current/total (percentage%)"
    expect(screen.getByText(/5\/10/)).toBeDefined();
    expect(screen.getByText(/50%/)).toBeDefined();
  });

  it('should show 0% when total is 0', () => {
    render(<ProgressBar current={0} total={0} />);
    expect(screen.getByText('盘点进度')).toBeDefined();
    expect(screen.getByText(/0\/0/)).toBeDefined();
    expect(screen.getByText(/0%/)).toBeDefined();
  });

  it('should show 100% when all completed', () => {
    render(<ProgressBar current={10} total={10} />);
    expect(screen.getByText('盘点进度')).toBeDefined();
    expect(screen.getByText(/10\/10/)).toBeDefined();
    expect(screen.getByText(/100%/)).toBeDefined();
  });

  it('should hide label when showLabel is false', () => {
    render(<ProgressBar current={3} total={10} showLabel={false} />);
    expect(screen.queryByText('盘点进度')).toBeNull();
  });

  it('should handle current greater than total gracefully', () => {
    render(<ProgressBar current={15} total={10} />);
    // percentage would be 150%, clamped by LinearProgress
    expect(screen.getByText(/150%/)).toBeDefined();
  });
});
