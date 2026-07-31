import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CameraCapture from './CameraCapture';

// Mock navigator.mediaDevices
const mockGetUserMedia = vi.fn();
const mockStopTrack = vi.fn();

beforeEach(() => {
  Object.defineProperty(globalThis.navigator, 'mediaDevices', {
    value: { getUserMedia: mockGetUserMedia },
    writable: true,
    configurable: true,
  });
});

// Mock canvas context
const mockDrawImage = vi.fn();
const mockToDataURL = vi.fn(() => 'data:image/jpeg;base64,mock');
const mockCanvasContext = {
  drawImage: mockDrawImage,
  fillRect: vi.fn(),
  fillText: vi.fn(),
  fillStyle: '',
  font: '',
  textBaseline: '',
  textAlign: '',
  globalAlpha: 1,
  save: vi.fn(),
  restore: vi.fn(),
  measureText: vi.fn(() => ({ width: 100 })),
};

beforeEach(() => {
  HTMLCanvasElement.prototype.getContext = vi.fn(() => mockCanvasContext) as any;
  HTMLCanvasElement.prototype.toDataURL = mockToDataURL;
});

// Mock MediaStream
beforeEach(() => {
  const mockStream = {
    getTracks: () => [{ stop: mockStopTrack }],
  };
  mockGetUserMedia.mockResolvedValue(mockStream);
});

// Mock Image
const originalImage = globalThis.Image;
beforeEach(() => {
  (globalThis as any).Image = class MockImage {
    onload: (() => void) | null = null;
    src: string = '';
    width: number = 800;
    height: number = 600;
    constructor() {
      setTimeout(() => {
        if (this.onload) this.onload();
      }, 0);
    }
  };
});

afterEach(() => {
  (globalThis as any).Image = originalImage;
});

describe('CameraCapture', () => {
  const defaultProps = {
    onCapture: vi.fn(),
    stepLabel: '测试拍照',
    watermark: {
      time: '2024-12-31 10:30:00',
      location: '成都市武侯区',
      operator: '张三',
      assetCode: 'ZC-2024-00123',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUserMedia.mockResolvedValue({
      getTracks: () => [{ stop: mockStopTrack }],
    });
  });

  it('should render capture button with stepLabel', () => {
    render(<CameraCapture {...defaultProps} />);
    const button = screen.getByRole('button', { name: /拍摄/ });
    expect(button).toBeDefined();
    expect(button.textContent).toContain('测试拍照');
  });

  it('should render the hidden canvas element', () => {
    render(<CameraCapture {...defaultProps} />);
    const canvas = document.querySelector('canvas');
    expect(canvas).toBeDefined();
    expect(canvas?.className).toContain('hidden');
  });

  it('should disable button when disabled prop is true', () => {
    render(<CameraCapture {...defaultProps} disabled={true} />);
    const button = screen.getByRole('button', { name: /拍摄/ });
    expect(button).toBeDisabled();
  });

  it('should show loading state when opening camera', async () => {
    // Make getUserMedia hang to test loading state
    mockGetUserMedia.mockImplementationOnce(() => new Promise(() => {}));

    const user = userEvent.setup();
    render(<CameraCapture {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: /拍摄/ }));
    expect(screen.getByText('正在打开摄像头...')).toBeDefined();
  });

  it('should open camera dialog on button click', async () => {
    const user = userEvent.setup();
    render(<CameraCapture {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: /拍摄/ }));

    // Camera dialog should be open
    await waitFor(() => {
      expect(screen.getByText('正在启动摄像头...')).toBeDefined();
    });
  });

  it('should show error alert when camera permission denied', async () => {
    mockGetUserMedia.mockRejectedValueOnce(new Error('Permission denied'));

    const user = userEvent.setup();
    render(<CameraCapture {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: /拍摄/ }));

    await waitFor(() => {
      expect(screen.getByText(/摄像头权限不足/)).toBeDefined();
    });
  });

  it('should display stepLabel in the dialog title bar', async () => {
    const user = userEvent.setup();
    render(<CameraCapture {...defaultProps} stepLabel="步骤一拍照" />);

    await user.click(screen.getByRole('button', { name: /拍摄/ }));

    await waitFor(() => {
      // stepLabel is displayed in the dialog header
      expect(screen.getByText('步骤一拍照')).toBeDefined();
    });
  });

  it('should display stepHint in the dialog when provided', async () => {
    const user = userEvent.setup();
    render(
      <CameraCapture
        {...defaultProps}
        stepHint="请拍摄资产正面照片"
      />
    );

    await user.click(screen.getByRole('button', { name: /拍摄/ }));

    await waitFor(() => {
      expect(screen.getByText('请拍摄资产正面照片')).toBeDefined();
    });
  });

  it('should call onClose when close button is clicked in dialog', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();

    render(<CameraCapture {...defaultProps} onClose={onClose} />);

    // Open camera
    await user.click(screen.getByRole('button', { name: /拍摄/ }));

    // Find and click close button (the X icon in the dialog header)
    await waitFor(async () => {
      const closeButtons = screen.getAllByRole('button');
      // The first IconButton with CloseIcon - it's the one in the header
      const closeBtn = closeButtons.find(
        (btn) => btn.querySelector('svg[data-testid="CloseIcon"]')
      );
      if (closeBtn) {
        await user.click(closeBtn);
      }
    });

    expect(onClose).toHaveBeenCalled();
  });
});
