import client from './client';

/** 复盘分配项 */
export interface ReviewAssignment {
  id: number;
  taskId: number;
  recordId: number;
  reviewerName: string;
  reviewerDingtalkId: string;
  status: string; // pending/completed/conflict
  createdAt: string;
}

/** 复盘分配列表响应 */
interface AssignmentsResponse {
  code: number;
  data: ReviewAssignment[];
  message: string;
  msg?: string;
}

/**
 * 获取复盘分配列表
 * GET /api/Account/Review/GetAssignments
 */
export async function getAssignments(taskId: string): Promise<ReviewAssignment[]> {
  const { data } = await client.get<AssignmentsResponse>('/api/Account/Review/GetAssignments', {
    params: { taskId },
  });
  if (data.code === 0 || data.code === 200) {
    return data.data;
  }
  throw new Error(data.msg || data.message || '获取复盘列表失败');
}

/** 自动抽取复盘 */
interface AssignReviewsResponse {
  code: number;
  data: ReviewAssignment[];
  message: string;
  msg?: string;
}

/**
 * 自动抽取复盘清单
 * POST /api/Account/Review/AssignReviews
 */
export async function assignReviews(
  taskId: string,
  ratio: number,
  reviewerNames: string[],
): Promise<ReviewAssignment[]> {
  const { data } = await client.post<AssignReviewsResponse>(
    '/api/Account/Review/AssignReviews',
    { taskId, ratio, reviewerNames },
  );
  if (data.code === 0 || data.code === 200) {
    return data.data;
  }
  throw new Error(data.msg || data.message || '抽取复盘失败');
}

/** 提交复盘参数 */
export interface SubmitReviewParams {
  assignmentId: number;
  assetCode: string;
  status: string;
  remark: string;
  photoBase64: string;
  operatorName: string;
}

/** 提交复盘响应 */
interface SubmitReviewResponse {
  code: number;
  data: {
    assignment: ReviewAssignment;
    reviewRecord: { id: number; status: string };
  };
  message: string;
  msg?: string;
}

/**
 * 提交复盘结果
 * POST /api/Account/Review/SubmitReview
 */
export async function submitReview(
  params: SubmitReviewParams,
): Promise<{ assignment: ReviewAssignment; reviewRecord: { id: number; status: string } }> {
  const { data } = await client.post<SubmitReviewResponse>(
    '/api/Account/Review/SubmitReview',
    params,
  );
  if (data.code === 0 || data.code === 200) {
    return data.data;
  }
  throw new Error(data.msg || data.message || '提交复盘失败');
}