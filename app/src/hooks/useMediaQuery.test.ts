import { renderHook } from '@testing-library/react';
import { useIsMobile, useIsTablet, useIsDesktop } from './useMediaQuery';

// Mock window.matchMedia
const createMatchMedia = (matches: boolean) => jest.fn(() => ({
  matches,
  media: '',
  onchange: null,
  addListener: jest.fn(),
  removeListener: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  dispatchEvent: jest.fn(),
}));

describe('useMediaQuery hooks', () => {
  beforeEach(() => {
    // Reset window.matchMedia
    delete (window as any).matchMedia;
  });

  describe('useIsMobile', () => {
    it('should return true when screen width is <= 768px', () => {
      window.matchMedia = createMatchMedia(true);
      const { result } = renderHook(() => useIsMobile());
      expect(result.current).toBe(true);
    });

    it('should return false when screen width is > 768px', () => {
      window.matchMedia = createMatchMedia(false);
      const { result } = renderHook(() => useIsMobile());
      expect(result.current).toBe(false);
    });
  });

  describe('useIsTablet', () => {
    it('should return true when screen width is between 769px and 1024px', () => {
      window.matchMedia = createMatchMedia(true);
      const { result } = renderHook(() => useIsTablet());
      expect(result.current).toBe(true);
    });

    it('should return false when screen width is outside tablet range', () => {
      window.matchMedia = createMatchMedia(false);
      const { result } = renderHook(() => useIsTablet());
      expect(result.current).toBe(false);
    });
  });

  describe('useIsDesktop', () => {
    it('should return true when screen width is >= 1025px', () => {
      window.matchMedia = createMatchMedia(true);
      const { result } = renderHook(() => useIsDesktop());
      expect(result.current).toBe(true);
    });

    it('should return false when screen width is < 1025px', () => {
      window.matchMedia = createMatchMedia(false);
      const { result } = renderHook(() => useIsDesktop());
      expect(result.current).toBe(false);
    });
  });
});