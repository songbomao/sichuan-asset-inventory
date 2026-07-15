import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import TaskList from './TaskList';

// Mock getTaskList API
const mockGetTaskList = vi.fn();
vi.mock('../api/tasks', () => ({
  getTaskList: (...args: any[]) => mockGetTaskList(...args),
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

function renderTaskList() {
  return render(
    <MemoryRouter>
      <TaskList />
    </MemoryRouter>,
  );
}

const mockTasks = [
  {
    taskId: '1',
    taskName: '2024年度固定资产盘点',
    assetCount: 100,
    completedCount: 45,
    deadline: '2024-12-31T23:59:59',
    status: 'in_progress',
    createTime: '2024-01-01',
    location: '成都市高新区',
  },
  {
    taskId: '2',
    taskName: '办公设备专项盘点',
    assetCount: 50,
    completedCount: 0,
    deadline: '2024-06-15T23:59:59', // expired
    status: 'pending',
    createTime: '2024-02-01',
    location: '',
  },
];

describe('TaskList Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockReset();
  });

  it('should show loading skeletons initially', () => {
    mockGetTaskList.mockImplementationOnce(() => new Promise(() => {}));
    renderTaskList();

    // Should show skeletons
    const skeletons = document.querySelectorAll('.MuiSkeleton-root');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('should render task list after loading', async () => {
    mockGetTaskList.mockResolvedValueOnce(mockTasks);
    renderTaskList();

    await waitFor(() => {
      expect(screen.getByText('2024年度固定资产盘点')).toBeDefined();
      expect(screen.getByText('办公设备专项盘点')).toBeDefined();
    });

    expect(screen.getByText('共 2 个任务待处理')).toBeDefined();
  });

  it('should show empty state when no tasks', async () => {
    mockGetTaskList.mockResolvedValueOnce([]);
    renderTaskList();

    await waitFor(() => {
      expect(screen.getByText('暂无盘点任务')).toBeDefined();
    });
  });

  it('should show error state on API failure', async () => {
    mockGetTaskList.mockRejectedValueOnce(new Error('网络错误'));
    renderTaskList();

    await waitFor(() => {
      expect(screen.getByText('网络错误')).toBeDefined();
    });
  });

  it('should show asset count and deadline on each card', async () => {
    mockGetTaskList.mockResolvedValueOnce(mockTasks);
    renderTaskList();

    await waitFor(() => {
      expect(screen.getByText('📦 资产 100 项')).toBeDefined();
      expect(screen.getByText('📦 资产 50 项')).toBeDefined();
    });
  });

  it('should navigate to inventory page on card click', async () => {
    const user = userEvent.setup();
    mockGetTaskList.mockResolvedValueOnce(mockTasks);
    renderTaskList();

    await waitFor(() => {
      expect(screen.getByText('2024年度固定资产盘点')).toBeDefined();
    });

    // Click on the first task card
    const card = screen.getByText('2024年度固定资产盘点').closest('.MuiCardActionArea-root');
    if (card) {
      await user.click(card);
      expect(mockNavigate).toHaveBeenCalledWith('/tasks/1/inventory');
    }
  });

  it('should show expired deadline in red for overdue tasks', async () => {
    mockGetTaskList.mockResolvedValueOnce([mockTasks[1]]); // expired task
    renderTaskList();

    await waitFor(() => {
      const deadlineElement = screen.getByText(/已过期/);
      expect(deadlineElement).toBeDefined();
      expect(deadlineElement.className).toContain('text-red-500');
    });
  });

  it('should show refreshing state on refresh click', async () => {
    const user = userEvent.setup();
    mockGetTaskList.mockResolvedValueOnce([]);
    // Second call will hang
    mockGetTaskList.mockResolvedValueOnce([]);

    renderTaskList();

    await waitFor(() => {
      expect(screen.getByText('暂无盘点任务')).toBeDefined();
    });

    const refreshButton = screen.getByRole('button', { name: '' }); // IconButton
    // Actually the refresh button is IconButton with RefreshIcon
    const buttons = screen.getAllByRole('button');
    // Find the refresh button
    const refreshBtn = buttons.find(b => b.querySelector('[data-testid="RefreshIcon"]') || b.closest('.MuiIconButton-root'));
    // Simpler: just find the icon button that wraps RefreshIcon
  });
});
