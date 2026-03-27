import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import NotificationPreferences from './NotificationPreferences';
import { api } from '@/utils/api';
import { toast } from './Toast';

// Mock dependencies
vi.mock('@/utils/api', () => ({
  api: {
    notifications: {
      getPreferences: {
        useQuery: vi.fn(),
      },
      updatePreferences: {
        useMutation: vi.fn(),
      },
      sendTestNotification: {
        useMutation: vi.fn(),
      },
    },
    clients: {
      getAll: {
        useQuery: vi.fn(),
      },
    },
  },
}));

vi.mock('./Toast', () => ({
  toast: vi.fn(),
}));

const mockPreferences = [
  {
    id: '1',
    notificationType: 'sla_breach' as const,
    channel: 'email' as const,
    isEnabled: true,
    settings: {
      frequency: 'immediate' as const,
      escalationLevel: 'all' as const,
      assignedOnly: false,
      digest: false,
    },
  },
  {
    id: '2',
    notificationType: 'ticket_assigned' as const,
    channel: 'email' as const,
    isEnabled: true,
    settings: {
      frequency: 'immediate' as const,
      escalationLevel: 'high_priority' as const,
      assignedOnly: true,
      digest: false,
      quietHours: {
        start: '22:00',
        end: '08:00',
      },
    },
  },
  {
    id: '3',
    notificationType: 'warranty_expiring' as const,
    channel: 'email' as const,
    isEnabled: false,
    settings: {
      frequency: 'daily' as const,
      escalationLevel: 'all' as const,
      assignedOnly: false,
      digest: true,
    },
  },
];

const mockClients = [
  { id: 'client-1', name: 'Acme Corp' },
  { id: 'client-2', name: 'Tech Solutions' },
  { id: 'client-3', name: 'Global Industries' },
];

