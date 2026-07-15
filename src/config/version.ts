/**
 * 应用版本信息
 * 每次发布前更新：
 *   version: vYYYYMMDDhhmm 格式
 *   releaseNotes: 本次修改内容摘要
 *   releaseTime: 发布时间
 */
export const APP_VERSION = 'v202607151140';
export const APP_NAME = '四川固定资产盘点系统';
export const RELEASE_TIME = '2026-07-15 11:40';
export const RELEASE_NOTES = '初始化项目：钉钉免登 + 水印相机 + 盘点任务';

/** 版本变更历史（最新的放最前面） */
export const VERSION_HISTORY: Array<{
  version: string;
  time: string;
  notes: string;
}> = [
  {
    version: APP_VERSION,
    time: RELEASE_TIME,
    notes: RELEASE_NOTES,
  },
];

/** 在页面 footer 等地方显示 */
export const VERSION_TEXT = `${APP_VERSION} | ${RELEASE_NOTES}`;
