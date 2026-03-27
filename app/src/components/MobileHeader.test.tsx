import { render, screen, fireEvent } from '@testing-library/react';
import MobileHeader from './MobileHeader';

// Mock the useIsMobile hook
jest.mock('@/hooks/useMediaQuery', () => ({
  useIsMobile: jest.fn(),
}));

describe('MobileHeader', () => {
  const mockOnMenuToggle = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('When on mobile', () => {
    beforeEach(() => {
      const { useIsMobile } = require('@/hooks/useMediaQuery');
      useIsMobile.mockReturnValue(true);
    });

    it('renders mobile header with menu button', () => {
      render(
        <MobileHeader 
          onMenuToggle={mockOnMenuToggle}
          title="Test Page"
          mobileMenuOpen={false}
        />
      );

      expect(screen.getByText('☰')).toBeInTheDocument();
      expect(screen.getByText('🧬')).toBeInTheDocument();
      expect(screen.getByText('Test Page')).toBeInTheDocument();
    });

    it('shows hamburger icon when menu is closed', () => {
      render(
        <MobileHeader 
          onMenuToggle={mockOnMenuToggle}
          title="Test Page"
          mobileMenuOpen={false}
        />
      );

      expect(screen.getByText('☰')).toBeInTheDocument();
    });

    it('shows close icon when menu is open', () => {
      render(
        <MobileHeader 
          onMenuToggle={mockOnMenuToggle}
          title="Test Page"
          mobileMenuOpen={true}
        />
      );

      expect(screen.getByText('✕')).toBeInTheDocument();
    });

    it('calls onMenuToggle when menu button is clicked', () => {
      render(
        <MobileHeader 
          onMenuToggle={mockOnMenuToggle}
          title="Test Page"
          mobileMenuOpen={false}
        />
      );

      fireEvent.click(screen.getByText('☰'));
      expect(mockOnMenuToggle).toHaveBeenCalledTimes(1);
    });

    it('uses default title when none provided', () => {
      render(
        <MobileHeader 
          onMenuToggle={mockOnMenuToggle}
          mobileMenuOpen={false}
        />
      );

      expect(screen.getByText('HelixPSA')).toBeInTheDocument();
    });

    it('has proper touch-friendly button sizing', () => {
      render(
        <MobileHeader 
          onMenuToggle={mockOnMenuToggle}
          title="Test Page"
          mobileMenuOpen={false}
        />
      );

      const menuButton = screen.getByText('☰').closest('button');
      expect(menuButton).toHaveStyle({ minHeight: '44px', minWidth: '44px' });
    });
  });

  describe('When on desktop', () => {
    beforeEach(() => {
      const { useIsMobile } = require('@/hooks/useMediaQuery');
      useIsMobile.mockReturnValue(false);
    });

    it('does not render on desktop', () => {
      render(
        <MobileHeader 
          onMenuToggle={mockOnMenuToggle}
          title="Test Page"
          mobileMenuOpen={false}
        />
      );

      expect(screen.queryByText('☰')).not.toBeInTheDocument();
      expect(screen.queryByText('Test Page')).not.toBeInTheDocument();
    });
  });
});