import { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { DingtalkUserInfo } from '../api/auth';
import { getStoredUser } from '../api/auth';
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
}

const AuthContext = createContext<AuthContextValue>({
  token: null,
  user: null,
  login: () => {},
  logout: () => {},
  isAuthenticated: false,
  refreshAdmin: async () => {},
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
      setUser((u) =>
        u ? { ...u, isAdmin: info.isAdmin, isSuper: info.isSuper } : u,
      );
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

  const value = useMemo(
    () => ({
      token,
      user,
      login,
      logout,
      isAuthenticated: !!token,
      refreshAdmin,
    }),
    [token, user, login, logout, refreshAdmin],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** 使用认证上下文 Hook */
export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
