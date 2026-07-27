import client from './client';

/** 资产逐项差异明细 */
export interface ReportItem {
  index: number;
  assetCode: string;
  assetName: string;
  categoryName: string;
  bookQty: number;
  actualQty: number;
  /** 实盘 - 账面：>0 盘盈 / <0 盘亏 / 0 平 */
  diffQty: number;
  remark: string;
  status: string;
}

/** 盘点报告数据 */
export interface ReportData {
  taskName: string;
  deadline: string;
  createdBy: string;
  createdAt: string;
  /** 盘点范围文本，如「按部门：XX、YY」 */
  scopeText: string;
  totalAssets: number;
  completedCount: number;
  normalCount: number;
  abnormalCount: number;
  completionRate: number;
  abnormalRate: number;
  abnormalList: Array<{
    assetCode: string;
    status: string;
    remark: string;
    operatorName: string;
    time: string;
  }>;
  review: {
    total: number;
    completed: number;
    conflict: number;
  };
  items: ReportItem[];
}

/** 报告响应 */
interface ReportResponse {
  code: number;
  data: ReportData;
  message: string;
  msg?: string;
}

/**
 * 生成盘点报告
 * GET /api/Account/Task/GenerateReport
 */
export async function generateReport(taskId: string): Promise<ReportData> {
  const { data } = await client.get<ReportResponse>('/api/Account/Task/GenerateReport', {
    params: { taskId },
  });
  if (data.code === 0 || data.code === 200) {
    return data.data;
  }
  throw new Error(data.msg || data.message || '生成报告失败');
}

/** 报告归档条目（含 content 原始 JSON，需前端反序列化为 ReportData） */
export interface ReportArchiveEntry {
  id: string;
  taskId: string;
  taskName: string;
  generatedAt: string;
  generatedBy: string;
  summary: string;
  content: string;
}

/** 报告归档列表响应 */
interface ReportArchiveResponse {
  code: number;
  data: { total: number; list: ReportArchiveEntry[] };
  message: string;
  msg?: string;
}

/**
 * 查询已生成的盘点报告归档（任意登录用户可调用，用于普通用户查看/管理员判断是否需要重新生成）
 * GET /api/Account/Task/GetReportArchive
 */
export async function getReportArchive(taskId: string): Promise<ReportArchiveEntry[]> {
  const { data } = await client.get<ReportArchiveResponse>('/api/Account/Task/GetReportArchive', {
    params: { taskId },
  });
  if (data.code === 0 || data.code === 200) {
    return data.data?.list ?? [];
  }
  throw new Error(data.msg || data.message || '查询报告失败');
}

/** 资产全生命周期 */
export interface LifecycleData {
  assetCode: string;
  assetName: string;
  categoryName: string;
  purchaseDate: string;
  /** 视图返回字符串，兼容 number */
  originalValue: number | string | null;
  /** 视图返回字符串，兼容 number */
  netValue: number | string | null;
  userName: string;
  costCenter: string;
  costCenterName?: string;
  deptName?: string;
  department?: string;
  profitCenterName?: string;
  supplierName?: string;
  manufacturer?: string;
  standard?: string;
  companyName?: string;
  location: string;
  currentStatus: string;
  records: Array<{
    id: number;
    createdAt: string;
    status: string;
    operatorName: string;
    photoUrl: string;
    operatorType: string;
    statusText: string;
  }>;
}

/** 生命周期响应 */
interface LifecycleResponse {
  code: number;
  data: LifecycleData;
  message: string;
  msg?: string;
}

/**
 * 获取资产全生命周期
 * GET /api/Account/Asset/GetLifecycle
 */
export async function getLifecycle(assetCode: string): Promise<LifecycleData> {
  const { data } = await client.get<LifecycleResponse>('/api/Account/Asset/GetLifecycle', {
    params: { assetCode },
  });
  if (data.code === 0 || data.code === 200) {
    return data.data;
  }
  throw new Error(data.msg || data.message || '查询生命周期失败');
}

/** 报废扫描响应 */
interface ScanScrapResponse {
  code: number;
  data: { count: number; assets: Array<{ assetCode: string; assetName: string; purchaseDate: string }> };
  message: string;
  msg?: string;
}

/**
 * 月度报废扫描
 * POST /api/Account/Asset/ScanScrap
 */
export async function scanScrap(): Promise<{ count: number; assets: Array<{ assetCode: string; assetName: string; purchaseDate: string }> }> {
  const { data } = await client.post<ScanScrapResponse>('/api/Account/Asset/ScanScrap');
  if (data.code === 0 || data.code === 200) {
    return data.data;
  }
  throw new Error(data.msg || data.message || '报废扫描失败');
}