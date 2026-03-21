import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@/test/test-utils';
import TicketsPage from './page';

// Mock usePathname
vi.mock('next/navigation', () => ({
  usePathname: () => '/tickets'
}));

// Mock the components that are used in TicketsPage
vi.mock('@/components/Sidebar', () => ({
  default: () => <div>Sidebar Mock</div>
}));

vi.mock('@/components/TicketBoard', () => ({
  default: ({ tickets, onTicketClick, timer }: any) => (
    <div>
      <div>TicketBoard Mock</div>
      <div>Tickets: {tickets.length}</div>
      {timer && <div>Timer Running: {timer.running ? 'yes' : 'no'}</div>}
      <button onClick={() => onTicketClick(tickets[0])}>Click First Ticket</button>
    </div>
  )
}));

vi.mock('@/components/CommandPalette', () => ({
  default: ({ isOpen, onClose, onNewTicket }: any) => 
    isOpen ? (
      <div>
        <div>Command Palette Open</div>
        <button onClick={onClose}>Close Command Palette</button>
        <button onClick={onNewTicket}>New Ticket from Palette</button>
      </div>
    ) : null
}));

vi.mock('@/components/TicketDetail', () => ({
  default: ({ ticket, onClose, timer, onTimerToggle }: any) =>
    ticket ? (
      <div>
        <div>Ticket Detail: {ticket.title}</div>
        <button onClick={onClose}>Close Detail</button>
        <button onClick={() => onTimerToggle(ticket.id)}>Toggle Timer</button>
        {timer?.ticketId === ticket.id && <div>Timer: {timer.seconds}s</div>}
      </div>
    ) : null
}));

vi.mock('@/components/NewTicketModal', () => ({
  default: ({ isOpen, onClose, onSubmit }: any) =>
    isOpen ? (
      <div>
        <div>New Ticket Modal Open</div>
        <button onClick={onClose}>Close Modal</button>
        <button onClick={() => onSubmit({
          title: 'Test Ticket',
          client: 'Test Client',
          assignee: 'Test Assignee',
          priority: 'medium',
          sla: '4h',
          description: 'Test description'
        })}>Create Test Ticket</button>
      </div>
    ) : null
}));

describe('TicketsPage', () => {
  beforeEach(() => {
    // Clear any existing timers
    vi.clearAllTimers();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders without crashing', () => {
    render(<TicketsPage />);
    expect(screen.getAllByText('Sidebar Mock').length).toBeGreaterThan(0);
    expect(screen.getAllByText('TicketBoard Mock').length).toBeGreaterThan(0);
  });

  it('displays search button with keyboard shortcut', () => {
    render(<TicketsPage />);
    expect(screen.getAllByText('Search or press /').length).toBeGreaterThan(0);
    expect(screen.getAllByText('⌘K').length).toBeGreaterThan(0);
  });

  it('shows notification button', () => {
    render(<TicketsPage />);
    const notificationButtons = document.querySelectorAll('button[style*="font-size: 18"]');
    expect(notificationButtons.length).toBeGreaterThan(0);
  });

  it('opens command palette when search button clicked', () => {
    render(<TicketsPage />);
    const searchButton = screen.getAllByText('Search or press /')[0].closest('button');
    expect(searchButton).not.toBeNull();
    fireEvent.click(searchButton!);
    expect(screen.getAllByText('Command Palette Open').length).toBeGreaterThan(0);
  });

  it('opens command palette with Cmd+K shortcut', () => {
    render(<TicketsPage />);
    fireEvent.keyDown(window, { key: 'k', metaKey: true });
    expect(screen.getAllByText('Command Palette Open').length).toBeGreaterThan(0);
  });

  it('opens command palette with / shortcut', () => {
    render(<TicketsPage />);
    fireEvent.keyDown(window, { key: '/' });
    expect(screen.getAllByText('Command Palette Open').length).toBeGreaterThan(0);
  });

  it('opens new ticket modal with Cmd+N shortcut', () => {
    render(<TicketsPage />);
    fireEvent.keyDown(window, { key: 'n', metaKey: true });
    expect(screen.getAllByText('New Ticket Modal Open').length).toBeGreaterThan(0);
  });


  it('can open new ticket modal from command palette', () => {
    render(<TicketsPage />);
    fireEvent.keyDown(window, { key: 'k', metaKey: true });
    fireEvent.click(screen.getAllByText('New Ticket from Palette')[0]);
    expect(screen.getAllByText('New Ticket Modal Open').length).toBeGreaterThan(0);
  });


  it('can click on ticket to open detail', () => {
    render(<TicketsPage />);
    fireEvent.click(screen.getAllByText('Click First Ticket')[0]);
    
    // Should open ticket detail for first ticket
    expect(screen.getAllByText(/Ticket Detail:/).length).toBeGreaterThan(0);
  });

  it('can close ticket detail', () => {
    render(<TicketsPage />);
    fireEvent.click(screen.getAllByText('Click First Ticket')[0]);
    expect(screen.getAllByText(/Ticket Detail:/).length).toBeGreaterThan(0);
    
    fireEvent.click(screen.getAllByText('Close Detail')[0]);
    expect(screen.queryByText(/Ticket Detail:/)).toBeNull();
  });

  it('starts timer when opening ticket', () => {
    render(<TicketsPage />);
    fireEvent.click(screen.getAllByText('Click First Ticket')[0]);
    
    expect(screen.getAllByText('Timer Running: yes').length).toBeGreaterThan(0);
  });

  it('can toggle timer', () => {
    render(<TicketsPage />);
    fireEvent.click(screen.getAllByText('Click First Ticket')[0]);
    
    fireEvent.click(screen.getAllByText('Toggle Timer')[0]);
    expect(screen.getAllByText('Timer Running: no').length).toBeGreaterThan(0);
    
    fireEvent.click(screen.getAllByText('Toggle Timer')[0]);
    expect(screen.getAllByText('Timer Running: yes').length).toBeGreaterThan(0);
  });





  it('displays tickets count from mock data', () => {
    render(<TicketsPage />);
    expect(screen.getAllByText(/Tickets: 10/).length).toBeGreaterThan(0);
  });

});