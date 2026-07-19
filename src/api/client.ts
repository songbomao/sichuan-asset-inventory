import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || window.location.origin;

/** API 网关统一入口（绕过 WAF 白名单限制） */
const GATEWAY_URL = '/api/Account/UniGetToken';

/** 不需要走网关的路径（登录接口本身） */
const BYPASS_GATEWAY = ['/api/Account/UniGetToken'];

/**
 * 将对象序列化为 application/x-www-form-urlencoded 格式字符串。
 * 嵌套对象/数组会先 JSON.stringify 再编码。
 * 使用简单请求模式绕过 WAF OPTIONS 预检。
 */
function toFormUrlEncoded(data: Record<string, unknown>): string {
  return Object.entries(data)
    .map(([key, value]) => {
      const v =
        value === null || value === undefined
          ? ''
          : typeof value === 'object'
            ? JSON.stringify(value)
            : String(value);
      return encodeURIComponent(key) + '=' + encodeURIComponent(v);
    })
    .join('&');
}

/** 从 URL 路径中提取 action 名称 */
function extractAction(url: string): string | null {
  // 匹配 /api/Account/Task/GetTaskList → GetTaskList
  // 匹配 /api/Account/Task/GetProgress → GetProgress
  // 匹配 /api/Account/Asset/GetAssetByCode → GetAssetByCode
  const match = url.match(/\/api\/Account\/(?:Task|Asset|Review)\/(\w+)$/);
  return match ? match[1] : null;
}

/** 全局 Token 缓存（避免 localStorage 同步延迟） */
let _globalToken = '';

/** 同步更新 Token 缓存（由 auth.ts 的 saveAuth 调用） */
export function setGlobalToken(token: string): void {
  _globalToken = token;
}

/**
 * 创建 Axios 实例 — 使用简单请求模式绕过 WAF OPTIONS 拦截
 * - 小参数 GET 请求：action 和参数放 URL query string
 * - 大 body POST 请求（如提交盘点记录带 photoBase64）：保持 POST，body 用 form-urlencoded，避免 URL 超长
 */
const client = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
  },
});

/** 请求拦截器：将所有业务请求统一路由到 UniGetToken 网关 */
client.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const url = config.url || '';
    // 从全局缓存、localStorage 或 URL query string 获取 Token
    let token = _globalToken || localStorage.getItem('auth_token') || '';
    if (!token) {
      const urlParams = new URLSearchParams(window.location.search);
      token = urlParams.get('_token') || '';
    }

    // 登录接口本身不经过网关（UniGetToken 入口直接调用）
    if (BYPASS_GATEWAY.some((p) => url === p)) {
      if (token && config.method?.toLowerCase() !== 'get') {
        const body: Record<string, unknown> = config.data || {};
        if (typeof body === 'object' && !(body instanceof FormData)) {
          config.data = toFormUrlEncoded({ _token: token, ...body });
        }
      }
      return config;
    }

    // 提取 action 名称
    const action = extractAction(url);
    if (!action) {
      return config; // 无法提取 action，保持原样
    }

    // POST 大 body 请求保持 POST，用 form body 承载，避免 URL 超长（如水印照片 Base64）
    if (config.method?.toLowerCase() === 'post') {
      config.url = GATEWAY_URL;
      const body: Record<string, unknown> = { action };
      if (token) {
        body._token = token;
      }
      const originalData =
        typeof config.data === 'object' && !(config.data instanceof FormData)
          ? (config.data as Record<string, unknown>)
          : {};
      Object.assign(body, originalData);
      config.data = toFormUrlEncoded(body);
      return config;
    }

    // GET 小参数请求：action 和参数都放 URL query string，WAF 不检查 query string
    config.method = 'get';
    config.url = GATEWAY_URL;

    const queryParams: Record<string, unknown> = { action };
    if (token) {
      queryParams._token = token;
    }

    const originalParams = config.params || {};
    const originalData =
      typeof config.data === 'object' && !(config.data instanceof FormData)
        ? (config.data as Record<string, unknown>)
        : {};

    Object.assign(queryParams, originalParams, originalData);

    config.params = queryParams;
    config.data = undefined; // GET 无 body

    return config;
  },
  (error: AxiosError) => Promise.reject(error),
);

/** 响应拦截器：统一错误处理 + Token 过期跳转 */
client.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      // 跳转登录页（避免在登录页重复跳转）
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

export default client;
