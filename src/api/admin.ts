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

/** 任务列表响应 */
interface AdminTaskListResponse {
  code: number;
  data: { total: number; page: number; pageSize: number; list: AdminTaskItem[] };
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
    return data.data.list;
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
