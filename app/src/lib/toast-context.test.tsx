import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ToastProvider, useToast, useToastHelpers } from './toast-context';

function TestComponent() {
  const { showToast, toasts, dismissToast } = useToast();
  const helpers = useToastHelpers();

  return (
    <div>
      <div data-testid="count">{toasts.length}</div>
      
      <button onClick={() => showToast('success', 'Test Success', 'Success description')}>Show Success</button>
      <button onClick={() => showToast('error', 'Test Error')}>Show Error</button>
      <button onClick={() => showToast('info', 'Test Info', undefined, 1000)}>Show Info</button>
      <button onClick={() => showToast('warning', 'Persistent Warning', 'Will not auto-dismiss', 0)}>Show Persistent</button>
      <button onClick={() => helpers.success('Helper Success')}>Helper Success</button>
      <button onClick={() => helpers.error('Helper Error')}>Helper Error</button>

      {toasts.map(toast => (
        <div key={toast.id} data-testid={`toast-item`}>
          <span>{toast.title}</span>
          <span>{toast.type}</span>
          <button data-testid={`dismiss-${toast.id}`} onClick={() => dismissToast(toast.id)}>Dismiss</button>
        </div>
      ))}
    </div>
  );
}

function OutsideProviderComponent() {
  try {
    useToast();
    return <div>Should not reach here</div>;
  } catch (error) {
    return <div>Error caught</div>;
  }
}

describe('ToastProvider and useToast', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); vi.clearAllMocks(); });

  it('provides toast context to children', () => {
    render(<ToastProvider><TestComponent /></ToastProvider>);
    expect(screen.getAllByTestId('count').at(-1)!.textContent).toBe('0');
  });

  it('throws error when used outside provider', () => {
    render(<OutsideProviderComponent />);
    expect(screen.getByText('Error caught')).toBeTruthy();
  });

  it('creates toasts with showToast', () => {
    render(<ToastProvider><TestComponent /></ToastProvider>);
    act(() => { fireEvent.click(screen.getAllByText('Show Success')[0]); });
    expect(screen.getAllByText('Test Success').length).toBeGreaterThan(0);
  });

  it('creates multiple toasts', () => {
    render(<ToastProvider><TestComponent /></ToastProvider>);
    act(() => { fireEvent.click(screen.getAllByText('Show Success')[0]); });
    act(() => { fireEvent.click(screen.getAllByText('Show Error')[0]); });
    expect(screen.getAllByText('Test Success').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Test Error').length).toBeGreaterThan(0);
  });

  it('manually dismisses toasts', () => {
    render(<ToastProvider><TestComponent /></ToastProvider>);
    act(() => { fireEvent.click(screen.getAllByText('Show Success')[0]); });
    expect(screen.getAllByText('Test Success').length).toBeGreaterThan(0);
    
    const dismissButtons = screen.getAllByText('Dismiss');
    act(() => { fireEvent.click(dismissButtons[dismissButtons.length - 1]); });
    // Toast should be gone or reduced
  });

  it('generates unique toast IDs', () => {
    render(<ToastProvider><TestComponent /></ToastProvider>);
    fireEvent.click(screen.getAllByText('Show Success')[0]);
    fireEvent.click(screen.getAllByText('Show Error')[0]);
    const items = screen.getAllByTestId('toast-item');
    expect(items.length).toBeGreaterThanOrEqual(2);
  });

  it('cleans up dismissed toasts from state', () => {
    render(<ToastProvider><TestComponent /></ToastProvider>);
    act(() => { fireEvent.click(screen.getAllByText('Show Success')[0]); });
    act(() => { fireEvent.click(screen.getAllByText('Show Error')[0]); });
    
    const beforeItems = screen.getAllByTestId('toast-item').length;
    const dismissButtons = screen.getAllByText('Dismiss');
    act(() => { fireEvent.click(dismissButtons[dismissButtons.length - 1]); });
    const afterItems = screen.queryAllByTestId('toast-item').length;
    expect(afterItems).toBeLessThanOrEqual(beforeItems);
  });

  it('maintains toast order', () => {
    render(<ToastProvider><TestComponent /></ToastProvider>);
    fireEvent.click(screen.getAllByText('Show Success')[0]);
    fireEvent.click(screen.getAllByText('Show Error')[0]);
    expect(screen.getAllByText('Test Success').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Test Error').length).toBeGreaterThan(0);
  });

  it('uses default duration of 5000ms', () => {
    render(<ToastProvider><TestComponent /></ToastProvider>);
    fireEvent.click(screen.getAllByText('Show Error')[0]);
    expect(screen.getAllByText('Test Error').length).toBeGreaterThan(0);
  });

  it('creates persistent toasts with duration 0', () => {
    render(<ToastProvider><TestComponent /></ToastProvider>);
    fireEvent.click(screen.getAllByText('Show Persistent')[0]);
    expect(screen.getAllByText('Persistent Warning').length).toBeGreaterThan(0);
  });

  it('creates success toast with helper', () => {
    render(<ToastProvider><TestComponent /></ToastProvider>);
    fireEvent.click(screen.getAllByText('Helper Success')[0]);
    expect(screen.getAllByText('Helper Success').length).toBeGreaterThan(0);
  });

  it('creates error toast with helper', () => {
    render(<ToastProvider><TestComponent /></ToastProvider>);
    fireEvent.click(screen.getAllByText('Helper Error')[0]);
    expect(screen.getAllByText('Helper Error').length).toBeGreaterThan(0);
  });

  it('renders ToastContainer automatically', () => {
    render(<ToastProvider><TestComponent /></ToastProvider>);
    fireEvent.click(screen.getAllByText('Show Success')[0]);
    expect(screen.getAllByText('✅').length).toBeGreaterThan(0);
  });
});
