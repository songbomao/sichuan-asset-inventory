import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Profile from './Profile';

// Mock useAuth
const mockLogout = vi.fn();
const mockNavigate = vi.fn();

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'u-001',
      username: 'zhangsan',
      name: '张三',
      role: '盘点员',
      department: '资产管理处',
    },
    logout: mockLogout,
  }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

function renderProfile() {
  return render(
    <MemoryRouter>
      <Profile />
    </MemoryRouter>,
  );
}

describe('Profile Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should display user name and username', () => {
    renderProfile();
    expect(screen.getByText('张三')).toBeDefined();
    expect(screen.getByText('@zhangsan')).toBeDefined();
  });

  it('should display user role and department', () => {
    renderProfile();
    expect(screen.getByText('盘点员')).toBeDefined();
    expect(screen.getByText('资产管理处')).toBeDefined();
  });

  it('should display user ID', () => {
    renderProfile();
    expect(screen.getByText('u-001')).toBeDefined();
  });

  it('should render logout button', () => {
    renderProfile();
    expect(screen.getByText('退出登录')).toBeDefined();
  });

  it('should call logout and navigate on logout click', async () => {
    const user = userEvent.setup();
    renderProfile();

    await user.click(screen.getByText('退出登录'));

    expect(mockLogout).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true });
  });

  it('should display app version', () => {
    renderProfile();
    expect(screen.getByText('v202607180010')).toBeDefined();
  });
});
