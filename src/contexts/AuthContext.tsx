import { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { DingtalkUserInfo } from '../api/auth';
import { getStoredUser } from '../api/auth';
import { getAdminInfo } from '../api/admin';

/** 视图角色：责任人视图 / 管理员视图 */
export type RoleView = 'owner' | 'admin';

/** 认证上下文值 */
interface AuthContextValue {
  token: string | null;
  user: DingtalkUserInfo | null;
  login: (token: string, userInfo?: DingtalkUserInfo) => void;
  logout: () => void;
  isAuthenticated: boolean;
  /** 从后端刷新当前用户的 isAdmin/isSuper 标记（管理员配置变更后立即生效） */
  refreshAdmin: () => Promise<void>;
  /** 当前信息架构视图角色，默认 'owner'。仅 user.isAdmin 时允许切到 'admin' */
  roleView: RoleView;
  /** 切换视图角色（非管理员请求 admin 会被忽略） */
  setRoleView: (view: RoleView) => void;
}

const AuthContext = createContext<AuthContextValue>({
  token: null,
  user: null,
  login: () => {},
  logout: () => {},
  isAuthenticated: false,
  refreshAdmin: async () => {},
  roleView: 'owner',
  setRoleView: () => {},
});

/** 认证上下文 Provider */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem('auth_token'),
  );
  const [user, setUser] = useState<DingtalkUserInfo | null>(() => getStoredUser());

  // 视图角色：默认从 localStorage 读取，缺失或非管理员遗留的 admin 一律回退 owner
  const [roleView, setRoleViewState] = useState<RoleView>(() => {
    const stored = localStorage.getItem('role_view');
    return stored === 'admin' ? 'admin' : 'owner';
  });

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
    localStorage.removeItem('role_view');
    setToken(null);
    setUser(null);
    setRoleViewState('owner');
  }, []);

  /** 切换视图角色：仅当用户为管理员时才允许进入 admin 视图 */
  const setRoleView = useCallback(
    (view: RoleView) => {
      if (view === 'admin' && !user?.isAdmin) {
        return;
      }
      localStorage.setItem('role_view', view);
      setRoleViewState(view);
    },
    [user?.isAdmin],
  );

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

  // 监听 localStorage 被其他标签页或 axios 拦截器清除 token 的事件，同步 React state
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === 'auth_token' && !e.newValue && token) {
        logout();
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, [token, logout]);

  // 用户权限变化时，若失去管理员身份则强制回退到责任人视图
  useEffect(() => {
    if (!user?.isAdmin && roleView === 'admin') {
      setRoleView('owner');
    }
  }, [user?.isAdmin, roleView, setRoleView]);

  const value = useMemo(
    () => ({
      token,
      user,
      login,
      logout,
      isAuthenticated: !!token,
      refreshAdmin,
      roleView,
      setRoleView,
    }),
    [token, user, login, logout, refreshAdmin, roleView, setRoleView],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** 使用认证上下文 Hook */
export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
