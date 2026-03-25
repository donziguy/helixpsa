import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import Dashboard from './Dashboard';

// Mock the tRPC API
vi.mock('@/utils/api', () => ({
  api: {
    reports: {
      getDashboardStats: {
        useQuery: vi.fn(() => ({
          data: {
            tickets: { open: 2, critical: 1 },
            time: { totalHours: 1.5 },
            revenue: { total: 200 }
          }
        }))
      }
    },
    tickets: {
      getAll: {
        useQuery: vi.fn(() => ({
          data: [
            {
              id: 't1',
              number: 'HLX-001',
              title: 'Test ticket 1',
              client: { name: 'Test Client' },
              assignee: 'Test User',
              priority: 'critical',
              status: 'open',
              updatedAt: new Date('2024-01-01T12:00:00Z').toISOString(),
              createdAt: new Date('2024-01-01T11:00:00Z').toISOString(),
              description: 'Test description'
            },
            {
              id: 't2',
              number: 'HLX-002',
              title: 'Test ticket 2',
              client: { name: 'Another Client' },
              assignee: 'Another User',
              priority: 'high',
              status: 'in_progress',
              updatedAt: new Date('2024-01-01T11:50:00Z').toISOString(),
              createdAt: new Date('2024-01-01T10:00:00Z').toISOString(),
              description: 'Another test description'
            },
            {
              id: 't3',
              number: 'HLX-003',
              title: 'Test ticket 3',
              client: { name: 'Third Client' },
              assignee: 'Third User',
              priority: 'medium',
              status: 'resolved',
              updatedAt: new Date('2024-01-01T10:00:00Z').toISOString(),
              createdAt: new Date('2024-01-01T09:00:00Z').toISOString(),
              description: 'Third test description'
            }
          ]
        }))
      }
    },
    clients: {
      getAll: {
        useQuery: vi.fn(() => ({
          data: [
            { id: '1', name: 'Test Client', slaHealth: 'good' },
            { id: '2', name: 'Another Client', slaHealth: 'warning' },
            { id: '3', name: 'Third Client', slaHealth: 'breach' }
          ]
        }))
      }
    }
  }
}));

describe('Dashboard', () => {
  it('renders without crashing', () => {
    render(<Dashboard />);
    expect(screen.getAllByText('Dashboard').length).toBeGreaterThan(0);
  });

  it('shows welcome message', () => {
    render(<Dashboard />);
    expect(screen.getAllByText(/Welcome back! Here's what's happening with your PSA today./).length).toBeGreaterThan(0);
  });

  it('displays stats cards', () => {
    render(<Dashboard />);
    expect(screen.getAllByText('Open Tickets').length).toBeGreaterThan(0);
    expect(screen.getAllByText('SLA Breaches').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Hours Today').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Monthly Revenue').length).toBeGreaterThan(0);
  });

  it('shows correct open tickets count', () => {
    render(<Dashboard />);
    // Should show "2" from dashboard stats
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('displays SLA breach count', () => {
    render(<Dashboard />);
    // 1 client with breach health
    expect(screen.getAllByText('1').length).toBeGreaterThan(0);
  });

  it('shows hours today calculation', () => {
    render(<Dashboard />);
    // Should show "1.5" from dashboard stats
    expect(screen.getByText('1.5')).toBeInTheDocument();
  });

  it('calculates and displays revenue', () => {
    render(<Dashboard />);
    // Should show "$200" from dashboard stats
    expect(screen.getByText('$200')).toBeInTheDocument();
  });

  it('displays recent activity section', () => {
    render(<Dashboard />);
    expect(screen.getAllByText('Recent Activity').length).toBeGreaterThan(0);
  });

  it('shows ticket numbers and titles in recent activity', () => {
    render(<Dashboard />);
    expect(screen.getByText(/HLX-001/)).toBeInTheDocument();
    expect(screen.getByText(/Test ticket 1/)).toBeInTheDocument();
  });

  it('displays client names in recent activity', () => {
    render(<Dashboard />);
    // Check for client names in recent tickets
    expect(screen.getByText(/Test Client/)).toBeInTheDocument();
    expect(screen.getByText(/Another Client/)).toBeInTheDocument();
  });

  it('shows quick stats section', () => {
    render(<Dashboard />);
    expect(screen.getAllByText('Quick Stats').length).toBeGreaterThan(0);
  });

  it('displays client health breakdown', () => {
    render(<Dashboard />);
    expect(screen.getAllByText('Client Health').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Good').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Warning').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Breach').length).toBeGreaterThan(0);
  });

  it('shows ticket priorities breakdown', () => {
    render(<Dashboard />);
    expect(screen.getAllByText('Ticket Priorities').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Critical').length).toBeGreaterThan(0);
    expect(screen.getAllByText('High').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Medium').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Low').length).toBeGreaterThan(0);
  });

  it('displays stat card icons', () => {
    render(<Dashboard />);
    const statCards = document.querySelectorAll('[style*="font-size: 20"]');
    expect(statCards.length).toBeGreaterThanOrEqual(4);
  });

  it('shows trend indicators', () => {
    render(<Dashboard />);
    expect(screen.getAllByText(/\+3/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/\-1/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/\+2\.5h/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/\+8%/).length).toBeGreaterThan(0);
  });

  it('displays priority indicators in recent activity', () => {
    render(<Dashboard />);
    const priorityIndicators = document.querySelectorAll('[style*="border-radius: 50%"]');
    expect(priorityIndicators.length).toBeGreaterThanOrEqual(5); // Recent tickets + other indicators
  });

  it('shows status badges in recent activity', () => {
    render(<Dashboard />);
    expect(screen.getByText('open')).toBeInTheDocument();
    expect(screen.getByText('in progress')).toBeInTheDocument();
  });

  it('displays percentage calculations for client health', () => {
    render(<Dashboard />);
    // With 3 clients: 1 good (33%), 1 warning (33%), 1 breach (33%)
    expect(screen.getAllByText(/33%/).length).toBeGreaterThan(0);
  });

  it('shows critical ticket count in subtext', () => {
    render(<Dashboard />);
    expect(screen.getByText('1 critical')).toBeInTheDocument();
  });

  it('displays time entries count', () => {
    render(<Dashboard />);
    expect(screen.getByText('Time entries')).toBeInTheDocument();
  });

  it('shows grid layout structure', () => {
    render(<Dashboard />);
    const gridElements = document.querySelectorAll('[style*="grid"]');
    expect(gridElements.length).toBeGreaterThanOrEqual(2);
  });
});