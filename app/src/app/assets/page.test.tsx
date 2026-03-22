import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@/test/test-utils';
import AssetsPage from './page';

// Mock usePathname
vi.mock('next/navigation', () => ({
  usePathname: () => '/assets'
}));

// Mock API responses
const mockAssets = [
  {
    id: '1',
    name: 'Dell Laptop 001',
    type: 'hardware' as const,
    status: 'active' as const,
    clientName: 'Acme Corp',
    manufacturer: 'Dell',
    model: 'Latitude 5520',
    serialNumber: 'DL001234',
    location: 'Office 101',
    assignedTo: 'John Smith',
    purchasePrice: '1500.00',
    warrantyExpiry: '2025-12-31T00:00:00Z',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: '2', 
    name: 'Office 365 License',
    type: 'software' as const,
    status: 'active' as const,
    clientName: 'Globex Industries',
    manufacturer: 'Microsoft',
    model: 'Business Premium',
    serialNumber: null,
    location: null,
    assignedTo: 'Jane Doe',
    purchasePrice: '300.00',
    warrantyExpiry: null,
    createdAt: '2024-01-15T00:00:00Z',
    updatedAt: '2024-01-15T00:00:00Z',
  },
  {
    id: '3',
    name: 'Network Switch',
    type: 'network' as const,
    status: 'maintenance' as const,
    clientName: 'Wayne Enterprises',
    manufacturer: 'Cisco',
    model: 'SG250-24P',
    serialNumber: 'CS567890',
    location: 'Server Room',
    assignedTo: null,
    purchasePrice: '800.00',
    warrantyExpiry: '2026-06-30T00:00:00Z',
    createdAt: '2024-02-01T00:00:00Z',
    updatedAt: '2024-02-01T00:00:00Z',
  }
];

const mockStats = {
  total: 3,
  byType: {
    hardware: 1,
    software: 1,
    network: 1,
  },
  byStatus: {
    active: 2,
    maintenance: 1,
  },
  warrantyExpiringSoon: 0,
  maintenanceDue: 0,
};

vi.mock('@/utils/api', () => ({
  api: {
    assets: {
      getAll: {
        useQuery: vi.fn(() => ({
          data: mockAssets,
          isLoading: false,
          refetch: vi.fn(),
        })),
      },
      getStats: {
        useQuery: vi.fn(() => ({
          data: mockStats,
        })),
      },
    },
  },
}));

