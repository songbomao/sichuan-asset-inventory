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
  it('should render bottom navigation with 3 tabs', () => {
    renderWithRouter('/tasks');
    expect(screen.getByText('任务')).toBeDefined();
    expect(screen.getByText('记录')).toBeDefined();
    expect(screen.getByText('我的')).toBeDefined();
  });

  it('should highlight tasks tab when on /tasks', () => {
    renderWithRouter('/tasks');
    const tasksTab = screen.getByText('任务').closest('button');
    expect(tasksTab?.classList.toString()).toContain('Mui-selected');
  });

  it('should highlight records tab when on /records', () => {
    renderWithRouter('/records');
    const recordsTab = screen.getByText('记录').closest('button');
    expect(recordsTab?.classList.toString()).toContain('Mui-selected');
  });

  it('should highlight profile tab when on /profile', () => {
    renderWithRouter('/profile');
    const profileTab = screen.getByText('我的').closest('button');
    expect(profileTab?.classList.toString()).toContain('Mui-selected');
  });

  it('should default to tasks tab for unknown paths', () => {
    renderWithRouter('/unknown');
    const tasksTab = screen.getByText('任务').closest('button');
    expect(tasksTab?.classList.toString()).toContain('Mui-selected');
  });

  it('should render Outlet for child routes', () => {
    const { container } = renderWithRouter('/tasks');
    // Should have a main element
    expect(container.querySelector('main')).toBeDefined();
  });
});
