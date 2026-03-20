import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import TicketBoard from './TicketBoard';
import { tickets } from '@/lib/mock-data';

describe('TicketBoard', () => {
  const defaultProps = {
    tickets,
    onTicketClick: vi.fn(),
    onStatusChange: vi.fn(),
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
});
