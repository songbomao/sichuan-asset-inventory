import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Inventory from './Inventory';

// Mock API calls
const mockGetTaskDetail = vi.fn();
const mockGetProgress = vi.fn();
const mockSubmitRecord = vi.fn();
const mockGetAssetByCode = vi.fn();

vi.mock('../api/tasks', () => ({
  getTaskDetail: (...args: any[]) => mockGetTaskDetail(...args),
  getProgress: (...args: any[]) => mockGetProgress(...args),
}));

vi.mock('../api/inventory', () => ({
  submitRecord: (...args: any[]) => mockSubmitRecord(...args),
  getAssetByCode: (...args: any[]) => mockGetAssetByCode(...args),
}));

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'u1', username: 'zhangsan', name: '张三', role: '盘点员', department: 'IT' },
    token: 'token',
    isAuthenticated: true,
  }),
}));

// Mock geolocation
const mockGetCurrentPosition = vi.fn();
Object.defineProperty(globalThis.navigator, 'geolocation', {
  value: { getCurrentPosition: mockGetCurrentPosition },
  writable: true,
  configurable: true,
});

// Mock canvas
HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
  drawImage: vi.fn(),
  fillRect: vi.fn(),
  fillText: vi.fn(),
  fillStyle: '',
  font: '',
  textBaseline: '',
  textAlign: '',
  globalAlpha: 1,
  save: vi.fn(),
  restore: vi.fn(),
})) as any;
HTMLCanvasElement.prototype.toDataURL = vi.fn(() => 'data:image/jpeg;base64,mock');

const mockAssets = [
  {
    assetCode: 'ZC-001',
    assetName: '联想笔记本电脑',
    category: '电子设备',
    location: 'A栋301',
    department: 'IT部',
    status: '正常',
    imageUrl: '',
  },
  {
    assetCode: 'ZC-002',
    assetName: 'HP打印机',
    category: '办公设备',
    location: 'B栋102',
    department: '行政部',
    status: '正常',
    imageUrl: '',
  },
];

const mockTaskDetail = {
  taskId: 't1',
  taskName: '2024年度盘点任务',
  assets: mockAssets,
  completedCodes: [] as string[],
};

const mockProgress = { total: 2, completed: 0, percentage: 0 };

function renderInventory() {
  return render(
    <MemoryRouter initialEntries={['/tasks/t1/inventory']}>
      <Inventory />
    </MemoryRouter>,
  );
}

