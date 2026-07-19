import client from './client';

/** 盘点任务项 */
export interface TaskItem {
  taskId: string;
  taskName: string;
  assetCount: number;
  completedCount: number;
  deadline: string;
  status: string;
  createTime: string;
  location: string;
}

/** 任务列表响应 */
interface TaskListResponse {
  code: number;
  data: TaskItem[] | { total: number; page: number; pageSize: number; list: TaskItem[] };
  message: string;
  msg?: string;
}

/**
 * 获取盘点任务列表
 * POST /api/Account/UniGetToken { action: "GetTaskList" }
 */
export async function getTaskList(): Promise<TaskItem[]> {
  const resp = await client.post('/api/Account/UniGetToken', {
    action: 'GetTaskList',
  });
  const data = resp.data as { code: number; data: { total: number; page: number; pageSize: number; list: TaskItem[] }; msg: string; message: string };
  if (data.code === 0 || data.code === 200) {
    return data.data?.list ?? [];
  }
  throw new Error(data.msg || data.message || '获取任务列表失败');
}

/** 任务详情中的资产项 */
export interface AssetInfo {
  assetCode: string;
  assetName: string;
  category: string;
  location: string;
  department: string;
  status: string;
  imageUrl: string;
}

/** 任务详情响应 */
interface TaskDetailResponse {
  code: number;
  data: {
    taskId: string;
    taskName: string;
    assets: AssetInfo[];
    completedCodes: string[];
  };
  message: string;
  msg?: string;
}

/**
 * 获取任务详情（含资产列表）
 * GET /api/Account/Task/GetTaskDetail?taskId={id}
 */
export async function getTaskDetail(taskId: string): Promise<{
  taskId: string;
  taskName: string;
  assets: AssetInfo[];
  completedCodes: string[];
}> {
  const { data } = await client.get<TaskDetailResponse>('/api/Account/Task/GetTaskDetail', {
    params: { taskId },
  });
  if (data.code === 0 || data.code === 200) {
    return data.data;
  }
  throw new Error(data.msg || data.message || '获取任务详情失败');
}

/** 盘点进度响应 */
interface ProgressResponse {
  code: number;
  data: {
    total: number;
    completed: number;
    percentage: number;
  };
  message: string;
  msg?: string;
}

/**
 * 获取盘点进度
 * GET /api/Account/Task/GetProgress?taskId={id}
 */
export async function getProgress(taskId: string): Promise<{
  total: number;
  completed: number;
  percentage: number;
}> {
  const { data } = await client.get<ProgressResponse>('/api/Account/Task/GetProgress', {
    params: { taskId },
  });
  if (data.code === 0 || data.code === 200) {
    return data.data;
  }
  throw new Error(data.msg || data.message || '获取进度失败');
}
