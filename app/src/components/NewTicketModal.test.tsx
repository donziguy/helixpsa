import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@/test/test-utils';
import NewTicketModal from './NewTicketModal';

// Mock TimeEstimationPanel
vi.mock('./TimeEstimationPanel', () => ({
  default: vi.fn(({ title, description, onEstimateUpdate }) => (
    <div data-testid="time-estimation-panel">
      <span>Time Estimation Panel</span>
      <button 
        onClick={() => onEstimateUpdate?.(2.5)}
        data-testid="mock-estimate-button"
      >
        Set Estimate
      </button>
      <span>Title: {title}</span>
      <span>Description: {description}</span>
    </div>
  )),
}));

describe('NewTicketModal', () => {
  const makeProps = () => ({
    isOpen: true,
    onClose: vi.fn(),
    onSubmit: vi.fn(),
  });

  it('renders nothing when not open', () => {
    const props = makeProps();
    const { queryByText } = render(<NewTicketModal {...props} isOpen={false} />);
    expect(queryByText('New Ticket')).not.toBeInTheDocument();
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

  it('renders time estimation panel', () => {
    const props = makeProps();
    render(<NewTicketModal {...props} />);
    expect(screen.getByTestId('time-estimation-panel')).toBeInTheDocument();
    expect(screen.getByText('Time Estimation Panel')).toBeInTheDocument();
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

  it('submits form with correct data', () => {
    const props = makeProps();
    render(<NewTicketModal {...props} />);
    
    // Fill out form
    fireEvent.change(screen.getAllByPlaceholderText('Brief description of the issue')[0], {
      target: { value: 'Test ticket title' }
    });
    fireEvent.change(screen.getAllByDisplayValue('Select client...')[0], {
      target: { value: 'Acme Corp' }
    });
    fireEvent.change(screen.getAllByDisplayValue('Cory S.')[0], {
      target: { value: 'Mike T.' }
    });
    fireEvent.click(screen.getAllByText('High')[0]);
    fireEvent.change(screen.getAllByPlaceholderText('Additional details about the issue...')[0], {
      target: { value: 'Test description' }
    });
    
    // Submit
    fireEvent.click(screen.getAllByText('Create Ticket')[0]);
    
    expect(props.onSubmit).toHaveBeenCalledWith({
      title: 'Test ticket title',
      client: 'Acme Corp',
      assignee: 'Mike T.',
      priority: 'high',
      description: 'Test description',
      sla: '24h remaining',
      estimatedHours: undefined,
    });
    expect(props.onClose).toHaveBeenCalled();
  });

  it('submits form with estimated hours when provided', () => {
    const props = makeProps();
    render(<NewTicketModal {...props} />);
    
    // Fill out form
    fireEvent.change(screen.getAllByPlaceholderText('Brief description of the issue')[0], {
      target: { value: 'Test ticket title' }
    });
    fireEvent.change(screen.getAllByDisplayValue('Select client...')[0], {
      target: { value: 'Acme Corp' }
    });
    
    // Set estimate via TimeEstimationPanel
    fireEvent.click(screen.getByTestId('mock-estimate-button'));
    
    // Submit
    fireEvent.click(screen.getAllByText('Create Ticket')[0]);
    
    expect(props.onSubmit).toHaveBeenCalledWith({
      title: 'Test ticket title',
      client: 'Acme Corp',
      assignee: 'Cory S.',
      priority: 'medium',
      description: '',
      sla: '24h remaining',
      estimatedHours: 2.5,
    });
    expect(props.onClose).toHaveBeenCalled();
  });

  it('passes title and description to time estimation panel', () => {
    const props = makeProps();
    render(<NewTicketModal {...props} />);
    
    // Fill out title and description
    fireEvent.change(screen.getAllByPlaceholderText('Brief description of the issue')[0], {
      target: { value: 'Network connectivity issue' }
    });
    fireEvent.change(screen.getAllByPlaceholderText('Additional details about the issue...')[0], {
      target: { value: 'Users cannot access the internet' }
    });
    
    expect(screen.getByText('Title: Network connectivity issue')).toBeInTheDocument();
    expect(screen.getByText('Description: Users cannot access the internet')).toBeInTheDocument();
  });
});