describe('NotificationPreferences', () => {
  const mockGetPreferences = vi.fn();
  const mockUpdatePreferences = vi.fn();
  const mockSendTestNotification = vi.fn();
  const mockGetClients = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mock return values
    mockGetPreferences.mockReturnValue({
      data: mockPreferences,
      isLoading: false,
      refetch: vi.fn(),
    });

    mockUpdatePreferences.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({}),
      isLoading: false,
    });

    mockSendTestNotification.mockReturnValue({
      mutate: vi.fn(),
      isLoading: false,
    });

    mockGetClients.mockReturnValue({
      data: mockClients,
      isLoading: false,
    });

    (api.notifications.getPreferences.useQuery as any).mockImplementation(() => mockGetPreferences());
    (api.notifications.updatePreferences.useMutation as any).mockImplementation(() => mockUpdatePreferences());
    (api.notifications.sendTestNotification.useMutation as any).mockImplementation(() => mockSendTestNotification());
    (api.clients.getAll.useQuery as any).mockImplementation(() => mockGetClients());
  });

  it('renders notification preferences correctly', () => {
    render(<NotificationPreferences />);

    expect(screen.getByText('Notification Preferences')).toBeInTheDocument();
    expect(screen.getByText('SLA Breach Alerts')).toBeInTheDocument();
    expect(screen.getByText('Ticket Assignment Notifications')).toBeInTheDocument();
    expect(screen.getByText('Warranty Expiration Alerts')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    mockGetPreferences.mockReturnValue({
      data: undefined,
      isLoading: true,
      refetch: vi.fn(),
    });

    render(<NotificationPreferences />);
    
    expect(screen.getAllByTestId('loading-skeleton').length).toBeGreaterThan(0);
  });

  it('displays enabled and disabled preferences correctly', () => {
    render(<NotificationPreferences />);

    // SLA Breach should be enabled (checkbox checked)
    const slaBreachToggle = screen.getByRole('checkbox', { name: /sla breach/i });
    expect(slaBreachToggle).toBeChecked();

    // Warranty Expiring should be disabled (checkbox unchecked)
    const warrantyToggle = screen.getByRole('checkbox', { name: /warranty/i });
    expect(warrantyToggle).not.toBeChecked();
  });

  it('allows toggling notification preferences', async () => {
    const mockMutateAsync = vi.fn().mockResolvedValue({});
    mockUpdatePreferences.mockReturnValue({
      mutateAsync: mockMutateAsync,
      isLoading: false,
    });

    render(<NotificationPreferences />);

    const warrantyToggle = screen.getByRole('checkbox', { name: /warranty/i });
    fireEvent.click(warrantyToggle);

    const saveButton = screen.getByText('Save Preferences');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            notificationType: 'warranty_expiring',
            isEnabled: true,
          }),
        ])
      );
    });
  });

  it('expands and collapses settings panel', () => {
    render(<NotificationPreferences />);

    const settingsButton = screen.getAllByText('Settings')[0];
    fireEvent.click(settingsButton);

    expect(screen.getByText('Delivery Frequency')).toBeInTheDocument();
    expect(screen.getByText('Priority Level')).toBeInTheDocument();

    // Close settings
    fireEvent.click(settingsButton);
    expect(screen.queryByText('Delivery Frequency')).not.toBeInTheDocument();
  });

  it('shows frequency options in settings', () => {
    render(<NotificationPreferences />);

    const settingsButton = screen.getAllByText('Settings')[0];
    fireEvent.click(settingsButton);

    const frequencySelect = screen.getByDisplayValue('Immediate');
    expect(frequencySelect).toBeInTheDocument();

    fireEvent.change(frequencySelect, { target: { value: 'daily' } });
    expect(frequencySelect).toHaveValue('daily');
  });

  it('shows escalation level options in settings', () => {
    render(<NotificationPreferences />);

    const settingsButton = screen.getAllByText('Settings')[0];
    fireEvent.click(settingsButton);

    const escalationSelect = screen.getByDisplayValue('All notifications');
    expect(escalationSelect).toBeInTheDocument();

    fireEvent.change(escalationSelect, { target: { value: 'critical_only' } });
    expect(escalationSelect).toHaveValue('critical_only');
  });

  it('handles quiet hours settings', () => {
    render(<NotificationPreferences />);

    // Find and expand ticket assigned settings (which has quiet hours)
    const settingsButtons = screen.getAllByText('Settings');
    const ticketAssignedButton = settingsButtons[1]; // Second settings button for ticket_assigned
    fireEvent.click(ticketAssignedButton);

    const quietHoursCheckbox = screen.getByLabelText('Enable quiet hours');
    expect(quietHoursCheckbox).toBeChecked(); // Should be checked based on mock data

    const startTimeInput = screen.getByDisplayValue('22:00');
    const endTimeInput = screen.getByDisplayValue('08:00');
    
    expect(startTimeInput).toBeInTheDocument();
    expect(endTimeInput).toBeInTheDocument();

    // Test changing times
    fireEvent.change(startTimeInput, { target: { value: '23:00' } });
    expect(startTimeInput).toHaveValue('23:00');
  });

  it('shows assignment filter for ticket notifications', () => {
    render(<NotificationPreferences />);

    // Expand ticket assigned settings
    const settingsButtons = screen.getAllByText('Settings');
    const ticketAssignedButton = settingsButtons[1]; // ticket_assigned
    fireEvent.click(ticketAssignedButton);

    const assignedOnlyCheckbox = screen.getByLabelText('Only notify for tickets assigned to me');
    expect(assignedOnlyCheckbox).toBeChecked(); // Based on mock data
  });

  it('shows client filter options', () => {
    render(<NotificationPreferences />);

    const settingsButton = screen.getAllByText('Settings')[0];
    fireEvent.click(settingsButton);

    expect(screen.getByText('Client Filter (leave empty for all clients)')).toBeInTheDocument();
    
    const clientSelect = screen.getByRole('listbox');
    expect(clientSelect).toBeInTheDocument();

    // Check if clients are in the options
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    expect(screen.getByText('Tech Solutions')).toBeInTheDocument();
    expect(screen.getByText('Global Industries')).toBeInTheDocument();
  });

  it('shows digest option for daily/weekly frequencies', () => {
    render(<NotificationPreferences />);

    // First enable the warranty notification (it's disabled by default)
    const warrantyToggle = screen.getByLabelText('Enable Warranty Expiration Alerts');
    fireEvent.click(warrantyToggle);

    // Then expand settings
    const settingsButtons = screen.getAllByText('Settings');
    const warrantyButton = settingsButtons[2]; // warranty_expiring
    fireEvent.click(warrantyButton);

    const digestCheckbox = screen.getByLabelText('Send as digest summary');
    expect(digestCheckbox).toBeChecked(); // Based on mock data
  });

  it('disables settings and test buttons for disabled notifications', () => {
    render(<NotificationPreferences />);

    // Find the disabled buttons in the warranty row
    const warrantySection = screen.getByText('Warranty Expiration Alerts').closest('.bg-gray-50');
    const buttons = warrantySection?.querySelectorAll('button[disabled]');
    
    expect(buttons).toHaveLength(2); // Settings and Test buttons should both be disabled
    expect(buttons?.[0]).toBeDisabled(); // Settings
    expect(buttons?.[1]).toBeDisabled(); // Test
  });

  it('sends test notifications', () => {
    const mockMutate = vi.fn();
    mockSendTestNotification.mockReturnValue({
      mutate: mockMutate,
      isLoading: false,
    });

    render(<NotificationPreferences />);

    const testButtons = screen.getAllByText('Test');
    const enabledTestButton = testButtons[0]; // First enabled test button
    
    fireEvent.click(enabledTestButton);

    expect(mockMutate).toHaveBeenCalledWith({
      notificationType: 'sla_breach'
    });
  });

  it('saves preferences with enhanced settings', async () => {
    const mockMutateAsync = vi.fn().mockResolvedValue({});
    mockUpdatePreferences.mockReturnValue({
      mutateAsync: mockMutateAsync,
      isLoading: false,
    });

    render(<NotificationPreferences />);

    const saveButton = screen.getByText('Save Preferences');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            notificationType: 'sla_breach',
            isEnabled: true,
            settings: expect.objectContaining({
              frequency: 'immediate',
              escalationLevel: 'all',
              assignedOnly: false,
              digest: false,
            }),
          }),
        ])
      );
    });
  });

  it('shows success message after saving preferences', async () => {
    const mockMutateAsync = vi.fn().mockResolvedValue({});
    const mockRefetch = vi.fn();
    
    mockUpdatePreferences.mockReturnValue({
      mutateAsync: mockMutateAsync,
      isLoading: false,
    });

    mockGetPreferences.mockReturnValue({
      data: mockPreferences,
      isLoading: false,
      refetch: mockRefetch,
    });

    render(<NotificationPreferences />);

    const saveButton = screen.getByText('Save Preferences');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith('Notification preferences updated successfully');
      expect(mockRefetch).toHaveBeenCalled();
    });
  });

  it('handles save errors gracefully', async () => {
    const mockMutateAsync = vi.fn().mockRejectedValue(new Error('Save failed'));
    
    mockUpdatePreferences.mockReturnValue({
      mutateAsync: mockMutateAsync,
      isLoading: false,
    });

    render(<NotificationPreferences />);

    const saveButton = screen.getByText('Save Preferences');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith(
        expect.stringContaining('Failed to update preferences'),
        'error'
      );
    });
  });
});