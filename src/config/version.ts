/**
 * 应用版本信息
 * 每次发布前更新：
 *   version: vYYYYMMDDhhmm 格式
 *   releaseNotes: 本次修改内容摘要
 *   releaseTime: 发布时间
 */
export const APP_VERSION = 'v202607181220';
export const APP_NAME = '蜀资点兵';
export const RELEASE_TIME = '2026-07-18 12:20';
export const RELEASE_NOTES = '对齐后端 API 路由 + 加 operatorName 参数';

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
    version: 'v202607180010',
    time: '2026-07-18 00:10',
    notes: '修复退出登录后自动重登：加 logout_flag 拦截',
  },
  {
    version: 'v202607180000',
    time: '2026-07-18 00:00',
    notes: '弹窗布局重写 + Profile 补全信息',
  },
  {
    version: 'v202607172357',
    time: '2026-07-17 23:57',
    notes: '移动端弹窗适配修复',
  },
  {
    version: 'v202607172340',
    time: '2026-07-17 23:40',
    notes: '新增管理员模块：管理员配置 + 任务下发',
  },
  {
    version: 'v202607172330',
    time: '2026-07-17 23:30',
    notes: '品牌更名：蜀资点兵 + V2免登接口升级',
  },
  {
    version: 'v202607172200',
    time: '2026-07-17 22:00',
    notes: '新建钉钉H5应用 + 更新凭证 + 绕过WAF OPTIONS预检',
  },
  {
    version: 'v202607151739',
    time: '2026-07-15 17:39',
    notes: '钉钉免登端到端修复：UniSaiAuth路由 + CORS + env.production API地址',
  },
  {
    version: 'v202607151655',
    time: '2026-07-15 16:55',
    notes: '修复钉钉免登：显式导入 dingtalk-jsapi 并挂载 window.dd',
  },
  {
    version: 'v202607151629',
    time: '2026-07-15 16:29',
    notes: '登录页面底部显示版本号方便核对部署版本',
  },
  {
    version: 'v202607151405',
    time: '2026-07-15 14:05',
    notes: 'GitHub Pages 构建源已切换为 GitHub Actions，验证部署',
  },
  {
    version: 'v202607151401',
    time: '2026-07-15 14:01',
    notes: '触发 GitHub Actions 重跑以验证 Pages 部署',
  },
  {
    version: 'v202607151243',
    time: '2026-07-15 12:43',
    notes: '自动启用 GitHub Pages：workflow 增加 enablement: true',
  },
  {
    version: 'v202607151230',
    time: '2026-07-15 12:30',
    notes: '修复 GitHub Pages 部署：同步 package-lock.json 并设置 GitHub Pages 基础路径',
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
