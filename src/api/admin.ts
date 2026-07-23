import client from './client';

/* ============================================================
 * 盘点任务（后端网关 action，已在网关层做管理员门控）
 * ============================================================ */

/** 创建任务参数 */
export interface CreateTaskParams {
  TaskName: string;
  ScopeType: string;
  ScopeConfig?: string;
  NeedReview?: boolean;
  ReviewRatio?: number;
  Deadline?: string;
  CreatedBy?: string;
}

/** 创建任务响应 */
interface CreateTaskResponse {
  code: number;
  data: { Id: number; TaskName: string; Status: string };
  message: string;
  msg?: string;
}

/**
 * 创建盘点任务（仅管理员）
 * POST /api/Account/UniGetToken/CreateTask
 */
export async function createTask(params: CreateTaskParams): Promise<{ Id: number; TaskName: string; Status: string }> {
  const { data } = await client.post<CreateTaskResponse>('/api/Account/UniGetToken', {
    action: 'CreateTask',
    ...params,
  });
  if (data.code === 0 || data.code === 200) {
    return data.data;
  }
  throw new Error(data.msg || data.message || '创建任务失败');
}

/** 启动任务响应 */
interface StartTaskResponse {
  code: number;
  data: unknown;
  message: string;
  msg?: string;
}

/**
 * 启动盘点任务（仅管理员）
 * POST /api/Account/UniGetToken/StartTask
 */
export async function startTask(taskId: number): Promise<void> {
  const { data } = await client.post<StartTaskResponse>('/api/Account/UniGetToken', {
    action: 'StartTask',
    taskId,
  });
  if (data.code !== 0 && data.code !== 200) {
    throw new Error(data.msg || data.message || '启动任务失败');
  }
}

/** 后端任务列表返回的原始字段（camelCase） */
export interface AdminTaskItem {
  id: number;
  taskName: string;
  scopeType: string;
  scopeConfig: string;
  needReview: boolean;
  reviewRatio: number | null;
  deadline: string | null;
  status: string;
  createdBy: string;
  createdAt: string;
}

/** 后端 GetTaskList 实际返回的原始字段（带 taskId / createTime 等） */
interface RawAdminTaskItem {
  taskId: string;
  taskName: string;
  assetCount?: number;
  completedCount?: number;
  deadline?: string | null;
  status: string;
  createTime?: string;
  location?: string;
  createdBy?: string;
  scopeType?: string;
  scopeConfig?: string;
  needReview?: boolean;
  reviewRatio?: number | null;
}

/** 任务列表响应 */
interface AdminTaskListResponse {
  code: number;
  data: { total: number; page: number; pageSize: number; list: RawAdminTaskItem[] };
  message: string;
  msg?: string;
}

/**
 * 获取全部任务列表（管理员视图）
 * GET /api/Account/Task/GetTaskList
 */
export async function getAdminTaskList(status?: string): Promise<AdminTaskItem[]> {
  const { data } = await client.get<AdminTaskListResponse>('/api/Account/Task/GetTaskList', {
    params: { status: status ?? '', page: 1, pageSize: 50 },
  });
  if (data.code === 0 || data.code === 200) {
    return data.data.list.map((item) => ({
      id: parseInt(item.taskId, 10),
      taskName: item.taskName,
      scopeType: item.scopeType ?? '',
      scopeConfig: item.scopeConfig ?? '',
      needReview: item.needReview ?? false,
      reviewRatio: item.reviewRatio ?? null,
      deadline: item.deadline ?? null,
      status: item.status,
      createdBy: item.createdBy ?? '',
      createdAt: item.createTime ?? '',
    }));
  }
  throw new Error(data.msg || data.message || '获取任务列表失败');
}

/* ============================================================
 * 管理员权限（后端 sai_db.sai_admin_users）
 * ============================================================ */

/** 当前用户的权限信息 */
export interface AdminInfo {
  isAdmin: boolean;
  isSuper: boolean;
  /** 系统是否尚未初始化任何管理员（用于展示"一键初始化超级管理员"） */
  hasAnyAdmin: boolean;
}

/**
 * 获取当前登录用户的权限信息
 * GET /api/Account/UniGetToken/GetAdminInfo
 */
export async function getAdminInfo(): Promise<AdminInfo> {
  const { data } = await client.get<{ code: number; data: AdminInfo; msg?: string; message?: string }>(
    '/api/Account/UniGetToken',
    { params: { action: 'GetAdminInfo' } },
  );
  if (data.code === 0 || data.code === 200) return data.data;
  throw new Error(data.msg || data.message || '获取权限信息失败');
}

/** 管理员用户 */
export interface AdminUser {
  dingtalkUserId: string;
  name: string;
  department?: string;
  phone?: string;
  isSuper: boolean;
}

/**
 * 获取管理员列表（仅超级管理员）
 * GET /api/Account/UniGetToken/GetAdminList
 */
export async function getAdminList(): Promise<AdminUser[]> {
  const { data } = await client.get<{ code: number; data: AdminUser[]; msg?: string; message?: string }>(
    '/api/Account/UniGetToken',
    { params: { action: 'GetAdminList' } },
  );
  if (data.code === 0 || data.code === 200) return data.data || [];
  throw new Error(data.msg || data.message || '获取管理员列表失败');
}

