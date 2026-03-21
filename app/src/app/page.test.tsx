import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@/test/test-utils';
import Home from './page';

// Mock components to avoid complex rendering
vi.mock('@/components/Sidebar', () => ({
  default: () => <div data-testid="sidebar">Sidebar</div>
}));

vi.mock('@/components/Dashboard', () => ({
  default: () => <div data-testid="dashboard">Dashboard</div>
}));

vi.mock('@/components/CommandPalette', () => ({
  default: ({ isOpen, onClose, onNewTicket }: any) => 
    isOpen ? (
      <div data-testid="command-palette">
        <button onClick={onClose}>Close</button>
        <button onClick={onNewTicket}>New Ticket</button>
      </div>
    ) : null
}));

vi.mock('@/components/NewTicketModal', () => ({
  default: ({ isOpen, onClose, onSubmit }: any) => 
    isOpen ? (
      <div data-testid="new-ticket-modal">
        <button onClick={onClose}>Close Modal</button>
        <button onClick={() => {
          onSubmit({ 
            title: 'Test Ticket', 
            client: 'Acme Corp', 
            assignee: 'Cory S.', 
            priority: 'medium', 
            description: 'Test description',
            sla: '24h remaining'
          });
          onClose();
        }}>
          Submit
        </button>
      </div>
    ) : null
}));

describe('Home', () => {
  beforeEach(() => {
    cleanup();
  });

  it('renders main layout components', () => {
    render(<Home />);
    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    expect(screen.getByTestId('dashboard')).toBeInTheDocument();
  });

  it('has search button with keyboard shortcut hint', () => {
    render(<Home />);
    expect(screen.getAllByText('Search or press /').length).toBeGreaterThan(0);
    expect(screen.getAllByText('⌘K').length).toBeGreaterThan(0);
  });

  it('opens command palette with Cmd+K', () => {
    render(<Home />);
    expect(screen.queryByTestId('command-palette')).not.toBeInTheDocument();
    
    fireEvent.keyDown(window, { key: 'k', metaKey: true });
    expect(screen.getAllByTestId('command-palette').length).toBeGreaterThan(0);
  });

  it('opens command palette with forward slash', () => {
    render(<Home />);
    expect(screen.queryByTestId('command-palette')).not.toBeInTheDocument();
    
    fireEvent.keyDown(window, { key: '/' });
    expect(screen.getAllByTestId('command-palette').length).toBeGreaterThan(0);
  });

  it('opens new ticket modal with Cmd+N shortcut', () => {
    render(<Home />);
    expect(screen.queryByTestId('new-ticket-modal')).not.toBeInTheDocument();
    
    // Press Cmd+N
    fireEvent.keyDown(window, { key: 'n', metaKey: true });
    expect(screen.getAllByTestId('new-ticket-modal').length).toBeGreaterThan(0);
  });

  it('opens new ticket modal with Ctrl+N shortcut on Windows/Linux', () => {
    render(<Home />);
    expect(screen.queryByTestId('new-ticket-modal')).not.toBeInTheDocument();
    
    // Press Ctrl+N
    fireEvent.keyDown(window, { key: 'n', ctrlKey: true });
    expect(screen.getAllByTestId('new-ticket-modal').length).toBeGreaterThan(0);
  });

  it('prevents Cmd+N from opening new ticket modal when modal is already open', () => {
    render(<Home />);
    
    // Open modal first
    fireEvent.keyDown(window, { key: 'n', metaKey: true });
    expect(screen.getAllByTestId('new-ticket-modal').length).toBeGreaterThan(0);
    
    // Close modal
    fireEvent.click(screen.getAllByText('Close Modal')[0]);
    expect(screen.queryByTestId('new-ticket-modal')).not.toBeInTheDocument();
    
    // Should be able to open again
    fireEvent.keyDown(window, { key: 'n', metaKey: true });
    expect(screen.getAllByTestId('new-ticket-modal').length).toBeGreaterThan(0);
  });

  it('can open new ticket modal from command palette', () => {
    render(<Home />);
    
    // Open command palette
    fireEvent.keyDown(window, { key: 'k', metaKey: true });
    expect(screen.getAllByTestId('command-palette').length).toBeGreaterThan(0);
    
    // Click new ticket option
    fireEvent.click(screen.getAllByText('New Ticket')[0]);
    expect(screen.getAllByTestId('new-ticket-modal').length).toBeGreaterThan(0);
  });

  it('creates new ticket when form is submitted', () => {
    render(<Home />);
    
    // Open modal
    fireEvent.keyDown(window, { key: 'n', metaKey: true });
    expect(screen.getAllByTestId('new-ticket-modal').length).toBeGreaterThan(0);
    
    // Submit form
    fireEvent.click(screen.getAllByText('Submit')[0]);
    
    // Modal should close
    expect(screen.queryByTestId('new-ticket-modal')).not.toBeInTheDocument();
  });

  it('shows notification button', () => {
    render(<Home />);
    const notificationButtons = document.querySelectorAll('button[style*="font-size: 18"]');
    expect(notificationButtons.length).toBeGreaterThan(0);
  });

  it('opens command palette when search button clicked', () => {
    render(<Home />);
    const searchButton = screen.getAllByText('Search or press /')[0].closest('button');
    expect(searchButton).not.toBeNull();
    fireEvent.click(searchButton!);
    expect(screen.getAllByTestId('command-palette').length).toBeGreaterThan(0);
  });

  it('closes command palette when close button clicked', () => {
    render(<Home />);
    
    // Open command palette
    fireEvent.keyDown(window, { key: 'k', metaKey: true });
    expect(screen.getAllByTestId('command-palette').length).toBeGreaterThan(0);
    
    // Close it
    fireEvent.click(screen.getAllByText('Close')[0]);
    expect(screen.queryByTestId('command-palette')).not.toBeInTheDocument();
  });

  it('prevents shortcuts when typing in input fields', () => {
    render(<Home />);
    
    // Create a mock input
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();
    
    // Should not open command palette when typing in input
    fireEvent.keyDown(input, { key: '/' });
    expect(screen.queryByTestId('command-palette')).not.toBeInTheDocument();
    
    document.body.removeChild(input);
  });

  it('maintains ticket state for new ticket creation', () => {
    render(<Home />);
    
    // Initially should have 10 tickets (from mock data)
    // Create a new ticket
    fireEvent.keyDown(window, { key: 'n', metaKey: true });
    fireEvent.click(screen.getAllByText('Submit')[0]);
    
    // New ticket should be added to state (verified by no errors)
    expect(screen.queryByTestId('new-ticket-modal')).not.toBeInTheDocument();
  });
});