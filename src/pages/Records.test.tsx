import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Records from './Records';

// Mock API
const mockGetMyRecords = vi.fn();
vi.mock('../api/inventory', () => ({
  getMyRecords: (...args: any[]) => mockGetMyRecords(...args),
}));

function renderRecords() {
  return render(
    <MemoryRouter>
      <Records />
    </MemoryRouter>,
  );
}

const mockRecords = [
  {
    recordId: 'r1',
    taskId: 't1',
    taskName: '2024年度盘点',
    assetCode: 'ZC-001',
    assetName: '笔记本电脑',
    status: '正常',
    remark: '完好',
    photoUrl: '',
    createTime: '2024-12-01T10:30:00',
    location: '成都市',
  },
  {
    recordId: 'r2',
    taskId: 't1',
    taskName: '2024年度盘点',
    assetCode: 'ZC-002',
    assetName: '打印机',
    status: '待维修',
    remark: '卡纸',
    photoUrl: '',
    createTime: '2024-12-01T11:00:00',
    location: '成都市',
  },
  {
    recordId: 'r3',
    taskId: 't2',
    taskName: '办公设备盘点',
    assetCode: 'ZC-003',
    assetName: '办公桌',
    status: '报废',
    remark: '',
    photoUrl: '',
    createTime: '2024-11-15T09:00:00',
    location: '',
  },
];

describe('Records Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show loading skeletons initially', () => {
    mockGetMyRecords.mockImplementationOnce(() => new Promise(() => {}));
    renderRecords();
    const skeletons = document.querySelectorAll('.MuiSkeleton-root');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('should render records after loading', async () => {
    mockGetMyRecords.mockResolvedValueOnce(mockRecords);
    renderRecords();

    await waitFor(() => {
      expect(screen.getByText('笔记本电脑')).toBeDefined();
      expect(screen.getByText('打印机')).toBeDefined();
      expect(screen.getByText('办公桌')).toBeDefined();
    });

    expect(screen.getByText('共 3 条记录')).toBeDefined();
  });

  it('should show empty state when no records', async () => {
    mockGetMyRecords.mockResolvedValueOnce([]);
    renderRecords();

    await waitFor(() => {
      expect(screen.getByText('暂无盘点记录')).toBeDefined();
    });
  });

  it('should show error state on API failure', async () => {
    mockGetMyRecords.mockRejectedValueOnce(new Error('服务器错误'));
    renderRecords();

    await waitFor(() => {
      expect(screen.getByText('服务器错误')).toBeDefined();
    });
  });

  it('should render filter chips', () => {
    renderRecords();
    expect(screen.getByText('全部')).toBeDefined();
    expect(screen.getByText('正常')).toBeDefined();
    expect(screen.getByText('待维修')).toBeDefined();
    expect(screen.getByText('报废')).toBeDefined();
    expect(screen.getByText('丢失')).toBeDefined();
  });

  it('should filter records by status', async () => {
    const user = userEvent.setup();
    mockGetMyRecords.mockResolvedValueOnce(mockRecords);
    renderRecords();

    await waitFor(() => {
      expect(screen.getByText('笔记本电脑')).toBeDefined();
    });

    // Click "待维修" filter chip (not the StatusBadge)
    const filterChips = screen.getAllByText('待维修');
    // The filter chip is a clickable element, find the MuiChip one
    const filterChip = filterChips.find((el) => el.closest('[role="button"]'));
    expect(filterChip).toBeDefined();
    await user.click(filterChip!);

    // Should only show 打印机 now
    expect(screen.getByText('打印机')).toBeDefined();
    expect(screen.queryByText('笔记本电脑')).toBeNull();
    expect(screen.queryByText('办公桌')).toBeNull();
  });

  it('should show "无匹配记录" when filter returns no results', async () => {
    const user = userEvent.setup();
    mockGetMyRecords.mockResolvedValueOnce(mockRecords);
    renderRecords();

    await waitFor(() => {
      expect(screen.getByText('笔记本电脑')).toBeDefined();
    });

    // Click "丢失" filter chip
    const lostChips = screen.getAllByText('丢失');
    const lostChip = lostChips.find((el) => el.closest('[role="button"]'));
    expect(lostChip).toBeDefined();
    await user.click(lostChip!);

    expect(screen.getByText('无匹配记录')).toBeDefined();
  });

  it('should open detail dialog on record click', async () => {
    const user = userEvent.setup();
    mockGetMyRecords.mockResolvedValueOnce(mockRecords);
    renderRecords();

    await waitFor(() => {
      expect(screen.getByText('笔记本电脑')).toBeDefined();
    });

    await user.click(screen.getByText('笔记本电脑'));

    await waitFor(() => {
      expect(screen.getByText('盘点详情')).toBeDefined();
      // In the dialog, should see asset details
      const assetNames = screen.getAllByText('笔记本电脑');
      expect(assetNames.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('should show empty state for no records (not filtered)', async () => {
    mockGetMyRecords.mockResolvedValueOnce([]);
    renderRecords();

    await waitFor(() => {
      expect(screen.getByText('完成盘点任务后记录将显示在此处')).toBeDefined();
    });
  });
});
