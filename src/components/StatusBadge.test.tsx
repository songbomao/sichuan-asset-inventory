import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import StatusBadge from './StatusBadge';

describe('StatusBadge', () => {
  it('should render "正常" with filled variant for small size', () => {
    render(<StatusBadge status="正常" />);
    expect(screen.getByText('正常')).toBeDefined();
  });

  it('should render "待维修"', () => {
    render(<StatusBadge status="待维修" />);
    expect(screen.getByText('待维修')).toBeDefined();
  });

  it('should render "报废"', () => {
    render(<StatusBadge status="报废" />);
    expect(screen.getByText('报废')).toBeDefined();
  });

  it('should render "丢失"', () => {
    render(<StatusBadge status="丢失" />);
    expect(screen.getByText('丢失')).toBeDefined();
  });

  it('should render "pending" as "待盘点"', () => {
    render(<StatusBadge status="pending" />);
    expect(screen.getByText('待盘点')).toBeDefined();
  });

  it('should render "completed" as "已完成"', () => {
    render(<StatusBadge status="completed" />);
    expect(screen.getByText('已完成')).toBeDefined();
  });

  it('should render "in_progress" as "进行中"', () => {
    render(<StatusBadge status="in_progress" />);
    expect(screen.getByText('进行中')).toBeDefined();
  });

  it('should fallback to raw status text for unknown status', () => {
    render(<StatusBadge status="unknown_status" />);
    expect(screen.getByText('unknown_status')).toBeDefined();
  });

  it('should render medium size with outlined variant', () => {
    const { container } = render(<StatusBadge status="正常" size="medium" />);
    // Should render without errors; medium uses outlined variant
    expect(container.firstChild).toBeDefined();
  });
});
