import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import WatermarkOverlay from './WatermarkOverlay';

describe('WatermarkOverlay', () => {
  const defaultProps = {
    time: '2024-12-31 10:30:00',
    location: '成都市武侯区',
    operator: '张三',
    assetCode: 'ZC-2024-00123',
  };

  it('should render all watermark fields', () => {
    render(<WatermarkOverlay {...defaultProps} />);
    expect(screen.getByText('2024-12-31 10:30:00')).toBeDefined();
    expect(screen.getByText('成都市武侯区')).toBeDefined();
    expect(screen.getByText('张三')).toBeDefined();
    expect(screen.getByText('ZC-2024-00123')).toBeDefined();
  });

  it('should show "--" for empty time', () => {
    render(<WatermarkOverlay {...defaultProps} time="" />);
    expect(screen.getByText('--')).toBeDefined();
  });

  it('should show "定位中..." for empty location', () => {
    render(<WatermarkOverlay {...defaultProps} location="" />);
    expect(screen.getByText('定位中...')).toBeDefined();
  });

  it('should show "--" for empty operator', () => {
    render(<WatermarkOverlay {...defaultProps} operator="" />);
    // Should show "--" for both operator and possibly empty fields
    const dashes = screen.getAllByText('--');
    expect(dashes.length).toBeGreaterThanOrEqual(1);
  });

  it('should show "--" for empty assetCode', () => {
    render(<WatermarkOverlay {...defaultProps} assetCode="" />);
    const dashes = screen.getAllByText('--');
    expect(dashes.length).toBeGreaterThanOrEqual(1);
  });
});
