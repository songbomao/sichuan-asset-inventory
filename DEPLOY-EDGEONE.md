# 蜀资点兵 · 前端部署到 EdgeOne Pages 完整流程

> 适用：前端代码改动后，重新构建并部署到 EdgeOne Pages。
> 项目：`sichuan-asset-inventory`（EdgeOne Project ID: `makers-izjvjv8yb4yr`）
> ⚠️ **重要限制**：EdgeOne Pages 国内版的默认域名（`*.edgeone.cool` / `*.edgeone.site`）**仅提供 3 小时预览链接**，超时返回 401。要长期公开访问，**必须绑定已备案的自定义域名**。

---

## 一、一句话总览

改代码 → 升版本号 → 构建 dist → 一条命令部署 → 验证访问。
**大部分事情让 AI（滚总）做，你只需要：确认关闭访问保护 + 手机钉钉验证。**

---

## 二、需要用 WorkBuddy 连接器吗？

**不需要连接器。** 部署走的是本地 `edgeone` 命令行工具（CLI），不是 WorkBuddy 连接器。

- 用到的是 **`edgeone-pages-deploy` 技能（skill）** —— 已安装，它只是告诉 AI 怎么调用本地 `edgeone` CLI。
- CLI 已装好（版本 1.6.14），登录用的 **API Token 已保存**在 `.edgeone/.token`，以后不用再登录/粘贴。

所以：**你只要跟 AI 说"重新部署前端"，AI 就能全自动完成。**

---

## 三、完整部署流程（AI 执行的步骤）

### 步骤 1：改代码 + 升版本号（必做）
- 改完前端代码后，更新 `src/config/version.ts`：
  - `APP_VERSION` 改成新的 `vYYYYMMDDhhmm`（唯一，用于区分部署版本、排查钉钉缓存）
  - 在 `VERSION_HISTORY` 数组最前面加一条记录

### 步骤 2：构建 dist
```bash
cd D:/work/workspace/workBuddy/sichuan-asset-inventory/sai-inventory-h5/sichuan-asset-inventory
npx vite build
```
- 产物在 `dist/` 目录
- ⚠️ `vite.config.ts` 的 `base` 必须是 `'/'`（EdgeOne 根域名托管），不能是 `/sichuan-asset-inventory/`（那是旧 GitHub Pages 子路径）

### 步骤 3：部署到 EdgeOne Pages（一条命令）
```bash
cd D:/work/workspace/workBuddy/sichuan-asset-inventory/sai-inventory-h5/sichuan-asset-inventory/dist
export PAGES_SOURCE=skills
edgeone pages deploy -n sichuan-asset-inventory -t "$(cat ../.edgeone/.token)"
```
- `-n sichuan-asset-inventory`：项目名，复用已有项目（不会新建）
- `-t`：API Token（从本地文件读，已保存）
- 部署约 40~60 秒完成

### 步骤 4：推送代码到 Gitee（备份）
```bash
cd D:/work/workspace/workBuddy/sichuan-asset-inventory/sai-inventory-h5/sichuan-asset-inventory
git add -A
git commit -m "deploy(vYYYYMMDDhhmm): 描述"
"D:/Program Files/Git/bin/git.exe" push gitee main
```
> 注：公司网络封 GitHub，只能 push Gitee。回家可再补 push GitHub。

---

## 四、你需要亲自做的事

| # | 事项 | 说明 |
|---|------|------|
| 1 | **绑定已备案自定义域名**（长期公开必需） | EdgeOne 国内版默认域名只有 3 小时 preview token，无法长期公开访问。见下方「五」 |
| 2 | **手机钉钉验证** | 清缓存后打开应用，看登录页底部版本号是否为最新，功能是否正常 |

---

## 五、自定义域名绑定（解决 401 / 长期公开访问）

**为什么必须做：** EdgeOne Pages 国内版对默认域名强制 3 小时预览令牌（`?eo_token=xxx&eo_time=xxx`），到期后返回 401。这是合规机制，**没有开关可以关闭**。

### 5.1 前提
- 需要一个**已完成工信部备案**的域名（公司域名或个人备案域名均可）
- 如果暂时没有，EdgeOne Pages 国内版**不能作为长期公开首页**；可先用下方「八、其他方案」里的临时链接测试

