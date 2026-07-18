import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getTaskList, getTaskDetail, getProgress } from './tasks';

// Mock the axios client
vi.mock('./client', () => {
  const mockGet = vi.fn();
  return {
    default: { get: mockGet },
  };
});

import client from './client';

const mockGet = client.get as ReturnType<typeof vi.fn>;

describe('getTaskList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return task list on success (code 0)', async () => {
    const tasks = [
      { taskId: '1', taskName: '任务1', assetCount: 10, completedCount: 3, deadline: '2024-12-31', status: 'in_progress', createTime: '2024-01-01', location: '成都' },
    ];
    mockGet.mockResolvedValueOnce({
      data: { code: 0, data: tasks, message: 'ok' },
    });
    const result = await getTaskList();
    expect(result).toEqual(tasks);
    expect(mockGet).toHaveBeenCalledWith('/api/Account/Task/GetList');
  });

  it('should return task list on success (code 200)', async () => {
    const tasks: import('./tasks').TaskItem[] = [];
    mockGet.mockResolvedValueOnce({
      data: { code: 200, data: tasks, message: 'ok' },
    });
    const result = await getTaskList();
    expect(result).toEqual(tasks);
  });

  it('should throw error on failure code', async () => {
    mockGet.mockResolvedValueOnce({
      data: { code: 500, data: null, message: '服务器错误' },
    });
    await expect(getTaskList()).rejects.toThrow('服务器错误');
  });

  it('should throw default error when no message', async () => {
    mockGet.mockResolvedValueOnce({
      data: { code: 500, data: null, message: '' },
    });
    await expect(getTaskList()).rejects.toThrow('获取任务列表失败');
  });

  it('should throw on network error', async () => {
    mockGet.mockRejectedValueOnce(new Error('Network Error'));
    await expect(getTaskList()).rejects.toThrow('Network Error');
  });
});

describe('getTaskDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return task detail on success', async () => {
    const detail = {
      taskId: '1',
      taskName: '任务1',
      assets: [{ assetCode: 'ZC-001', assetName: '电脑', category: '电子设备', location: 'A栋', department: 'IT', status: '正常', imageUrl: '' }],
      completedCodes: ['ZC-001'],
    };
    mockGet.mockResolvedValueOnce({
      data: { code: 0, data: detail, message: 'ok' },
    });
    const result = await getTaskDetail('1');
    expect(result).toEqual(detail);
    expect(mockGet).toHaveBeenCalledWith('/api/Account/Task/GetTaskDetail', { params: { taskId: '1' } });
  });

  it('should throw error on failure', async () => {
    mockGet.mockResolvedValueOnce({
      data: { code: 404, data: null, message: '任务不存在' },
    });
    await expect(getTaskDetail('999')).rejects.toThrow('任务不存在');
  });
});

describe('getProgress', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return progress on success', async () => {
    const progress = { total: 10, completed: 5, percentage: 50 };
    mockGet.mockResolvedValueOnce({
      data: { code: 0, data: progress, message: 'ok' },
    });
    const result = await getProgress('1');
    expect(result).toEqual(progress);
    expect(mockGet).toHaveBeenCalledWith('/api/Account/Task/GetProgress', { params: { taskId: '1' } });
  });

  it('should throw error on failure', async () => {
    mockGet.mockResolvedValueOnce({
      data: { code: 500, data: null, message: '' },
    });
    await expect(getProgress('1')).rejects.toThrow('获取进度失败');
  });
});
