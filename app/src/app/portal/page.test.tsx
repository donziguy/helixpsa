import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@/test/test-utils';
import ClientPortal from './page';

// Mock the API calls
vi.mock('@/utils/api', () => {
  const mockAuthenticate = vi.fn();
  const mockGetClientTickets = vi.fn();
  const mockGetTicketById = vi.fn();
  const mockSubmitTicket = vi.fn();
  const mockAddTicketNote = vi.fn();
  const mockGetClientInfo = vi.fn();

  return {
    api: {
      portal: {
        authenticate: {
          query: mockAuthenticate,
        },
        getClientTickets: {
          query: mockGetClientTickets,
        },
        getTicketById: {
          query: mockGetTicketById,
        },
        submitTicket: {
          mutate: mockSubmitTicket,
        },
        addTicketNote: {
          mutate: mockAddTicketNote,
        },
        getClientInfo: {
          query: mockGetClientInfo,
        },
      },
    },
    // Store references for access in tests
    __mockRefs: {
      mockAuthenticate,
      mockGetClientTickets,
      mockGetTicketById,
      mockSubmitTicket,
      mockAddTicketNote,
      mockGetClientInfo,
    },
  };
});

// Mock localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

const mockTickets = [
  {
    id: '1',
    number: 'HLX-001',
    title: 'Email server down',
    description: 'Unable to send or receive emails',
    priority: 'critical',
    status: 'open',
    estimatedHours: '2',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    resolvedAt: null,
    closedAt: null,
  },
  {
    id: '2',
    number: 'HLX-002',
    title: 'Printer not working',
    description: 'Office printer is showing error message',
    priority: 'medium',
    status: 'in_progress',
    estimatedHours: '1',
    createdAt: new Date('2024-01-02'),
    updatedAt: new Date('2024-01-02'),
    resolvedAt: null,
    closedAt: null,
  },
];

const mockTicketWithNotes = {
  ...mockTickets[0],
  notes: [
    {
      id: 'note1',
      content: 'Initial report received',
      createdAt: new Date('2024-01-01'),
    },
    {
      id: 'note2',
      content: 'Tech assigned to investigate',
      createdAt: new Date('2024-01-01'),
    },
  ],
};

