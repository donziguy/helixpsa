import '@testing-library/jest-dom';

// Mock fetch globally
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
    headers: new Headers(),
  } as Response)
);

// Mock database modules for tests
vi.mock('../db/index', () => ({
  db: {},
  testConnection: vi.fn(),
  closeConnection: vi.fn(),
}));

// Mock Next.js modules
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}));

// Mock next-auth/react
vi.mock('next-auth/react', () => ({
  SessionProvider: vi.fn(({ children }) => children),
  useSession: () => ({
    data: {
      user: { id: '1', email: 'test@example.com', name: 'Test User' },
      org: { id: '1', name: 'Test Org' },
    },
    status: 'authenticated',
  }),
  signOut: vi.fn(),
  signIn: vi.fn(),
}));

// Mock toast context
vi.mock('@/lib/toast-context', () => ({
  ToastProvider: ({ children }: { children: React.ReactNode }) => children,
  useToast: () => ({
    toasts: [],
    showToast: vi.fn(),
    removeToast: vi.fn(),
    toast: vi.fn(),
  }),
  useToastHelpers: () => ({
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    toast: {
      success: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      warning: vi.fn(),
    },
  }),
}));

// Mock Redis
vi.mock('ioredis', () => {
  const mockRedis = {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue('OK'),
    setex: vi.fn().mockResolvedValue('OK'),
    del: vi.fn().mockResolvedValue(1),
    keys: vi.fn().mockResolvedValue([]),
    publish: vi.fn().mockResolvedValue(1),
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    disconnect: vi.fn(),
  };
  
  const Redis = vi.fn().mockImplementation(() => mockRedis);
  return { default: Redis };
});

// Mock socket.io-client
vi.mock('socket.io-client', () => {
  const mockSocket = {
    emit: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    disconnect: vi.fn(),
  };
  
  const io = vi.fn(() => mockSocket);
  return { 
    io,
    __mockSocket: mockSocket,
  };
});

// Mock crypto
vi.mock('crypto', async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    createHash: vi.fn(() => ({
      update: vi.fn(() => ({
        digest: vi.fn(() => 'mocked-hash'),
      })),
    })),
    randomBytes: vi.fn(() => Buffer.from('mocked-random-bytes')),
    createCipher: vi.fn(() => ({
      update: vi.fn(() => 'encrypted'),
      final: vi.fn(() => ''),
    })),
    createDecipher: vi.fn(() => ({
      update: vi.fn(() => 'decrypted'),
      final: vi.fn(() => ''),
    })),
  };
});

// Mock next/server
vi.mock('next/server', () => ({
  NextRequest: vi.fn(),
  NextResponse: {
    json: vi.fn(() => ({ status: 200 })),
    redirect: vi.fn(),
  },
}));

