import { useEffect, useState, useCallback } from 'react';

interface NavigationItem {
  id: string;
  element?: HTMLElement | null;
}

interface UseKeyboardNavigationProps {
  items: NavigationItem[];
  onSelect?: (item: NavigationItem, index: number) => void;
  onNavigate?: (index: number) => void;
  disabled?: boolean;
  wrapAround?: boolean;
}

export function useKeyboardNavigation({
  items,
  onSelect,
  onNavigate,
  disabled = false,
  wrapAround = true
}: UseKeyboardNavigationProps) {
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);

  const navigateToIndex = useCallback((newIndex: number) => {
    if (items.length === 0) return;
    
    let targetIndex = newIndex;
    
    if (wrapAround) {
      if (targetIndex >= items.length) targetIndex = 0;
      if (targetIndex < 0) targetIndex = items.length - 1;
    } else {
      targetIndex = Math.max(0, Math.min(items.length - 1, targetIndex));
    }
    
    setSelectedIndex(targetIndex);
    onNavigate?.(targetIndex);
    
    // Scroll the selected item into view
    const item = items[targetIndex];
    if (item?.element) {
      item.element.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest'
      });
    }
  }, [items, wrapAround, onNavigate]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (disabled) return;
    
    const target = e.target as HTMLElement;
    const isInputElement = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
    const hasContentEditable = target.contentEditable === 'true';
    
    // Don't interfere with input elements or when typing
    if (isInputElement || hasContentEditable) return;
    
    switch (e.key) {
      case 'j':
      case 'ArrowDown':
        e.preventDefault();
        navigateToIndex(selectedIndex + 1);
        break;
      case 'k':
      case 'ArrowUp':
        e.preventDefault();
        navigateToIndex(selectedIndex - 1);
        break;
      case 'h':
      case 'ArrowLeft':
        // In Kanban view, move to previous column
        e.preventDefault();
        navigateToIndex(selectedIndex - 1);
        break;
      case 'l':
      case 'ArrowRight':
        // In Kanban view, move to next item in same column or next column
        e.preventDefault();
        navigateToIndex(selectedIndex + 1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < items.length) {
          onSelect?.(items[selectedIndex], selectedIndex);
        }
        break;
      case 'Home':
        e.preventDefault();
        navigateToIndex(0);
        break;
      case 'End':
        e.preventDefault();
        navigateToIndex(items.length - 1);
        break;
    }
  }, [disabled, selectedIndex, items, navigateToIndex, onSelect]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Reset selection when items change
  useEffect(() => {
    if (selectedIndex >= items.length) {
      setSelectedIndex(items.length > 0 ? 0 : -1);
    }
  }, [items.length, selectedIndex]);

  const selectIndex = useCallback((index: number) => {
    setSelectedIndex(index);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIndex(-1);
  }, []);

  return {
    selectedIndex,
    selectIndex,
    clearSelection,
    navigateToIndex
  };
}