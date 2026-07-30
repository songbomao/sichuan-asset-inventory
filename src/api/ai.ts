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

/** 资产识别请求（双照片双校验：二维码硬校验 + 正面照软识别） */
export interface RecognizeAssetRequest {
  /** 正面照（实物外观）Base64（dataURL），用于外观识别 */
  image: string;
  /** 当前盘点位置可能的资产候选列表 */
  candidates: RecognizeAssetCandidate[];
  /** 前端 jsQR 从二维码照解码出的固资编号；解码失败传空串 */
  qrAssetCode?: string;
  /** 二维码照 Base64（dataURL），可选，供后端留痕/兜底 */
  qrImage?: string;
  /** 当前盘点资产编号（前端已知），用于与二维码编号硬校验比对 */
  currentAssetCode?: string;
}

/** 资产识别结果（双校验） */
export interface RecognizeAssetResult {
  assetCode: string;
  /** 资产名称 */
  name: string;
  spec: string;
  /** 置信度 0~1（正面照外观识别） */
  confidence: number;
  /** 二维码解码出的编号（回显） */
  qrAssetCode?: string;
  /** 二维码是否成功解码出编号 */
  qrDecoded?: boolean;
  /** 本地表是否存在该编号 */
  qrExists?: boolean;
  /** 硬校验：二维码编号 == 当前盘点资产编号 */
  qrMatched?: boolean;
  /** 置信度是否低于阈值（0.6） */
  lowConfidence?: boolean;
  /** 是否需要人工确认（!qrMatched || lowConfidence） */
  needManualConfirm?: boolean;
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
    // 后端 AI 无密钥时会优雅降级：code=200 但 data=null，附带降级说明文案。
    // 直接返回 null 会导致调用方在 null 上取属性崩溃，故此处抛出后端文案。
    if (data == null) {
      throw new Error(message || msg || 'AI 服务暂不可用，已回退人工流程');
    }
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
