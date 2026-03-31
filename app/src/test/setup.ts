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

// Mock window.matchMedia for responsive components and useMediaQuery hook
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

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

// Mock toast context for all tests except toast-context.test.tsx
// That test file uses vi.unmock() to get the real implementation
vi.mock('@/lib/toast-context', () => {
  let mockToasts: any[] = [];
  
  const mockShowToast = vi.fn((type, title, description, duration) => {
    const newToast = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: type || 'info',
      title: title || 'Test Toast',
      description: description,
      duration: duration || 5000,
    };
    mockToasts.push(newToast);
  });

  const mockDismissToast = vi.fn((id) => {
    mockToasts = mockToasts.filter(t => t.id !== id);
  });

  return {
    ToastProvider: ({ children }: { children: React.ReactNode }) => children,
    useToast: () => ({
      toasts: mockToasts,
      showToast: mockShowToast,
      dismissToast: mockDismissToast,
    }),
    useToastHelpers: () => ({
      success: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      warning: vi.fn(),
    }),
  };
});

// Mock Redis
vi.mock('ioredis', () => {
  // Create a class-like constructor function for new Redis()
  function MockRedis(url?: string, options?: any) {
    return {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue('OK'),
      setex: vi.fn().mockResolvedValue('OK'),
      del: vi.fn().mockResolvedValue(1),
      keys: vi.fn().mockResolvedValue([]),
      publish: vi.fn().mockResolvedValue(1),
      subscribe: vi.fn().mockResolvedValue(1),
      unsubscribe: vi.fn().mockResolvedValue(1),
      on: vi.fn(),
      off: vi.fn(),
      disconnect: vi.fn(),
    };
  }
  
  return { 
    default: MockRedis,
  };
});

// Mock socket.io-client
vi.mock('socket.io-client', () => {
  const mockSocket = {
    emit: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    disconnect: vi.fn(),
    connected: true,
  };
  
  const io = vi.fn(() => mockSocket);
  // Make io a spy so it can be tested
  Object.assign(io, {
    mockReturnValue: vi.fn(() => io),
    mockImplementation: vi.fn(() => io),
  });
  
  return { 
    io: vi.fn(() => mockSocket),
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

// Mock next-auth (ESM resolution fix)
vi.mock('next-auth', () => {
  const NextAuth = vi.fn(() => ({
    handlers: { GET: vi.fn(), POST: vi.fn() },
    auth: vi.fn(() => null),
    signIn: vi.fn(),
    signOut: vi.fn(),
  }));
  return { default: NextAuth };
});

// Mock @/lib/auth to avoid next-auth ESM import chain
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(() => Promise.resolve(null)),
  signIn: vi.fn(),
  signOut: vi.fn(),
  handlers: { GET: vi.fn(), POST: vi.fn() },
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
      Provider: ({ children }: any) => children,
    },
    // Add mock refs for specific tests
    __mockRefs: {
      queryResult: mockQueryResult,
      mutationResult: mockMutationResult,
    },
  };
});

// Additional path-specific mocks for different relative import patterns
vi.mock('../../../utils/api', () => vi.importActual('@/utils/api'));
vi.mock('../../utils/api', () => vi.importActual('@/utils/api'));
vi.mock('../utils/api', () => vi.importActual('@/utils/api'));
vi.mock('./utils/api', () => vi.importActual('@/utils/api'));