describe('AssetsPage', () => {
  it('renders without crashing', () => {
    render(<AssetsPage />);
    expect(screen.getAllByText('Assets').length).toBeGreaterThan(0);
  });

  it('shows the correct number of assets in header', () => {
    render(<AssetsPage />);
    expect(screen.getAllByText('3 assets across all clients').length).toBeGreaterThan(0);
  });

  it('displays asset statistics cards', () => {
    render(<AssetsPage />);
    expect(screen.getAllByText('3').length).toBeGreaterThan(0); // Total assets
    expect(screen.getAllByText('2').length).toBeGreaterThan(0); // Active assets
    expect(screen.getAllByText('1').length).toBeGreaterThan(0); // Maintenance assets
    expect(screen.getAllByText('Total Assets').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Active').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Maintenance').length).toBeGreaterThan(0);
  });

  it('displays all asset names', () => {
    render(<AssetsPage />);
    expect(screen.getAllByText('Dell Laptop 001').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Office 365 License').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Network Switch').length).toBeGreaterThan(0);
  });

  it('shows asset type labels and icons', () => {
    render(<AssetsPage />);
    expect(screen.getAllByText('Hardware').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Software').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Network').length).toBeGreaterThan(0);
  });

  it('displays asset status', () => {
    render(<AssetsPage />);
    expect(screen.getAllByText('Active').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Maintenance').length).toBeGreaterThan(0);
  });

  it('shows client information', () => {
    render(<AssetsPage />);
    expect(screen.getAllByText('Acme Corp').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Globex Industries').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Wayne Enterprises').length).toBeGreaterThan(0);
  });

  it('displays manufacturer and model information', () => {
    render(<AssetsPage />);
    expect(screen.getAllByText('Dell').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Latitude 5520').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Microsoft').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Business Premium').length).toBeGreaterThan(0);
  });

  it('shows serial numbers when available', () => {
    render(<AssetsPage />);
    expect(screen.getAllByText('DL001234').length).toBeGreaterThan(0);
    expect(screen.getAllByText('CS567890').length).toBeGreaterThan(0);
  });

  it('displays location and assignment information', () => {
    render(<AssetsPage />);
    expect(screen.getAllByText('Office 101').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Server Room').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Assigned:.*John Smith/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Assigned:.*Jane Doe/).length).toBeGreaterThan(0);
  });

  it('shows purchase price in currency format', () => {
    render(<AssetsPage />);
    expect(screen.getAllByText(/Value:.*\$1,500\.00/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Value:.*\$300\.00/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Value:.*\$800\.00/).length).toBeGreaterThan(0);
  });

  it('displays warranty expiry dates', () => {
    render(<AssetsPage />);
    expect(screen.getAllByText(/Warranty:.*Dec 31, 2025/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Warranty:.*Jun 30, 2026/).length).toBeGreaterThan(0);
  });

  it('shows new asset button', () => {
    render(<AssetsPage />);
    expect(screen.getAllByText('+ New Asset').length).toBeGreaterThan(0);
  });

  it('has search functionality', () => {
    render(<AssetsPage />);
    const searchInputs = screen.getAllByPlaceholderText('Search assets...');
    expect(searchInputs.length).toBeGreaterThan(0);
    
    // Test search input
    fireEvent.change(searchInputs[0], { target: { value: 'Dell' } });
    // Note: In a real app, this would trigger a refetch, but we're just testing the input works
  });

  it('has type filter dropdown', () => {
    render(<AssetsPage />);
    const typeSelects = screen.getAllByDisplayValue('All Types');
    expect(typeSelects.length).toBeGreaterThan(0);
    
    // Test changing filter
    fireEvent.change(typeSelects[0], { target: { value: 'hardware' } });
  });

  it('has status filter dropdown', () => {
    render(<AssetsPage />);
    const statusSelects = screen.getAllByDisplayValue('All Statuses');
    expect(statusSelects.length).toBeGreaterThan(0);
    
    // Test changing filter
    fireEvent.change(statusSelects[0], { target: { value: 'active' } });
  });

  it('opens create asset modal when button is clicked', async () => {
    render(<AssetsPage />);
    const createButtons = screen.getAllByText('+ New Asset');
    
    fireEvent.click(createButtons[0]);
    
    await waitFor(() => {
      expect(screen.getAllByText('Add New Asset').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Asset creation form coming soon!').length).toBeGreaterThan(0);
    });
  });

  it('closes create asset modal when close button is clicked', async () => {
    render(<AssetsPage />);
    const createButtons = screen.getAllByText('+ New Asset');
    
    // Open modal
    fireEvent.click(createButtons[0]);
    
    await waitFor(() => {
      expect(screen.getAllByText('Add New Asset').length).toBeGreaterThan(0);
    });
    
    // Close modal
    const closeButtons = screen.getAllByText('Close');
    fireEvent.click(closeButtons[0]);
    
    await waitFor(() => {
      expect(screen.queryByText('Add New Asset')).toBeNull();
    });
  });

  it('handles asset click interaction', () => {
    render(<AssetsPage />);
    const assetCards = document.querySelectorAll('[style*="background: var(--bg-secondary)"]');
    
    // Click on first asset card
    if (assetCards[0]) {
      fireEvent.click(assetCards[0]);
      // In a real app, this would show asset details
    }
  });

  it('shows proper grid layout structure', () => {
    render(<AssetsPage />);
    const assetCards = document.querySelectorAll('[style*="background: var(--bg-secondary)"]');
    // We expect at least the asset cards to be rendered
    expect(assetCards.length).toBeGreaterThanOrEqual(3);
  });

  it('handles loading state', () => {
    // Mock loading state
    vi.mocked(require('@/utils/api').api.assets.getAll.useQuery).mockReturnValue({
      data: [],
      isLoading: true,
      refetch: vi.fn(),
    });

    render(<AssetsPage />);
    expect(screen.getAllByText('Loading assets...').length).toBeGreaterThan(0);
  });

  it('shows empty state when no assets', () => {
    // Mock empty state
    vi.mocked(require('@/utils/api').api.assets.getAll.useQuery).mockReturnValue({
      data: [],
      isLoading: false,
      refetch: vi.fn(),
    });

    render(<AssetsPage />);
    expect(screen.getAllByText('No assets found').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Get started by adding your first asset').length).toBeGreaterThan(0);
  });
});