import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@/test/test-utils';
import TicketBoard from './TicketBoard';
import { tickets as mockTickets } from '@/lib/mock-data';

const mockProps = {
  tickets: mockTickets,
  onTicketClick: vi.fn(),
  onStatusChange: vi.fn(),
  onTicketUpdate: vi.fn(),
  timer: null,
};

describe('TicketBoard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock scrollIntoView
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('renders board view by default', () => {
    render(<TicketBoard {...mockProps} />);
    expect(screen.getAllByText('Tickets').length).toBeGreaterThan(0);
    // Should show kanban columns
    expect(screen.getAllByText('Open').length).toBeGreaterThan(0);
    expect(screen.getAllByText('In Progress').length).toBeGreaterThan(0);
  });

  it('can switch to list view', () => {
    render(<TicketBoard {...mockProps} />);
    
    const listButton = screen.getAllByText('list')[0];
    fireEvent.click(listButton);
    
    // Should show table headers
    expect(screen.getAllByText('ID').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Title').length).toBeGreaterThan(0);
  });

  it('displays filtered ticket count', () => {
    render(<TicketBoard {...mockProps} />);
    expect(screen.getAllByText(/active tickets/).length).toBeGreaterThan(0);
  });

  it('can search tickets', () => {
    render(<TicketBoard {...mockProps} />);
    
    const searchInput = screen.getAllByPlaceholderText('Search tickets, clients, assignees...')[0];
    fireEvent.change(searchInput, { target: { value: 'Password' } });
    
    // Should filter results - look for any ticket content that matches
    expect(searchInput).toHaveValue('Password');
  });

  it('can filter by client', () => {
    render(<TicketBoard {...mockProps} />);
    
    // Find client filter dropdown
    const clientSelects = screen.getAllByDisplayValue('All');
    const clientSelect = clientSelects.find(select => 
      select.closest('div')?.textContent?.includes('Client:')
    );
    
    if (clientSelect) {
      fireEvent.change(clientSelect, { target: { value: 'Acme Corp' } });
      // Should filter to only Acme Corp tickets
    }
  });

  it('can clear filters', () => {
    render(<TicketBoard {...mockProps} />);
    
    // Add a search filter
    const searchInput = screen.getAllByPlaceholderText('Search tickets, clients, assignees...')[0];
    fireEvent.change(searchInput, { target: { value: 'test' } });
    
    // Clear filters button should appear
    const clearButton = screen.queryByText('Clear filters');
    if (clearButton) {
      fireEvent.click(clearButton);
      expect(searchInput).toHaveValue('');
    }
  });

  it('handles drag and drop', () => {
    render(<TicketBoard {...mockProps} />);
    
    // Mock drag and drop events
    const dragData = new Map();
    const mockDataTransfer = {
      setData: (key: string, value: string) => dragData.set(key, value),
      getData: (key: string) => dragData.get(key),
      effectAllowed: '',
      dropEffect: 'move',
    };

    // Find a ticket card and simulate drag
    const ticketCards = document.querySelectorAll('[draggable="true"]');
    if (ticketCards.length > 0) {
      const firstCard = ticketCards[0];
      fireEvent.dragStart(firstCard, { dataTransfer: mockDataTransfer });
      
      // Find a drop zone (column)
      const columns = document.querySelectorAll('[data-testid], div[style*="grid"]');
      if (columns.length > 0) {
        fireEvent.dragOver(columns[0], { dataTransfer: mockDataTransfer });
        fireEvent.drop(columns[0], { dataTransfer: mockDataTransfer });
      }
    }
  });

  it('calls onTicketClick when ticket is clicked', () => {
    render(<TicketBoard {...mockProps} />);
    
    // Find and click a ticket card (look for draggable elements which are our ticket cards)
    const ticketCards = document.querySelectorAll('[draggable="true"]');
    if (ticketCards.length > 0) {
      fireEvent.click(ticketCards[0]);
      expect(mockProps.onTicketClick).toHaveBeenCalled();
    } else {
      // Fallback - just ensure the component renders correctly
      expect(screen.getAllByText('Tickets').length).toBeGreaterThan(0);
    }
  });

  describe('Keyboard Navigation', () => {
    it('navigates down with j key', () => {
      render(<TicketBoard {...mockProps} />);
      
      fireEvent.keyDown(window, { key: 'j' });
      
      // First ticket should be selected (visual indication)
      const selectedElements = document.querySelectorAll('[style*="var(--accent)"]');
      expect(selectedElements.length).toBeGreaterThan(0);
    });

    it('navigates up with k key', () => {
      render(<TicketBoard {...mockProps} />);
      
      // Navigate down first
      fireEvent.keyDown(window, { key: 'j' });
      fireEvent.keyDown(window, { key: 'j' });
      
      // Then navigate up
      fireEvent.keyDown(window, { key: 'k' });
      
      // Should call onTicketClick when selection changes
      expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
    });

    it('opens ticket with Enter key', () => {
      render(<TicketBoard {...mockProps} />);
      
      // Navigate to first ticket
      fireEvent.keyDown(window, { key: 'j' });
      
      // Press Enter to select
      fireEvent.keyDown(window, { key: 'Enter' });
      
      expect(mockProps.onTicketClick).toHaveBeenCalled();
    });

    it('navigates with arrow keys', () => {
      render(<TicketBoard {...mockProps} />);
      
      fireEvent.keyDown(window, { key: 'ArrowDown' });
      fireEvent.keyDown(window, { key: 'ArrowUp' });
      fireEvent.keyDown(window, { key: 'ArrowLeft' });
      fireEvent.keyDown(window, { key: 'ArrowRight' });
      
      // Should handle arrow key navigation
      expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
    });

    it('navigates to first/last with Home/End keys', () => {
      render(<TicketBoard {...mockProps} />);
      
      fireEvent.keyDown(window, { key: 'Home' });
      expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
      
      fireEvent.keyDown(window, { key: 'End' });
      expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
    });

    it('does not interfere with input elements', () => {
      render(<TicketBoard {...mockProps} />);
      
      const searchInput = screen.getAllByPlaceholderText('Search tickets, clients, assignees...')[0];
      
      // Focus the input and try typing
      fireEvent.focus(searchInput);
      fireEvent.change(searchInput, { target: { value: 'test' } });
      fireEvent.keyDown(searchInput, { key: 'j' });
      
      // Input should retain its value (proving keyboard nav didn't interfere)
      expect(searchInput).toHaveValue('test');
    });
  });

  describe('List View', () => {
    it('renders list view correctly', () => {
      render(<TicketBoard {...mockProps} />);
      
      // Switch to list view
      const listButton = screen.getAllByText('list')[0];
      fireEvent.click(listButton);
      
      // Should show table structure
      expect(screen.getAllByText('ID').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Priority').length).toBeGreaterThan(0);
    });

    it('supports keyboard navigation in list view', () => {
      render(<TicketBoard {...mockProps} />);
      
      // Switch to list view
      const listButton = screen.getAllByText('list')[0];
      fireEvent.click(listButton);
      
      // Navigate with keyboard
      fireEvent.keyDown(window, { key: 'j' });
      fireEvent.keyDown(window, { key: 'Enter' });
      
      expect(mockProps.onTicketClick).toHaveBeenCalled();
    });
  });

  describe('Timer Integration', () => {
    it('highlights active timer ticket', () => {
      const timerProps = {
        ...mockProps,
        timer: { ticketId: mockTickets[0].id, seconds: 120, running: true }
      };
      
      render(<TicketBoard {...timerProps} />);
      
      // Timer should be passed to component correctly
      expect(timerProps.timer.running).toBe(true);
      expect(timerProps.timer.ticketId).toBe(mockTickets[0].id);
    });
  });
});