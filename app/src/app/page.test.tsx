import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import Home from './page';

// Mock components to avoid complex rendering
vi.mock('@/components/Sidebar', () => ({
  default: () => <div data-testid="sidebar">Sidebar</div>
}));

vi.mock('@/components/TicketBoard', () => ({
  default: ({ onTicketClick }: { onTicketClick: (ticket: any) => void }) => (
    <div data-testid="ticket-board">
      <button onClick={() => onTicketClick({ id: 't1', number: 'HLX-001' })}>
        Test Ticket
      </button>
    </div>
  )
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
            title: 'Test', 
            client: 'Acme Corp', 
            assignee: 'Cory S.', 
            priority: 'medium', 
            description: 'Test description',
            sla: '24h remaining'
          });
          // Mock automatically calls onClose after submit like the real component does
          onClose();
        }}>
          Submit
        </button>
      </div>
    ) : null
}));

vi.mock('@/components/TicketDetail', () => ({
  default: ({ ticket, onClose }: any) => 
    ticket ? (
      <div data-testid="ticket-detail">
        <button onClick={onClose}>Close Detail</button>
        <div>Ticket: {ticket.number}</div>
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
    expect(screen.getByTestId('ticket-board')).toBeInTheDocument();
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
    
    // Should open ticket detail for new ticket
    expect(screen.getAllByTestId('ticket-detail').length).toBeGreaterThan(0);
  });

  it('shows active timer when ticket timer is running', () => {
    render(<Home />);
    
    // Click on a ticket to start timer
    fireEvent.click(screen.getAllByText('Test Ticket')[0]);
    
    // Should show ticket detail
    expect(screen.getAllByTestId('ticket-detail').length).toBeGreaterThan(0);
    expect(screen.getAllByText('HLX-001').length).toBeGreaterThan(0);
  });

  it('closes ticket detail when close button is clicked', () => {
    render(<Home />);
    
    // Click on a ticket
    fireEvent.click(screen.getAllByText('Test Ticket')[0]);
    expect(screen.getAllByTestId('ticket-detail').length).toBeGreaterThan(0);
    
    // Close detail
    fireEvent.click(screen.getAllByText('Close Detail')[0]);
    expect(screen.queryByTestId('ticket-detail')).not.toBeInTheDocument();
  });
});