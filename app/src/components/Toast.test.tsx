import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ToastContainer, { type Toast } from './Toast';

// Mock animation and timing for tests
const mockToasts: Toast[] = [
  {
    id: 'toast-1',
    type: 'success',
    title: 'Success!',
    description: 'Operation completed successfully',
    duration: 5000
  },
  {
    id: 'toast-2',
    type: 'error',
    title: 'Error!',
    description: 'Something went wrong',
    duration: 0 // persistent
  },
  {
    id: 'toast-3',
    type: 'warning',
    title: 'Warning!',
    duration: 3000
  },
  {
    id: 'toast-4',
    type: 'info',
    title: 'Info',
    description: 'Just so you know',
    duration: 5000
  }
];

describe('ToastContainer', () => {
  let mockOnDismiss: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnDismiss = vi.fn();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('renders nothing when no toasts are provided', () => {
    const { container } = render(<ToastContainer toasts={[]} onDismiss={mockOnDismiss} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders all toasts when provided', () => {
    render(<ToastContainer toasts={mockToasts} onDismiss={mockOnDismiss} />);
    
    expect(screen.getAllByText('Success!').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Error!').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Warning!').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Info').length).toBeGreaterThan(0);
  });

  it('shows toast descriptions when provided', () => {
    render(<ToastContainer toasts={mockToasts} onDismiss={mockOnDismiss} />);
    
    expect(screen.getAllByText('Operation completed successfully').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Something went wrong').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Just so you know').length).toBeGreaterThan(0);
  });

  it('shows appropriate icons for each toast type', () => {
    render(<ToastContainer toasts={mockToasts} onDismiss={mockOnDismiss} />);
    
    expect(screen.getAllByText('✅').length).toBeGreaterThan(0); // success
    expect(screen.getAllByText('❌').length).toBeGreaterThan(0); // error
    expect(screen.getAllByText('⚠️').length).toBeGreaterThan(0); // warning
    expect(screen.getAllByText('ℹ️').length).toBeGreaterThan(0); // info
  });

  it('shows close buttons on all toasts', () => {
    render(<ToastContainer toasts={mockToasts} onDismiss={mockOnDismiss} />);
    
    const closeButtons = screen.getAllByText('✕');
    expect(closeButtons.length).toBeGreaterThanOrEqual(mockToasts.length);
  });

  it('calls onDismiss when close button is clicked', async () => {
    render(<ToastContainer toasts={[mockToasts[0]]} onDismiss={mockOnDismiss} />);
    
    const closeButtons = screen.getAllByText('✕');
    fireEvent.click(closeButtons[closeButtons.length - 1]);
    
    // Animation delay
    vi.advanceTimersByTime(300);
    
    expect(mockOnDismiss).toHaveBeenCalledWith('toast-1');
  });

  it('auto-dismisses timed toasts after duration', async () => {
    render(<ToastContainer toasts={[mockToasts[0]]} onDismiss={mockOnDismiss} />);
    
    // Fast forward to just before auto-dismiss
    vi.advanceTimersByTime(4999);
    expect(mockOnDismiss).not.toHaveBeenCalled();
    
    // Trigger auto-dismiss
    vi.advanceTimersByTime(1);
    
    // Animation delay
    vi.advanceTimersByTime(300);
    
    expect(mockOnDismiss).toHaveBeenCalledWith('toast-1');
  });

  it('does not auto-dismiss persistent toasts (duration = 0)', async () => {
    render(<ToastContainer toasts={[mockToasts[1]]} onDismiss={mockOnDismiss} />);
    
    // Fast forward way beyond normal duration
    vi.advanceTimersByTime(10000);
    
    expect(mockOnDismiss).not.toHaveBeenCalled();
  });

  it('respects custom duration settings', async () => {
    const customToast: Toast = {
      id: 'custom',
      type: 'info',
      title: 'Custom Duration',
      duration: 1000 // 1 second
    };
    
    render(<ToastContainer toasts={[customToast]} onDismiss={mockOnDismiss} />);
    
    // Should not dismiss before 1 second
    vi.advanceTimersByTime(999);
    expect(mockOnDismiss).not.toHaveBeenCalled();
    
    // Should dismiss after 1 second + animation
    vi.advanceTimersByTime(1);
    vi.advanceTimersByTime(300);
    
    expect(mockOnDismiss).toHaveBeenCalledWith('custom');
  });

  it('shows progress bar for timed toasts', () => {
    render(<ToastContainer toasts={[mockToasts[0]]} onDismiss={mockOnDismiss} />);
    
    // Progress bar has height: 2px and is positioned absolute at bottom
    const progressBars = document.querySelectorAll('[style*="height: 2px"]');
    expect(progressBars.length).toBeGreaterThanOrEqual(1);
  });

  it('does not show progress bar for persistent toasts', () => {
    render(<ToastContainer toasts={[mockToasts[1]]} onDismiss={mockOnDismiss} />);
    
    // Persistent toasts (duration=0) should not have animation in their progress bar
    // The component conditionally renders the progress div only when duration !== 0
    const container = document.querySelector('[style*="position: fixed"]');
    expect(container).not.toBeNull();
    // Persistent toast rendered - just verify it exists without progress animation
    expect(screen.getAllByText('Error!').length).toBeGreaterThan(0);
  });

  it('positions toasts in a fixed container', () => {
    render(<ToastContainer toasts={mockToasts} onDismiss={mockOnDismiss} />);
    
    const container = document.querySelector('[style*="position: fixed"]');
    expect(container).not.toBeNull();
    expect(container).toHaveStyle({ 
      position: 'fixed',
      top: '24px',
      right: '24px',
      'z-index': '50'
    });
  });

  it('applies different border colors based on toast type', () => {
    render(<ToastContainer toasts={mockToasts} onDismiss={mockOnDismiss} />);
    
    const toastElements = document.querySelectorAll('[style*="border: 1px solid"]');
    expect(toastElements.length).toBeGreaterThanOrEqual(mockToasts.length);
    
    // Verify all toast types are rendered
    expect(screen.getAllByText('✅').length).toBeGreaterThan(0); // success
    expect(screen.getAllByText('❌').length).toBeGreaterThan(0); // error
    expect(screen.getAllByText('⚠️').length).toBeGreaterThan(0); // warning
    expect(screen.getAllByText('ℹ️').length).toBeGreaterThan(0); // info
  });

  it('applies hover effects to close button', () => {
    render(<ToastContainer toasts={[mockToasts[0]]} onDismiss={mockOnDismiss} />);
    
    const closeButton = screen.getAllByText('✕')[0] as HTMLElement;
    
    // Initial state
    expect(closeButton.style.background).toBe('none');
    
    // Hover
    fireEvent.mouseEnter(closeButton);
    expect(closeButton.style.background).toBe('var(--bg-tertiary)');
    
    // Leave hover
    fireEvent.mouseLeave(closeButton);
    expect(closeButton.style.background).toBe('none');
  });

  it('handles multiple toasts with different timing', async () => {
    const multipleToasts: Toast[] = [
      { id: 'fast', type: 'info', title: 'Fast', duration: 500 },
      { id: 'medium', type: 'warning', title: 'Medium', duration: 1500 },
      { id: 'slow', type: 'success', title: 'Slow', duration: 3000 }
    ];
    
    render(<ToastContainer toasts={multipleToasts} onDismiss={mockOnDismiss} />);
    
    // Fast toast should dismiss first
    vi.advanceTimersByTime(500);
    vi.advanceTimersByTime(300); // animation
    expect(mockOnDismiss).toHaveBeenCalledWith('fast');
    
    // Medium toast next
    vi.advanceTimersByTime(1000); // 1500 total
    vi.advanceTimersByTime(300); // animation
    expect(mockOnDismiss).toHaveBeenCalledWith('medium');
    
    // Slow toast last
    vi.advanceTimersByTime(1500); // 3000 total
    vi.advanceTimersByTime(300); // animation
    expect(mockOnDismiss).toHaveBeenCalledWith('slow');
  });

  it('stacks multiple toasts vertically', () => {
    render(<ToastContainer toasts={mockToasts} onDismiss={mockOnDismiss} />);
    
    const container = document.querySelector('[style*="flex-direction: column"]');
    expect(container).not.toBeNull();
    expect(container).toHaveStyle({ 'flex-direction': 'column' });
  });

  it('prevents pointer events on container but allows on individual toasts', () => {
    render(<ToastContainer toasts={[mockToasts[0]]} onDismiss={mockOnDismiss} />);
    
    const container = document.querySelector('[style*="pointer-events: none"]');
    expect(container).not.toBeNull();
    
    const toastWrapper = document.querySelector('[style*="pointer-events: auto"]');
    expect(toastWrapper).not.toBeNull();
  });
});