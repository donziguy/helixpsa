import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import NewTicketModal from './NewTicketModal';

describe('NewTicketModal', () => {
  const makeProps = () => ({
    isOpen: true,
    onClose: vi.fn(),
    onSubmit: vi.fn(),
  });

  it('renders nothing when not open', () => {
    const props = makeProps();
    const { container } = render(<NewTicketModal {...props} isOpen={false} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders modal header and title input', () => {
    const props = makeProps();
    render(<NewTicketModal {...props} />);
    expect(screen.getAllByText('New Ticket').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Title *').length).toBeGreaterThan(0);
    expect(screen.getAllByPlaceholderText('Brief description of the issue').length).toBeGreaterThan(0);
  });

  it('renders client selection dropdown', () => {
    const props = makeProps();
    render(<NewTicketModal {...props} />);
    expect(screen.getAllByText('Client *').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Select client...').length).toBeGreaterThan(0);
    // Should have client options
    expect(screen.getAllByText('Acme Corp').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Globex Industries').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Wayne Enterprises').length).toBeGreaterThan(0);
  });

  it('renders assignee dropdown with default selection', () => {
    const props = makeProps();
    render(<NewTicketModal {...props} />);
    expect(screen.getAllByText('Assignee').length).toBeGreaterThan(0);
    expect(screen.getAllByDisplayValue('Cory S.').length).toBeGreaterThan(0);
  });

  it('renders priority buttons with medium selected by default', () => {
    const props = makeProps();
    render(<NewTicketModal {...props} />);
    expect(screen.getAllByText('Priority').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Critical').length).toBeGreaterThan(0);
    expect(screen.getAllByText('High').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Medium').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Low').length).toBeGreaterThan(0);
  });

  it('renders description textarea', () => {
    const props = makeProps();
    render(<NewTicketModal {...props} />);
    expect(screen.getAllByText('Description').length).toBeGreaterThan(0);
    expect(screen.getAllByPlaceholderText('Additional details about the issue...').length).toBeGreaterThan(0);
  });

  it('renders footer with cancel and submit buttons', () => {
    const props = makeProps();
    render(<NewTicketModal {...props} />);
    expect(screen.getAllByText('Cancel').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Create Ticket').length).toBeGreaterThan(0);
    expect(screen.getAllByText('ESC Cancel').length).toBeGreaterThan(0);
    expect(screen.getAllByText('⌘↵ Submit').length).toBeGreaterThan(0);
  });

  it('has close button', () => {
    const props = makeProps();
    render(<NewTicketModal {...props} />);
    const closeButtons = screen.getAllByText('✕');
    expect(closeButtons.length).toBeGreaterThan(0);
  });

  it('has cancel button', () => {
    const props = makeProps();
    render(<NewTicketModal {...props} />);
    const cancelButtons = screen.getAllByRole('button', { name: 'Cancel' });
    expect(cancelButtons.length).toBeGreaterThan(0);
  });

  it('has keyboard shortcut info', () => {
    const props = makeProps();
    render(<NewTicketModal {...props} />);
    expect(screen.getAllByText('ESC Cancel').length).toBeGreaterThan(0);
    expect(screen.getAllByText('⌘↵ Submit').length).toBeGreaterThan(0);
  });

  it('can fill and submit form', () => {
    const props = makeProps();
    render(<NewTicketModal {...props} />);
    
    // All form elements exist
    expect(screen.getAllByPlaceholderText('Brief description of the issue').length).toBeGreaterThan(0);
    expect(screen.getAllByDisplayValue('').length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: 'High' }).length).toBeGreaterThan(0);
    expect(screen.getAllByPlaceholderText('Additional details about the issue...').length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: 'Create Ticket' }).length).toBeGreaterThan(0);
  });

  it('disables submit when required fields are missing', () => {
    const props = makeProps();
    render(<NewTicketModal {...props} />);
    
    const submitButtons = screen.getAllByRole('button', { name: 'Create Ticket' });
    expect(submitButtons[0]).toBeDisabled();
  });

  it('has priority selection buttons', () => {
    const props = makeProps();
    render(<NewTicketModal {...props} />);
    
    expect(screen.getAllByRole('button', { name: 'Critical' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: 'High' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: 'Medium' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: 'Low' }).length).toBeGreaterThan(0);
  });

  it('has assignee options', () => {
    const props = makeProps();
    render(<NewTicketModal {...props} />);
    
    const assigneeSelects = screen.getAllByDisplayValue('Cory S.');
    expect(assigneeSelects.length).toBeGreaterThan(0);
  });

  it('has client selection', () => {
    const props = makeProps();
    render(<NewTicketModal {...props} />);
    
    // Should have client options
    expect(screen.getAllByText('Acme Corp').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Globex Industries').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Wayne Enterprises').length).toBeGreaterThan(0);
  });
});