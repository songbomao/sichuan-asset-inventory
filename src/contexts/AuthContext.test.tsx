import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';
import React from 'react';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

// Mock parseToken and getStoredUser from api/auth
vi.mock('../api/auth', () => ({
  parseToken: vi.fn((token: string) => {
    if (!token || token === 'bad-token') return null;
    return {
      id: 'u1',
      username: 'testuser',
      name: '测试用户',
      role: 'operator',
      department: 'IT部',
    };
  }),
  getStoredUser: vi.fn(() => {
    const raw = localStorage.getItem('auth_user');
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  }),
}));

// Wrapper component that provides AuthContext
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

describe('AuthContext', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  describe('initial state', () => {
    it('should initialize with null token and user when localStorage is empty', () => {
      const { result } = renderHook(() => useAuth(), { wrapper });
      expect(result.current.token).toBeNull();
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should initialize from localStorage when auth_token exists', () => {
      const user = JSON.stringify({ id: 'u1', username: 'test', name: 'Test', role: 'op', department: 'dept' });
      localStorage.setItem('auth_token', 'existing-token');
      localStorage.setItem('auth_user', user);

      const { result } = renderHook(() => useAuth(), { wrapper });
      expect(result.current.token).toBe('existing-token');
      expect(result.current.isAuthenticated).toBe(true);
    });
  });

  describe('login', () => {
    it('should set token, parse user, and store in localStorage', () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      act(() => {
        result.current.login('valid-jwt-token');
      });

      expect(result.current.token).toBe('valid-jwt-token');
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).not.toBeNull();
      expect(result.current.user?.name).toBe('测试用户');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('auth_token', 'valid-jwt-token');
    });

    it('should still set token even when parseToken fails', () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      act(() => {
        result.current.login('bad-token');
      });

      expect(result.current.token).toBe('bad-token');
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toBeNull();
    });
  });

  describe('logout', () => {
    it('should clear token, user, and localStorage', () => {
      localStorage.setItem('auth_token', 'some-token');
      localStorage.setItem('auth_user', '{"id":"1"}');

      const { result } = renderHook(() => useAuth(), { wrapper });

      // First login to set state
      act(() => {
        result.current.login('valid-jwt-token');
      });

      expect(result.current.isAuthenticated).toBe(true);

      // Then logout
      act(() => {
        result.current.logout();
      });

      expect(result.current.token).toBeNull();
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('auth_token');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('auth_user');
    });
  });

  describe('isAuthenticated', () => {
    it('should reflect login/logout state correctly', () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current.isAuthenticated).toBe(false);

      act(() => { result.current.login('token'); });
      expect(result.current.isAuthenticated).toBe(true);

      act(() => { result.current.logout(); });
      expect(result.current.isAuthenticated).toBe(false);
    });
  });
});
