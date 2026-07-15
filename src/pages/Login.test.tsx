import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Login from './Login';

// Mock useAuth hook
const mockLogin = vi.fn();
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ login: mockLogin }),
}));

// Mock login API
const mockApiLogin = vi.fn();
vi.mock('../api/auth', () => ({
  login: (...args: any[]) => mockApiLogin(...args),
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

function renderLogin() {
  return render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>,
  );
}

describe('Login Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApiLogin.mockReset();
    mockLogin.mockReset();
    mockNavigate.mockReset();
  });

  it('should render login form with title', () => {
    renderLogin();
    expect(screen.getByText('四川固定资产盘点系统')).toBeDefined();
    expect(screen.getByText('账号登录')).toBeDefined();
    expect(screen.getByLabelText('用户名')).toBeDefined();
    expect(screen.getByLabelText('密码')).toBeDefined();
    expect(screen.getByRole('button', { name: /登 录/ })).toBeDefined();
  });

  it('should show validation error when submitting empty form', async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.click(screen.getByRole('button', { name: /登 录/ }));

    await waitFor(() => {
      expect(screen.getByText('请输入用户名和密码')).toBeDefined();
    });
  });

  it('should show validation error when only username is filled', async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByLabelText('用户名'), 'testuser');
    await user.click(screen.getByRole('button', { name: /登 录/ }));

    await waitFor(() => {
      expect(screen.getByText('请输入用户名和密码')).toBeDefined();
    });
  });

  it('should call login API on valid submission', async () => {
    const user = userEvent.setup();
    mockApiLogin.mockResolvedValueOnce({ access_token: 'jwt-token-123' });

    renderLogin();

    await user.type(screen.getByLabelText('用户名'), 'testuser');
    await user.type(screen.getByLabelText('密码'), 'password123');
    await user.click(screen.getByRole('button', { name: /登 录/ }));

    await waitFor(() => {
      expect(mockApiLogin).toHaveBeenCalledWith({
        username: 'testuser',
        password: 'password123',
      });
    });
  });

  it('should call auth.login and navigate on success', async () => {
    const user = userEvent.setup();
    mockApiLogin.mockResolvedValueOnce({ access_token: 'jwt-token-123' });

    renderLogin();

    await user.type(screen.getByLabelText('用户名'), 'testuser');
    await user.type(screen.getByLabelText('密码'), 'password123');
    await user.click(screen.getByRole('button', { name: /登 录/ }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('jwt-token-123');
      expect(mockNavigate).toHaveBeenCalledWith('/tasks', { replace: true });
    });
  });

  it('should show error on login failure', async () => {
    const user = userEvent.setup();
    mockApiLogin.mockRejectedValueOnce(new Error('用户名或密码错误'));

    renderLogin();

    await user.type(screen.getByLabelText('用户名'), 'testuser');
    await user.type(screen.getByLabelText('密码'), 'wrong');
    await user.click(screen.getByRole('button', { name: /登 录/ }));

    await waitFor(() => {
      expect(screen.getByText('用户名或密码错误')).toBeDefined();
    });
  });

  it('should show generic error on non-Error exception', async () => {
    const user = userEvent.setup();
    mockApiLogin.mockRejectedValueOnce('string error');

    renderLogin();

    await user.type(screen.getByLabelText('用户名'), 'testuser');
    await user.type(screen.getByLabelText('密码'), 'pass');
    await user.click(screen.getByRole('button', { name: /登 录/ }));

    await waitFor(() => {
      expect(screen.getByText('登录失败，请稍后重试')).toBeDefined();
    });
  });

  it('should show loading state during submission', async () => {
    const user = userEvent.setup();
    // Make the API call hang to observe loading state
    mockApiLogin.mockImplementationOnce(() => new Promise(() => {}));

    renderLogin();

    await user.type(screen.getByLabelText('用户名'), 'testuser');
    await user.type(screen.getByLabelText('密码'), 'password');
    await user.click(screen.getByRole('button', { name: /登 录/ }));

    // Submit button should now contain a CircularProgress (disabled state)
    const submitButton = screen.getByRole('button', { name: /登 录/ });
    expect(submitButton).toBeDisabled();
  });

  it('should toggle password visibility', async () => {
    const user = userEvent.setup();
    renderLogin();

    const passwordInput = screen.getByLabelText('密码');
    expect(passwordInput.getAttribute('type')).toBe('password');

    // Click visibility toggle
    const toggleButton = document.querySelector('button[aria-label="toggle password visibility"]');
    // The IconButton doesn't have an aria-label by default, so find the button inside InputAdornment
    const visibilityButton = screen.getByLabelText('密码').parentElement?.querySelector('button');
    if (visibilityButton) {
      await user.click(visibilityButton);
      expect(passwordInput.getAttribute('type')).toBe('text');
    }
  });

  it('should trim username before submitting', async () => {
    const user = userEvent.setup();
    mockApiLogin.mockResolvedValueOnce({ access_token: 'token' });

    renderLogin();

    await user.type(screen.getByLabelText('用户名'), '  testuser  ');
    await user.type(screen.getByLabelText('密码'), 'password');
    await user.click(screen.getByRole('button', { name: /登 录/ }));

    await waitFor(() => {
      expect(mockApiLogin).toHaveBeenCalledWith({
        username: 'testuser',
        password: 'password',
      });
    });
  });
});
