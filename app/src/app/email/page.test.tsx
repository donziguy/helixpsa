import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SessionProvider } from 'next-auth/react';
import EmailPage from './page';

// Mock the API utilities
vi.mock('~/utils/api', () => ({
  api: {
    email: {
      getConfigurations: {
        useQuery: vi.fn(() => ({
          data: [
            {
              id: '1',
              name: 'Support Email',
              email: 'support@test.com',
              imapHost: 'imap.gmail.com',
              imapPort: 993,
              imapSecure: true,
              folderName: 'INBOX',
              defaultClientId: 'client-1',
              defaultAssigneeId: 'user-1',
              defaultPriority: 'medium',
              isActive: true,
              autoAssignBySubject: false,
              subjectClientMappings: null,
              lastProcessedUid: 100,
              createdAt: new Date(),
              updatedAt: new Date(),
              defaultClient: { id: 'client-1', name: 'Test Client' },
              defaultAssignee: { id: 'user-1', firstName: 'John', lastName: 'Doe' },
            },
          ],
          refetch: vi.fn(),
        })),
      },
      getStatistics: {
        useQuery: vi.fn(() => ({
          data: {
            totalConfigurations: 1,
            activeConfigurations: 1,
            totalEmailsProcessed: 50,
            successfullyProcessed: 48,
            failed: 2,
          },
        })),
      },
      getProcessingLogs: {
        useQuery: vi.fn(() => ({
          data: [
            {
              id: 'log-1',
              emailUid: 123,
              fromEmail: 'client@test.com',
              subject: 'Test Issue',
              messageId: '<test@test.com>',
              status: 'processed',
              errorMessage: null,
              processedAt: new Date(),
              createdAt: new Date(),
              configuration: {
                id: '1',
                name: 'Support Email',
                email: 'support@test.com',
              },
              ticket: {
                id: 'ticket-1',
                number: '202403-0001-EMAIL',
                title: 'Test Issue',
                status: 'open',
              },
            },
            {
              id: 'log-2',
              emailUid: 124,
              fromEmail: 'spam@spam.com',
              subject: 'Spam Email',
              messageId: '<spam@spam.com>',
              status: 'failed',
              errorMessage: 'Client not found',
              processedAt: new Date(),
              createdAt: new Date(),
              configuration: {
                id: '1',
                name: 'Support Email',
                email: 'support@test.com',
              },
              ticket: null,
            },
          ],
        })),
      },
      createConfiguration: {
        mutateAsync: vi.fn(),
        isPending: false,
      },
      updateConfiguration: {
        mutateAsync: vi.fn(),
        isPending: false,
      },
      deleteConfiguration: {
        mutateAsync: vi.fn(),
        isPending: false,
      },
      testConfiguration: {
        mutateAsync: vi.fn(() => Promise.resolve({
          success: true,
          message: 'Connection test successful',
        })),
        isPending: false,
      },
      processEmails: {
        mutateAsync: vi.fn(() => Promise.resolve({
          success: true,
          message: 'Email processing completed',
        })),
        isPending: false,
      },
    },
    clients: {
      getAll: {
        useQuery: vi.fn(() => ({
          data: [
            { id: 'client-1', name: 'Test Client' },
            { id: 'client-2', name: 'Another Client' },
          ],
        })),
      },
    },
    users: {
      getAll: {
        useQuery: vi.fn(() => ({
          data: [
            { id: 'user-1', firstName: 'John', lastName: 'Doe' },
            { id: 'user-2', firstName: 'Jane', lastName: 'Smith' },
          ],
        })),
      },
    },
  },
}));

// Mock session
const mockSession = {
  user: {
    id: '1',
    email: 'admin@test.com',
    name: 'Admin User',
    organizationId: 'org-1',
  },
};

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <SessionProvider session={mockSession}>
    {children}
  </SessionProvider>
);

