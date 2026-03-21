import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import InlineEdit from './InlineEdit';

describe('InlineEdit', () => {
  beforeEach(() => {
    cleanup();
  });

  it('renders the value as display text initially', () => {
    render(<InlineEdit value="Test Value" onSave={vi.fn()} />);
    expect(screen.getByText('Test Value')).toBeTruthy();
  });

  it('shows placeholder when value is empty', () => {
    render(<InlineEdit value="" onSave={vi.fn()} placeholder="Click to edit..." />);
    expect(screen.getByText('Click to edit...')).toBeTruthy();
  });

  it('enters edit mode when clicked', () => {
    render(<InlineEdit value="Test Value" onSave={vi.fn()} />);
    
    const displayText = screen.getByText('Test Value');
    fireEvent.click(displayText);
    
    expect(screen.getByDisplayValue('Test Value')).toBeTruthy();
  });

  it('calls onSave when Enter is pressed', () => {
    const onSave = vi.fn();
    render(<InlineEdit value="Original" onSave={onSave} />);
    
    const displayText = screen.getByText('Original');
    fireEvent.click(displayText);
    
    const input = screen.getByDisplayValue('Original') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'New Value' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    
    expect(onSave).toHaveBeenCalledWith('New Value');
  });

  it('calls onSave when input loses focus', () => {
    const onSave = vi.fn();
    render(
      <div>
        <InlineEdit value="Original Value" onSave={onSave} />
        <button>Other element</button>
      </div>
    );
    
    const displayText = screen.getByText('Original Value');
    fireEvent.click(displayText);
    
    const input = screen.getByDisplayValue('Original Value') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'New Value' } });
    fireEvent.blur(input);
    
    expect(onSave).toHaveBeenCalledWith('New Value');
  });

  it('cancels edit when Escape is pressed', () => {
    const onSave = vi.fn();
    const onCancel = vi.fn();
    render(<InlineEdit value="Original Text" onSave={onSave} onCancel={onCancel} />);
    
    const displayText = screen.getByText('Original Text');
    fireEvent.click(displayText);
    
    const input = screen.getByDisplayValue('Original Text') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'New Value' } });
    fireEvent.keyDown(input, { key: 'Escape' });
    
    expect(onSave).not.toHaveBeenCalled();
    expect(onCancel).toHaveBeenCalled();
    expect(screen.getByText('Original Text')).toBeTruthy();
  });

  it('renders as select when selectOptions provided', () => {
    const onSave = vi.fn();
    const options = [
      { value: 'option1', label: 'Option 1' },
      { value: 'option2', label: 'Option 2' },
    ];
    
    render(<InlineEdit value="option1" onSave={onSave} selectOptions={options} />);
    
    // Should show label text, not value
    const displayText = screen.getByText('Option 1');
    fireEvent.click(displayText);
    
    expect(screen.getByRole('combobox')).toBeTruthy();
    expect(screen.getByText('Option 1')).toBeTruthy();
    expect(screen.getByText('Option 2')).toBeTruthy();
  });

  it('renders as textarea when multiline is true', () => {
    render(<InlineEdit value="Multi line content" onSave={vi.fn()} multiline />);
    
    const displayText = screen.getByText('Multi line content');
    fireEvent.click(displayText);
    
    const textarea = document.querySelector('textarea');
    expect(textarea).toBeTruthy();
    expect(textarea?.value).toBe('Multi line content');
  });

  it('saves on Cmd+Enter in multiline mode', () => {
    const onSave = vi.fn();
    render(<InlineEdit value="Original Multi" onSave={onSave} multiline />);
    
    const displayText = screen.getByText('Original Multi');
    fireEvent.click(displayText);
    
    const textarea = document.querySelector('textarea');
    if (textarea) {
      fireEvent.change(textarea, { target: { value: 'New multiline\ncontent' } });
      fireEvent.keyDown(textarea, { key: 'Enter', metaKey: true });
    }
    
    expect(onSave).toHaveBeenCalledWith('New multiline\ncontent');
  });

  it('does not save if value unchanged', () => {
    const onSave = vi.fn();
    render(<InlineEdit value="Unchanged Value" onSave={onSave} />);
    
    const displayText = screen.getByText('Unchanged Value');
    fireEvent.click(displayText);
    
    const input = screen.getByDisplayValue('Unchanged Value');
    fireEvent.keyDown(input, { key: 'Enter' });
    
    expect(onSave).not.toHaveBeenCalled();
  });
});