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
  msg?: string;
}

/**
 * 提交盘点记录
 * POST /api/Account/Task/Submit
 */
export async function submitRecord(params: SubmitRecordParams): Promise<string> {
  const { data } = await client.post<SubmitRecordResponse>(
    '/api/Account/Task/SubmitRecord',
    params,
  );
  if (data.code === 0 || data.code === 200) {
    return data.data.recordId;
  }
  throw new Error(data.msg || data.message || '提交盘点记录失败');
}

/** 资产完整详情（映射后端 SapAssetView / sai_assets 同构结构） */
export interface AssetDetail {
  id?: string;
  systemId?: string;
  companyCode?: string;
  companyName?: string;
  profitsGroupCode?: string;
  profitsGroupName?: string;
  accountYear?: string;
  assetType?: string;
  assetTypeName?: string;
  mainAssetCode?: string;
  oldAssetsCardCode?: string;
  createDate?: string;
  assetCode: string;
  assetName: string;
  parentAsset?: string;
  unit?: string;
  categoryCode?: string;
  categoryName?: string;
  assetsSubject?: string;
  assetsNode?: string;
  assetsPoint?: string;
  standard?: string;
  abcType?: string;
  workcostType?: string;
  costCenterCode?: string;
  costCenterName?: string;
  costCenter?: string;
  deptCode?: string;
  deptName?: string;
  location?: string;
  wbs?: string;
  assetsRelegation?: string;
  specialtyRelegation?: string;
  assetsNature?: string;
  useStatus?: string;
  planUsePeriod?: string;
  purchaseDate?: string;
  leaveUsePeriod?: string;
  licenceNumber?: string;
  isOverAge?: string;
  zexp?: string;
  remark?: string;
  menge?: string;
  originalValue?: string;
  accDepreciation?: string;
  netValue?: string;
  lostValue?: string;
  newnessRate?: string;
  provinceCode?: string;
  profitCenterCode?: string;
  profitCenterName?: string;
  assetsSeCode?: string;
  supplierCode?: string;
  supplierName?: string;
  userName?: string;
  manufacturer?: string;
  itemNumber?: string;
  increaseReson?: string;
  depreciationKey?: string;
  subjectMatterCode?: string;
  contractCode?: string;
}

/** 资产查询（按编码） */
interface AssetQueryResponse {
  code: number;
  data: AssetDetail;
  message: string;
  msg?: string;
}

/**
 * 按资产编码查询资产
 * GET /api/Account/Asset/GetByCode?assetCode={code}
 */
export async function getAssetByCode(assetCode: string): Promise<AssetDetail> {
  const { data } = await client.get<AssetQueryResponse>('/api/Account/Asset/GetAssetByCode', {
    params: { assetCode },
  });
  if (data.code === 0 || data.code === 200) {
    return data.data;
  }
  throw new Error(data.msg || data.message || '查询资产失败');
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

/** 我的记录响应（支持分页） */
interface MyRecordsResponse {
  code: number;
  data: {
    total: number;
    page: number;
    pageSize: number;
    list: RecordItem[];
  };
  message: string;
  msg?: string;
}

/**
 * 获取我的盘点记录
 * POST /api/Account/UniGetToken { action: "GetMyItems", page, pageSize }
 * 与 getTaskList 完全一致的 POST body 调用方式，钉钉 WebView 中更稳定
 */
export async function getMyRecords(page = 1, pageSize = 50): Promise<{ total: number; page: number; pageSize: number; list: RecordItem[] }> {
  const resp = await client.post('/api/Account/UniGetToken', {
    action: 'GetMyItems',
    page,
    pageSize,
  });
  const data = resp.data as { code: number; data: { total: number; page: number; pageSize: number; list: RecordItem[] }; msg: string; message: string };
  if (data.code === 0 || data.code === 200) {
    return {
      total: data.data?.total ?? 0,
      page: data.data?.page ?? page,
      pageSize: data.data?.pageSize ?? pageSize,
      list: data.data?.list ?? [],
    };
  }
  throw new Error(data.msg || data.message || '获取盘点记录失败');
}

/**
 * 获取单条盘点记录详情（含照片）
 * POST /api/Account/UniGetToken { action: "GetRecordDetail", recordId }
 */
export async function getRecordDetail(recordId: string): Promise<RecordItem> {
  const resp = await client.post('/api/Account/UniGetToken', {
    action: 'GetRecordDetail',
    recordId,
  });
  const data = resp.data as { code: number; data: RecordItem; msg: string; message: string };
  if (data.code === 0 || data.code === 200) {
    return data.data;
  }
  throw new Error(data.msg || data.message || '获取记录详情失败');
}