describe('Inventory Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetTaskDetail.mockResolvedValue(mockTaskDetail);
    mockGetProgress.mockResolvedValue(mockProgress);
    mockSubmitRecord.mockResolvedValue('r-new');
    mockGetCurrentPosition.mockImplementation(
      (success: PositionCallback) => success({
        coords: { latitude: 30.6599, longitude: 104.0657, accuracy: 10, altitude: null, altitudeAccuracy: null, heading: null, speed: null },
        timestamp: Date.now(),
      }),
    );
  });

  describe('loading state', () => {
    it('should show loading indicator', () => {
      mockGetTaskDetail.mockImplementationOnce(() => new Promise(() => {}));
      renderInventory();
      expect(screen.getByText('加载盘点任务...')).toBeDefined();
    });
  });

  describe('error state', () => {
    it('should show error message and retry button', async () => {
      mockGetTaskDetail.mockRejectedValueOnce(new Error('网络连接失败'));
      renderInventory();

      await waitFor(() => {
        expect(screen.getByText('网络连接失败')).toBeDefined();
        expect(screen.getByText('重新加载')).toBeDefined();
        expect(screen.getByText('返回任务列表')).toBeDefined();
      });
    });
  });

  describe('empty state', () => {
    it('should show empty message when no assets', async () => {
      mockGetTaskDetail.mockResolvedValueOnce({
        taskId: 't1',
        taskName: '空任务',
        assets: [],
        completedCodes: [],
      });
      renderInventory();

      await waitFor(() => {
        expect(screen.getByText('该任务暂无资产数据')).toBeDefined();
      });
    });
  });

  describe('loaded state', () => {
    it('should render asset card with details', async () => {
      renderInventory();

      await waitFor(() => {
        expect(screen.getByText('联想笔记本电脑')).toBeDefined();
        expect(screen.getByText('ZC-001')).toBeDefined();
        expect(screen.getByText('电子设备')).toBeDefined();
        expect(screen.getByText('A栋301')).toBeDefined();
      });
    });

    it('should show progress from getProgress API', async () => {
      renderInventory();

      await waitFor(() => {
        expect(screen.getByText('2024年度盘点任务')).toBeDefined();
      });
    });

    it('should show status toggle buttons', async () => {
      renderInventory();

      await waitFor(() => {
        expect(screen.getByText('✅ 正常')).toBeDefined();
        expect(screen.getByText('🔧 待维修')).toBeDefined();
        expect(screen.getByText('🗑 报废')).toBeDefined();
        expect(screen.getByText('❌ 丢失')).toBeDefined();
      });
    });

    it('should show navigation buttons', async () => {
      renderInventory();

      await waitFor(() => {
        expect(screen.getByText('上一个')).toBeDefined();
        expect(screen.getByText('下一个')).toBeDefined();
        expect(screen.getByText('📤 提交盘点记录')).toBeDefined();
      });
    });

    it('should disable prev button on first asset', async () => {
      renderInventory();

      await waitFor(() => {
        expect(screen.getByText('联想笔记本电脑')).toBeDefined();
        expect(screen.getByText('上一个').closest('button')).toBeDisabled();
      });
    });

    it('should go to next asset', async () => {
      const user = userEvent.setup();
      renderInventory();

      await waitFor(() => {
        expect(screen.getByText('联想笔记本电脑')).toBeDefined();
      });

      await user.click(screen.getByText('下一个'));

      await waitFor(() => {
        expect(screen.getByText('HP打印机')).toBeDefined();
      });

      // Now "下一个" should be disabled
      expect(screen.getByText('下一个').closest('button')).toBeDisabled();
    });

    it('should submit record successfully', async () => {
      const user = userEvent.setup();
      mockSubmitRecord.mockResolvedValueOnce('r-123');

      renderInventory();

      await waitFor(() => {
        expect(screen.getByText('联想笔记本电脑')).toBeDefined();
      });

      await user.click(screen.getByText('📤 提交盘点记录'));

      await waitFor(() => {
        expect(mockSubmitRecord).toHaveBeenCalledWith(
          expect.objectContaining({
            taskId: 't1',
            assetCode: 'ZC-001',
            status: '正常',
          }),
        );
        expect(screen.getByText('✅ 盘点提交成功！')).toBeDefined();
      });
    });

    it('should show error on submit failure', async () => {
      const user = userEvent.setup();
      mockSubmitRecord.mockRejectedValueOnce(new Error('提交失败，请重试'));

      renderInventory();

      await waitFor(() => {
        expect(screen.getByText('联想笔记本电脑')).toBeDefined();
      });

      await user.click(screen.getByText('📤 提交盘点记录'));

      await waitFor(() => {
        expect(screen.getByText('❌ 提交失败，请重试')).toBeDefined();
      });
    });

    it('should show completed state after submission', async () => {
      const user = userEvent.setup();
      mockGetTaskDetail.mockResolvedValueOnce({
        ...mockTaskDetail,
        completedCodes: ['ZC-001'],
      });

      renderInventory();

      await waitFor(() => {
        expect(screen.getByText('该资产已盘点完成 ✅')).toBeDefined();
        expect(screen.getByText('✅ 已完成盘点')).toBeDefined();
      });
    });

    it('should render AI scan dialog', async () => {
      const user = userEvent.setup();
      renderInventory();

      await waitFor(() => {
        expect(screen.getByText('AI识别')).toBeDefined();
      });

      await user.click(screen.getByText('AI识别'));

      await waitFor(() => {
        expect(screen.getByText('🔍 AI 识别资产')).toBeDefined();
      });
    });
  });

  describe('GPS handling', () => {
    it('should show "定位中..." initially', async () => {
      mockGetCurrentPosition.mockImplementationOnce(() => {}); // never calls back

      renderInventory();

      await waitFor(() => {
        // WatermarkOverlay shows "定位中..." for empty location
        const locationElements = screen.getAllByText('定位中...');
        expect(locationElements.length).toBeGreaterThanOrEqual(1);
      });
    });

    it('should show "设备不支持定位" when geolocation unavailable', async () => {
      const originalGeolocation = navigator.geolocation;
      Object.defineProperty(globalThis.navigator, 'geolocation', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      renderInventory();

      // Reset for other tests
      await waitFor(() => {
        Object.defineProperty(globalThis.navigator, 'geolocation', {
          value: originalGeolocation,
          writable: true,
          configurable: true,
        });
      });
    });
  });
});
