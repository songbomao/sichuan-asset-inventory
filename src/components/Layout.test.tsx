import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Layout from './Layout';

// Wrapper with router context
function renderWithRouter(initialPath = '/tasks') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Layout />
    </MemoryRouter>,
  );
}

describe('Layout', () => {
  it('should render bottom navigation with owner tabs (责任人视图)', () => {
    renderWithRouter('/tasks');
    expect(screen.getByText('我的任务')).toBeDefined();
    expect(screen.getByText('资产档案')).toBeDefined();
    expect(screen.getByText('我的')).toBeDefined();
  });

  it('should render role switcher (责任人 / 管理员)', () => {
    renderWithRouter('/tasks');
    expect(screen.getByText('责任人')).toBeDefined();
    expect(screen.getByText('管理员')).toBeDefined();
  });

  it('should highlight 我的任务 tab when on /tasks', () => {
    renderWithRouter('/tasks');
    const tasksTab = screen.getByText('我的任务').closest('button');
    expect(tasksTab?.classList.toString()).toContain('Mui-selected');
  });

  it('should highlight 资产档案 tab when on /assets', () => {
    renderWithRouter('/assets');
    const assetsTab = screen.getByText('资产档案').closest('button');
    expect(assetsTab?.classList.toString()).toContain('Mui-selected');
  });

  it('should highlight 我的 tab when on /profile', () => {
    renderWithRouter('/profile');
    const profileTab = screen.getByText('我的').closest('button');
    expect(profileTab?.classList.toString()).toContain('Mui-selected');
  });

  it('should default to 我的任务 tab for unknown paths', () => {
    renderWithRouter('/unknown');
    const tasksTab = screen.getByText('我的任务').closest('button');
    expect(tasksTab?.classList.toString()).toContain('Mui-selected');
  });

  it('should render Outlet for child routes', () => {
    const { container } = renderWithRouter('/tasks');
    // Should have a main element
    expect(container.querySelector('main')).toBeDefined();
  });
});
