import client from './client';

/** 钉钉免登返回的用户信息 */
export interface DingtalkUserInfo {
  id: string;
  username: string;
  name: string;
  role: string;
  department: string;
  dingtalkUserId?: string;
  avatar?: string;
}

/** 钉钉免登响应 */
interface DingtalkLoginResponse {
  code: number;
  data: {
    access_token: string;
    user: DingtalkUserInfo;
  };
  msg: string;
}

/**
 * 钉钉免登
 * POST /api/Account/UniSaiAuth
 */
export async function dingtalkLogin(authCode: string): Promise<{
  access_token: string;
  user: DingtalkUserInfo;
}> {
  const { data } = await client.post<DingtalkLoginResponse>(
    '/api/Account/UniSaiAuth',
    { authCode },
  );
  if (data.code === 0 || data.code === 200) {
    return data.data;
  }
  throw new Error(data.msg || '钉钉免登失败');
}

/**
 * 从 JWT Token 中解析用户信息（兜底方案）
 */
export function parseToken(token: string): Partial<DingtalkUserInfo> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]));
    return {
      id: payload.sub || payload.user_id || payload.nameid || '',
      username: payload.sub || payload.user_id || payload.nameid || '',
      name: payload.name || payload.given_name || payload.unique_name || '',
      role: payload.role || payload.user_role || '',
      department: payload.department || payload.dept || '',
    };
  } catch {
    return null;
  }
}

/**
 * 存储登录态
 */
export function saveAuth(token: string, user?: DingtalkUserInfo): void {
  localStorage.setItem('auth_token', token);
  if (user) {
    localStorage.setItem('auth_user', JSON.stringify(user));
  }
}

/**
 * 清除登录态
 */
export function clearAuth(): void {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('auth_user');
}

/**
 * 从 localStorage 读取用户信息
 */
export function getStoredUser(): DingtalkUserInfo | null {
  try {
    const raw = localStorage.getItem('auth_user');
    if (!raw) return null;
    return JSON.parse(raw) as DingtalkUserInfo;
  } catch {
    return null;
  }
}
