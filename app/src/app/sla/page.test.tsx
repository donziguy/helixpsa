import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@/test/test-utils';
import SlaPage from './page';

// Mock usePathname
vi.mock('next/navigation', () => ({
  usePathname: () => '/sla'
}));

// Mock tRPC API calls
vi.mock('@/utils/api', () => ({
  api: {
    sla: {
      policies: {
        getAll: {
          useQuery: () => ({
            data: [
              {
                id: '1',
                name: 'Enterprise Critical',
                description: 'Fastest response for enterprise clients',
                slaTier: 'Enterprise',
                priority: 'critical',
                responseTimeMinutes: 60,
                resolutionTimeMinutes: 240,
                warningThresholdPercent: 80,
                escalationTimeMinutes: 30,
                businessHoursOnly: false,
                isActive: true,
                createdAt: '2026-03-01T00:00:00Z',
                updatedAt: '2026-03-01T00:00:00Z',
              },
              {
                id: '2',
                name: 'Standard Medium',
                description: 'Standard response for medium priority',
                slaTier: 'Standard',
                priority: 'medium',
                responseTimeMinutes: 240,
                resolutionTimeMinutes: 1440,
                warningThresholdPercent: 80,
                escalationTimeMinutes: null,
                businessHoursOnly: true,
                isActive: true,
                createdAt: '2026-03-01T00:00:00Z',
                updatedAt: '2026-03-01T00:00:00Z',
              }
            ],
            refetch: vi.fn()
          })
        },
        create: {
          useMutation: () => ({
            mutateAsync: vi.fn()
          })
        },
        update: {
          useMutation: () => ({
            mutateAsync: vi.fn()
          })
        },
        delete: {
          useMutation: () => ({
            mutateAsync: vi.fn()
          })
        }
      },
      alerts: {
        getAll: {
          useQuery: () => ({
            data: [
              {
                id: '1',
                alertType: 'warning',
                status: 'active',
                message: 'Ticket PSA-00001 (critical priority) is approaching SLA deadline.',
                deadlineAt: '2026-03-22T10:00:00Z',
                acknowledgedAt: null,
                resolvedAt: null,
                createdAt: '2026-03-22T08:00:00Z',
                ticket: {
                  id: 'ticket-1',
                  number: 'PSA-00001',
                  title: 'Server Down',
                  priority: 'critical',
                  status: 'open'
                },
                client: {
                  id: 'client-1',
                  name: 'Acme Corp',
                  slaTier: 'Enterprise'
                },
                policy: {
                  id: '1',
                  name: 'Enterprise Critical',
                  responseTimeMinutes: 60,
                  resolutionTimeMinutes: 240
                },
                acknowledgedBy: null
              },
              {
                id: '2',
                alertType: 'breach',
                status: 'active',
                message: 'SLA BREACH: Ticket PSA-00002 has exceeded 4h resolution time.',
                deadlineAt: '2026-03-22T06:00:00Z',
                acknowledgedAt: null,
                resolvedAt: null,
                createdAt: '2026-03-22T07:00:00Z',
                ticket: {
                  id: 'ticket-2',
                  number: 'PSA-00002',
                  title: 'Email Issues',
                  priority: 'high',
                  status: 'in_progress'
                },
                client: {
                  id: 'client-2',
                  name: 'TechCorp',
                  slaTier: 'Premium'
                },
                policy: {
                  id: '3',
                  name: 'Premium High',
                  responseTimeMinutes: 120,
                  resolutionTimeMinutes: 240
                },
                acknowledgedBy: null
              }
            ],
            refetch: vi.fn()
          })
        },
        getStats: {
          useQuery: () => ({
            data: {
              alertCounts: [
                { status: 'active', count: 2 },
                { status: 'acknowledged', count: 1 },
                { status: 'resolved', count: 3 }
              ],
              activeBreaches: 1,
              approachingDeadline: 2
            }
          })
        },
        acknowledge: {
          useMutation: () => ({
            mutateAsync: vi.fn()
          })
        }
      }
    }
  }
}));

// Mock toast context
vi.mock('@/lib/toast-context', () => ({
  useToastHelpers: () => ({
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  })
}));

