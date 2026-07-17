import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || window.location.origin;

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

/** 创建 Axios 实例 — 使用简单请求模式绕过 WAF OPTIONS 拦截 */
const client = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
  },
});

/** 请求拦截器：将 Token 从 Header 移到 Body/Query 中，避免触发 OPTIONS 预检 */
client.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      if (config.method?.toLowerCase() === 'get') {
        // GET 请求：token 放在 URL query string 中
        config.params = { _token: token, ...config.params };
      } else {
        // POST/PUT 请求：token 放在 body 中，整体序列化为 form-urlencoded
        const body: Record<string, unknown> = config.data || {};
        if (typeof body === 'object' && !(body instanceof FormData)) {
          const bodyWithToken = { _token: token, ...body };
          config.data = toFormUrlEncoded(bodyWithToken);
        }
      }
    }
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
