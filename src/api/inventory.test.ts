import { describe, it, expect, vi, beforeEach } from 'vitest';
import { submitRecord, getAssetByCode } from './inventory';

vi.mock('./client', () => {
  const mockGet = vi.fn();
  const mockPost = vi.fn();
  return {
    default: { get: mockGet, post: mockPost },
  };
});

import client from './client';

const mockGet = client.get as ReturnType<typeof vi.fn>;
const mockPost = client.post as ReturnType<typeof vi.fn>;

describe('submitRecord', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const validParams = {
    taskId: '1',
    assetCode: 'ZC-001',
    status: '正常',
    remark: '',
    photoUrls: ['data:image/jpeg;base64,...'],
    photoBase64: 'data:image/jpeg;base64,...',
    longitude: '104.0657',
    latitude: '30.6599',
    location: '成都',
    operatorName: '张三',
  };

  it('should return recordId on success', async () => {
    mockPost.mockResolvedValueOnce({
      data: { code: 0, data: { recordId: 'r-123' }, message: 'ok' },
    });
    const result = await submitRecord(validParams);
    expect(result).toBe('r-123');
    expect(mockPost).toHaveBeenCalledWith('/api/Account/Task/Submit', validParams);
  });

  it('should work with code 200 as well', async () => {
    mockPost.mockResolvedValueOnce({
      data: { code: 200, data: { recordId: 'r-456' }, message: 'ok' },
    });
    const result = await submitRecord(validParams);
    expect(result).toBe('r-456');
  });

  it('should throw error on failure', async () => {
    mockPost.mockResolvedValueOnce({
      data: { code: 500, data: null, message: '提交失败' },
    });
    await expect(submitRecord(validParams)).rejects.toThrow('提交失败');
  });

  it('should throw default error message when empty', async () => {
    mockPost.mockResolvedValueOnce({
      data: { code: 500, data: null, message: '' },
    });
    await expect(submitRecord(validParams)).rejects.toThrow('提交盘点记录失败');
  });
});

describe('getAssetByCode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return asset on success', async () => {
    const asset = {
      assetCode: 'ZC-001',
      assetName: '笔记本电脑',
      category: '电子设备',
      location: 'A栋101',
      department: 'IT',
      status: '正常',
    };
    mockGet.mockResolvedValueOnce({
      data: { code: 0, data: asset, message: 'ok' },
    });
    const result = await getAssetByCode('ZC-001');
    expect(result).toEqual(asset);
    expect(mockGet).toHaveBeenCalledWith('/api/Account/Asset/GetByCode', { params: { assetCode: 'ZC-001' } });
  });

  it('should throw error on failure', async () => {
    mockGet.mockResolvedValueOnce({
      data: { code: 404, data: null, message: '资产不存在' },
    });
      await expect(getAssetByCode('NONEXIST')).rejects.toThrow('资产不存在');
  });
});