describe('SlaPage', () => {
  it('renders SLA management page with policies', () => {
    render(<SlaPage />);
    
    expect(screen.getByText('SLA Management')).toBeInTheDocument();
    expect(screen.getByText('Configure service level agreements and monitor compliance')).toBeInTheDocument();
    expect(screen.getByText('+ New SLA Policy')).toBeInTheDocument();
  });

  it('displays SLA policies in the default tab', () => {
    render(<SlaPage />);
    
    expect(screen.getByText('Enterprise Critical')).toBeInTheDocument();
    expect(screen.getByText('Standard Medium')).toBeInTheDocument();
    expect(screen.getByText('Fastest response for enterprise clients')).toBeInTheDocument();
    expect(screen.getByText('1h')).toBeInTheDocument(); // Response time
    expect(screen.getByText('4h')).toBeInTheDocument(); // Resolution time
  });

  it('displays stats correctly', () => {
    render(<SlaPage />);
    
    expect(screen.getByText('1')).toBeInTheDocument(); // Active breaches
    expect(screen.getByText('Active Breaches')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument(); // Approaching deadline
    expect(screen.getByText('Approaching Deadline')).toBeInTheDocument();
  });

  it('switches to alerts tab', async () => {
    render(<SlaPage />);
    
    const alertsTab = screen.getByText('Alerts');
    fireEvent.click(alertsTab);
    
    await waitFor(() => {
      expect(screen.getByText('PSA-00001')).toBeInTheDocument();
      expect(screen.getByText('Server Down')).toBeInTheDocument();
      expect(screen.getByText('WARNING')).toBeInTheDocument();
      expect(screen.getByText('BREACH')).toBeInTheDocument();
    });
  });

  it('shows create policy modal when button clicked', async () => {
    render(<SlaPage />);
    
    const createButton = screen.getByText('+ New SLA Policy');
    fireEvent.click(createButton);
    
    await waitFor(() => {
      expect(screen.getByText('Create SLA Policy')).toBeInTheDocument();
      expect(screen.getByText('Policy Name *')).toBeInTheDocument();
      expect(screen.getByText('SLA Tier *')).toBeInTheDocument();
      expect(screen.getByText('Priority *')).toBeInTheDocument();
    });
  });

  it('shows edit policy modal when edit button clicked', async () => {
    render(<SlaPage />);
    
    const editButtons = screen.getAllByText('Edit');
    fireEvent.click(editButtons[0]);
    
    await waitFor(() => {
      expect(screen.getByText('Edit SLA Policy')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Enterprise Critical')).toBeInTheDocument();
    });
  });

  it('displays alerts with correct information', async () => {
    render(<SlaPage />);
    
    const alertsTab = screen.getByText('Alerts');
    fireEvent.click(alertsTab);
    
    await waitFor(() => {
      expect(screen.getByText('Ticket PSA-00001 (critical priority) is approaching SLA deadline.')).toBeInTheDocument();
      expect(screen.getByText('SLA BREACH: Ticket PSA-00002 has exceeded 4h resolution time.')).toBeInTheDocument();
      expect(screen.getAllByText('Acknowledge')).toHaveLength(2);
    });
  });

  it('shows empty state when no policies exist', () => {
    // Re-mock to return empty data
    vi.doMock('@/utils/api', () => ({
      api: {
        sla: {
          policies: {
            getAll: {
              useQuery: () => ({
                data: [],
                refetch: vi.fn()
              })
            },
            create: { useMutation: () => ({ mutateAsync: vi.fn() }) },
            update: { useMutation: () => ({ mutateAsync: vi.fn() }) },
            delete: { useMutation: () => ({ mutateAsync: vi.fn() }) }
          },
          alerts: {
            getAll: { useQuery: () => ({ data: [], refetch: vi.fn() }) },
            getStats: { useQuery: () => ({ data: { alertCounts: [], activeBreaches: 0, approachingDeadline: 0 } }) },
            acknowledge: { useMutation: () => ({ mutateAsync: vi.fn() }) }
          }
        }
      }
    }));
    
    const { rerender } = render(<SlaPage />);
    rerender(<SlaPage />);
    
    expect(screen.getByText('No SLA policies configured')).toBeInTheDocument();
    expect(screen.getByText('Create your first SLA policy to start tracking service level agreements')).toBeInTheDocument();
  });

  it('shows priority and tier badges correctly', () => {
    render(<SlaPage />);
    
    expect(screen.getByText('ENTERPRISE')).toBeInTheDocument();
    expect(screen.getByText('CRITICAL')).toBeInTheDocument();
    expect(screen.getByText('STANDARD')).toBeInTheDocument();
    expect(screen.getByText('MEDIUM')).toBeInTheDocument();
  });

  it('formats time durations correctly', () => {
    render(<SlaPage />);
    
    // Should show formatted times
    expect(screen.getAllByText('1h')).toBeDefined(); // 60 minutes
    expect(screen.getAllByText('4h')).toBeDefined(); // 240 minutes
    expect(screen.getAllByText('24h')).toBeDefined(); // 1440 minutes
  });

  it('shows business hours indicator when enabled', () => {
    render(<SlaPage />);
    
    expect(screen.getByText('Business Hours')).toBeInTheDocument();
  });
});