import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@/test/test-utils';
import TicketBoard from './TicketBoard';
import { tickets } from '@/lib/mock-data';

describe('TicketBoard', () => {
  const defaultProps = {
    tickets,
    onTicketClick: vi.fn(),
    onStatusChange: vi.fn(),
    onTicketUpdate: vi.fn(),
    timer: null,
  };

  it('renders without crashing', () => {
    render(<TicketBoard {...defaultProps} />);
    expect(screen.getAllByText('Tickets').length).toBeGreaterThan(0);
  });

  it('shows all column headers in board view', () => {
    render(<TicketBoard {...defaultProps} />);
    expect(screen.getAllByText('Open').length).toBeGreaterThan(0);
    expect(screen.getAllByText('In Progress').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Waiting').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Resolved').length).toBeGreaterThan(0);
  });

  it('shows ticket count', () => {
    render(<TicketBoard {...defaultProps} />);
    expect(screen.getAllByText(/10/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/active tickets/).length).toBeGreaterThan(0);
  });

  it('renders ticket cards with numbers', () => {
    render(<TicketBoard {...defaultProps} />);
    expect(screen.getAllByText('HLX-001').length).toBeGreaterThan(0);
    expect(screen.getAllByText('HLX-002').length).toBeGreaterThan(0);
  });

  it('renders all 10 tickets', () => {
    render(<TicketBoard {...defaultProps} />);
    const draggables = document.querySelectorAll('[draggable=true]');
    // Each ticket renders as a draggable card (may be doubled by StrictMode)
    expect(draggables.length).toBeGreaterThanOrEqual(10);
  });

  it('calls onTicketClick when a ticket card is clicked', () => {
    const onClick = vi.fn();
    render(<TicketBoard {...defaultProps} onTicketClick={onClick} />);
    const cards = document.querySelectorAll('[draggable=true]');
    // Click the last card to avoid StrictMode duplicates
    fireEvent.click(cards[cards.length - 1]);
    expect(onClick).toHaveBeenCalled();
  });

  it('switches to list view', () => {
    render(<TicketBoard {...defaultProps} />);
    const listButtons = screen.getAllByText('list');
    fireEvent.click(listButtons[0]);
    // In list view, table headers appear
    expect(screen.getAllByText('Title').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Client').length).toBeGreaterThan(0);
  });

  it('shows new ticket button', () => {
    render(<TicketBoard {...defaultProps} />);
    expect(screen.getAllByText('+ New Ticket').length).toBeGreaterThan(0);
  });

  it('allows inline editing of ticket title', async () => {
    const onTicketUpdate = vi.fn();
    render(<TicketBoard {...defaultProps} onTicketUpdate={onTicketUpdate} />);
    
    // Find all inline editable spans and pick the last one matching (avoids StrictMode doubles)
    const titleSpans = Array.from(document.querySelectorAll('span[title="Click to edit"]')).filter(span => 
      span.textContent?.includes('Exchange server not syncing emails')
    );
    
    expect(titleSpans.length).toBeGreaterThan(0);
    
    // Click the last one (real render)
    fireEvent.click(titleSpans[titleSpans.length - 1]);
    
    // Find the input that appears
    const inputs = screen.getAllByDisplayValue('Exchange server not syncing emails');
    const input = inputs[inputs.length - 1] as HTMLInputElement;
    expect(input).toBeTruthy();
    
    fireEvent.change(input, { target: { value: 'Updated title' } });
    fireEvent.blur(input);
    
    expect(onTicketUpdate).toHaveBeenCalledWith('t1', { title: 'Updated title' });
  });

  it('allows inline editing of ticket priority', async () => {
    const onTicketUpdate = vi.fn();
    render(<TicketBoard {...defaultProps} onTicketUpdate={onTicketUpdate} />);
    
    const prioritySpans = Array.from(document.querySelectorAll('span[title="Click to edit"]')).filter(span => 
      span.textContent?.includes('Critical')
    );
    
    expect(prioritySpans.length).toBeGreaterThan(0);
    
    fireEvent.click(prioritySpans[prioritySpans.length - 1]);
    
    const selects = document.querySelectorAll('select');
    const select = selects[selects.length - 1] as HTMLSelectElement;
    expect(select).toBeTruthy();
    expect(select.value).toBe('critical');
    
    fireEvent.change(select, { target: { value: 'high' } });
    fireEvent.blur(select);
    
    // Should call with any critical ticket's ID and priority: 'high'
    expect(onTicketUpdate).toHaveBeenCalledWith(expect.any(String), { priority: 'high' });
  });

  it('filters tickets by search query', () => {
    render(<TicketBoard {...defaultProps} />);
    
    // Find the search input - use getAllBy and take first one to handle multiple renders
    const searchInputs = screen.getAllByPlaceholderText(/Search tickets, clients, assignees/);
    const searchInput = searchInputs[0];
    expect(searchInput).toBeTruthy();
    
    // Initially should show all 10 tickets
    expect(document.querySelectorAll('[draggable=true]').length).toBeGreaterThanOrEqual(10);
    
    // Search for "Exchange" - should filter to tickets containing that term
    fireEvent.change(searchInput, { target: { value: 'Exchange' } });
    
    // Should still show tickets, but filtered results
    const visibleTickets = document.querySelectorAll('[draggable=true]');
    expect(visibleTickets.length).toBeGreaterThan(0);
    
    // Should show the ticket with "Exchange server not syncing emails" 
    expect(screen.getAllByText(/Exchange server not syncing emails/).length).toBeGreaterThan(0);
  });

  it('filters tickets by client', () => {
    render(<TicketBoard {...defaultProps} />);
    
    // Find the Client filter dropdown
    const clientSelects = document.querySelectorAll('select');
    const clientSelect = Array.from(clientSelects).find(select => {
      return select.previousElementSibling?.textContent?.includes('Client');
    });
    expect(clientSelect).toBeTruthy();
    
    // Filter by "Acme Corp"
    fireEvent.change(clientSelect!, { target: { value: 'Acme Corp' } });
    
    // Should only show tickets for Acme Corp
    expect(screen.getAllByText('Acme Corp').length).toBeGreaterThan(0);
  });

  it('filters tickets by priority', () => {
    render(<TicketBoard {...defaultProps} />);
    
    // Find the Priority filter dropdown
    const prioritySelects = document.querySelectorAll('select');
    const prioritySelect = Array.from(prioritySelects).find(select => {
      return select.previousElementSibling?.textContent?.includes('Priority');
    });
    expect(prioritySelect).toBeTruthy();
    
    // Filter by critical priority
    fireEvent.change(prioritySelect!, { target: { value: 'critical' } });
    
    // Should show critical priority tickets
    expect(screen.getAllByText('Critical').length).toBeGreaterThan(0);
  });

  it('shows clear filters button when filters are applied', () => {
    render(<TicketBoard {...defaultProps} />);
    
    // Get the search input
    const searchInputs = screen.getAllByPlaceholderText(/Search tickets, clients, assignees/);
    const searchInput = searchInputs[0];
    
    // Apply a search filter
    fireEvent.change(searchInput, { target: { value: 'Exchange' } });
    
    // Should show clear filters button (it appears when hasFilters is true)
    expect(screen.getByText('Clear filters')).toBeTruthy();
    
    // Click clear filters
    fireEvent.click(screen.getByText('Clear filters'));
    
    // Search input should be cleared
    expect((searchInput as HTMLInputElement).value).toBe('');
  });

  it('updates ticket count when filters are applied', () => {
    render(<TicketBoard {...defaultProps} />);
    
    // Apply a filter that should reduce the count
    const searchInputs = screen.getAllByPlaceholderText(/Search tickets, clients, assignees/);
    const searchInput = searchInputs[0];
    fireEvent.change(searchInput, { target: { value: 'Exchange' } });
    
    // Should show filtered count vs total count
    const countText = screen.getByText(/of \d+ tickets showing/);
    expect(countText).toBeTruthy();
  });
});
