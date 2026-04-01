import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import IntegrationsPage from './page';
import { api } from '@/utils/api';
import { createMockQuery, createMockMutation, resetApiMocks } from '@/test-utils/trpc-mocks';

vi.mock('@/components/Toast', () => ({
  toast: vi.fn(),
}));

// Uses global mock from setup.ts - no local api mock needed

const mockIntegration = {
  id: 'integration-1',
  teamId: 'T1234567890',
  teamName: 'Test Workspace',
  botUserId: 'U1234567890',
  isActive: true,
  createdAt: '2026-03-26T00:00:00Z',
  updatedAt: '2026-03-26T00:00:00Z',
};

const mockChannels = [
  { id: 'C1234567890', name: 'general', is_member: true },
  { id: 'C1234567891', name: 'alerts', is_member: false },
  { id: 'C1234567892', name: 'tech-team', is_member: true },
];

const mockPreferences = [
  {
    notificationType: 'sla_breach',
    channel: 'slack',
    isEnabled: true,
    settings: {
      slackChannelId: 'C1234567890',
      slackChannelName: 'general',
      useDirectMessage: false,
    },
    id: 'pref-1',
  },
  {
    notificationType: 'ticket_assigned',
    channel: 'slack',
    isEnabled: false,
    settings: {
      slackChannelId: null,
      slackChannelName: null,
      useDirectMessage: true,
    },
    id: 'pref-2',
  },
];

const mockHistory = [
  {
    id: 'notif-1',
    notificationType: 'sla_breach',
    slackChannelName: 'general',
    message: 'SLA BREACH: Ticket #12345',
    status: 'sent',
    errorMessage: null,
    sentAt: '2026-03-26T12:00:00Z',
    createdAt: '2026-03-26T11:55:00Z',
    recipient: {
      id: 'user-1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
    },
  },
  {
    id: 'notif-2',
    notificationType: 'ticket_assigned',
    slackChannelName: null,
    message: 'New ticket assigned: #12346',
    status: 'failed',
    errorMessage: 'Channel not found',
    sentAt: null,
    createdAt: '2026-03-26T11:30:00Z',
    recipient: {
      id: 'user-2',
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane@example.com',
    },
  },
];

const mockStats = {
  total: 25,
  pending: 2,
  sent: 20,
  failed: 3,
  byType: {
    sla_breach: 5,
    ticket_assigned: 15,
    warranty_expiring: 5,
  },
};

