import { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { DingtalkUserInfo } from '../api/auth';
import { getStoredUser, parseToken } from '../api/auth';
import { getAdminInfo } from '../api/admin';

/** 认证上下文值 */
interface AuthContextValue {
  token: string | null;
  user: DingtalkUserInfo | null;
  login: (token: string, userInfo?: DingtalkUserInfo) => void;
  logout: () => void;
  isAuthenticated: boolean;
  /** 从后端刷新当前用户的 isAdmin/isSuper 标记（管理员配置变更后立即生效） */
  refreshAdmin: () => Promise<void>;
  /** 是否为（超级）管理员：由后端 user.isAdmin 权威判定，前端不再做角色视图切换 */
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  token: null,
  user: null,
  login: () => {},
  logout: () => {},
  isAuthenticated: false,
  refreshAdmin: async () => {},
  isAdmin: false,
});

/** 认证上下文 Provider */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem('auth_token'),
  );
  const [user, setUser] = useState<DingtalkUserInfo | null>(() => getStoredUser());

  const login = useCallback((newToken: string, userInfo?: DingtalkUserInfo) => {
    localStorage.setItem('auth_token', newToken);
    if (userInfo) {
      localStorage.setItem('auth_user', JSON.stringify(userInfo));
      setUser(userInfo);
    }
    setToken(newToken);
  }, []);

  const logout = useCallback(() => {
    localStorage.setItem('logout_flag', '1');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    setToken(null);
    setUser(null);
  }, []);

  /** 从后端拉取最新权限标记，覆盖本地 user（后端为权威来源） */
  const refreshAdmin = useCallback(async () => {
    if (!token) return;
    try {
      const info = await getAdminInfo();
      setUser((u) => {
        if (!u) return u;
        const updated = { ...u, isAdmin: info.isAdmin, isSuper: info.isSuper };
        // 同步写回 localStorage，确保全局返回控制台按钮的 storedAdmin 兜底
        // 与 RequireAdmin 的 React user 口径一致，避免管理员被误弹回责任人首页。
        localStorage.setItem('auth_user', JSON.stringify(updated));
        return updated;
      });
    } catch {
      // 网络/接口异常时保留本地值
    }
  }, [token]);

  // 应用启动时，若已登录则同步一次后端权限标记（JWT 角色可能滞后）
  useEffect(() => {
    if (token) {
      refreshAdmin();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // 监听 localStorage 被其他标签页或 axios 拦截器清除 token 的事件，同步 React state
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === 'auth_token' && !e.newValue && token) {
        logout();
      }
    };
    // 同一标签页内 axios 拦截器清除 token 时，storage 事件不会触发，
    // 因此需要额外监听自定义事件来立即感知 401。
    const customHandler = () => {
      if (token) logout();
    };
    window.addEventListener('storage', handler);
    window.addEventListener('auth_token_cleared', customHandler);
    return () => {
      window.removeEventListener('storage', handler);
      window.removeEventListener('auth_token_cleared', customHandler);
    };
  }, [token, logout]);

  // 角色由后端权限标记权威判定，不再维护可切换的视图状态
  // 优先级：JWT claim（同步可靠，无网络竞态）> React user state > localStorage 兜底
  const isAdmin = (() => {
    if (token) {
      const jwtInfo = parseToken(token);
      if (jwtInfo?.isAdmin === true) return true;
      if (jwtInfo?.isAdmin === false) return false;
      // JWT 不含 IsAdmin claim（兼容旧 token），回退到其他来源
    }
    if (user?.isAdmin !== undefined) return user.isAdmin;
    return getStoredUser()?.isAdmin ?? false;
  })();

  const value = useMemo(
    () => ({
      token,
      user,
      login,
      logout,
      isAuthenticated: !!token,
      refreshAdmin,
      isAdmin,
    }),
    [token, user, login, logout, refreshAdmin, isAdmin],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** 使用认证上下文 Hook */
export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
