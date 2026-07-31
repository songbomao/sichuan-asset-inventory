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
  /** 盘亏数量（仅管理员额外展示，普通用户不展示） */
  deficit?: number;
  /** 差异数量（仅管理员额外展示，普通用户不展示） */
  difference?: number;
}

/** 个人维度统计 */
export interface PersonStat {
  name: string;
  completed: number;
}

/** 类别维度统计（全局视图） */
export interface CategoryStat {
  category: string;
  total: number;
  completed: number;
  /** 盘亏数量（仅管理员额外展示，普通用户不展示） */
  deficit?: number;
  /** 差异数量（仅管理员额外展示，普通用户不展示） */
  difference?: number;
}

/** 任务汇总（全局视图，可下钻） */
export interface TaskSummary {
  taskId: string;
  taskName: string;
  totalAssets: number;
  completedCount: number;
  abnormalCount: number;
  completionRate: number;
  status?: string;
}

/** 看板数据 */
export interface DashboardData {
  overall: DashboardOverall;
  deptStats: DeptStat[];
  personStats: PersonStat[];
  /** 视图范围：task=单任务；global=全局（taskId='0'） */
  scope?: 'task' | 'global';
  /** 类别维度（全局视图） */
  categoryStats?: CategoryStat[];
  /** 任务汇总列表（全局视图，可下钻） */
  tasks?: TaskSummary[];
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