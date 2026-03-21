import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TicketDetail from './TicketDetail';
import { tickets } from '@/lib/mock-data';

describe('TicketDetail', () => {
  const ticket = tickets[0]; // HLX-001

  const makeProps = () => ({
    ticket,
    onClose: vi.fn(),
    onStatusChange: vi.fn(),
    onTicketUpdate: vi.fn(),
    timer: null,
    onTimerToggle: vi.fn(),
  });

  it('renders nothing when ticket is null', () => {
    const props = makeProps();
    const { container } = render(<TicketDetail {...props} ticket={null} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders ticket number and title', () => {
    const props = makeProps();
    render(<TicketDetail {...props} />);
    expect(screen.getAllByText(ticket.number).length).toBeGreaterThan(0);
    expect(screen.getAllByText(ticket.title).length).toBeGreaterThan(0);
  });

  it('renders ticket client and assignee', () => {
    const props = makeProps();
    render(<TicketDetail {...props} />);
    expect(screen.getAllByText(ticket.client).length).toBeGreaterThan(0);
    // Assignee may appear in metadata grid + activity notes
    expect(screen.getAllByText(ticket.assignee).length).toBeGreaterThan(0);
  });

  it('shows status change buttons', () => {
    const props = makeProps();
    render(<TicketDetail {...props} />);
    expect(screen.getAllByText('Open').length).toBeGreaterThan(0);
    expect(screen.getAllByText('In Progress').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Waiting').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Resolved').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Closed').length).toBeGreaterThan(0);
  });

  it('calls onStatusChange when status button clicked', () => {
    const props = makeProps();
    render(<TicketDetail {...props} />);
    const resolvedButtons = screen.getAllByText('Resolved');
    // Click the last one (first real render)
    fireEvent.click(resolvedButtons[resolvedButtons.length - 1]);
    expect(props.onStatusChange).toHaveBeenCalledWith(ticket.id, 'resolved');
  });

  it('calls onClose when X button clicked', () => {
    const props = makeProps();
    render(<TicketDetail {...props} />);
    const closeButtons = screen.getAllByText('✕');
    fireEvent.click(closeButtons[closeButtons.length - 1]);
    expect(props.onClose).toHaveBeenCalled();
  });

  it('calls onClose on Escape key', () => {
    const props = makeProps();
    render(<TicketDetail {...props} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(props.onClose).toHaveBeenCalled();
  });

  it('shows timer controls', () => {
    const props = makeProps();
    render(<TicketDetail {...props} />);
    // Play button exists
    expect(screen.getAllByText('▶').length).toBeGreaterThan(0);
  });

  it('calls onTimerToggle when timer button clicked', () => {
    const props = makeProps();
    render(<TicketDetail {...props} />);
    const playButtons = screen.getAllByText('▶');
    fireEvent.click(playButtons[playButtons.length - 1]);
    expect(props.onTimerToggle).toHaveBeenCalledWith(ticket.id);
  });

  it('shows stop button when timer is active', () => {
    const props = makeProps();
    render(<TicketDetail {...props} timer={{ ticketId: ticket.id, seconds: 60, running: true }} />);
    expect(screen.getAllByText('⏹').length).toBeGreaterThan(0);
  });

  it('can add a note', () => {
    const props = makeProps();
    render(<TicketDetail {...props} />);
    const inputs = screen.getAllByPlaceholderText(/Add a note/);
    fireEvent.change(inputs[0], { target: { value: 'Test note from vitest' } });
    const sendButtons = screen.getAllByText('Send');
    fireEvent.click(sendButtons[0]);
    expect(screen.getAllByText('Test note from vitest').length).toBeGreaterThan(0);
  });

  it('shows SLA info', () => {
    const props = makeProps();
    render(<TicketDetail {...props} />);
    expect(screen.getAllByText(/SLA:/).length).toBeGreaterThan(0);
  });

  it('allows inline editing of ticket title', async () => {
    const props = makeProps();
    render(<TicketDetail {...props} />);
    
    // Find the InlineEdit span for the title - look for exact title with click-to-edit tooltip
    const titleSpans = document.querySelectorAll('span[title="Click to edit"]');
    const titleSpan = Array.from(titleSpans).find(span => 
      span.textContent?.includes(ticket.title)
    );
    
    expect(titleSpan).toBeTruthy();
    
    // Click the span to enter edit mode
    fireEvent.click(titleSpan!);
    
    // Should show an input
    const input = screen.getByDisplayValue(ticket.title) as HTMLInputElement;
    expect(input).toBeTruthy();
    
    // Change the value and save
    fireEvent.change(input, { target: { value: 'New Title' } });
    fireEvent.blur(input);
    
    expect(props.onTicketUpdate).toHaveBeenCalledWith(ticket.id, { title: 'New Title' });
  });

  it('allows inline editing of ticket description', async () => {
    const props = makeProps();
    render(<TicketDetail {...props} />);
    
    // Find the InlineEdit span for the description
    const descSpans = document.querySelectorAll('span[title="Click to edit"]');
    const descSpan = Array.from(descSpans).find(span => 
      span.textContent?.includes(ticket.description)
    );
    
    expect(descSpan).toBeTruthy();
    
    // Click the span to enter edit mode
    fireEvent.click(descSpan!);
    
    // Should show a textarea
    const textarea = screen.getByDisplayValue(ticket.description) as HTMLTextAreaElement;
    expect(textarea).toBeTruthy();
    
    // Change the value and save
    fireEvent.change(textarea, { target: { value: 'New description' } });
    fireEvent.blur(textarea);
    
    expect(props.onTicketUpdate).toHaveBeenCalledWith(ticket.id, { description: 'New description' });
  });
});