describe('IntegrationsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('when no integration exists', () => {
    beforeEach(() => {
      (api.slack.getIntegration.useQuery as any).mockReturnValue({
        data: null,
        isLoading: false,
        refetch: vi.fn(),
      });

      (api.slack.addIntegration.useMutation as any).mockReturnValue({
        mutate: vi.fn(),
        isLoading: false,
      });
    });

    it('should render setup form', () => {
      render(<IntegrationsPage />);
      
      expect(screen.getByText('🔗 Connect Slack')).toBeInTheDocument();
      expect(screen.getByText('Setup Instructions:')).toBeInTheDocument();
      expect(screen.getByLabelText('Team ID')).toBeInTheDocument();
      expect(screen.getByLabelText('Team Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Bot User ID')).toBeInTheDocument();
      expect(screen.getByLabelText('Bot Access Token')).toBeInTheDocument();
    });

    it('should handle form submission', async () => {
      const mockMutate = vi.fn();
      (api.slack.addIntegration.useMutation as any).mockReturnValue({
        mutate: mockMutate,
        isLoading: false,
      });

      render(<IntegrationsPage />);

      fireEvent.change(screen.getByLabelText('Team ID'), {
        target: { value: 'T1234567890' }
      });
      fireEvent.change(screen.getByLabelText('Team Name'), {
        target: { value: 'Test Workspace' }
      });
      fireEvent.change(screen.getByLabelText('Bot User ID'), {
        target: { value: 'U1234567890' }
      });
      fireEvent.change(screen.getByLabelText('Bot Access Token'), {
        target: { value: 'xoxb-test-token' }
      });

      fireEvent.click(screen.getByRole('button', { name: 'Connect Slack' }));

      expect(mockMutate).toHaveBeenCalledWith({
        teamId: 'T1234567890',
        teamName: 'Test Workspace',
        botUserId: 'U1234567890',
        botAccessToken: 'xoxb-test-token',
      });
    });
  });

  describe('when integration exists', () => {
    beforeEach(() => {
      (api.slack.getIntegration.useQuery as any).mockReturnValue({
        data: mockIntegration,
        isLoading: false,
        refetch: vi.fn(),
      });

      (api.slack.getChannels.useQuery as any).mockReturnValue({
        data: mockChannels,
        isLoading: false,
        refetch: vi.fn(),
      });

      (api.slack.getNotificationPreferences.useQuery as any).mockReturnValue({
        data: mockPreferences,
        isLoading: false,
        refetch: vi.fn(),
      });

      (api.slack.getNotificationHistory.useQuery as any).mockReturnValue({
        data: mockHistory,
        isLoading: false,
        refetch: vi.fn(),
      });

      (api.slack.getNotificationStatistics.useQuery as any).mockReturnValue({
        data: mockStats,
      });

      (api.slack.testIntegration.useMutation as any).mockReturnValue({
        mutate: vi.fn(),
        isLoading: false,
      });

      (api.slack.disableIntegration.useMutation as any).mockReturnValue({
        mutate: vi.fn(),
        isLoading: false,
      });

      (api.slack.updateNotificationPreferences.useMutation as any).mockReturnValue({
        mutate: vi.fn(),
        isLoading: false,
      });

      (api.slack.sendTestNotification.useMutation as any).mockReturnValue({
        mutate: vi.fn(),
        isLoading: false,
      });

      (api.slack.processPending.useMutation as any).mockReturnValue({
        mutate: vi.fn(),
        isLoading: false,
      });
    });

    it('should render integration status', () => {
      render(<IntegrationsPage />);
      
      expect(screen.getByText('✅ Connected to Slack')).toBeInTheDocument();
      expect(screen.getByText('Test Workspace')).toBeInTheDocument();
      expect(screen.getByText('T1234567890')).toBeInTheDocument();
      expect(screen.getByText('U1234567890')).toBeInTheDocument();
    });

    it('should render statistics correctly', () => {
      render(<IntegrationsPage />);
      
      expect(screen.getByText('25')).toBeInTheDocument(); // total
      expect(screen.getByText('20')).toBeInTheDocument(); // sent  
      expect(screen.getByText('2')).toBeInTheDocument(); // pending
      expect(screen.getByText('3')).toBeInTheDocument(); // failed
    });

    it('should handle test connection', async () => {
      const mockMutate = vi.fn();
      (api.slack.testIntegration.useMutation as any).mockReturnValue({
        mutate: mockMutate,
        isLoading: false,
      });

      render(<IntegrationsPage />);

      fireEvent.click(screen.getByRole('button', { name: 'Test Connection' }));

      expect(mockMutate).toHaveBeenCalled();
    });

    it('should handle disable integration', async () => {
      const mockMutate = vi.fn();
      (api.slack.disableIntegration.useMutation as any).mockReturnValue({
        mutate: mockMutate,
        isLoading: false,
      });

      render(<IntegrationsPage />);

      fireEvent.click(screen.getByRole('button', { name: 'Disable' }));

      expect(mockMutate).toHaveBeenCalled();
    });

    it('should render notification preferences', () => {
      render(<IntegrationsPage />);
      
      expect(screen.getByText('📬 Notification Settings')).toBeInTheDocument();
      expect(screen.getByText('SLA Breaches')).toBeInTheDocument();
      expect(screen.getByText('Ticket Assigned')).toBeInTheDocument();
      
      // Check that SLA breach is enabled
      const slaBreachCheckbox = screen.getAllByRole('checkbox')[0];
      expect(slaBreachCheckbox).toBeChecked();
      
      // Check that ticket assigned is disabled
      const ticketAssignedCheckbox = screen.getAllByRole('checkbox')[1];
      expect(ticketAssignedCheckbox).not.toBeChecked();
    });

    it('should handle preference updates', async () => {
      const mockMutate = vi.fn();
      (api.slack.updateNotificationPreferences.useMutation as any).mockReturnValue({
        mutate: mockMutate,
        isLoading: false,
      });

      render(<IntegrationsPage />);

      // Toggle ticket assigned preference
      const ticketAssignedCheckbox = screen.getAllByRole('checkbox')[1];
      fireEvent.click(ticketAssignedCheckbox);

      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalledWith([
          expect.objectContaining({
            notificationType: 'sla_breach',
            isEnabled: true,
          }),
          expect.objectContaining({
            notificationType: 'ticket_assigned',
            isEnabled: true,
          }),
        ]);
      });
    });

    it('should render notification history', () => {
      render(<IntegrationsPage />);
      
      expect(screen.getByText('📜 Recent Notifications')).toBeInTheDocument();
      expect(screen.getByText('SLA Breaches')).toBeInTheDocument(); // notification type
      expect(screen.getByText('general')).toBeInTheDocument(); // channel name
      expect(screen.getByText('sent')).toBeInTheDocument(); // status
      expect(screen.getByText('failed')).toBeInTheDocument(); // status
    });

    it('should handle send test notification', async () => {
      const mockMutate = vi.fn();
      (api.slack.sendTestNotification.useMutation as any).mockReturnValue({
        mutate: mockMutate,
        isLoading: false,
      });

      render(<IntegrationsPage />);

      fireEvent.click(screen.getByRole('button', { name: 'Send Test' }));

      expect(mockMutate).toHaveBeenCalledWith({
        notificationType: 'system_alert',
        slackChannelId: undefined,
      });
    });

    it('should handle process pending notifications', async () => {
      const mockMutate = vi.fn();
      (api.slack.processPending.useMutation as any).mockReturnValue({
        mutate: mockMutate,
        isLoading: false,
      });

      render(<IntegrationsPage />);

      fireEvent.click(screen.getByRole('button', { name: 'Process Pending' }));

      expect(mockMutate).toHaveBeenCalled();
    });

    it('should handle channel selection in preferences', async () => {
      const mockMutate = vi.fn();
      (api.slack.updateNotificationPreferences.useMutation as any).mockReturnValue({
        mutate: mockMutate,
        isLoading: false,
      });

      render(<IntegrationsPage />);

      // Find the channel dropdown for the enabled SLA breach notification
      const channelSelects = screen.getAllByRole('combobox');
      const slaBreachChannelSelect = channelSelects[0];
      
      fireEvent.change(slaBreachChannelSelect, { target: { value: 'C1234567892' } });

      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalledWith([
          expect.objectContaining({
            notificationType: 'sla_breach',
            isEnabled: true,
            settings: expect.objectContaining({
              slackChannelId: 'C1234567892',
              slackChannelName: 'tech-team',
            }),
          }),
          expect.any(Object),
        ]);
      });
    });
  });

  describe('loading states', () => {
    it('should show loading when fetching integration', () => {
      (api.slack.getIntegration.useQuery as any).mockReturnValue({
        data: null,
        isLoading: true,
        refetch: vi.fn(),
      });

      render(<IntegrationsPage />);
      
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should show loading when adding integration', () => {
      (api.slack.getIntegration.useQuery as any).mockReturnValue({
        data: null,
        isLoading: false,
        refetch: vi.fn(),
      });

      (api.slack.addIntegration.useMutation as any).mockReturnValue({
        mutate: vi.fn(),
        isLoading: true,
      });

      render(<IntegrationsPage />);

      expect(screen.getByRole('button', { name: 'Connecting...' })).toBeInTheDocument();
    });
  });

  describe('setup mode', () => {
    beforeEach(() => {
      (api.slack.getIntegration.useQuery as any).mockReturnValue({
        data: mockIntegration,
        isLoading: false,
        refetch: vi.fn(),
      });
    });

    it('should switch to setup mode when reconfigure is clicked', () => {
      render(<IntegrationsPage />);

      // Initially should show integration status
      expect(screen.getByText('✅ Connected to Slack')).toBeInTheDocument();

      // Click reconfigure
      fireEvent.click(screen.getByRole('button', { name: 'Reconfigure' }));

      // Should now show setup form
      expect(screen.getByText('🔗 Connect Slack')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    });

    it('should cancel setup mode', () => {
      render(<IntegrationsPage />);

      // Switch to setup mode
      fireEvent.click(screen.getByRole('button', { name: 'Reconfigure' }));
      expect(screen.getByText('🔗 Connect Slack')).toBeInTheDocument();

      // Cancel setup mode
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

      // Should be back to integration status
      expect(screen.getByText('✅ Connected to Slack')).toBeInTheDocument();
    });
  });
});