describe('EmailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders email configurations and statistics', () => {
    render(<EmailPage />, { wrapper: Wrapper });
    
    // Check if page title is rendered
    expect(screen.getByText('Email Integration')).toBeInTheDocument();
    
    // Check statistics
    expect(screen.getByText('Total Configurations')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument(); // Total configurations count
    
    // Check configuration
    expect(screen.getByText('Support Email')).toBeInTheDocument();
    expect(screen.getByText('support@test.com')).toBeInTheDocument();
    expect(screen.getByText('imap.gmail.com:993 • INBOX')).toBeInTheDocument();
  });

  it('displays processing logs with correct status colors', () => {
    render(<EmailPage />, { wrapper: Wrapper });
    
    // Check processing logs section
    expect(screen.getByText('Processing Logs')).toBeInTheDocument();
    
    // Check successful log entry
    expect(screen.getByText('Test Issue')).toBeInTheDocument();
    expect(screen.getByText('From: client@test.com')).toBeInTheDocument();
    expect(screen.getByText('Ticket: 202403-0001-EMAIL - Test Issue')).toBeInTheDocument();
    
    // Check failed log entry
    expect(screen.getByText('Spam Email')).toBeInTheDocument();
    expect(screen.getByText('From: spam@spam.com')).toBeInTheDocument();
    expect(screen.getByText('Client not found')).toBeInTheDocument();
  });

  it('opens new configuration modal when add button is clicked', async () => {
    render(<EmailPage />, { wrapper: Wrapper });
    
    const addButton = screen.getByText('Add Configuration');
    fireEvent.click(addButton);
    
    await waitFor(() => {
      expect(screen.getByText('Add Email Configuration')).toBeInTheDocument();
    });
    
    // Check form fields are present
    expect(screen.getByLabelText('Configuration Name')).toBeInTheDocument();
    expect(screen.getByLabelText('IMAP Server')).toBeInTheDocument();
    expect(screen.getByLabelText('Email Address')).toBeInTheDocument();
    expect(screen.getByLabelText('Password / App Password')).toBeInTheDocument();
  });

  it('handles configuration form submission', async () => {
    const { api } = require('../../../utils/api');
    const createMock = api.email.createConfiguration.mutateAsync;
    
    render(<EmailPage />, { wrapper: Wrapper });
    
    // Open modal
    fireEvent.click(screen.getByText('Add Configuration'));
    
    await waitFor(() => {
      expect(screen.getByText('Add Email Configuration')).toBeInTheDocument();
    });
    
    // Fill form
    fireEvent.change(screen.getByLabelText('Configuration Name'), {
      target: { value: 'New Config' },
    });
    fireEvent.change(screen.getByLabelText('IMAP Server'), {
      target: { value: 'imap.test.com' },
    });
    fireEvent.change(screen.getByLabelText('Email Address'), {
      target: { value: 'new@test.com' },
    });
    fireEvent.change(screen.getByLabelText('Password / App Password'), {
      target: { value: 'password123' },
    });
    
    // Submit form
    fireEvent.click(screen.getByText('Create'));
    
    await waitFor(() => {
      expect(createMock).toHaveBeenCalledWith({
        name: 'New Config',
        imapHost: 'imap.test.com',
        imapPort: 993,
        imapSecure: true,
        email: 'new@test.com',
        password: 'password123',
        defaultClientId: '',
        defaultAssigneeId: '',
        defaultPriority: 'medium',
        folderName: 'INBOX',
        autoAssignBySubject: false,
        subjectClientMappings: '',
      });
    });
  });

  it('handles test configuration', async () => {
    window.alert = vi.fn();
    const { api } = require('../../../utils/api');
    const testMock = api.email.testConfiguration.mutateAsync;
    
    render(<EmailPage />, { wrapper: Wrapper });
    
    const testButton = screen.getByText('Test');
    fireEvent.click(testButton);
    
    await waitFor(() => {
      expect(testMock).toHaveBeenCalledWith({ id: '1' });
      expect(window.alert).toHaveBeenCalledWith('Connection test successful');
    });
  });

  it('handles manual email processing', async () => {
    window.alert = vi.fn();
    const { api } = require('../../../utils/api');
    const processMock = api.email.processEmails.mutateAsync;
    
    render(<EmailPage />, { wrapper: Wrapper });
    
    const processButton = screen.getAllByText('Process')[0]; // First process button (for specific config)
    fireEvent.click(processButton!);
    
    await waitFor(() => {
      expect(processMock).toHaveBeenCalledWith({ configurationId: '1' });
      expect(window.alert).toHaveBeenCalledWith('Email processing completed');
    });
  });

  it('handles configuration enable/disable', async () => {
    const { api } = require('../../../utils/api');
    const updateMock = api.email.updateConfiguration.mutateAsync;
    
    render(<EmailPage />, { wrapper: Wrapper });
    
    const disableButton = screen.getByText('Disable');
    fireEvent.click(disableButton);
    
    await waitFor(() => {
      expect(updateMock).toHaveBeenCalledWith({
        id: '1',
        isActive: false,
      });
    });
  });

  it('handles configuration deletion with confirmation', async () => {
    window.confirm = vi.fn(() => true);
    const { api } = require('../../../utils/api');
    const deleteMock = api.email.deleteConfiguration.mutateAsync;
    
    render(<EmailPage />, { wrapper: Wrapper });
    
    const deleteButton = screen.getByText('Delete');
    fireEvent.click(deleteButton);
    
    await waitFor(() => {
      expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete this email configuration?');
      expect(deleteMock).toHaveBeenCalledWith({ id: '1' });
    });
  });

  it('shows processing logs for specific configuration when logs button is clicked', () => {
    render(<EmailPage />, { wrapper: Wrapper });
    
    const logsButton = screen.getByText('Logs');
    fireEvent.click(logsButton);
    
    // Should update the selected config ID and show "Show All" button
    expect(screen.getByText('Show All')).toBeInTheDocument();
  });

  it('displays empty states correctly', () => {
    // Mock empty data
    const { api } = vi.mocked(require('../../../utils/api'));
    api.email.getConfigurations.useQuery.mockReturnValue({
      data: [],
      refetch: vi.fn(),
    });
    api.email.getProcessingLogs.useQuery.mockReturnValue({
      data: [],
    });
    
    render(<EmailPage />, { wrapper: Wrapper });
    
    expect(screen.getByText('No email configurations configured.')).toBeInTheDocument();
    expect(screen.getByText('No processing logs found.')).toBeInTheDocument();
  });

  it('shows priority and status badges with correct colors', () => {
    render(<EmailPage />, { wrapper: Wrapper });
    
    // Check priority badge for medium priority
    const priorityBadge = screen.getByText('medium');
    expect(priorityBadge).toHaveClass('bg-blue-100', 'text-blue-800');
    
    // Check status badges in logs
    const processedBadge = screen.getByText('processed');
    expect(processedBadge).toHaveClass('bg-green-100', 'text-green-800');
    
    const failedBadge = screen.getByText('failed');
    expect(failedBadge).toHaveClass('bg-red-100', 'text-red-800');
  });
});