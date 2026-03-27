import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import NotificationsPage from './page';
import { api } from '@/utils/api';

// Mock the NotificationPreferences component since we test it separately
vi.mock('@/components/NotificationPreferences', () => ({
  default: () => <div data-testid="notification-preferences">Notification Preferences Component</div>,
}));

vi.mock('@/components/Toast', () => ({
  toast: vi.fn(),
}));

vi.mock('@/utils/api', () => ({
  api: {
    notifications: {
      getEmailHistory: {
        useQuery: vi.fn(),
      },
      getStatistics: {
        useQuery: vi.fn(),
      },
      triggerChecks: {
        useMutation: vi.fn(),
      },
      processPending: {
        useMutation: vi.fn(),
      },
      retryFailed: {
        useMutation: vi.fn(),
      },
    },
  },
}));

const mockStats = {
  total: 150,
  pending: 5,
  sent: 140,
  failed: 5,
  byType: {
    sla_breach: 20,
    warranty_expiring: 30,
    ticket_assigned: 100,
  },
};

const mockHistory = [
  {
    id: '1',
    notificationType: 'sla_breach',
    subject: 'SLA Breach Alert - Ticket #123',
    status: 'sent',
    errorMessage: null,
    createdAt: '2026-03-26T08:00:00Z',
    recipient: {
      id: 'user-1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
    },
  },
  {
    id: '2',
    notificationType: 'warranty_expiring',
    subject: 'Warranty Expiring - Asset XYZ123',
    status: 'failed',
    errorMessage: 'SMTP connection timeout',
    createdAt: '2026-03-26T07:30:00Z',
    recipient: {
      id: 'user-2',
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane.smith@example.com',
    },
  },
  {
    id: '3',
    notificationType: 'ticket_assigned',
    subject: 'New Ticket Assignment - Ticket #456',
    status: 'pending',
    errorMessage: null,
    createdAt: '2026-03-26T07:00:00Z',
    recipient: {
      id: 'user-3',
      firstName: 'Bob',
      lastName: 'Johnson',
      email: 'bob.johnson@example.com',
    },
  },
];

