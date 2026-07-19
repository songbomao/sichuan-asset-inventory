/**
 * 应用版本信息
 * 每次发布前更新：
 *   version: vYYYYMMDDhhmm 格式
 *   releaseNotes: 本次修改内容摘要
 *   releaseTime: 发布时间
 */
export const APP_VERSION = 'v202607192032';
export const APP_NAME = '蜀资点兵';
export const RELEASE_TIME = '2026-07-19 20:32';
export const RELEASE_NOTES = '修复：连续盘点提交后照片/备注/状态未清空，导致上一个资产照片残留到下一个资产；在提交成功分支显式重置表单（照片、备注、状态、水印时间）。';

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
    version: 'v202607191943',
    time: '2026-07-19 19:43',
    notes: '修复：1) 钉钉JSAPI鉴权+定位逆地理编码，彻底修复水印经纬度；2) 记录详情展示照片；3) 任务管理卡片字段对齐；4) 管理员配置支持钉钉组织架构选择（带部门名）；5) 盘点重复提交按操作人判定',
  },
  {
    version: 'v202607191429',
    time: '2026-07-19 15:01',
    notes: '对齐后端 v202607191429：盘点位置逆地理编码显示具体地址',
  },
  {
    version: 'v202607191350',
    time: '2026-07-19 13:50',
    notes: '修复：盘点提交 POST 大 body 改走 form-urlencoded，避免 URL 超长导致 Network Error',
  },
  {
    version: 'v202607191300',
    time: '2026-07-19 13:00',
    notes: '修复后端 InventoryTaskService GroupBy 语法：改为内存聚合',
  },
  {
    version: 'v202607191200',
    time: '2026-07-19 12:00',
    notes: '批量补齐：复盘流程+钉钉推送+进度看板+盘点报告+资产全生命周期',
  },
  {
    version: 'v202607182240',
    time: '2026-07-18 22:40',
    notes: '确认部署 — 修复后端ReslutJson.msg与前端data.message不匹配',
  },
  {
    version: 'v202607181700',
    time: '2026-07-18 17:00',
    notes: 'UniGetToken 支持 GET + POST — 405 修复',
  },
  {
    version: 'v202607181505',
    time: '2026-07-18 15:05',
    notes: 'Token 改走 URL query string 绕过 WAF body 拦截',
  },
  {
    version: 'v202607181440',
    time: '2026-07-18 14:40',
    notes: '修复网关 SubmitRecord 字段映射编译错误',
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
