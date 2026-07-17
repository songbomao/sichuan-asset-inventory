import client from './client';

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
}

/**
 * 创建盘点任务
 * POST /SaiApi/Task/Create
 */
export async function createTask(params: CreateTaskParams): Promise<{ Id: number; TaskName: string; Status: string }> {
  const { data } = await client.post<CreateTaskResponse>('/SaiApi/Task/Create', params);
  if (data.code === 0 || data.code === 200) {
    return data.data;
  }
  throw new Error(data.message || '创建任务失败');
}

/** 启动任务响应 */
interface StartTaskResponse {
  code: number;
  data: unknown;
  message: string;
}

/**
 * 启动盘点任务
 * POST /SaiApi/Task/Start
 */
export async function startTask(taskId: number): Promise<void> {
  const { data } = await client.post<StartTaskResponse>('/SaiApi/Task/Start', { taskId });
  if (data.code !== 0 && data.code !== 200) {
    throw new Error(data.message || '启动任务失败');
  }
}

/** 后端任务列表返回的原始字段 */
export interface AdminTaskItem {
  Id: number;
  TaskName: string;
  ScopeType: string;
  ScopeConfig: string;
  NeedReview: boolean;
  ReviewRatio: number | null;
  Deadline: string | null;
  Status: string;
  CreatedBy: string;
  CreatedAt: string;
}

/** 任务列表响应 */
interface AdminTaskListResponse {
  code: number;
  data: { total: number; page: number; pageSize: number; list: AdminTaskItem[] };
  message: string;
}

/**
 * 获取全部任务列表（管理员视图）
 * GET /SaiApi/Task/GetList?status=&page=1&pageSize=50
 */
export async function getAdminTaskList(status?: string): Promise<AdminTaskItem[]> {
  const { data } = await client.get<AdminTaskListResponse>('/SaiApi/Task/GetList', {
    params: { status: status ?? '', page: 1, pageSize: 50 },
  });
  if (data.code === 0 || data.code === 200) {
    return data.data.list;
  }
  throw new Error(data.message || '获取任务列表失败');
}

/* ---- 管理员列表管理（localStorage） ---- */

const ADMIN_STORAGE_KEY = 'admin_users';

export interface AdminUser {
  /** 钉钉 userid */
  dingtalkUserId: string;
  /** 显示名称 */
  name: string;
}

/** 读取管理员列表 */
export function getAdminUsers(): AdminUser[] {
  try {
    const raw = localStorage.getItem(ADMIN_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** 保存管理员列表 */
export function setAdminUsers(users: AdminUser[]): void {
  localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(users));
}

/** 判断当前用户是否为管理员 */
export function isAdmin(currentDingtalkUserId?: string): boolean {
  if (!currentDingtalkUserId) return false;
  const admins = getAdminUsers();
  return admins.some((a) => a.dingtalkUserId === currentDingtalkUserId);
}