// Mock tRPC API
vi.mock('@/utils/api', () => {
  const mockTickets = [
    {
      id: '1',
      number: '#T-001',
      title: 'Test Ticket 1',
      description: 'Test description',
      priority: 'high',
      status: 'open',
      clientId: '1',
      assigneeId: '1',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      client: { id: '1', name: 'Acme Corp' },
      assignee: { id: '1', name: 'John Doe' },
    },
  ];

  const mockClients = [
    { id: '1', name: 'Acme Corp', email: 'contact@acme.com' },
    { id: '2', name: 'Globex Industries', email: 'info@globex.com' },
  ];

  const mockUsers = [
    { id: '1', name: 'John Doe', email: 'john@example.com' },
    { id: '2', name: 'Jane Smith', email: 'jane@example.com' },
  ];

  const mockStats = {
    openTickets: 5,
    slaBreaches: 2,
    hoursToday: 6.5,
    revenue: 12500.00,
  };

  const mockQueryResult = {
    data: [],
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  };

  const mockMutationResult = {
    mutate: vi.fn(),
    mutateAsync: vi.fn().mockResolvedValue({}),
    isLoading: false,
    isError: false,
    error: null,
  };

  return {
    api: {
      tickets: {
        getAll: { useQuery: vi.fn(() => ({ ...mockQueryResult, data: mockTickets })) },
        create: { useMutation: vi.fn(() => mockMutationResult) },
        update: { useMutation: vi.fn(() => mockMutationResult) },
        delete: { useMutation: vi.fn(() => mockMutationResult) },
        updateStatus: { useMutation: vi.fn(() => mockMutationResult) },
      },
      clients: {
        getAll: { useQuery: vi.fn(() => ({ ...mockQueryResult, data: mockClients })) },
        create: { useMutation: vi.fn(() => mockMutationResult) },
        update: { useMutation: vi.fn(() => mockMutationResult) },
        delete: { useMutation: vi.fn(() => mockMutationResult) },
      },
      timeEntries: {
        getAll: { useQuery: vi.fn(() => mockQueryResult) },
        create: { useMutation: vi.fn(() => mockMutationResult) },
        update: { useMutation: vi.fn(() => mockMutationResult) },
        delete: { useMutation: vi.fn(() => mockMutationResult) },
      },
      users: {
        getAll: { useQuery: vi.fn(() => ({ ...mockQueryResult, data: mockUsers })) },
        create: { useMutation: vi.fn(() => mockMutationResult) },
        update: { useMutation: vi.fn(() => mockMutationResult) },
        delete: { useMutation: vi.fn(() => mockMutationResult) },
      },
      notes: {
        getAll: { useQuery: vi.fn(() => mockQueryResult) },
        create: { useMutation: vi.fn(() => mockMutationResult) },
        update: { useMutation: vi.fn(() => mockMutationResult) },
        delete: { useMutation: vi.fn(() => mockMutationResult) },
      },
      sla: {
        getPolicies: { useQuery: vi.fn(() => mockQueryResult) },
        getAlerts: { useQuery: vi.fn(() => mockQueryResult) },
        createPolicy: { useMutation: vi.fn(() => mockMutationResult) },
        updatePolicy: { useMutation: vi.fn(() => mockMutationResult) },
        deletePolicy: { useMutation: vi.fn(() => mockMutationResult) },
      },
      assets: {
        getAll: { useQuery: vi.fn(() => mockQueryResult) },
        create: { useMutation: vi.fn(() => mockMutationResult) },
        update: { useMutation: vi.fn(() => mockMutationResult) },
        delete: { useMutation: vi.fn(() => mockMutationResult) },
      },
      schedule: {
        getSchedule: { useQuery: vi.fn(() => mockQueryResult) },
        getTechnicians: { useQuery: vi.fn(() => mockQueryResult) },
        getWorkloadSummary: { useQuery: vi.fn(() => mockQueryResult) },
        updateAssignment: { useMutation: vi.fn(() => mockMutationResult) },
        createEvent: { useMutation: vi.fn(() => mockMutationResult) },
        updateEvent: { useMutation: vi.fn(() => mockMutationResult) },
        deleteEvent: { useMutation: vi.fn(() => mockMutationResult) },
      },
      reports: {
        getDashboardStats: { useQuery: vi.fn(() => ({ ...mockQueryResult, data: mockStats })) },
        getTicketVolume: { useQuery: vi.fn(() => mockQueryResult) },
        getResolutionTime: { useQuery: vi.fn(() => mockQueryResult) },
        getRevenue: { useQuery: vi.fn(() => mockQueryResult) },
        getTopClients: { useQuery: vi.fn(() => mockQueryResult) },
      },
      email: {
        getConfigurations: { useQuery: vi.fn(() => mockQueryResult) },
        createConfiguration: { useMutation: vi.fn(() => mockMutationResult) },
        updateConfiguration: { useMutation: vi.fn(() => mockMutationResult) },
        deleteConfiguration: { useMutation: vi.fn(() => mockMutationResult) },
        testConfiguration: { useMutation: vi.fn(() => mockMutationResult) },
        processEmails: { useMutation: vi.fn(() => mockMutationResult) },
        getProcessingLogs: { useQuery: vi.fn(() => mockQueryResult) },
        getStatistics: { useQuery: vi.fn(() => mockQueryResult) },
      },
      knowledge: {
        getAll: { useQuery: vi.fn(() => mockQueryResult) },
        create: { useMutation: vi.fn(() => mockMutationResult) },
        update: { useMutation: vi.fn(() => mockMutationResult) },
        delete: { useMutation: vi.fn(() => mockMutationResult) },
        search: { useQuery: vi.fn(() => mockQueryResult) },
      },
      portal: {
        authenticate: { useMutation: vi.fn(() => mockMutationResult) },
        getTickets: { useQuery: vi.fn(() => mockQueryResult) },
        createTicket: { useMutation: vi.fn(() => mockMutationResult) },
        addNote: { useMutation: vi.fn(() => mockMutationResult) },
      },
      ai: {
        suggestTime: { useMutation: vi.fn(() => mockMutationResult) },
        categorizeTicket: { useMutation: vi.fn(() => mockMutationResult) },
        suggestPriority: { useMutation: vi.fn(() => mockMutationResult) },
        suggestAssignee: { useMutation: vi.fn(() => mockMutationResult) },
      },
    },
    // Add mock refs for specific tests
    __mockRefs: {
      queryResult: mockQueryResult,
      mutationResult: mockMutationResult,
    },
  };
});

// Additional specific mocks for problematic paths
vi.mock('../../../utils/api', () => vi.importActual('@/utils/api'));
vi.mock('../../utils/api', () => vi.importActual('@/utils/api'));
vi.mock('../utils/api', () => vi.importActual('@/utils/api'));