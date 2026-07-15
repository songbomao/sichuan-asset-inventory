/**
 * 应用版本信息
 * 每次发布前更新：
 *   version: vYYYYMMDDhhmm 格式
 *   releaseNotes: 本次修改内容摘要
 *   releaseTime: 发布时间
 */
export const APP_VERSION = 'v202607151230';
export const APP_NAME = '四川固定资产盘点系统';
export const RELEASE_TIME = '2026-07-15 12:30';
export const RELEASE_NOTES = '修复 GitHub Pages 部署：同步 package-lock.json 并设置 GitHub Pages 基础路径';

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
  {
    version: 'v202607151216',
    time: '2026-07-15 12:16',
    notes: '清理仓库：移除误提交的 node_modules/ 和 dist/ 构建产物',
  },
  {
    version: 'v202607151140',
    time: '2026-07-15 11:40',
    notes: '初始化项目：钉钉免登 + 水印相机 + 盘点任务',
  },
];

/** 在页面 footer 等地方显示 */
export const VERSION_TEXT = `${APP_VERSION} | ${RELEASE_NOTES}`;
