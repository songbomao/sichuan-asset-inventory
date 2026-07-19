import client from './client';

/** 看板整体统计 */
export interface DashboardOverall {
  totalAssets: number;
  completedCount: number;
  abnormalCount: number;
  completionRate: number;
}

/** 部门维度统计 */
export interface DeptStat {
  department: string;
  total: number;
  completed: number;
}

/** 个人维度统计 */
export interface PersonStat {
  name: string;
  completed: number;
}

/** 看板数据 */
export interface DashboardData {
  overall: DashboardOverall;
  deptStats: DeptStat[];
  personStats: PersonStat[];
}

/** 看板响应 */
interface DashboardResponse {
  code: number;
  data: DashboardData;
  message: string;
  msg?: string;
}

/**
 * 获取进度看板数据
 * GET /api/Account/Task/GetDashboard
 */
export async function getDashboard(taskId: string): Promise<DashboardData> {
  const { data } = await client.get<DashboardResponse>('/api/Account/Task/GetDashboard', {
    params: { taskId },
  });
  if (data.code === 0 || data.code === 200) {
    return data.data;
  }
  throw new Error(data.msg || data.message || '获取看板数据失败');
}