describe('NotificationsPage', () => {
  const mockGetEmailHistory = vi.fn();
  const mockGetStatistics = vi.fn();
  const mockTriggerChecks = vi.fn();
  const mockProcessPending = vi.fn();
  const mockRetryFailed = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    mockGetEmailHistory.mockReturnValue({
      data: mockHistory,
      isLoading: false,
      refetch: vi.fn(),
    });

    mockGetStatistics.mockReturnValue({
      data: mockStats,
    });

    mockTriggerChecks.mockReturnValue({
      mutate: vi.fn(),
      isLoading: false,
    });

    mockProcessPending.mockReturnValue({
      mutate: vi.fn(),
      isLoading: false,
    });

    mockRetryFailed.mockReturnValue({
      mutate: vi.fn(),
      isLoading: false,
    });

    (api.notifications.getEmailHistory.useQuery as any).mockImplementation(mockGetEmailHistory);
    (api.notifications.getStatistics.useQuery as any).mockImplementation(mockGetStatistics);
    (api.notifications.triggerChecks.useMutation as any).mockImplementation(mockTriggerChecks);
    (api.notifications.processPending.useMutation as any).mockImplementation(mockProcessPending);
    (api.notifications.retryFailed.useMutation as any).mockImplementation(mockRetryFailed);
  });

  it('renders the notifications page with tabs', () => {
    render(<NotificationsPage />);

    expect(screen.getByText('Notifications')).toBeInTheDocument();
    expect(screen.getByText('Manage your notification preferences and view notification history')).toBeInTheDocument();
    expect(screen.getByText('Preferences')).toBeInTheDocument();
    expect(screen.getByText('History & Management')).toBeInTheDocument();
  });

  it('shows preferences tab by default', () => {
    render(<NotificationsPage />);

    expect(screen.getByTestId('notification-preferences')).toBeInTheDocument();
  });

  it('switches to history tab when clicked', () => {
    render(<NotificationsPage />);

    const historyTab = screen.getByText('History & Management');
    fireEvent.click(historyTab);

    expect(screen.getByText('Notification Management')).toBeInTheDocument();
    expect(screen.getByText('Notification History')).toBeInTheDocument();
  });

  it('displays statistics cards in history tab', () => {
    render(<NotificationsPage />);

    const historyTab = screen.getByText('History & Management');
    fireEvent.click(historyTab);

    expect(screen.getByText('Total Notifications')).toBeInTheDocument();
    expect(screen.getByText('150')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('Sent')).toBeInTheDocument();
    expect(screen.getByText('140')).toBeInTheDocument();
    expect(screen.getByText('Failed')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('displays management action buttons', () => {
    render(<NotificationsPage />);

    const historyTab = screen.getByText('History & Management');
    fireEvent.click(historyTab);

    expect(screen.getByText('Trigger All Checks')).toBeInTheDocument();
    expect(screen.getByText('Check SLAs')).toBeInTheDocument();
    expect(screen.getByText('Check Warranties')).toBeInTheDocument();
    expect(screen.getByText('Check Maintenance')).toBeInTheDocument();
    expect(screen.getByText('Process Pending')).toBeInTheDocument();
    expect(screen.getByText('Retry Failed')).toBeInTheDocument();
  });

  it('displays notification history table', () => {
    render(<NotificationsPage />);

    const historyTab = screen.getByText('History & Management');
    fireEvent.click(historyTab);

    // Check table headers
    expect(screen.getByText('Recipient')).toBeInTheDocument();
    expect(screen.getByText('Type')).toBeInTheDocument();
    expect(screen.getByText('Subject')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Created')).toBeInTheDocument();

    // Check notification data
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john.doe@example.com')).toBeInTheDocument();
    expect(screen.getByText('SLA Breach Alert - Ticket #123')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('Warranty Expiring - Asset XYZ123')).toBeInTheDocument();
    expect(screen.getByText('SMTP connection timeout')).toBeInTheDocument();
  });

  it('shows correct status badges', () => {
    render(<NotificationsPage />);

    const historyTab = screen.getByText('History & Management');
    fireEvent.click(historyTab);

    // Check for status badges (they should have appropriate colors)
    const sentBadge = screen.getByText('sent');
    const failedBadge = screen.getByText('failed');
    const pendingBadge = screen.getByText('pending');

    expect(sentBadge).toBeInTheDocument();
    expect(failedBadge).toBeInTheDocument();
    expect(pendingBadge).toBeInTheDocument();
  });

  it('shows correct type badges', () => {
    render(<NotificationsPage />);

    const historyTab = screen.getByText('History & Management');
    fireEvent.click(historyTab);

    expect(screen.getByText('sla breach')).toBeInTheDocument();
    expect(screen.getByText('warranty expiring')).toBeInTheDocument();
    expect(screen.getByText('ticket assigned')).toBeInTheDocument();
  });

  it('handles status filter changes', () => {
    render(<NotificationsPage />);

    const historyTab = screen.getByText('History & Management');
    fireEvent.click(historyTab);

    const statusFilter = screen.getByDisplayValue('All Statuses');
    fireEvent.change(statusFilter, { target: { value: 'failed' } });

    expect(statusFilter).toHaveValue('failed');
  });

  it('handles type filter changes', () => {
    render(<NotificationsPage />);

    const historyTab = screen.getByText('History & Management');
    fireEvent.click(historyTab);

    const typeFilter = screen.getByDisplayValue('All Types');
    fireEvent.change(typeFilter, { target: { value: 'sla_breach' } });

    expect(typeFilter).toHaveValue('sla_breach');
  });

  it('triggers notification checks', () => {
    const mockMutate = vi.fn();
    mockTriggerChecks.mockReturnValue({
      mutate: mockMutate,
      isLoading: false,
    });

    render(<NotificationsPage />);

    const historyTab = screen.getByText('History & Management');
    fireEvent.click(historyTab);

    const triggerAllButton = screen.getByText('Trigger All Checks');
    fireEvent.click(triggerAllButton);

    expect(mockMutate).toHaveBeenCalledWith({ checkType: 'all' });
  });

  it('triggers specific SLA checks', () => {
    const mockMutate = vi.fn();
    mockTriggerChecks.mockReturnValue({
      mutate: mockMutate,
      isLoading: false,
    });

    render(<NotificationsPage />);

    const historyTab = screen.getByText('History & Management');
    fireEvent.click(historyTab);

    const checkSLAsButton = screen.getByText('Check SLAs');
    fireEvent.click(checkSLAsButton);

    expect(mockMutate).toHaveBeenCalledWith({ checkType: 'sla' });
  });

  it('processes pending notifications', () => {
    const mockMutate = vi.fn();
    mockProcessPending.mockReturnValue({
      mutate: mockMutate,
      isLoading: false,
    });

    render(<NotificationsPage />);

    const historyTab = screen.getByText('History & Management');
    fireEvent.click(historyTab);

    const processPendingButton = screen.getByText('Process Pending');
    fireEvent.click(processPendingButton);

    expect(mockMutate).toHaveBeenCalled();
  });

  it('retries failed notifications', () => {
    const mockMutate = vi.fn();
    mockRetryFailed.mockReturnValue({
      mutate: mockMutate,
      isLoading: false,
    });

    render(<NotificationsPage />);

    const historyTab = screen.getByText('History & Management');
    fireEvent.click(historyTab);

    const retryFailedButton = screen.getByText('Retry Failed');
    fireEvent.click(retryFailedButton);

    expect(mockMutate).toHaveBeenCalledWith({});
  });

  it('shows loading state for history', () => {
    mockGetEmailHistory.mockReturnValue({
      data: undefined,
      isLoading: true,
      refetch: vi.fn(),
    });

    render(<NotificationsPage />);

    const historyTab = screen.getByText('History & Management');
    fireEvent.click(historyTab);

    // Should show loading skeleton
    expect(screen.getByText('Notification History')).toBeInTheDocument();
  });

  it('shows empty state when no notifications', () => {
    mockGetEmailHistory.mockReturnValue({
      data: [],
      isLoading: false,
      refetch: vi.fn(),
    });

    render(<NotificationsPage />);

    const historyTab = screen.getByText('History & Management');
    fireEvent.click(historyTab);

    expect(screen.getByText('No notifications found')).toBeInTheDocument();
  });

  it('shows buttons as disabled when loading', () => {
    mockTriggerChecks.mockReturnValue({
      mutate: vi.fn(),
      isLoading: true,
    });

    render(<NotificationsPage />);

    const historyTab = screen.getByText('History & Management');
    fireEvent.click(historyTab);

    const triggerAllButton = screen.getByText('Checking...');
    expect(triggerAllButton).toBeDisabled();
  });

  it('applies correct tab styling', () => {
    render(<NotificationsPage />);

    const preferencesTab = screen.getByText('Preferences');
    const historyTab = screen.getByText('History & Management');

    // Preferences tab should be active by default
    expect(preferencesTab).toHaveClass('border-blue-500', 'text-blue-600');
    expect(historyTab).toHaveClass('border-transparent', 'text-gray-500');

    // Switch to history tab
    fireEvent.click(historyTab);

    expect(historyTab).toHaveClass('border-blue-500', 'text-blue-600');
    expect(preferencesTab).toHaveClass('border-transparent', 'text-gray-500');
  });
});