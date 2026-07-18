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
  // 匹配 /api/Account/Task/GetList → GetList
  const match = url.match(/\/api\/Account\/(?:Task|Asset|Review|Version)\/(\w+)/);
  return match ? match[1] : null;
}

/** 全局 Token 缓存（避免 localStorage 同步延迟） */
let _globalToken = '';

/** 同步更新 Token 缓存（由 auth.ts 的 saveAuth 调用） */
export function setGlobalToken(token: string): void {
  _globalToken = token;
}

/** 创建 Axios 实例 — 使用简单请求模式绕过 WAF OPTIONS 拦截 */
const client = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
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

    // 登录接口本身不经过网关
    if (BYPASS_GATEWAY.some((p) => url.startsWith(p))) {
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

    // 将所有请求重写为 POST /api/Account/UniGetToken
    config.method = 'post';
    config.url = GATEWAY_URL;

    // 构建网关 body: { action, _token, ...原始参数 }
    const gatewayBody: Record<string, unknown> = { action };
    if (token) {
      gatewayBody._token = token;
    }

    // 合并原始 data（POST body）
    const originalData = (typeof config.data === 'object' && !(config.data instanceof FormData))
      ? config.data as Record<string, unknown>
      : {};

    Object.assign(gatewayBody, originalData);

    config.data = toFormUrlEncoded(gatewayBody);

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