### 5.2 操作步骤
1. 打开控制台：
   https://console.cloud.tencent.com/edgeone/pages/project/makers-izjvjv8yb4yr
2. 左侧菜单 → **域名管理**（或项目设置 → 域名管理）
3. 点击 **添加自定义域名**
4. 输入你的子域名，例如 `sai.yourcompany.com`
5. 按提示在你的域名注册商/DNS 服务商添加 **CNAME 记录**
6. 回到控制台点击 **验证**，通过后会自动配置 HTTPS 证书
7. 把钉钉微应用首页地址改成这个自定义域名

### 5.3 加速区域说明
- **中国大陆可用区** 或 **全球可用区（含中国大陆）**：自定义域名必须备案
- **全球可用区（不含中国大陆）**：自定义域名无需备案，但中国大陆访问会 401，不推荐用于钉钉国内用户

---

## 六、如何确认部署成功

### 方式 1：看 CLI 输出
部署命令最后会打印：
```
[cli][✔] Deploy Success
[cli][✔] Deploy URL: https://sichuan-asset-inventory-xxxx.edgeone.cool?eo_token=...
[cli][✔] Console URL: https://console.cloud.tencent.com/edgeone/pages/project/makers-izjvjv8yb4yr/deployment/xxxx
```
看到 **`Deploy Success`** 就表示上传部署成功。

### 方式 2：浏览器打开访问 URL
- 关闭访问保护后，直接打开 `https://sichuan-asset-inventory-bganooln.edgeone.cool`
- 能看到「蜀资点兵」登录页 = 成功
- （电脑浏览器会显示钉钉 `notInDingTalk` 错误，这是**正常的**，因为钉钉免登只能在钉钉容器里跑）

### 方式 3：核对版本号（最可靠）
- 手机钉钉里打开应用 → 登录页底部 / 我的页底部看版本号
- 与你本次 `APP_VERSION` 一致 = 部署的是最新版
- 如果还是旧版本 → 钉钉缓存了，需在钉钉里清缓存重进

---

## 七、钉钉微应用首页地址

前端换了托管地址后，需把钉钉后台「蜀资点兵」应用的**首页地址**改成新 URL：
- 旧：`https://songbomao.github.io/sichuan-asset-inventory/`
- 新：`https://sichuan-asset-inventory-bganooln.edgeone.cool/`（关闭访问保护后）
- 或绑定的自定义域名

钉钉开发者后台 → 应用 → 开发配置 → 应用首页地址 / 服务端出口 IP。

---

## 八、其他方案（如果没有已备案域名）

如果暂时无法提供已备案域名，EdgeOne Pages 国内版**不能长期公开托管**。可替代方案：

| 方案 | 是否免费 | 是否需要域名 | 国内访问 | 说明 |
|------|---------|-------------|---------|------|
| **EdgeOne Pages + 已备案域名** | ✅ | ✅ | ✅ 最快 | 推荐长期方案 |
| **CloudStudio 预览链接** | ✅ | ❌ | ✅ 可用 | 临时测试用，已生成：`https://56670883cd394c388bcd5a6312791239.app.codebuddy.work` |
| **GitHub Pages** | ✅ | ❌ | ⚠️ 一般/偶尔不稳 | 公司网络封 GitHub，push 已失败 |
| **Cloudflare Pages / Netlify / Vercel** | ✅ | ❌ | ⚠️ 国际节点，国内速度一般 | 公司网络可能也受限 |

---

## 九、常见问题

| 现象 | 原因 | 解决 |
|------|------|------|
| 访问返回 401 | EdgeOne 国内版默认域名 preview token 3 小时过期，合规机制 | 绑定已备案自定义域名，或使用 3 小时内的 preview 链接 |
| 页面白屏 / 资源 404 | `base` 不是 `/` | 改 `vite.config.ts` base=`/` 重新构建部署 |
| 钉钉里还是旧版本 | 钉钉缓存 | 钉钉内清缓存，或版本号带时间戳强制识别 |
| 电脑浏览器 notInDingTalk | 正常 | 钉钉 H5 必须钉钉内打开 |
| 部署落到 global area | Token 是国际站的 | 如需国内站，去 console.cloud.tencent.com 重新生成 Token |