/** 添加/更新管理员参数 */
export interface AddAdminParams {
  dingtalkUserId: string;
  name: string;
  department?: string;
  mobile?: string;
  isSuper: boolean;
}

/**
 * 添加或更新管理员（仅超级管理员）
 * POST /api/Account/UniGetToken/AddAdmin
 */
export async function addAdmin(params: AddAdminParams): Promise<void> {
  const { data } = await client.post<{ code: number; msg?: string; message?: string }>(
    '/api/Account/UniGetToken',
    { action: 'AddAdmin', ...params },
  );
  if (data.code !== 0 && data.code !== 200) {
    throw new Error(data.msg || data.message || '添加管理员失败');
  }
}

/**
 * 删除管理员（仅超级管理员）
 * POST /api/Account/UniGetToken/RemoveAdmin
 */
export async function removeAdmin(dingtalkUserId: string): Promise<void> {
  const { data } = await client.post<{ code: number; msg?: string; message?: string }>(
    '/api/Account/UniGetToken',
    { action: 'RemoveAdmin', dingtalkUserId },
  );
  if (data.code !== 0 && data.code !== 200) {
    throw new Error(data.msg || data.message || '删除管理员失败');
  }
}

/**
 * 初始化超级管理员（仅当系统尚无任何管理员时可用）
 * POST /api/Account/UniGetToken/BootstrapSuperAdmin
 */
export async function bootstrapSuperAdmin(): Promise<void> {
  const { data } = await client.post<{ code: number; msg?: string; message?: string }>(
    '/api/Account/UniGetToken',
    { action: 'BootstrapSuperAdmin' },
  );
  if (data.code !== 0 && data.code !== 200) {
    throw new Error(data.msg || data.message || '初始化失败');
  }
}

/* ============================================================
 * 钉钉搜索用户（用于添加管理员时选人）
 * ============================================================ */

/** 钉钉搜索用户结果 */
export interface DingtalkSearchUser {
  userId: string;
  name: string;
  department?: string;
  /** 手机号 */
  mobile?: string;
}

/**
 * 搜索钉钉用户（按姓名）
 * POST /api/Account/UniGetToken/SearchDingtalkUsers
 */
export async function searchDingtalkUsers(keyword: string): Promise<DingtalkSearchUser[]> {
  const { data } = await client.post<{ code: number; data: DingtalkSearchUser[]; message: string; msg?: string }>(
    '/api/Account/UniGetToken',
    { action: 'SearchDingtalkUsers', keyword },
  );
  if (data.code === 0 || data.code === 200) {
    return data.data || [];
  }
  throw new Error(data.msg || data.message || '搜索用户失败');
}

/* ============================================================
 * 后端驱动的钉钉组织架构（自定义选人，替代 complexPicker）
 * ============================================================ */

/** 钉钉部门树节点（递归） */
export interface DingtalkDepartmentNode {
  deptId: number;
  name: string;
  parentId: number;
  children: DingtalkDepartmentNode[];
}

/**
 * 获取钉钉部门树（后端代理，避免 complexPicker 在 iOS 容器报 invalid corpId）
 * POST /api/Account/UniGetToken
 */
export async function getDingtalkDepartments(): Promise<DingtalkDepartmentNode[]> {
  const { data } = await client.post<{ code: number; data: DingtalkDepartmentNode[]; msg?: string; message?: string }>(
    '/api/Account/UniGetToken',
    { action: 'GetDingtalkDepartments' },
  );
  if (data.code === 0 || data.code === 200) return data.data || [];
  throw new Error(data.msg || data.message || '获取部门架构失败');
}

/**
 * 获取部门下的用户列表（后端代理）
 * POST /api/Account/UniGetToken
 */
export async function getDingtalkDepartmentUsers(
  deptId: number,
  recursive = false,
): Promise<DingtalkSearchUser[]> {
  const { data } = await client.post<{ code: number; data: DingtalkSearchUser[]; msg?: string; message?: string }>(
    '/api/Account/UniGetToken',
    { action: 'GetDingtalkDepartmentUsers', deptId, recursive },
  );
  if (data.code === 0 || data.code === 200) return data.data || [];
  throw new Error(data.msg || data.message || '获取部门用户失败');
}

/** 钉钉直接子部门 */
export interface DingtalkSubDepartment {
  deptId: number;
  name: string;
  parentId: number;
}

/**
 * 获取指定部门的直接子部门（懒加载，配合部门树逐级下钻）
 * POST /api/Account/UniGetToken
 */
export async function getDingtalkSubDepartments(deptId: number): Promise<DingtalkSubDepartment[]> {
  const { data } = await client.post<{ code: number; data: DingtalkSubDepartment[]; msg?: string; message?: string }>(
    '/api/Account/UniGetToken',
    { action: 'GetDingtalkSubDepartments', deptId },
  );
  if (data.code === 0 || data.code === 200) return data.data || [];
  throw new Error(data.msg || data.message || '获取子部门失败');
}

