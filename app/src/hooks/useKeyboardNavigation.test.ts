import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useKeyboardNavigation } from './useKeyboardNavigation';

describe('useKeyboardNavigation', () => {
  const mockItems = [
    { id: '1', element: document.createElement('div') },
    { id: '2', element: document.createElement('div') },
    { id: '3', element: document.createElement('div') },
  ];

  const mockOnSelect = vi.fn();
  const mockOnNavigate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock scrollIntoView
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('initializes with no selection', () => {
    const { result } = renderHook(() => useKeyboardNavigation({
      items: mockItems,
      onSelect: mockOnSelect,
      onNavigate: mockOnNavigate,
    }));

    expect(result.current.selectedIndex).toBe(-1);
  });

  it('navigates down with j key', () => {
    const { result } = renderHook(() => useKeyboardNavigation({
      items: mockItems,
      onSelect: mockOnSelect,
      onNavigate: mockOnNavigate,
    }));

    act(() => {
      const event = new KeyboardEvent('keydown', { key: 'j' });
      window.dispatchEvent(event);
    });

    expect(result.current.selectedIndex).toBe(0);
    expect(mockOnNavigate).toHaveBeenCalledWith(0);
  });

  it('navigates up with k key', () => {
    const { result } = renderHook(() => useKeyboardNavigation({
      items: mockItems,
      onSelect: mockOnSelect,
      onNavigate: mockOnNavigate,
    }));

    // First navigate down
    act(() => {
      const event = new KeyboardEvent('keydown', { key: 'j' });
      window.dispatchEvent(event);
    });

    // Then navigate up
    act(() => {
      const event = new KeyboardEvent('keydown', { key: 'k' });
      window.dispatchEvent(event);
    });

    expect(result.current.selectedIndex).toBe(2); // Wraps to last item
    expect(mockOnNavigate).toHaveBeenLastCalledWith(2);
  });

  it('navigates with arrow keys', () => {
    const { result } = renderHook(() => useKeyboardNavigation({
      items: mockItems,
      onSelect: mockOnSelect,
      onNavigate: mockOnNavigate,
    }));

    act(() => {
      const event = new KeyboardEvent('keydown', { key: 'ArrowDown' });
      window.dispatchEvent(event);
    });

    expect(result.current.selectedIndex).toBe(0);

    act(() => {
      const event = new KeyboardEvent('keydown', { key: 'ArrowUp' });
      window.dispatchEvent(event);
    });

    expect(result.current.selectedIndex).toBe(2); // Wraps to last item
  });

  it('selects item with Enter key', () => {
    const { result } = renderHook(() => useKeyboardNavigation({
      items: mockItems,
      onSelect: mockOnSelect,
      onNavigate: mockOnNavigate,
    }));

    // Navigate to first item
    act(() => {
      const event = new KeyboardEvent('keydown', { key: 'j' });
      window.dispatchEvent(event);
    });

    // Select current item
    act(() => {
      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      window.dispatchEvent(event);
    });

    expect(mockOnSelect).toHaveBeenCalledWith(mockItems[0], 0);
  });

  it('navigates to home/end with Home/End keys', () => {
    const { result } = renderHook(() => useKeyboardNavigation({
      items: mockItems,
      onSelect: mockOnSelect,
      onNavigate: mockOnNavigate,
    }));

    act(() => {
      const event = new KeyboardEvent('keydown', { key: 'End' });
      window.dispatchEvent(event);
    });

    expect(result.current.selectedIndex).toBe(2);

    act(() => {
      const event = new KeyboardEvent('keydown', { key: 'Home' });
      window.dispatchEvent(event);
    });

    expect(result.current.selectedIndex).toBe(0);
  });

  it('does not interfere with input elements', () => {
    const { result } = renderHook(() => useKeyboardNavigation({
      items: mockItems,
      onSelect: mockOnSelect,
      onNavigate: mockOnNavigate,
    }));

    // Create a real input element and dispatch event from it
    const mockInput = document.createElement('input');
    document.body.appendChild(mockInput);

    act(() => {
      const event = new KeyboardEvent('keydown', { 
        key: 'j', 
        bubbles: true
      });
      // Dispatch from the input element itself
      Object.defineProperty(event, 'target', { value: mockInput });
      window.dispatchEvent(event);
    });

    expect(result.current.selectedIndex).toBe(-1); // Should not change
    expect(mockOnNavigate).not.toHaveBeenCalled();
    
    document.body.removeChild(mockInput);
  });

  it('wraps around when wrapAround is true', () => {
    const { result } = renderHook(() => useKeyboardNavigation({
      items: mockItems,
      onSelect: mockOnSelect,
      onNavigate: mockOnNavigate,
      wrapAround: true,
    }));

    // Navigate to end
    act(() => {
      result.current.navigateToIndex(2);
    });

    // Navigate down (should wrap to beginning)
    act(() => {
      const event = new KeyboardEvent('keydown', { key: 'j' });
      window.dispatchEvent(event);
    });

    expect(result.current.selectedIndex).toBe(0);
  });

  it('does not wrap around when wrapAround is false', () => {
    const { result } = renderHook(() => useKeyboardNavigation({
      items: mockItems,
      onSelect: mockOnSelect,
      onNavigate: mockOnNavigate,
      wrapAround: false,
    }));

    // Navigate to end
    act(() => {
      result.current.navigateToIndex(2);
    });

    // Try to navigate down (should stay at end)
    act(() => {
      const event = new KeyboardEvent('keydown', { key: 'j' });
      window.dispatchEvent(event);
    });

    expect(result.current.selectedIndex).toBe(2);
  });

  it('can be disabled', () => {
    // Create a fresh mock for this test
    const disabledOnNavigate = vi.fn();
    const { result } = renderHook(() => useKeyboardNavigation({
      items: mockItems,
      onSelect: mockOnSelect,
      onNavigate: disabledOnNavigate,
      disabled: true,
    }));

    act(() => {
      const event = new KeyboardEvent('keydown', { key: 'j' });
      window.dispatchEvent(event);
    });

    expect(result.current.selectedIndex).toBe(-1);
    expect(disabledOnNavigate).not.toHaveBeenCalled();
  });

  it('scrolls selected element into view', () => {
    const { result } = renderHook(() => useKeyboardNavigation({
      items: mockItems,
      onSelect: mockOnSelect,
      onNavigate: mockOnNavigate,
    }));

    act(() => {
      const event = new KeyboardEvent('keydown', { key: 'j' });
      window.dispatchEvent(event);
    });

    expect(mockItems[0].element?.scrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'center',
      inline: 'nearest'
    });
  });

  it('updates selection when items change', () => {
    let items = mockItems;
    const { result, rerender } = renderHook(
      ({ items: hookItems }) => useKeyboardNavigation({
        items: hookItems,
        onSelect: mockOnSelect,
        onNavigate: mockOnNavigate,
      }),
      { initialProps: { items } }
    );

    // Navigate to last item
    act(() => {
      result.current.navigateToIndex(2);
    });
    expect(result.current.selectedIndex).toBe(2);

    // Remove items (simulate filtering)
    items = mockItems.slice(0, 2);
    rerender({ items });

    expect(result.current.selectedIndex).toBe(0); // Should reset to first available item
  });
});