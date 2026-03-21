import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
import Dashboard from './Dashboard';

// Mock the data modules
vi.mock('@/lib/mock-data', () => ({
  tickets: [
    {
      id: 't1',
      number: 'HLX-001',
      title: 'Test ticket 1',
      client: 'Test Client',
      assignee: 'Test User',
      priority: 'critical',
      status: 'open',
      sla: '1h remaining',
      created: '1h ago',
      updated: '5m ago',
      description: 'Test description',
      timeSpent: 30
    },
    {
      id: 't2',
      number: 'HLX-002',
      title: 'Test ticket 2',
      client: 'Another Client',
      assignee: 'Another User',
      priority: 'high',
      status: 'in_progress',
      sla: '2h remaining',
      created: '2h ago',
      updated: '10m ago',
      description: 'Another test description',
      timeSpent: 60
    },
    {
      id: 't3',
      number: 'HLX-003',
      title: 'Test ticket 3',
      client: 'Third Client',
      assignee: 'Third User',
      priority: 'medium',
      status: 'resolved',
      sla: 'Completed',
      created: '1d ago',
      updated: '1h ago',
      description: 'Third test description',
      timeSpent: 90
    }
  ],
  clients: [
    {
      id: 'c1',
      name: 'Test Client',
      ticketCount: 5,
      monthlyHours: 20,
      contact: { name: 'John Doe', email: 'john@test.com', phone: '555-1234' },
      sla: { tier: 'Premium', responseTime: '1 hour', health: 'good' },
      industry: 'Technology',
      onboardDate: '2024-01-01'
    },
    {
      id: 'c2',
      name: 'Another Client',
      ticketCount: 3,
      monthlyHours: 15,
      contact: { name: 'Jane Smith', email: 'jane@another.com', phone: '555-5678' },
      sla: { tier: 'Standard', responseTime: '4 hours', health: 'warning' },
      industry: 'Healthcare',
      onboardDate: '2024-02-01'
    },
    {
      id: 'c3',
      name: 'Third Client',
      ticketCount: 2,
      monthlyHours: 10,
      contact: { name: 'Bob Johnson', email: 'bob@third.com', phone: '555-9012' },
      sla: { tier: 'Enterprise', responseTime: '30 minutes', health: 'breach' },
      industry: 'Finance',
      onboardDate: '2024-03-01'
    }
  ],
  timeEntries: [
    {
      id: 'te1',
      ticketId: 't1',
      ticketNumber: 'HLX-001',
      ticketTitle: 'Test ticket 1',
      client: 'Test Client',
      assignee: 'Test User',
      description: 'Working on test',
      startTime: '2026-03-21T10:00:00',
      endTime: '2026-03-21T10:30:00',
      duration: 30,
      billable: true,
      hourlyRate: 150,
      date: '2026-03-21'
    },
    {
      id: 'te2',
      ticketId: 't2',
      ticketNumber: 'HLX-002',
      ticketTitle: 'Test ticket 2',
      client: 'Another Client',
      assignee: 'Another User',
      description: 'More testing',
      startTime: '2026-03-21T11:00:00',
      endTime: '2026-03-21T12:00:00',
      duration: 60,
      billable: true,
      hourlyRate: 125,
      date: '2026-03-21'
    }
  ]
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
    // 2 tickets with open/in_progress status
    expect(screen.getAllByText('2').length).toBeGreaterThan(0);
  });

  it('displays SLA breach count', () => {
    render(<Dashboard />);
    // 1 client with breach health
    expect(screen.getAllByText('1').length).toBeGreaterThan(0);
  });

  it('shows hours today calculation', () => {
    render(<Dashboard />);
    // 1.5 hours total (30 + 60 minutes / 60)
    expect(screen.getAllByText('1.5').length).toBeGreaterThan(0);
  });

  it('calculates and displays revenue', () => {
    render(<Dashboard />);
    // Revenue calculation: (30/60 * 150) + (60/60 * 125) = 75 + 125 = 200
    expect(screen.getAllByText(/\$200/).length).toBeGreaterThan(0);
  });

  it('displays recent activity section', () => {
    render(<Dashboard />);
    expect(screen.getAllByText('Recent Activity').length).toBeGreaterThan(0);
  });

  it('shows ticket numbers and titles in recent activity', () => {
    render(<Dashboard />);
    expect(screen.getAllByText(/HLX-001/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Test ticket 1/).length).toBeGreaterThan(0);
  });

  it('displays client names in recent activity', () => {
    render(<Dashboard />);
    // Check for ticket clients from mock data
    expect(screen.getAllByText(/Test Client|Another Client|Third Client/).length).toBeGreaterThan(0);
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
    expect(screen.getAllByText('open').length).toBeGreaterThan(0);
    expect(screen.getAllByText('in progress').length).toBeGreaterThan(0);
  });

  it('displays percentage calculations for client health', () => {
    render(<Dashboard />);
    // With 3 clients: 1 good (33%), 1 warning (33%), 1 breach (33%)
    expect(screen.getAllByText(/33%/).length).toBeGreaterThan(0);
  });

  it('shows critical ticket count in subtext', () => {
    render(<Dashboard />);
    expect(screen.getAllByText(/1 critical/).length).toBeGreaterThan(0);
  });

  it('displays time entries count', () => {
    render(<Dashboard />);
    expect(screen.getAllByText(/2 entries/).length).toBeGreaterThan(0);
  });

  it('shows grid layout structure', () => {
    render(<Dashboard />);
    const gridElements = document.querySelectorAll('[style*="grid"]');
    expect(gridElements.length).toBeGreaterThanOrEqual(2);
  });
});