import client from './client';

/** 提交盘点记录参数 */
export interface SubmitRecordParams {
  taskId: string;
  assetCode: string;
  status: string;        // 正常 | 待维修 | 报废 | 丢失
  remark: string;
  photoBase64: string;   // 水印照片 Base64
  longitude: string;
  latitude: string;
  location: string;
  operatorName: string;  // 盘点人姓名
}

/** 提交盘点响应 */
interface SubmitRecordResponse {
  code: number;
  data: { recordId: string };
  message: string;
}

/**
 * 提交盘点记录
 * POST /api/Account/Task/Submit
 */
export async function submitRecord(params: SubmitRecordParams): Promise<string> {
  const { data } = await client.post<SubmitRecordResponse>(
    '/api/Account/Task/Submit',
    params,
  );
  if (data.code === 0 || data.code === 200) {
    return data.data.recordId;
  }
  throw new Error(data.message || '提交盘点记录失败');
}

/** 资产查询（按编码） */
interface AssetQueryResponse {
  code: number;
  data: {
    assetCode: string;
    assetName: string;
    category: string;
    location: string;
    department: string;
    status: string;
  };
  message: string;
}

/**
 * 按资产编码查询资产
 * GET /api/Account/Asset/GetByCode?assetCode={code}
 */
export async function getAssetByCode(assetCode: string) {
  const { data } = await client.get<AssetQueryResponse>('/api/Account/Asset/GetByCode', {
    params: { assetCode },
  });
  if (data.code === 0 || data.code === 200) {
    return data.data;
  }
  throw new Error(data.message || '查询资产失败');
}

/** 盘点记录项 */
export interface RecordItem {
  recordId: string;
  taskId: string;
  taskName: string;
  assetCode: string;
  assetName: string;
  status: string;
  remark: string;
  photoUrl: string;
  createTime: string;
  location: string;
}

/** 我的记录响应 */
interface MyRecordsResponse {
  code: number;
  data: RecordItem[];
  message: string;
}

/**
 * 获取我的盘点记录
 * GET /api/Account/Task/GetMyItems
 */
export async function getMyRecords(): Promise<RecordItem[]> {
  const { data } = await client.get<MyRecordsResponse>('/api/Account/Task/GetMyItems');
  if (data.code === 0 || data.code === 200) {
    return data.data;
  }
  throw new Error(data.message || '获取盘点记录失败');
}
