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
  inventoryQty?: number; // 盘点数量（可选）
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
  photoUrls?: string[];      // 多图（未来支持；当前后端仅返回单图 photoUrl，抽屉自动退化）
  createTime: string;
  location: string;
  inventoryQty?: number | null; // 盘点数量（可选）
  operatorName?: string;         // 盘点人姓名
  functionStatus?: string;       // 功能状态
  appearanceStatus?: string;     // 外观状态
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

/** 筛选我的盘点记录参数 */
export interface MyRecordsFilterParams {
  page?: number;
  pageSize?: number;
  status?: string;       // 全部时不传
  startTime?: string;    // yyyy-MM-dd
  endTime?: string;      // yyyy-MM-dd
  keyword?: string;      // 资产名称/编码关键字
}

/** 任务盘点记录响应 */
interface TaskRecordsResponse {
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
 * 筛选「我的盘点记录」
 * POST /api/Account/Task/GetMyRecords
 * 与 submitRecord 同模式，交由网关拦截器改写为 UniGetToken + action。
 */
export async function getMyRecordsFiltered(params: MyRecordsFilterParams = {}): Promise<{ total: number; page: number; pageSize: number; list: RecordItem[] }> {
  const { page = 1, pageSize = 50, status, startTime, endTime, keyword } = params;
  const resp = await client.post('/api/Account/Task/GetMyRecords', {
    page,
    pageSize,
    status,
    startTime,
    endTime,
    keyword,
  });
  const data = resp.data as { code: number; data: TaskRecordsResponse['data']; msg: string; message: string };
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

/** 任务盘点记录参数 */
export interface TaskRecordsParams {
  taskId: string;
  page?: number;
  pageSize?: number;
  status?: string;
  keyword?: string;
}

/**
 * 获取某任务下的全部盘点记录（管理员视角，含盘点人）
 * POST /api/Account/Task/GetTaskRecords
 */
export async function getTaskRecords(params: TaskRecordsParams): Promise<{ total: number; page: number; pageSize: number; list: RecordItem[] }> {
  const { taskId, page = 1, pageSize = 50, status, keyword } = params;
  const resp = await client.post('/api/Account/Task/GetTaskRecords', {
    taskId,
    page,
    pageSize,
    status,
    keyword,
  });
  const data = resp.data as { code: number; data: TaskRecordsResponse['data']; msg: string; message: string };
  if (data.code === 0 || data.code === 200) {
    return {
      total: data.data?.total ?? 0,
      page: data.data?.page ?? page,
      pageSize: data.data?.pageSize ?? pageSize,
      list: data.data?.list ?? [],
    };
  }
  throw new Error(data.msg || data.message || '获取任务盘点记录失败');
}

/** 任务盘点记录汇总 */
export interface TaskRecordSummary {
  taskName: string;
  taskStatus?: string;
  deadline?: string;
  createdBy?: string;
  totalAssets: number;          // 任务资产总数
  recordCount: number;          // 已盘点记录数（自盘）
  completionRate: number;       // 完成率 0-100
  byStatus: { status: string; count: number }[];        // 按状态分布
  byOperator: {                                         // 按参与人分布
    userName: string;
    dingtalkUserId: string;
    assetCount: number;
    completedCount: number;
    abnormalCount: number;
  }[];
}

/** 任务记录汇总响应 */
interface TaskRecordSummaryResponse {
  code: number;
  data: TaskRecordSummary;
  message: string;
  msg?: string;
}

/**
 * 获取任务盘点记录汇总统计
 * POST /api/Account/Task/GetTaskRecordSummary
 */
export async function getTaskRecordSummary(taskId: string): Promise<TaskRecordSummary> {
  const resp = await client.post('/api/Account/Task/GetTaskRecordSummary', {
    taskId,
  });
  const data = resp.data as TaskRecordSummaryResponse;
  if (data.code === 0 || data.code === 200) {
    return data.data;
  }
  throw new Error(data.msg || data.message || '获取任务汇总失败');
}
