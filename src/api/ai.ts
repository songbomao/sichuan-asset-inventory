import client from './client';

/**
 * AI 能力调用层
 * 统一走 /api/Account/UniGetToken 网关（由 client 拦截器自动封装 action + token）。
 * 权限分级由后端按 action 强制，前端仅按 action 名调用：
 *  - RecognizeAsset  requiredLevel = 0（所有人可用）
 *  - DiagnoseDifference / WriteReport  requiredLevel = L1（需管理员，路由层 RequireAdmin 已拦截）
 */

/** 资产识别候选（盘点任务中该位置可能的资产） */
export interface RecognizeAssetCandidate {
  assetCode: string;
  name: string;
  spec: string;
}

/** 资产识别请求 */
export interface RecognizeAssetRequest {
  /** 拍照/相册得到的水印照片 Base64（dataURL） */
  image: string;
  /** 当前盘点位置可能的资产候选列表 */
  candidates: RecognizeAssetCandidate[];
}

/** 资产识别结果 */
export interface RecognizeAssetResult {
  assetCode: string;
  /** 资产名称 */
  name: string;
  spec: string;
  /** 置信度 0~1 */
  confidence: number;
}

/** 差异诊断请求 */
export interface DiagnoseDifferenceRequest {
  taskId: string;
  assetCode: string;
}

/** 差异诊断结果 */
export interface DiagnoseDifferenceResult {
  /** 差异原因 */
  reason: string;
  /** 处理建议 */
  suggestion: string;
  /** 责任人提示 */
  ownerHint: string;
}

/** 报告生成请求 */
export interface WriteReportRequest {
  taskId: string;
}

/** 报告生成结果 */
export interface WriteReportResult {
  /** Markdown 格式盘点汇报正文 */
  markdown: string;
  /** 卡片/摘要文案 */
  actionCardText: string;
}

interface AiResponse<T> {
  code: number;
  data: T;
  message?: string;
  msg?: string;
}

/** 统一解包网关响应 */
function unwrap<T>(resp: { data: AiResponse<T> }): T {
  const { code, data, msg, message } = resp.data;
  if (code === 0 || code === 200) {
    return data;
  }
  throw new Error(msg || message || 'AI 服务调用失败');
}

/**
 * 资产识别：根据照片 + 候选列表识别盘点资产
 * POST action=RecognizeAsset
 */
export async function RecognizeAsset(
  req: RecognizeAssetRequest,
): Promise<RecognizeAssetResult> {
  const resp = await client.post< AiResponse<RecognizeAssetResult>>(
    '/api/Account/Task/RecognizeAsset',
    req,
  );
  return unwrap(resp);
}

/**
 * 差异诊断：对盘点差异给出原因与处理建议
 * GET action=DiagnoseDifference
 */
export async function DiagnoseDifference(
  req: DiagnoseDifferenceRequest,
): Promise<DiagnoseDifferenceResult> {
  const resp = await client.get<AiResponse<DiagnoseDifferenceResult>>(
    '/api/Account/Task/DiagnoseDifference',
    { params: { taskId: req.taskId, assetCode: req.assetCode } },
  );
  return unwrap(resp);
}

/**
 * 报告生成：基于任务生成 Markdown 汇报文案
 * GET action=WriteReport
 */
export async function WriteReport(
  req: WriteReportRequest,
): Promise<WriteReportResult> {
  const resp = await client.get<AiResponse<WriteReportResult>>(
    '/api/Account/Task/WriteReport',
    { params: { taskId: req.taskId } },
  );
  return unwrap(resp);
}
