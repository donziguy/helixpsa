import { render, screen, fireEvent } from '@testing-library/react';
import ResponsiveTable from './ResponsiveTable';

// Mock the useIsMobile hook
jest.mock('@/hooks/useMediaQuery', () => ({
  useIsMobile: jest.fn(),
}));

const mockColumns = [
  { key: 'name', label: 'Name' },
  { key: 'status', label: 'Status', mobileHidden: true },
  { key: 'date', label: 'Date', render: (value: string) => new Date(value).toLocaleDateString() },
];

const mockData = [
  { id: '1', name: 'Item 1', status: 'Active', date: '2024-01-01' },
  { id: '2', name: 'Item 2', status: 'Inactive', date: '2024-01-02' },
];

describe('ResponsiveTable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Desktop view', () => {
    beforeEach(() => {
      const { useIsMobile } = require('@/hooks/useMediaQuery');
      useIsMobile.mockReturnValue(false);
    });

    it('renders as a table on desktop', () => {
      render(<ResponsiveTable columns={mockColumns} data={mockData} />);
      
      expect(screen.getByRole('table')).toBeInTheDocument();
      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Date')).toBeInTheDocument();
    });

    it('renders all columns on desktop', () => {
      render(<ResponsiveTable columns={mockColumns} data={mockData} />);
      
      expect(screen.getByText('Status')).toBeInTheDocument();
    });

    it('calls onRowClick when row is clicked', () => {
      const mockOnRowClick = jest.fn();
      render(<ResponsiveTable columns={mockColumns} data={mockData} onRowClick={mockOnRowClick} />);
      
      fireEvent.click(screen.getAllByText('Item 1')[0]);
      expect(mockOnRowClick).toHaveBeenCalledWith(mockData[0]);
    });
  });

  describe('Mobile view', () => {
    beforeEach(() => {
      const { useIsMobile } = require('@/hooks/useMediaQuery');
      useIsMobile.mockReturnValue(true);
    });

    it('renders as cards on mobile', () => {
      render(<ResponsiveTable columns={mockColumns} data={mockData} />);
      
      expect(screen.queryByRole('table')).not.toBeInTheDocument();
      expect(screen.getAllByText('Item 1')).toHaveLength(1);
      expect(screen.getAllByText('Item 2')).toHaveLength(1);
    });

    it('hides mobile-hidden columns on mobile', () => {
      render(<ResponsiveTable columns={mockColumns} data={mockData} />);
      
      expect(screen.queryByText('STATUS')).not.toBeInTheDocument();
    });

    it('shows column labels in mobile cards', () => {
      render(<ResponsiveTable columns={mockColumns} data={mockData} />);
      
      expect(screen.getAllByText('NAME')).toHaveLength(2);
      expect(screen.getAllByText('DATE')).toHaveLength(2);
    });

    it('calls onRowClick when mobile card is clicked', () => {
      const mockOnRowClick = jest.fn();
      render(<ResponsiveTable columns={mockColumns} data={mockData} onRowClick={mockOnRowClick} />);
      
      const cards = screen.getAllByText('Item 1')[0].closest('div');
      if (cards) {
        fireEvent.click(cards);
        expect(mockOnRowClick).toHaveBeenCalledWith(mockData[0]);
      }
    });
  });

  describe('Loading and empty states', () => {
    beforeEach(() => {
      const { useIsMobile } = require('@/hooks/useMediaQuery');
      useIsMobile.mockReturnValue(false);
    });

    it('shows loading state', () => {
      render(<ResponsiveTable columns={mockColumns} data={[]} loading={true} />);
      
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('shows empty state when no data', () => {
      render(<ResponsiveTable columns={mockColumns} data={[]} loading={false} />);
      
      expect(screen.getByText('No data available')).toBeInTheDocument();
    });
  });

  describe('Custom render functions', () => {
    beforeEach(() => {
      const { useIsMobile } = require('@/hooks/useMediaQuery');
      useIsMobile.mockReturnValue(false);
    });

    it('applies custom render functions', () => {
      render(<ResponsiveTable columns={mockColumns} data={mockData} />);
      
      // The date column uses a custom render function to format dates
      expect(screen.getByText('1/1/2024')).toBeInTheDocument();
      expect(screen.getByText('1/2/2024')).toBeInTheDocument();
    });
  });
});