/* ============================================================
 * 后端版本号（用于管理员页前后端版本对照）
 * ============================================================ */

export interface ServerVersion {
  version: string;
  releaseTime: string;
  releaseNotes: string;
}

/** 获取后端服务版本号（走统一网关 UniGetToken，后端 HandleApiGateway 的 GetVersion case 已支持） */
export async function getServerVersion(): Promise<ServerVersion> {
  const res = await client.post('/api/Account/UniGetToken', { action: 'GetVersion' });
  const payload = (res.data && res.data.data) ? res.data.data : res.data;
  return {
    version: payload?.appVersion ?? '',
    releaseTime: payload?.releaseTime ?? '',
    releaseNotes: payload?.releaseNotes ?? '',
  };
}

/* ============================================================
 * 固定资产对比与同步（仅管理员）
 * 后端网关 action，沿用统一 UniGetToken 网关 + _token 机制
 * ============================================================ */

/** 本地资产表（sai_assets）单条记录 */
export interface AssetTableItem {
  assetCode: string;
  assetName: string;
  categoryName: string;
  useStatus: string;
  /** 原值（可能为空） */
  originalValue: string | number | null;
  /** 净值（可能为空） */
  netValue: string | number | null;
  deptName?: string;
  companyName?: string;
  standard?: string;
}

/** 资产表分页结果 */
export interface AssetTableResult {
  total: number;
  page: number;
  pageSize: number;
  list: AssetTableItem[];
}

/**
 * 读取本地资产表（分页 + 关键字搜索）
 * POST /api/Account/UniGetToken/GetAssetTable
 */
export async function getAssetTable(params: {
  keyword?: string;
  page: number;
  pageSize: number;
}): Promise<AssetTableResult> {
  const { data } = await client.post<{ code: number; data: AssetTableResult; msg?: string; message?: string }>(
    '/api/Account/UniGetToken',
    {
      action: 'GetAssetTable',
      keyword: params.keyword ?? '',
      page: params.page,
      pageSize: params.pageSize,
    },
  );
  if (data.code === 0 || data.code === 200) return data.data;
  throw new Error(data.msg || data.message || '获取资产表失败');
}

/** 单条差异字段 */
export interface AssetDiffField {
  field: string;
  tableValue: string | number | null;
  viewValue: string | number | null;
}

/** 字段不一致的对照记录 */
export interface AssetDiffItem {
  assetCode: string;
  assetName: string;
  diffs: AssetDiffField[];
}

/** 差异对比结果 */
export interface CompareAssetsResult {
  onlyInTable: { assetCode: string; assetName: string }[];
  onlyInView: { assetCode: string; assetName: string }[];
  different: AssetDiffItem[];
  summary: {
    localCount: number;
    viewCount: number;
    onlyInTableCount: number;
    onlyInViewCount: number;
    differentCount: number;
  };
}

/**
 * 本地表 vs SAP 视图 差异对比
 * POST /api/Account/UniGetToken/CompareAssets
 */
export async function compareAssets(): Promise<CompareAssetsResult> {
  const { data } = await client.post<{ code: number; data: CompareAssetsResult; msg?: string; message?: string }>(
    '/api/Account/UniGetToken',
    { action: 'CompareAssets' },
    { timeout: 120000 },
  );
  if (data.code === 0 || data.code === 200) return data.data;
  throw new Error(data.msg || data.message || '差异对比失败');
}

/** 单条同步明细 */
export interface SyncDetail {
  assetCode: string;
  changeType: 'insert' | 'update' | 'delete' | string;
}

/** 同步预览结果 */
export interface PreviewSyncResult {
  toInsert: unknown[];
  toUpdate: unknown[];
  toDelete: unknown[];
  details: SyncDetail[];
  summary: {
    insertCount: number;
    updateCount: number;
    deleteCount: number;
  };
}

/**
 * 视图 → 本地表 同步预览（不落库）
 * POST /api/Account/UniGetToken/PreviewSyncAssets
 */
export async function previewSyncAssets(): Promise<PreviewSyncResult> {
  const { data } = await client.post<{ code: number; data: PreviewSyncResult; msg?: string; message?: string }>(
    '/api/Account/UniGetToken',
    { action: 'PreviewSyncAssets' },
    { timeout: 120000 },
  );
  if (data.code === 0 || data.code === 200) return data.data;
  throw new Error(data.msg || data.message || '同步预览失败');
}

/** 执行同步结果 */
export interface SyncAssetsResult {
  inserted: number;
  updated: number;
  deleted: number;
  success: boolean;
  message: string;
}

/**
 * 执行同步（视图 → 本地表，覆盖本地快照）
 * POST /api/Account/UniGetToken/SyncAssets
 */
export async function syncAssets(): Promise<SyncAssetsResult> {
  const { data } = await client.post<{ code: number; data: SyncAssetsResult; msg?: string; message?: string }>(
    '/api/Account/UniGetToken',
    { action: 'SyncAssets' },
    { timeout: 180000 },
  );
  if (data.code === 0 || data.code === 200) return data.data;
  throw new Error(data.msg || data.message || '同步失败');
}
