import { describe, it, expect, vi, beforeEach } from 'vitest';
import { submitRecord, getAssetByCode, getMyRecords } from './inventory';

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
    expect(mockPost).toHaveBeenCalledWith('/SaiApi/Task/Submit', validParams);
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
    expect(mockGet).toHaveBeenCalledWith('/SaiApi/Asset/GetByCode', { params: { assetCode: 'ZC-001' } });
  });

  it('should throw error on failure', async () => {
    mockGet.mockResolvedValueOnce({
      data: { code: 404, data: null, message: '资产不存在' },
    });
    await expect(getAssetByCode('NONEXIST')).rejects.toThrow('资产不存在');
  });
});

describe('getMyRecords', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return records list on success', async () => {
    const records = [
      { recordId: 'r1', taskId: 't1', taskName: '任务1', assetCode: 'ZC-001', assetName: '电脑', status: '正常', remark: '', photoUrl: '', createTime: '2024-01-01', location: '成都' },
    ];
    mockGet.mockResolvedValueOnce({
      data: { code: 0, data: records, message: 'ok' },
    });
    const result = await getMyRecords();
    expect(result).toEqual(records);
  });

  it('should throw error on failure', async () => {
    mockGet.mockResolvedValueOnce({
      data: { code: 500, data: null, message: '' },
    });
    await expect(getMyRecords()).rejects.toThrow('获取盘点记录失败');
  });
});
