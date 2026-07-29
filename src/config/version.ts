/**
 * 应用版本信息
 * 每次发布前更新：
 *   version: vYYYYMMDDhhmm 格式
 *   releaseNotes: 本次修改内容摘要
 *   releaseTime: 发布时间
 */
export const APP_VERSION = 'v202607290955';
export const APP_NAME = '蜀资点兵';
export const RELEASE_TIME = '2026-07-29 09:55';
export const RELEASE_NOTES = '恢复 validateCategoryResponsibles 为 POST 调用（GET 导致 URL 超长 30s 超时）；后端修复 form body 多值 key 丢失：AccountController form-urlencoded 解析改用 MergeQueryValue 处理数组参数。配套后端 v202607290954。';

/** 版本变更历史（最新的放最前面） */
export const VERSION_HISTORY: Array<{
  version: string;
  time: string;
  notes: string;
}> = [
  {
    version: 'v202607290955',
    time: '2026-07-29 09:55',
    notes: '恢复 validateCategoryResponsibles 为 POST 调用（GET 导致 URL 超长 30s 超时）；后端修复 form body 多值 key 丢失：AccountController form-urlencoded 解析改用 MergeQueryValue 处理数组参数。配套后端 v202607290954。',
  },
  {
    version: 'v202607290937',
    time: '2026-07-29 09:37',
    notes: '修复 validateCategoryResponsibles 参数传输：由 POST form body 改为 GET query string（与 CreateTask 一致），selectedAssetCodes 经 repeat 风格由 MergeQueryValue 合并为 JArray，避过 form body 对数组 JSON.stringify→Form.FirstOrDefault→JArray.Parse 的长序列化链。配套后端 v202607290936。',
  },
  {
    version: 'v202607281703',
    time: '2026-07-28 17:03',
    notes: '根因修复：按类别全选资产时ScopeConfig含84个编码导致URL超长被截断——改为全选时不留selectedAssetCodes（后端按类别名自动匹配），仅部分选时才传；与按责任人下达走同一GET+query短URL路径。',
  },

  {
    version: 'v202607281436',
    time: '2026-07-28 14:36',
    notes: '移除工作台统一顶栏（AppHeader），将「退出应用」提取为独立按钮，以固定定位（右上角 z-50 浅色圆角容器 + 紫色图标）置于所有页面右上角，不被内容或底部导航遮挡；全局看板页自身顶栏移除重复退出按钮、仅保留返回工作台，避免双层与重复。',
  },

  {
    version: 'v202607281420',
    time: '2026-07-28 14:20',
    notes: '资产对比同步页差异对比新增「责任人异常」Tab：展示责任人为空/为null/不在组织架构的异常明细（含类型 Chip、资产编号、名称、当前责任人值、建议处理方式），支持分类内搜索与加载更多，并纳入差异摘要计数。后端 CompareAssetsResult 新增 responsiblePersonAnomalies 与 summary.responsiblePersonAnomalyCount。',
  },

  {
    version: 'v202607281235',
    time: '2026-07-28 12:35',
    notes: '我的盘点页顶部标题优化：将顶部 AppHeader 在 /tasks 路由下的标题由「我的盘点」改为「盘点任务」，避免与底部导航栏「我的盘点」入口重复；底部导航保持不动。',
  },

  {
    version: 'v202607281218',
    time: '2026-07-28 12:18',
    notes: '任务通知异步化：CreateTask/DispatchTask/DeleteTask 改为立即返回并附带 notifyJobId，钉钉推送转入后台异步 Job，前端通过网关 GetNotifyResult 轮询进度并在完成后静默提示一次（成功 X/Y 人 / 失败名单 / job 错误原因）；dispatchTask、deleteTask 超时由 120s/60s 降回默认，修复 30 秒超时导致的下达失败；新增 StartNotifyTask 用于失败重推（本次仅封装 API）。',
  },

  {
    version: 'v202607281125',
    time: '2026-07-28 11:25',
    notes: '新增退出/返回工作台导航：①工作台（底部导航首页）由 Layout 统一渲染顶栏，显示当前页签标题并提供「退出应用」入口；②所有深层页面（任务详情/盘点/复盘/报告/看板/资产全生命周期/我的记录/任务记录）顶栏右侧新增「返回工作台」(家图标，一键 replace 落地首页) 与「退出应用」(登出图标，带确认弹窗)；③退出应用在钉钉环境调用 dd.biz.navigation.close 真正关闭微应用返回钉钉工作台，非钉钉环境兜底提示。原有返回箭头逻辑保持不变。',
  },

  {
    version: 'v202607281102',
    time: '2026-07-28 11:02',
    notes: '资产预览列表卡片新增 assetTypeName 展示：后端 PreviewAssetsByCategories 返回 assetTypeName，前端 PreviewAssetItem 类型扩展并在每个资产卡片下方显示「责任人 · 部门 · 类别 · 资产类型」四段信息。',
  },

  {
    version: 'v202607280919',
    time: '2026-07-28 09:19',
    notes: '精简资产对比同步页差异提醒：步骤一 Alert 去除原始行数、去重规则等冗余解释，仅保留「数据一致/发现 X 处差异」+ SAP视图/本地表数量 + 三类差异计数；有差异时 Alert 自动切为 warning，无差异为 success。同步预览卡片同步移除重复的去重说明文案。',
  },

  {
    version: 'v202607271825',
    time: '2026-07-27 18:25',
    notes: '新建盘点任务强制双校验，不通过禁止创建：①点击「新建任务」先比对 SAP 系统数据与本地数据，不一致则弹出拦截弹窗（含仅本地/仅SAP视图/字段不一致明细与样例）并禁止继续，提供「去资产对比同步」入口；②按盘点类别创建任务确认前，反向校验所选类别下全部资产的责任人完整性——user 为空(null)或已不在组织(疑似离职)/无法唯一匹配时，弹出明细清单列出具体资产与责任人，提示通过财辅更正后再创建。后端新增 ValidateCategoryResponsibles 接口（requiredLevel=1）。',
  },

  {
    version: 'v202607271800',
    time: '2026-07-27 18:00',
    notes: '移除盘点任务管理页顶部「数据同步状态」Alert，避免冗余文案与实时差异对比提示冲突；保留 syncStatus 后台数据用于下达任务按钮就绪回退。',
  },

  {
    version: 'v202607271753',
    time: '2026-07-27 17:53',
    notes: '修复切换「盘点任务管理」Tab 自动差异对比提示逻辑反转：①原逻辑写反——数据存在差异时错误提示「无需同步」、数据一致时反而提示「请先执行同步操作」，现修正为：存在差异→警告「数据存在差异（含仅本地/仅SAP视图/字段不一致明细），请先到资产对比同步执行同步后再下达任务」；一致→成功「数据一致，无需同步，可正常下达任务」；②「下达任务」按钮就绪条件与实时对比结果联动——实时对比一致即可下达，实时对比发现差异即使之前同步过也须先重新同步，实时对比未返回时回退到是否已完成同步(isLatest)；③按钮 Tooltip 按差异原因给出对应提示。',
  },

  {
    version: 'v202607271740',
    time: '2026-07-27 17:40',
    notes: '新建盘点任务截止时间选择器改造为自定义 DeadlinePicker：替换原生 type="datetime-local" 输入，改用只读展示框 + Dialog 弹窗，内含独立的日期（type=date）和时间（type=time）输入框，底部提供「取消」「完成」按钮，确保在 PC 钉钉桌面端也能显式确认选择，解决原先无完成按钮的问题。',
  },

  {
    version: 'v202607271733',
    time: '2026-07-27 17:33',
    notes: '差异对比按钮加载态可读性修复 + 盘点任务管理 Tab 自动差异对比提示：①「差异对比」按钮进入「对比中...」loading 态时保持紫色背景与白色文字，避免默认 disabled 样式导致黑字在紫底上看不见；②切换到「盘点任务管理」Tab 时自动调用 compareAssets 差异对比，有差异提示「数据存在差异，无需同步」，无差异提示「数据一致，请先执行同步操作」。',
  },

  {
    version: 'v202607271717',
    time: '2026-07-27 17:17',
    notes: '资产对比同步流程交互优化：①同步预览无变更（新增/更新/删除均为 0）时，底部主按钮文字由「确认同步」改为「无需同步」；②同步成功后 Stepper 第三步文字变为「同步完成」并标记 completed（MUI 默认绿色），同时页面显示同步完成摘要卡片与「重新差异对比」按钮，流程闭环更清晰。',
  },

  {
    version: 'v202607271703',
    time: '2026-07-27 17:03',
    notes: '固定资产查询（本地资产表）隐藏「状态」列与「部门」列：COLUMNS 列定义移除 useStatus/状态 与 deptName/部门 两项，资产列表仅保留资产编号/名称/类别/地址/责任人/成本中心/原值/净值，列表更聚焦。',
  },

  {
    version: 'v202607271657',
    time: '2026-07-27 16:57',
    notes: '修复任务卡片删除按钮风格、同步预览留白、同步状态文案（配套后端 v202607271658）：①盘点任务卡片右上角删除由红色实心按钮改为红色描边+删除图标按钮，与「运行中」Chip 及「盘点记录」按钮风格协调；②同步预览卡片移除 minHeight:78vh 与 flex 撑满，列表与「确认同步」按钮间距恢复正常，消除内容少时的大片留白；③数据同步状态 Alert 按 SAP 视图 add_date 去重后有效记录数展示（本地 X 行 / SAP视图去重后 Y 条），并补充原始行数/合并重复数。',
  },

  {
    version: 'v202607271516',
    time: '2026-07-27 15:16',
    notes: '资产对比同步页统一为「SAP 在左、本地表在右」：①顶部信息区改为「SAP视图 X 条 · 本地表 Y 条」；②差异对比 Tab 顺序改为「仅SAP视图 | 仅本地表 | 字段不一致」并同步明细数据映射；③同步预览无变更文案改为「SAP 视图与本地表已一致」。去重提示文案与规则保持原样。',
  },

  {
    version: 'v202607271449',
    time: '2026-07-27 14:49',
    notes: '资产对比同步差异对比清晰展示去重数量（配套后端 v202607271450）：①对比/预览 summary 增加 deduplicatedLocalCount/deduplicatedViewCount/dedupRule 字段；②差异对比与同步预览信息卡片新增「SAP视图原始行数 / 按 add_date 最新去重后保留有效记录数 / 合并��复编码数 / 去重规则」展示，明确一笔固定资产只保留一行（取 add_date 最新）。',
  },

  {
    version: 'v202607271135',
    time: '2026-07-27 11:35',
    notes: '盘点报告页权限与预览重构：①权限控制——GetReportArchive 网关权限降为 requiredLevel=0（任意登录用户可查看已生成报告），GenerateReport 保持管理员(requiredLevel=1)；仅管理员可见/可点「生成盘点报告」按钮，普通用户无按钮、未生成时显示空状态占位「暂无报告，请联系管理员生成」。②生成后同页内嵌预览（无需跳转），先查 GetReportArchive 取最新归档 content 解析展示。③排版——报告头卡片列报告名称/盘点日期/截止日期/创建人/盘点范围(scopeText)；新增「资产盘点明细」表格（序号/物品名称/账面数量/实盘数量/差异数量/备注），差异盘盈绿色、盘亏红色高亮；独立「盘点结果统计」卡片(完成率/异常率/正常件/异常件)。后端 GenerateReport 扩展返回 items(逐项差异)与 scopeText 并写入归档 content。',
  },
  {
    version: 'v202607270953',
    time: '2026-07-27 09:53',
    notes: '修复任务进度在移动端显示不完整：HorizontalTimeline 改为响应式——宽屏(≥600px)保持横向 5 节点，窄屏自动切纵向(vertical)，移除原 minWidth:520 + overflowX:auto 强制滚动与 nowrap 截断，标题/时间戳/状态在各类移动分辨率下完整可见、无需横向滑动；时间戳与「待到达」改由 StepLabel optional 统一呈现，标题窄屏允许换行并缩字号。',
  },
  {
    version: 'v202607270035',
    time: '2026-07-27 00:35',
    notes: '真·多图盘点提交打通（配套后端 v202607270040）：①提交页 Inventory.tsx 移除多图垂直拼接为单长图逻辑，改为直接传 photoUrls 字符串数组（仍约束≤4张、≥2张）；②api SubmitRecordParams 由单 photoBase64 改为 photoUrls:string[]（保留 photoBase64 可选兼容旧端）；③后端 sai_inventory_records 新增 PhotoUrls(mediumtext JSON数组) 列，AccountController/InventoryTaskController 的 SubmitRecord 解析 photoUrls 数组(兼容旧 photoBase64)、GetRecordDetail 返回 photoUrls(string[])，详情灯箱(上轮已做)即可按序翻页切换预览。',
  },
  {
    version: 'v202607270022',
    time: '2026-07-27 00:22',
    notes: '盘点详情页与记录筛选改造：①「我的盘点记录」移除按时间段（开始/结束日期）筛选，仅保留状态 chip + 关键字；②重构盘点详情抽屉——内聚照片灯箱（默认缩略图网格，点击放大全屏、再次点击还原、多图支持左右翻页与键盘切换），整体分为「基本信息」（蓝，来自 sai_assets 经 GetAssetByCode）与「盘点信息」（紫，来自责任人提交：状态/数量/盘点人/功能/外观/时间/地点/备注/照片）两大区块，蓝紫左border+标题强区分，层次清晰；③移除两页原外部 showPhoto/setFullscreen 状态与各自全屏 Dialog，灯箱逻辑全部内聚进抽屉，MyRecords 与 AdminTaskRecords 同步精简。',
  },
  {
    version: 'v202607262354',
    time: '2026-07-26 23:54',
    notes: '修复盘点任务详情页两处问题：①资产数量显示错误——根因是后端 GetTaskDetail 原返回整任务全部资产（未过滤责任人），前端取 detail.assets.length 显示 3；后端改为同时返回 assetCount（整任务数）与 myAssetCount（当前责任人名下数），前端按角色取数（管理员看整任务数、责任人看本人名下数）。②进度图优化——取消原竖向 6 节点假时间戳时间轴，新增横向 5 节点任务进度轴（MUI Stepper alternativeLabel，与管理页资产对比同步同款）：数据同步（SAP→本地最近同步时刻）/盘点下达（任务 CreatedAt）/盘点完成（责任人最后一个 self 记录 CreatedAt）/报告生成（sai_report_archive.GeneratedAt）/盘点完成归档（+5 分钟），完成态由真实时间戳是否存在驱动，标题由「盘点进度」改为「任务进度」。配套后端 v202607262353（GetTaskDetail 补返 assetCount/myAssetCount/milestones）。',
  },
  {
    version: 'v202607262332',
    time: '2026-07-26 23:32',
    notes: '修复「我的盘点任务」Tab 卡片状态逻辑：原卡片直接取任务级 t.Status 显示，与当前责任人完成情况脱节。改为依据后端 GetTaskList(onlyMine) 已按当前用户聚合的 assetCount/completedCount 派生状态——当前责任人名下资产全部盘点完成（completedCount>=assetCount 且 assetCount>0）即显示「已完成」，否则沿用任务级状态；visibleTasks 过滤补上 completed 使已完成卡片可见；进度条本就按用户级完成数渲染，与状态一致。仅前端逻辑，后端无改动。',
  },
  {
    version: 'v202607262327',
    time: '2026-07-26 23:27',
    notes: '「我的资产」Tab 受限改造：AssetLocalTable 新增可选 props——lockToOwner（隐藏搜索框、关键字锁定当前登录用户名、仅展示本人名下固定资产）、hideDownload（移除「下载全量CSV」按钮）、pageSize/pageSizeOptions（每页条数）。「我的资产」Tab 传 lockToOwner hideDownload pageSize={40} pageSizeOptions={[40]}；管理页「固资查询」仍走默认 props（搜索/下载/分页20 不变），互不影响。仅组件复用层与 UI 改造，不影响现有功能。',
  },
  {
    version: 'v202607262315',
    time: '2026-07-26 23:15',
    notes: '新增「我的资产」Tab 与清理冗余标题：①「我的盘点」页新增第三 Tab「我的资产」，复用 AssetLocalTable（列/搜索/分页/导出完全一致），ownerName 按当前用户姓名过滤名下固定资产；②移除「我的盘点任务」Tab 内重复「我的盘点」标题；③移除管理页「资产对比同步」内重复「资产对比同步」标题；④移除 AssetLocalTable 内重复「固资查询」标题（与 Tab 名重复）。仅 UI 与新增 Tab。',
  },
  {
    version: 'v202607262300',
    time: '2026-07-26 23:00',
    notes: '导航与交互优化：①底部导航「我的任务」更名为「我的盘点」，图标 AssignmentIcon→InventoryIcon（库存盘点风格），责任人与管理员两套导航同步更新；②「我的盘点」页标题「我的任务」→「我的盘点」；③移除「我的盘点」页刷新图标按钮；④新增 Tab 切换自动刷新——切到「我的盘点任务」触发 fetchTasks(true)，切到「我的盘点记录」因条件渲染重挂载使 MyRecords 挂载即拉最新，覆盖全部 Tab。',
  },
  {
    version: 'v202607262252',
    time: '2026-07-26 22:52',
    notes: '信息架构收敛：「我的」页移除「我的盘点记录」按钮（入口收敛至「我的任务」页 Tab）；「我的任务」页拆分为两个 fullWidth Tab——「我的盘点任务」（现有任务列表+刷新）与「我的盘点记录」（复用 MyRecords(embedded)）；Tab 样式完全参照管理员 AdminTasks 的 3-Tab（variant=fullWidth、minHeight=40、textTransform=none、fontSize=0.9rem），切换效果/间距/字体一致。盘点记录入口现为「我的任务→我的盘点记录」Tab 与「资产档案→盘点时间线」两处。',
  },
  {
    version: 'v202607262012',
    time: '2026-07-26 20:12',
    notes: '新增盘点结果查看功能：①新增「我的盘点记录」页（/my-records，入口：我的页按钮 + 我的任务页历史图标），展示本人参与的全部盘点记录（照片/备注/盘点数量/存放地点/盘点人），支持按状态、起止日期、关键字筛选与分页；②新增「任务盘点记录」页（/admin/tasks/:taskId/records，RequireAdmin），超管视角展示该任务下全员盘点记录 + 汇总视图（完成率/按状态/按参与人分布）+ 参与人列表；③抽取 RecordDetailDrawer 共享组件，盘点详情完整展示照片/备注/盘点数量/功能状态/外观状态；④盘点操作页新增可选「盘点数量」录入；⑤AdminTasks 任务卡片新增「盘点记录」按钮直达任务记录页。配套后端 v202607262013（GetMyRecords/GetTaskRecords/GetTaskRecordSummary + InventoryQty 列）。',
  },
  {
    version: 'v202607261941',
    time: '2026-07-26 19:41',
    notes: '启用三项 P0 AI 能力前端入口：①盘点报告页「AI 生成盘点报告」恢复真实调用 WriteReport（天翼云大模型生成 Markdown 报告并弹窗展示，失败时降级提示）；②盘点操作页相机组件接入 AI 识别——传入当前任务全部资产作为候选（candidates），拍照后显示「AI 识别资产」按钮，识别命中后自动切换到对应资产项（onAIRecognized）；③差异诊断入口保留不变。配套后端 v202607261942（appsettings 注入天翼云 Wishub ApiKey 与模型 ID）。',
  },
  {
    version: 'v202607261743',
    time: '2026-07-26 17:43',
    notes: '六项优化：①盘点操作页恢复固定资产详情卡片（资产编号/名称/类别/使用部门/责任人/存放地点/使用状态/成本中心，来自 sai_assets 经 GetTaskDetail 关联返回）；②新建任务「按盘点部门」改为「按资产责任人」，部门选择与人员选择合并为单一「选择盘点责任人」弹窗（左侧部门树 + 右侧人员多选，支持按姓名搜索与多选），可直接从部门或子部门勾选责任人；③盘点方式文案「按盘点部门」→「按资产责任人」（保留「按盘点类别」）；④下达任务必填校验：任务名称、盘点方式、截止时间（datetime-local 精确到秒）、创建人四项非空，未填拦截并提示；⑤全部盘点项完成后自动跳回任务卡片页（/tasks）；⑥后端 CreateTask 按责任人筛选时改为跨全部部门匹配其名下全部资产，修复责任人资产分布多部门时漏项（如宋伯茂 7 项仅显示 1 项）。',
  },
  {
    version: 'v202607261125',
    time: '2026-07-26 11:25',
    notes: '底部导航图标按入口性质重选：我的进度由 Insights(洞察) 改为 TrendingUp(进展上升趋势)；管理由 Settings(齿轮/设置) 改为 AdminPanelSettings(管理员面板)；我的任务(Assignment)、全局进度(Dashboard)、我的(Person) 图标保留。责任人导航「我的进度」同步改 TrendingUp 保持一致。',
  },
  {
    version: 'v202607261104',
    time: '2026-07-26 11:04',
    notes: '管理员底部导航调整：将原「盘点任务」入口移动到从左到右最右侧位置，并改名为「管理」（图标改为齿轮 Settings）。管理员导航顺序现为：进度监控 · 我的进度 · 我的 · 管理。路由（/admin/tasks）与页面内容不变，仍承载盘点任务管理/资产对比同步/固资查询三模块及双重门控。',
  },
  {
    version: 'v202607261056',
    time: '2026-07-26 10:56',
    notes: '三项优化：①底部导航新增「我的进度」通用入口（所有角色可见），新建 MyProgress 页展示当前用户名下全部盘点任务的完成率与总体进度，点击卡片直达该任务进度看板；②盘点任务页（盘点任务管理/资产对比同步/固资查询三模块）确认维持 RequireAdmin 路由级 + 页面级 isAdmin 双重门控，仅管理员和超级管理员可访问；③取消「盘点报告」底部导航独立入口，报告合并至盘点任务管理——任务卡片进详情后「盘点报告」作为末位卡片与其他详情卡片平级展示（/admin/report 路由保留兼容直链）。',
  },
  {
    version: 'v202607260013',
    time: '2026-07-26 00:13',
    notes: '修复四问题：①AI 报告生成 API 网关异常——Program.cs 中 AiService 原误用 AddHttpClient<AiService>()（typed-client 要求构造函数首参为 HttpClient），改为 AddHttpClient() 注册 IHttpClientFactory + AddScoped<AiService>()，与 AiService(IConfiguration, IHttpClientFactory) 构造函数对齐；②移除「我的」页左上角冗余的「我的」标题；③盘点任务管理页 3 个 Tab（盘点任务管理/资产对比同步/固资查询）维持 RequireAdmin 路由级 + 页面级双重门控，仅管理员和超级管理员可见；④恢复责任人的进度看板与盘点页访问——全局进度监控仍仅管理员可见，任务级进度看板对所有责任人开放（任务详情页「进度看板」卡片移出仅管理员区）。',
  },
  {
    version: 'v202607252329',
    time: '2026-07-25 23:29',
    notes: '修复三处问题：①进度监控页面跳转崩溃（后端全局看板字段名 byDepartment/byCategory 对齐前端 deptStats/categoryStats）；②盘点报告 AI 生成误报"AI 服务暂不可用"——api/ai.ts 在 code=200 但 data=null（AI 降级）时抛后端真实文案，Report.tsx 判空双保险并展示后端文案；③我的任务仅展示"责任人为当前登录用户 + 状态为未盘点(pending)"的新任务：getTaskList(true) 走 onlyMine 后端过滤，移除待办/已办分段。',
  },
  {
    version: 'v202607252300',
    time: '2026-07-25 23:00',
    notes: '信息架构重构：移除顶部角色 Tab 切换器，按后端 user.isAdmin 自动判定角色并渲染对应底部导航（管理员：盘点任务/进度监控/盘点报告/我的；责任人：我的任务/资产档案/我的），无需手动切换；"我的"页作为通用页对所有角色展示，配置管理员按钮对超级管理员与管理员均可见；前端与后端版本号合并同一行展示。',
  },
  {
    version: 'v202607252020',
    time: '2026-07-25 20:20',
    notes: '重新部署验证前端缓存策略：vite.config 已对 assets/*.js|css 引用追加 ?v=版本号 强制刷新；本次仅升版本号触发 GitHub Pages 重新部署，确保钉钉 WebView 加载到最新构建产物（含 v202607251900 的角色化重构 + P0 三项 AI）。',
  },
  {
    version: 'v202607251900',
    time: '2026-07-25 19:00',
    notes: '角色化信息架构重构 + P0 三项 AI 能力（拍照即盘/差异诊断/报告撰写）前端落地：①角色切换器 + 双套底部导航（责任人：我的任务/资产档案/我的；管理员：盘点任务/进度监控/盘点报告），按 isAdmin 隔离；②新增资产档案页（资产总览 + 盘点时间线，原记录页并入时间线）；③任务页改「我的任务」+待办/已办分段，统计按当前登录人；④进度监控全局聚合看板（部门/类别双维度完成率 + 任务汇总下钻）；⑤报告页支持归档与 AI 生成汇报文案；⑥AI 调用层与 CameraCapture/Records/Report UI 接入，AI 不可用时静默回退。',
  },
  {
    version: 'v202607251312',
    time: '2026-07-25 13:12',
    notes: '修复盘点预览数量/人员仍为空：前端 axios 配置 paramsSerializer: { indexes: null }，使数组参数使用 repeat 风格（categoryNames=a&categoryNames=b），避免 brackets 风格（categoryNames[]=a）导致后端 query 解析丢失；后端 UniGetToken 合并 query string 时把多值还原为 JArray（兼容 brackets 与 repeat 两种风格）。',
  },
  {
    version: 'v202607251254',
    time: '2026-07-25 12:54',
    notes: '修复盘点预览数量为空的问题：前端简单请求把数组 JSON.stringify 进 query，后端网关新增 ParseStringList/ParseLongList 兼容解析 JSON 数组字符串与逗号分隔字符串，恢复按类别预览资产、按部门预览人员；预览按钮文案改为显示已选部门/类别数量。',
  },
  {
    version: 'v202607251051',
    time: '2026-07-25 10:51',
    notes: '盘点下达前新增责任人匹配校验：责任人(user)为空时全量列出并禁止下达；责任人与钉钉一票否决式全量匹配，离职/重名/无法匹配时列出人员及涉及资产并禁止下达；校验失败弹出明细清单对话框。',
  },
  {
    version: 'v202607250841',
    time: '2026-07-25 08:41',
    notes: '新建盘点任务支持精确选择：按类别筛选后可预览资产清单（编码+名称+责任人/部门）并勾选特定资产；按部门选择后可预览该部门及子部门下的人员及其负责资产数并勾选特定人员；两类方式均实时显示已选/总数统计。',
  },
  {
    version: 'v202607242045',
    time: '2026-07-24 20:45',
    notes: '新建盘点任务交互改造：任务名称合并为单个可选输入框（留空用默认名）；盘点部门改为钉钉组织架构树形多选（含子部门级联）；盘点类别改为多选；后端人员匹配容错增强，修复"宋伯茂"等人推送未匹配问题。',
  },
  {
    version: 'v202607241951',
    time: '2026-07-24 19:51',
    notes: '新建盘点任务改造：按部门/类别单维度筛选，创建后即时按责任人推送钉钉消息。',
  },
  {
    version: 'v202607241810',
    time: '2026-07-24 18:10',
    notes: '资产对比页增加诊断统计展示（原始行数、空编码数、重复编码数），辅助排查数量与差异识别异常。',
  },
  {
    version: 'v202607241805',
    time: '2026-07-24 18:05',
    notes: '固资查询移除全部/责任人切换，统一按编号/名称/责任人搜索；移动端CSV下载改为后端文件流直连，适配钉钉原生下载。',
  },
  {
    version: 'v202607241730',
    time: '2026-07-24 17:30',
    notes: '修复同步预览统计展示与确认按钮样式（含弹窗内确认按钮）；固资查询仅保留本地快照并移除导出PDF；修复移动端钉钉CSV下载兼容性。',
  },
  {
    version: 'v202607241705',
    time: '2026-07-24 17:05',
    notes: '修复资产对比统计总数口径；统一界面"视图"文案为"SAP视图"。',
  },
  {
    version: 'v202607241543',
    time: '2026-07-24 15:43',
    notes: '管理员页面重构为三个标签页：盘点任务管理、资产对比同步、固资查询；将「资产对比同步」中的「本地资产表」模块拆分为独立「固资查询」页（AssetLocalTable），保留 SAP视图/本地快照切换、全部/责任人搜索、刷新、分页、导出PDF、全量CSV 及打印功能；资产对比同步页仅保留差异对比→同步预览→确认同步流程；各页功能与交互布局保持一致。',
  },
  {
    version: 'v202607241412',
    time: '2026-07-24 14:12',
    notes: '资产对比同步页对接后端 v202607241352：资产表默认展示 SAP 实时视图并支持切换本地快照；搜索新增「责任人」模式（searchField）；表格补全地址/责任人/部门/成本中心列；差异对比改为 Tab 切换 + 分类内搜索 + 加载更多（一次加载三类数据）；修复钉钉 WebView 导出 PDF 不调起问题（延迟触发 window.print）；新增全量 CSV 导出（ExportAssets）并加 BOM 防乱码；',
  },
  {
    version: 'v202607241234',
    time: '2026-07-24 12:34',
    notes: '重构资产对比同步页：差异卡片箭头修正为「SAP视图 → 本地」方向；字段显示改为中文备注名；新增三步骤 Stepper（差异对比/同步预览/确认同步）梳理交互流程；搜索与导出功能下移至本地资产表附近；同步成功后自动重新执行差异对比并展示最新结果；',
  },
  {
    version: 'v202607231811',
    time: '2026-07-23 18:11',
    notes: '基于 sai_assets 新结构重设计盘点资产详情页：新增 AssetDetailTabs 组件，顶部突出资产编号与名称，下方采用 Tab 标签页分区展示（基本信息、位置信息、使用信息、财务信息、维护/供应商、历史变更）；切换资产时实时调用 GetAssetByCode 拉取 SAP 视图完整字段、调用 GetLifecycle 拉取盘点历史时间线；字段按类别归属清晰，核心字段优先，移动端横向滚动 Tab 适配；',
  },
  {
    version: 'v202607231650',
    time: '2026-07-23 16:50',
    notes: '彻底修复资产对比/同步预览/同步报 Network Error：根因是这些请求走 POST 且 action+_token 放在请求体 body 中，被前置 WAF(scwms.chinaccsscm.cn:8096) 拦截，请求从未到达后端（GatewayTrace 日志文件从未生成已印证）；前端请求拦截器改为将无大字段(如照片Base64)的网关 POST 请求自动转为 GET + query string，与一直正常的任务列表 GetTaskList 走同一 WAF 放行路径；后端零改动。',
  },
  {
    version: 'v202607231430',
    time: '2026-07-23 14:30',
    notes: '修复 GitHub Actions 构建失败：vite.config.ts 使用 fs/path/__dirname 做 cache-busting 时被 tsc -b 检查报错缺少 Node 类型；package.json 添加 @types/node，tsconfig.node.json 增加 types: ["node"]，npm install 同步 package-lock.json；功能与 v202607231420 一致（index.html no-cache + JS/CSS ?v=版本号 强制钉钉拉最新资源）；',
  },
  {
    version: 'v202607231420',
    time: '2026-07-23 14:20',
    notes: '前端缓存根治：index.html 加 no-cache 头 + 构建产物 JS/CSS 资源引用追加 ?v=版本号 query，强制钉钉 WebView 每次拉取最新资源，彻底解决因 SPA 资源被强缓存导致反复加载旧前端（旧同步 CompareAssets 请求读 150 SAP视图超时断连、误报 Network Error）的问题；后端 Start* 异步轮询接口已就绪（v202607231348），本次确保钉钉真正加载到新前端；',
  },
  {
    version: 'v202607231336',
    time: '2026-07-23 13:36',
    notes: '彻底修复资产对比/同步预览/同步 Network Error：compareAssets/previewSyncAssets/syncAssets 改为「启动任务→轮询结果」模式——先调后端 Start* 拿 jobId，再每隔数秒轮询 Get*Result 直到完成/失败，彻底绕开钉钉容器与网关对单次长连接的超时断连；轮询失败时抛出后端真实错误消息，不再统一显示 Network Error；',
  },
  {
    version: 'v202607231132',
    time: '2026-07-23 11:32',
    notes: '盘点任务管理模块前端：任务管理页顶部新增数据同步状态条（未同步到最新时禁止下达任务并提示先同步）；任务名称按当前年份自动生成月度/季度/半年/年度/专项五类预设可选；盘点范围改为组织/类别/成本中心三维度多选筛选器（选项来自 GetScopeOptions）；创建人默认当前登录用户且只读；新增「下达任务」按钮（调用 DispatchTask，钉钉推送提醒）；新增 getSyncStatus/getScopeOptions/dispatchTask/getTaskAssetSummary 接口；',
  },
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
    notes: 'sai_assets 对接真实 SAP 固定资产视图（SAP 视图库，双库分离），适配 SAP 视图全部字符串字段（原值/净值/转资日期等）；资产全生命周期页展示规格型号/使用部门/利润中心/供应商/制造商等真实字段，原值净值显示做 Number 容错；',
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
