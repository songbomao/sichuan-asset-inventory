import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { parseToken, saveAuth, clearAuth, getStoredUser } from './auth';

// Base64-encode helper (for generating mock JWT tokens)
function base64Encode(str: string): string {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(str);
  let binary = '';
  bytes.forEach((b) => { binary += String.fromCharCode(b); });
  return btoa(binary);
}

function makeToken(payload: Record<string, unknown>): string {
  const header = base64Encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64Encode(JSON.stringify(payload));
  const sig = 'mock_signature';
  return `${header}.${body}.${sig}`;
}

// Setup localStorage mock BEFORE tests run
const store: Record<string, string> = {};
vi.stubGlobal('localStorage', {
  getItem: vi.fn((key: string) => store[key] ?? null),
  setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
  removeItem: vi.fn((key: string) => { delete store[key]; }),
  clear: vi.fn(() => { for (const k of Object.keys(store)) delete store[k]; }),
});

describe('parseToken', () => {
  it('should parse a valid JWT token with standard claims', () => {
    const token = makeToken({
      sub: 'user123',
      name: '张三',
      role: 'admin',
      department: '财务部',
    });
    const result = parseToken(token);
    expect(result).not.toBeNull();
    expect(result!.id).toBe('user123');
    expect(result!.username).toBe('user123');
    expect(result!.name).toBe('张三');
    expect(result!.role).toBe('admin');
    expect(result!.department).toBe('财务部');
  });

  it('should parse a token with user_id claim', () => {
    const token = makeToken({
      user_id: 'u456',
      name: '李四',
    });
    const result = parseToken(token);
    expect(result).not.toBeNull();
    expect(result!.id).toBe('u456');
  });

  it('should parse a token with nameid claim', () => {
    const token = makeToken({
      nameid: 'u789',
      given_name: '王五',
    });
    const result = parseToken(token);
    expect(result).not.toBeNull();
    expect(result!.id).toBe('u789');
    expect(result!.name).toBe('王五');
  });

  it('should handle token with user_role and dept claims', () => {
    const token = makeToken({
      sub: 'u001',
      unique_name: '赵六',
      user_role: 'operator',
      dept: 'IT部',
    });
    const result = parseToken(token);
    expect(result).not.toBeNull();
    expect(result!.name).toBe('赵六');
    expect(result!.role).toBe('operator');
    expect(result!.department).toBe('IT部');
  });

  it('should return null for an empty string', () => {
    expect(parseToken('')).toBeNull();
  });

  it('should return null for a malformed token (not 3 parts)', () => {
    expect(parseToken('only.two')).toBeNull();
    expect(parseToken('one.two.three.four')).toBeNull();
    expect(parseToken('justastring')).toBeNull();
  });

  it('should return null for invalid base64 in payload', () => {
    const result = parseToken('header.!!!invalid_base64!!!.sig');
    expect(result).toBeNull();
  });

  it('should return null for non-JSON payload', () => {
    const header = base64Encode(JSON.stringify({ alg: 'HS256' }));
    const body = base64Encode('not-json');
    const token = `${header}.${body}.sig`;
    expect(parseToken(token)).toBeNull();
  });

  it('should handle payload with missing fields gracefully', () => {
    const token = makeToken({ sub: 'u000' });
    const result = parseToken(token);
    expect(result).not.toBeNull();
    expect(result!.name).toBe('');
    expect(result!.role).toBe('');
    expect(result!.department).toBe('');
  });
});

describe('saveAuth / clearAuth / getStoredUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const k of Object.keys(store)) delete store[k];
  });

  it('should save token and parsed user to localStorage', () => {
    const token = makeToken({
      sub: 'user1',
      name: '测试用户',
      role: 'operator',
      department: '后勤部',
    });
    saveAuth(token);
    const ls = globalThis.localStorage as any;

    // Check token was saved
    expect(ls.setItem).toHaveBeenCalledWith('auth_token', token);

    // Check user was saved (parsed from token)
    const setItemCalls = (ls.setItem as ReturnType<typeof vi.fn>).mock.calls;
    const userCall = setItemCalls.find((c: string[]) => c[0] === 'auth_user');
    expect(userCall).toBeDefined();
    expect(JSON.parse(userCall![1]).name).toBe('测试用户');
  });

  it('should still save token even if parse fails', () => {
    // Token with just 1 part (invalid) - parseToken returns null
    saveAuth('invalid-token');
    const ls = globalThis.localStorage as any;
    expect(ls.setItem).toHaveBeenCalledWith('auth_token', 'invalid-token');

    // auth_user should NOT be set since parse fails
    const setItemCalls = (ls.setItem as ReturnType<typeof vi.fn>).mock.calls;
    const userCall = setItemCalls.find((c: string[]) => c[0] === 'auth_user');
    expect(userCall).toBeUndefined();
  });

  it('should remove both auth_token and auth_user on clearAuth', () => {
    store['auth_token'] = 'some-token';
    store['auth_user'] = '{"id":"1"}';
    clearAuth();
    const ls = globalThis.localStorage as any;
    expect(ls.removeItem).toHaveBeenCalledWith('auth_token');
    expect(ls.removeItem).toHaveBeenCalledWith('auth_user');
  });

  it('should return parsed user from localStorage', () => {
    store['auth_user'] = JSON.stringify({
      id: 'u1', username: 'test', name: 'Test', role: 'op', department: 'dept',
    });
    const result = getStoredUser();
    expect(result).toEqual({
      id: 'u1', username: 'test', name: 'Test', role: 'op', department: 'dept',
    });
  });

  it('should return null when auth_user is not set', () => {
    expect(getStoredUser()).toBeNull();
  });

  it('should return null for invalid JSON', () => {
    store['auth_user'] = '{invalid';
    expect(getStoredUser()).toBeNull();
  });
});
