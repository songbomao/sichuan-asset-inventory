/**
 * 应用版本信息
 * 每次发布前更新：
 *   version: vYYYYMMDDhhmm 格式
 *   releaseNotes: 本次修改内容摘要
 *   releaseTime: 发布时间
 */
export const APP_VERSION = 'v202607210900';
export const APP_NAME = '蜀资点兵';
export const RELEASE_TIME = '2026-07-21 09:00';
export const RELEASE_NOTES = '修复钉钉 WebView 白屏：vite build.target 降为 es2015，转译 ??/?./async 等 ES2020+ 语法以兼容旧版钉钉内核；401 未授权跳转改为 HashRouter 的 hash 方式（window.location.hash），避免整页刷新触发重定向死循环；新增全局 ErrorBoundary，渲染异常时显示可读错误而非白屏。';

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
    version: 'v202607201551',
    time: '2026-07-20 15:51',
    notes: '我的页部门名兜底：后端钉钉免登 GetUserInfoByCode 在 user/get 未返回 dept_name_list 时，用 dept_id_list 调 department/get 取部门名，修复「我的」页部门显示为空；ID 字段为本地系统用户标识。',
  },
  {
    version: 'v202607201530',
    time: '2026-07-20 15:30',
    notes: '管理员搜索结果增强：搜索结果展示手机号（后端 SearchDingtalkUsers 返回 mobile 字段）；部门名兜底修复「未知部门」；管理员列表同步展示手机号。',
  },
  {
    version: 'v202607201400',
    time: '2026-07-20 14:00',
    notes: '修复管理员搜索失效：后端 SearchUsersByName 恢复递归遍历全企业部门，确保深层部门用户可被搜到；保留 access_token 缓存提速。',
  },
  {
    version: 'v202607201246',
    time: '2026-07-20 12:46',
    notes: '管理员选人优化：1) 后端 access_token 缓存 + 搜索只查根部门及直接子部门，减少超时和 network error；2) 组织架构选人失败提示更明确，引导改用姓名搜索。',
  },
  {
    version: 'v202607201230',
    time: '2026-07-20 12:30',
    notes: '管理员选人失败诊断增强：选人失败时自动附带 dd.env 环境信息，帮助快速定位 invalid corpId 是企业环境问题还是通讯录权限问题。',
  },
  {
    version: 'v202607201200',
    time: '2026-07-20 12:00',
    notes: '移动端详情抽屉再优化：去掉冗余图标，改为标签+值同水平线的紧凑布局，照片 thumbnail 直接可见，整体更简洁、信息密度更高。',
  },
  {
    version: 'v202607200910',
    time: '2026-07-20 09:10',
    notes: '关键修复：后端 GetMyItems 去掉 LeftJoin 联表，改为单表查询 + 批量补名称，杜绝 LeftJoin 异常导致前端记录页 network error。',
  },
  {
    version: 'v202607192250',
    time: '2026-07-19 22:52',
    notes: '关键修复：getMyRecords/getRecordDetail 改为 POST /api/Account/UniGetToken body 调用（与 getTaskList 完全一致），彻底解决钉钉 WebView 中 GET 请求触发的 network error。',
  },
  {
    version: 'v202607192200',
    time: '2026-07-19 21:00',
    notes: '优化：1) 盘点记录详情弹窗单列布局，信息不拥挤；2) 照片预览支持点击放大全屏，再次点击返回；3) 后端 GetMyItems 改 Join 单次查询加速列表；4) 管理员搜索改用钉钉 search_key 直接搜索，加速并提升成功率；5) 管理员配置增加钉钉环境诊断信息。',
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
