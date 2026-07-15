import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';

// Mock AuthContext - must be imported before App
const mockUseAuth = vi.fn();
vi.mock('./contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock all page components
vi.mock('./pages/Login', () => ({
  default: () => <div data-testid="login-page">Login Page</div>,
}));
vi.mock('./pages/TaskList', () => ({
  default: () => <div data-testid="tasklist-page">Task List Page</div>,
}));
vi.mock('./pages/Inventory', () => ({
  default: () => <div data-testid="inventory-page">Inventory Page</div>,
}));
vi.mock('./pages/Records', () => ({
  default: () => <div data-testid="records-page">Records Page</div>,
}));
vi.mock('./pages/Profile', () => ({
  default: () => <div data-testid="profile-page">Profile Page</div>,
}));
vi.mock('./components/Layout', () => ({
  default: () => (
    <div data-testid="layout">
      <div data-testid="outlet-marker" />
    </div>
  ),
}));

function renderApp(initialPath: string, token: string | null) {
  mockUseAuth.mockReturnValue({ token, user: token ? { id: '1', name: 'Test' } : null });
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <App />
    </MemoryRouter>,
  );
}

describe('App Routing', () => {
  beforeEach(() => {
    mockUseAuth.mockReset();
  });

  describe('unauthenticated user (token=null)', () => {
    it('should render login page at /login', () => {
      renderApp('/login', null);
      expect(screen.getByTestId('login-page')).toBeDefined();
    });

    it('should redirect /tasks to /login', () => {
      renderApp('/tasks', null);
      // ProtectedRoute redirects to /login
      expect(screen.getByTestId('login-page')).toBeDefined();
    });

    it('should redirect /records to /login', () => {
      renderApp('/records', null);
      expect(screen.getByTestId('login-page')).toBeDefined();
    });

    it('should redirect /profile to /login', () => {
      renderApp('/profile', null);
      expect(screen.getByTestId('login-page')).toBeDefined();
    });

    it('should redirect /tasks/:id/inventory to /login', () => {
      renderApp('/tasks/123/inventory', null);
      expect(screen.getByTestId('login-page')).toBeDefined();
    });
  });

  describe('authenticated user (token=present)', () => {
    it('should redirect /login to /tasks when authenticated', () => {
      renderApp('/login', 'valid-token');
      // PublicRoute redirects to /tasks
      expect(screen.getByTestId('tasklist-page')).toBeDefined();
    });

    it('should render layout at /tasks', () => {
      renderApp('/tasks', 'valid-token');
      expect(screen.getByTestId('layout')).toBeDefined();
    });

    it('should render inventory page at /tasks/:id/inventory', () => {
      renderApp('/tasks/123/inventory', 'valid-token');
      expect(screen.getByTestId('inventory-page')).toBeDefined();
    });

    it('should redirect unknown routes to /tasks', () => {
      renderApp('/unknown-path', 'valid-token');
      expect(screen.getByTestId('tasklist-page')).toBeDefined();
    });
  });
});
