import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import type { DingtalkUserInfo } from '../api/auth';
import { getStoredUser } from '../api/auth';

/** 认证上下文值 */
interface AuthContextValue {
  token: string | null;
  user: DingtalkUserInfo | null;
  login: (token: string, userInfo?: DingtalkUserInfo) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  token: null,
  user: null,
  login: () => {},
  logout: () => {},
  isAuthenticated: false,
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

  const value = useMemo(
    () => ({
      token,
      user,
      login,
      logout,
      isAuthenticated: !!token,
    }),
    [token, user, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** 使用认证上下文 Hook */
export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
