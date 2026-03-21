import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@/test/test-utils';
import { useSession, signOut } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';

// Mock NextAuth
vi.mock('next-auth/react', () => ({
  useSession: vi.fn(),
  signOut: vi.fn()
}));

// Mock Next.js router
vi.mock('next/navigation', () => ({
  usePathname: vi.fn()
}));

describe('Sidebar', () => {
  beforeEach(() => {
    vi.mocked(usePathname).mockReturnValue('/');
    vi.mocked(signOut).mockResolvedValue();
    cleanup();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders with authenticated user', () => {
    vi.mocked(useSession).mockReturnValue({
      data: {
        user: {
          id: '1',
          name: 'John Doe',
          email: 'john@example.com',
          organizationId: 'org-1',
          organizationName: 'Test Organization',
          role: 'admin'
        }
      },
      status: 'authenticated'
    } as any);

    render(<Sidebar />);

    expect(screen.getByText('HelixPSA')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('admin • Test Organization')).toBeInTheDocument();
    expect(screen.getByText('JD')).toBeInTheDocument(); // User initials
  });

  it('renders with no session', () => {
    vi.mocked(useSession).mockReturnValue({
      data: null,
      status: 'loading'
    } as any);

    render(<Sidebar />);

    expect(screen.getByText('HelixPSA')).toBeInTheDocument();
    expect(screen.getByText('User')).toBeInTheDocument();
    expect(screen.getByText('Member • Organization')).toBeInTheDocument();
    expect(screen.getByText('U')).toBeInTheDocument(); // Default initials
  });

  it('shows logout menu when user avatar is clicked', () => {
    vi.mocked(useSession).mockReturnValue({
      data: {
        user: {
          id: '1',
          name: 'John Doe',
          email: 'john@example.com',
          organizationId: 'org-1',
          organizationName: 'Test Organization',
          role: 'admin'
        }
      },
      status: 'authenticated'
    } as any);

    render(<Sidebar />);

    const userButton = screen.getByText('John Doe').closest('button');
    expect(userButton).toBeInTheDocument();

    fireEvent.click(userButton!);

    expect(screen.getByText('Sign Out')).toBeInTheDocument();
  });

  it('calls signOut when logout button is clicked', async () => {
    vi.mocked(useSession).mockReturnValue({
      data: {
        user: {
          id: '1',
          name: 'John Doe',
          email: 'john@example.com',
          organizationId: 'org-1',
          organizationName: 'Test Organization',
          role: 'admin'
        }
      },
      status: 'authenticated'
    } as any);

    render(<Sidebar />);

    // Open logout menu
    const userButton = screen.getByText('John Doe').closest('button');
    fireEvent.click(userButton!);

    // Click logout
    const logoutButton = screen.getByText('Sign Out');
    fireEvent.click(logoutButton);

    expect(vi.mocked(signOut)).toHaveBeenCalledWith({ callbackUrl: '/auth/signin' });
  });

  it('generates correct user initials', () => {
    vi.mocked(useSession).mockReturnValue({
      data: {
        user: {
          id: '1',
          name: 'Jane Smith-Johnson',
          email: 'jane@example.com',
          organizationId: 'org-1',
          organizationName: 'Test Organization',
          role: 'technician'
        }
      },
      status: 'authenticated'
    } as any);

    render(<Sidebar />);

    expect(screen.getByText('JS')).toBeInTheDocument(); // First two initials
  });

  it('handles single name correctly', () => {
    vi.mocked(useSession).mockReturnValue({
      data: {
        user: {
          id: '1',
          name: 'Madonna',
          email: 'madonna@example.com',
          organizationId: 'org-1',
          organizationName: 'Test Organization',
          role: 'admin'
        }
      },
      status: 'authenticated'
    } as any);

    render(<Sidebar />);

    expect(screen.getByText('M')).toBeInTheDocument();
  });

  it('collapses and expands correctly', () => {
    vi.mocked(useSession).mockReturnValue({
      data: {
        user: {
          id: '1',
          name: 'John Doe',
          email: 'john@example.com',
          organizationId: 'org-1',
          organizationName: 'Test Organization',
          role: 'admin'
        }
      },
      status: 'authenticated'
    } as any);

    render(<Sidebar />);

    // Initially expanded - should show text labels
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Tickets')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();

    // Click logo to collapse
    const logo = screen.getByText('HelixPSA').closest('div');
    fireEvent.click(logo!);

    // In collapsed state, text should still be rendered but hidden via CSS
    // Icons should still be visible
    expect(screen.getByText('📊')).toBeInTheDocument();
    expect(screen.getByText('🎫')).toBeInTheDocument();
  });

  it('highlights active navigation item', () => {
    vi.mocked(usePathname).mockReturnValue('/tickets');
    vi.mocked(useSession).mockReturnValue({
      data: {
        user: {
          id: '1',
          name: 'John Doe',
          email: 'john@example.com',
          organizationId: 'org-1',
          organizationName: 'Test Organization',
          role: 'admin'
        }
      },
      status: 'authenticated'
    } as any);

    render(<Sidebar />);

    const ticketsLink = screen.getByText('Tickets').closest('a');
    expect(ticketsLink).toHaveAttribute('href', '/tickets');
  });

  it('shows all navigation items', () => {
    vi.mocked(useSession).mockReturnValue({
      data: {
        user: {
          id: '1',
          name: 'John Doe',
          email: 'john@example.com',
          organizationId: 'org-1',
          organizationName: 'Test Organization',
          role: 'admin'
        }
      },
      status: 'authenticated'
    } as any);

    render(<Sidebar />);

    // Check main navigation items
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Tickets')).toBeInTheDocument();
    expect(screen.getByText('Clients')).toBeInTheDocument();
    expect(screen.getByText('Time')).toBeInTheDocument();
    expect(screen.getByText('Billing')).toBeInTheDocument();
    expect(screen.getByText('Assets')).toBeInTheDocument();
    expect(screen.getByText('Schedule')).toBeInTheDocument();
    expect(screen.getByText('Reports')).toBeInTheDocument();

    // Check bottom navigation items
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Help')).toBeInTheDocument();
  });

  it('hides logout menu when collapsed', () => {
    vi.mocked(useSession).mockReturnValue({
      data: {
        user: {
          id: '1',
          name: 'John Doe',
          email: 'john@example.com',
          organizationId: 'org-1',
          organizationName: 'Test Organization',
          role: 'admin'
        }
      },
      status: 'authenticated'
    } as any);

    render(<Sidebar />);

    // Collapse sidebar
    const logo = screen.getByText('HelixPSA').closest('div');
    fireEvent.click(logo!);

    // Try to click user button (should still be clickable)
    const userButton = screen.getByText('JD').closest('button');
    fireEvent.click(userButton!);

    // Logout menu should not appear when collapsed
    expect(screen.queryByText('Sign Out')).not.toBeInTheDocument();
  });
});