describe('ClientPortal', () => {
  let mocks: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.clear();
    // Get mock references
    const apiModule = require('@/utils/api');
    mocks = apiModule.__mockRefs;
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  it('renders login form when not authenticated', () => {
    render(<ClientPortal />);
    
    expect(screen.getAllByText('Client Portal').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Access your support tickets').length).toBeGreaterThan(0);
    expect(screen.getAllByPlaceholderText('Enter your client ID').length).toBeGreaterThan(0);
    expect(screen.getAllByPlaceholderText('Enter your email address').length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: /sign in/i }).length).toBeGreaterThan(0);
  });

  it('shows validation error for empty login form', async () => {
    render(<ClientPortal />);
    
    const signInButton = screen.getAllByRole('button', { name: /sign in/i })[0];
    fireEvent.click(signInButton);
    
    // Form validation should prevent submission
    expect(mocks.mockAuthenticate).not.toHaveBeenCalled();
  });

  it('can login successfully', async () => {
    mocks.mockAuthenticate.mockResolvedValue({
      success: true,
      contact: {
        id: 'contact1',
        name: 'John Doe',
        email: 'john@company.com',
        clientId: 'client1',
        clientName: 'Test Company',
        organizationId: 'org1',
      },
      sessionToken: 'session123',
    });
    
    mocks.mockGetClientTickets.mockResolvedValue(mockTickets);

    render(<ClientPortal />);
    
    // Fill in login form
    const clientIdInput = screen.getAllByPlaceholderText('Enter your client ID')[0];
    const emailInput = screen.getAllByPlaceholderText('Enter your email address')[0];
    
    fireEvent.change(clientIdInput, { target: { value: 'client123' } });
    fireEvent.change(emailInput, { target: { value: 'john@company.com' } });
    
    const signInButton = screen.getAllByRole('button', { name: /sign in/i })[0];
    fireEvent.click(signInButton);
    
    await waitFor(() => {
      expect(mocks.mockAuthenticate).toHaveBeenCalledWith({
        clientId: 'client123',
        contactEmail: 'john@company.com',
      });
    });
  });

  it('displays tickets after login', async () => {
    // Set up logged in state
    mockLocalStorage.setItem('portal-session', JSON.stringify({
      clientId: 'client1',
      contactEmail: 'john@company.com',
      contactName: 'John Doe',
      clientName: 'Test Company',
      sessionToken: 'session123',
    }));
    
    mocks.mockGetClientTickets.mockResolvedValue(mockTickets);

    render(<ClientPortal />);
    
    await waitFor(() => {
      expect(screen.getAllByText('Your Tickets').length).toBeGreaterThan(0);
      expect(screen.getAllByText('HLX-001').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Email server down').length).toBeGreaterThan(0);
      expect(screen.getAllByText('HLX-002').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Printer not working').length).toBeGreaterThan(0);
    });
  });

  it('can navigate to new ticket form', async () => {
    // Set up logged in state
    mockLocalStorage.setItem('portal-session', JSON.stringify({
      clientId: 'client1',
      contactEmail: 'john@company.com',
      contactName: 'John Doe',
      clientName: 'Test Company',
      sessionToken: 'session123',
    }));
    
    mocks.mockGetClientTickets.mockResolvedValue([]);

    render(<ClientPortal />);
    
    await waitFor(() => {
      const newTicketButton = screen.getAllByText('New Ticket')[0];
      fireEvent.click(newTicketButton);
    });
    
    expect(screen.getAllByText('Submit New Ticket').length).toBeGreaterThan(0);
    expect(screen.getAllByPlaceholderText('Brief description of the issue').length).toBeGreaterThan(0);
  });

  it('can submit a new ticket', async () => {
    // Set up logged in state
    mockLocalStorage.setItem('portal-session', JSON.stringify({
      clientId: 'client1',
      contactEmail: 'john@company.com',
      contactName: 'John Doe',
      clientName: 'Test Company',
      sessionToken: 'session123',
    }));
    
    mocks.mockGetClientTickets.mockResolvedValue([]);
    mocks.mockSubmitTicket.mockResolvedValue({
      id: 'new-ticket',
      number: 'HLX-003',
      title: 'New issue',
      status: 'open',
      priority: 'medium',
      createdAt: new Date(),
    });

    render(<ClientPortal />);
    
    await waitFor(() => {
      const newTicketButton = screen.getAllByText('New Ticket')[0];
      fireEvent.click(newTicketButton);
    });
    
    // Fill in the form
    const titleInput = screen.getAllByPlaceholderText('Brief description of the issue')[0];
    const descriptionInput = screen.getAllByPlaceholderText(/Please provide detailed information/)[0];
    
    fireEvent.change(titleInput, { target: { value: 'Test ticket title' } });
    fireEvent.change(descriptionInput, { target: { value: 'Test ticket description' } });
    
    const submitButton = screen.getAllByRole('button', { name: /submit ticket/i })[0];
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(mocks.mockSubmitTicket).toHaveBeenCalledWith({
        clientId: 'client1',
        contactEmail: 'john@company.com',
        title: 'Test ticket title',
        description: 'Test ticket description',
        priority: 'medium',
      });
    });
  });

  it('can view ticket details', async () => {
    // Set up logged in state
    mockLocalStorage.setItem('portal-session', JSON.stringify({
      clientId: 'client1',
      contactEmail: 'john@company.com',
      contactName: 'John Doe',
      clientName: 'Test Company',
      sessionToken: 'session123',
    }));
    
    mocks.mockGetClientTickets.mockResolvedValue(mockTickets);
    mocks.mockGetTicketById.mockResolvedValue(mockTicketWithNotes);

    render(<ClientPortal />);
    
    await waitFor(() => {
      const ticketCard = screen.getAllByText('Email server down')[0];
      fireEvent.click(ticketCard);
    });
    
    await waitFor(() => {
      expect(mocks.mockGetTicketById).toHaveBeenCalledWith({
        ticketId: '1',
        clientId: 'client1',
        contactEmail: 'john@company.com',
      });
      
      expect(screen.getAllByText('HLX-001').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Email server down').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Initial report received').length).toBeGreaterThan(0);
    });
  });

  it('can add a note to a ticket', async () => {
    // Set up logged in state
    mockLocalStorage.setItem('portal-session', JSON.stringify({
      clientId: 'client1',
      contactEmail: 'john@company.com',
      contactName: 'John Doe',
      clientName: 'Test Company',
      sessionToken: 'session123',
    }));
    
    mocks.mockGetClientTickets.mockResolvedValue(mockTickets);
    mocks.mockGetTicketById.mockResolvedValue(mockTicketWithNotes);
    mocks.mockAddTicketNote.mockResolvedValue({
      id: 'note3',
      content: 'John Doe: Additional information provided',
      createdAt: new Date(),
    });

    render(<ClientPortal />);
    
    // Navigate to ticket details
    await waitFor(() => {
      const ticketCard = screen.getAllByText('Email server down')[0];
      fireEvent.click(ticketCard);
    });
    
    await waitFor(() => {
      const noteTextarea = screen.getAllByPlaceholderText('Add a comment to this ticket...')[0];
      fireEvent.change(noteTextarea, { target: { value: 'Additional information provided' } });
      
      const addCommentButton = screen.getAllByRole('button', { name: /add comment/i })[0];
      fireEvent.click(addCommentButton);
    });
    
    await waitFor(() => {
      expect(mocks.mockAddTicketNote).toHaveBeenCalledWith({
        ticketId: '1',
        clientId: 'client1',
        contactEmail: 'john@company.com',
        content: 'Additional information provided',
      });
    });
  });

  it('can logout', async () => {
    // Set up logged in state
    mockLocalStorage.setItem('portal-session', JSON.stringify({
      clientId: 'client1',
      contactEmail: 'john@company.com',
      contactName: 'John Doe',
      clientName: 'Test Company',
      sessionToken: 'session123',
    }));
    
    mocks.mockGetClientTickets.mockResolvedValue([]);

    render(<ClientPortal />);
    
    await waitFor(() => {
      const logoutButton = screen.getAllByText('Logout')[0];
      fireEvent.click(logoutButton);
    });
    
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('portal-session');
    expect(screen.getAllByText('Sign In').length).toBeGreaterThan(0);
  });

  it('shows empty state when no tickets exist', async () => {
    // Set up logged in state
    mockLocalStorage.setItem('portal-session', JSON.stringify({
      clientId: 'client1',
      contactEmail: 'john@company.com',
      contactName: 'John Doe',
      clientName: 'Test Company',
      sessionToken: 'session123',
    }));
    
    mocks.mockGetClientTickets.mockResolvedValue([]);

    render(<ClientPortal />);
    
    await waitFor(() => {
      expect(screen.getAllByText('No tickets yet').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Submit your first ticket to get started').length).toBeGreaterThan(0);
    });
  });

  it('shows correct priority and status colors', async () => {
    // Set up logged in state
    mockLocalStorage.setItem('portal-session', JSON.stringify({
      clientId: 'client1',
      contactEmail: 'john@company.com',
      contactName: 'John Doe',
      clientName: 'Test Company',
      sessionToken: 'session123',
    }));
    
    mocks.mockGetClientTickets.mockResolvedValue(mockTickets);

    render(<ClientPortal />);
    
    await waitFor(() => {
      expect(screen.getAllByText('CRITICAL').length).toBeGreaterThan(0);
      expect(screen.getAllByText('MEDIUM').length).toBeGreaterThan(0);
      expect(screen.getAllByText('OPEN').length).toBeGreaterThan(0);
      expect(screen.getAllByText('IN PROGRESS').length).toBeGreaterThan(0);
    });
  });

  it('handles API errors gracefully', async () => {
    mocks.mockAuthenticate.mockRejectedValue(new Error('Invalid credentials'));

    render(<ClientPortal />);
    
    // Fill in login form
    const clientIdInput = screen.getAllByPlaceholderText('Enter your client ID')[0];
    const emailInput = screen.getAllByPlaceholderText('Enter your email address')[0];
    
    fireEvent.change(clientIdInput, { target: { value: 'invalid' } });
    fireEvent.change(emailInput, { target: { value: 'invalid@email.com' } });
    
    const signInButton = screen.getAllByRole('button', { name: /sign in/i })[0];
    fireEvent.click(signInButton);
    
    await waitFor(() => {
      expect(mocks.mockAuthenticate).toHaveBeenCalled();
    });
    
    // Should still show login form after error
    expect(screen.getAllByPlaceholderText('Enter your client ID').length).toBeGreaterThan(0);
  });

  it('disables comment form for closed tickets', async () => {
    const closedTicket = {
      ...mockTicketWithNotes,
      status: 'closed' as const,
    };
    
    // Set up logged in state
    mockLocalStorage.setItem('portal-session', JSON.stringify({
      clientId: 'client1',
      contactEmail: 'john@company.com',
      contactName: 'John Doe',
      clientName: 'Test Company',
      sessionToken: 'session123',
    }));
    
    mocks.mockGetClientTickets.mockResolvedValue([closedTicket]);
    mocks.mockGetTicketById.mockResolvedValue(closedTicket);

    render(<ClientPortal />);
    
    // Navigate to closed ticket
    await waitFor(() => {
      const ticketCard = screen.getAllByText('Email server down')[0];
      fireEvent.click(ticketCard);
    });
    
    await waitFor(() => {
      // Should not show comment form for closed tickets
      expect(screen.queryByPlaceholderText('Add a comment to this ticket...')).toBeNull();
    });
  });
});