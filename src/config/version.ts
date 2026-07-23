/**
 * 应用版本信息
 * 每次发布前更新：
 *   version: vYYYYMMDDhhmm 格式
 *   releaseNotes: 本次修改内容摘要
 *   releaseTime: 发布时间
 */
export const APP_VERSION = 'v202607231050';
export const APP_NAME = '蜀资点兵';
export const RELEASE_TIME = '2026-07-23 10:50';
export const RELEASE_NOTES = '修复任务详情页竖向时间轴被错误放置在页面底部的问题，将其调整至页面最顶部；修复资产对比同步模块差异对比/同步预览 Network Error：前端增加超长超时（120s），后端限制比对/预览结果明细数量并优化响应体大小；';

/** 版本变更历史（最新的放最前面） */
export const VERSION_HISTORY: Array<{
  version: string;
  time: string;
  notes: string;
}> = [
  {
    version: 'v202607231050',
    time: '2026-07-23 10:50',
    notes: '修复任务详情页竖向时间轴被错误放置在页面底部的问题，将其调整至页面最顶部；修复资产对比同步模块差异对比/同步预览 Network Error：前端增加超长超时（120s），后端限制比对/预览结果明细数量并优化响应体大小；',
  },
  {
    version: 'v202607221354',
    time: '2026-07-22 13:54',
    notes: '任务详情页新增竖向盘点进度时间轴：根据完成率展示数据同步/盘点下达/盘点中/报告生成/盘点结束/完成归档六个里程碑，已完成绿色对勾、进行中蓝色脉冲圆点、待处理灰色空心圆，与现有卡片风格统一。',
  },
  {
    version: 'v202607221148',
    time: '2026-07-22 11:48',
    notes: '管理员组织架构选择器改为手风琴式就地展开：取消左右分栏，点击部门直接在该节点下方列出直属成员和子部门，同一时间仅一个部门展开，并支持面包屑导航回退；',
  },
  {
    version: 'v202607221131',
    time: '2026-07-22 11:31',
    notes: 'sai_assets 对接真实固定资产视图（SAP 视图库，双库分离），适配视图全部字符串字段（原值/净值/转资日期等）；资产全生命周期页展示规格型号/使用部门/利润中心/供应商/制造商等真实字段，原值净值显示做 Number 容错；',
  },
  {
    version: 'v202607221045',
    time: '2026-07-22 10:45',
    notes: '1) 部门树点击部门时懒加载直接子部门（新接口 GetDingtalkSubDepartments），根治部门树只两层导致第三层子部门不显示、无法逐级下钻；2) 修复后端版本获取：getServerVersion 改走统一网关 UniGetToken（原 UniSaiAuth 后端无此端点导致获取不到）；3) 后端版本号显示由管理员页迁移至「我的」页底部，管理员页取消版本对照条；',
  },
  {
    version: 'v202607220935',
    time: '2026-07-22 09:35',
    notes: '修复组织架构选择器右侧子部门列表不显示的问题：选中部门时同时记录其子部门到状态，避免依赖树查找失败导致子部门区域空白；',
  },
  {
    version: 'v202607220910',
    time: '2026-07-22 09:10',
    notes: '部门树支持逐级展开/折叠（只加载选中部门直属人员，不一次性加载所有子部门人员）；右侧显示直属成员+子部门列表；人员卡片部门名改用当前选中部门名，移除「未知部门」分类；',
  },
  {
    version: 'v202607221100',
    time: '2026-07-22 11:00',
    notes: '管理员页版本对照条后端版本查询改走 UniSaiAuth 网关（action=GetVersion），修复 WAF 拦截导致后端版本获取不到；',
  },
  {
    version: 'v202607221000',
    time: '2026-07-22 10:00',
    notes: '修复组织架构选择器抽屉打开时默认加载全公司人员的问题；打开后仅展示部门树，点击部门后再加载该部门及其子部门成员；',
  },
  {
    version: 'v202607211900',
    time: '2026-07-21 19:00',
    notes: '组织架构选择器点选父部门时递归加载该部门及其所有子部门成员（去重），修复只显示本级 2 人的问题；',
  },
  {
    version: 'v202607211800',
    time: '2026-07-21 18:00',
    notes: '后端 GetDingtalkDepartments 部门树字段契约修复（DeptId→deptId），前端版本号对齐；',
  },
  {
    version: 'v202607211500',
    time: '2026-07-21 15:00',
    notes: '管理员任务页新增前后端版本对照条，后端版本经 /api/Account/GetServerVersion 获取，不一致时黄色警示提醒部署后端；',
  },
  {
    version: 'v202607211400',
    time: '2026-07-21 14:00',
    notes: '前端响应拦截器透传后端业务错误详情，便于定位 500 根因；',
  },
  {
    version: 'v202607211300',
    time: '2026-07-21 13:00',
    notes: '修复任务列表字段映射：getAdminTaskList 将后端 taskId/createTime 等映射为 AdminTaskItem，修复创建人时间异常与卡片点击 /tasks/undefined 触发 500；创建人/时间行空值防御；',
  },
  {
    version: 'v202607211200',
    time: '2026-07-21 12:00',
    notes: '管理员页任务卡片可点击跳转详情，恢复看板/复盘/报告入口；',
  },
  {
    version: 'v202607211030',
    time: '2026-07-21 10:30',
    notes: '修复管理员配置中组织架构选择器被 Dialog 遮罩压住的层级问题，将抽屉改为独立全屏 Dialog。',
  },
  {
    version: 'v202607210930',
    time: '2026-07-21 09:30',
    notes: '修复登录后页面闪烁循环：统一为 /api/Account/UniGetToken 的 GET/POST 请求自动附加 _token，修复 GetAdminInfo 因未带 token 反复 401 触发登录重定向循环；401 时同步清除全局 token 缓存；AuthContext 监听 localStorage 变化同步登出；Login 页使用 ref 防止自动登录重复触发。',
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
