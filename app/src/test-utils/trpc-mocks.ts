import { vi } from 'vitest';

export const createMockQuery = (data: any = null, overrides: any = {}) => ({
  data,
  isLoading: false,
  isError: false,
  error: null,
  refetch: vi.fn(),
  ...overrides,
});

export const createMockMutation = (overrides: any = {}) => ({
  mutate: vi.fn(),
  mutateAsync: vi.fn().mockResolvedValue({ success: true }),
  isLoading: false,
  isError: false,
  error: null,
  ...overrides,
});

export const mockApi = {
  tickets: {
    getAll: { useQuery: vi.fn() },
    create: { useMutation: vi.fn() },
    update: { useMutation: vi.fn() },
    delete: { useMutation: vi.fn() },
    updateStatus: { useMutation: vi.fn() },
  },
  clients: {
    getAll: { useQuery: vi.fn() },
    create: { useMutation: vi.fn() },
    update: { useMutation: vi.fn() },
    delete: { useMutation: vi.fn() },
  },
  timeEntries: {
    getAll: { useQuery: vi.fn() },
    create: { useMutation: vi.fn() },
    update: { useMutation: vi.fn() },
    delete: { useMutation: vi.fn() },
  },
  users: {
    getAll: { useQuery: vi.fn() },
    create: { useMutation: vi.fn() },
    update: { useMutation: vi.fn() },
    delete: { useMutation: vi.fn() },
  },
  sla: {
    getPolicies: { useQuery: vi.fn() },
    getAlerts: { useQuery: vi.fn() },
    createPolicy: { useMutation: vi.fn() },
    updatePolicy: { useMutation: vi.fn() },
    deletePolicy: { useMutation: vi.fn() },
  },
  assets: {
    getAll: { useQuery: vi.fn() },
    create: { useMutation: vi.fn() },
    update: { useMutation: vi.fn() },
    delete: { useMutation: vi.fn() },
  },
  schedule: {
    getSchedule: { useQuery: vi.fn() },
    getTechnicians: { useQuery: vi.fn() },
    getWorkloadSummary: { useQuery: vi.fn() },
    updateAssignment: { useMutation: vi.fn() },
    createEvent: { useMutation: vi.fn() },
    updateEvent: { useMutation: vi.fn() },
    deleteEvent: { useMutation: vi.fn() },
  },
  reports: {
    getDashboardStats: { useQuery: vi.fn() },
    getTicketVolume: { useQuery: vi.fn() },
    getResolutionTime: { useQuery: vi.fn() },
    getRevenue: { useQuery: vi.fn() },
    getTopClients: { useQuery: vi.fn() },
  },
  email: {
    getConfigurations: { useQuery: vi.fn() },
    getProcessingLogs: { useQuery: vi.fn() },
    getStatistics: { useQuery: vi.fn() },
    createConfiguration: { useMutation: vi.fn() },
    updateConfiguration: { useMutation: vi.fn() },
    deleteConfiguration: { useMutation: vi.fn() },
    testConfiguration: { useMutation: vi.fn() },
    processEmails: { useMutation: vi.fn() },
  },
  knowledge: {
    getAll: { useQuery: vi.fn() },
    create: { useMutation: vi.fn() },
    update: { useMutation: vi.fn() },
    delete: { useMutation: vi.fn() },
    search: { useQuery: vi.fn() },
  },
  ai: {
    suggestTime: { useMutation: vi.fn() },
    categorizeTicket: { useMutation: vi.fn() },
    suggestPriority: { useMutation: vi.fn() },
    suggestAssignee: { useMutation: vi.fn() },
  },
  notifications: {
    getPreferences: { useQuery: vi.fn() },
    updatePreferences: { useMutation: vi.fn() },
    getEmailHistory: { useQuery: vi.fn() },
    getStatistics: { useQuery: vi.fn() },
    triggerChecks: { useMutation: vi.fn() },
    processPending: { useMutation: vi.fn() },
    retryFailed: { useMutation: vi.fn() },
    sendTestNotification: { useMutation: vi.fn() },
  },
  automation: {
    getAll: { useQuery: vi.fn() },
    getById: { useQuery: vi.fn() },
    create: { useMutation: vi.fn() },
    update: { useMutation: vi.fn() },
    delete: { useMutation: vi.fn() },
    getExecutions: { useQuery: vi.fn() },
    executeForTicket: { useMutation: vi.fn() },
    executeAutoClose: { useMutation: vi.fn() },
    getStats: { useQuery: vi.fn() },
  },
  slack: {
    getIntegration: { useQuery: vi.fn() },
    getChannels: { useQuery: vi.fn() },
    getNotificationPreferences: { useQuery: vi.fn() },
    getNotificationHistory: { useQuery: vi.fn() },
    getNotificationStatistics: { useQuery: vi.fn() },
    addIntegration: { useMutation: vi.fn() },
    testIntegration: { useMutation: vi.fn() },
    disableIntegration: { useMutation: vi.fn() },
    updateNotificationPreferences: { useMutation: vi.fn() },
    sendTestNotification: { useMutation: vi.fn() },
    processPending: { useMutation: vi.fn() },
  },
  quickbooks: {
    getIntegration: { useQuery: vi.fn() },
    addIntegration: { useMutation: vi.fn() },
    testConnection: { useMutation: vi.fn() },
    syncTimeEntries: { useMutation: vi.fn() },
    updateIntegration: { useMutation: vi.fn() },
    removeIntegration: { useMutation: vi.fn() },
  },
  Provider: ({ children }: any) => children,
};

export const resetApiMocks = () => {
  Object.values(mockApi).forEach((router: any) => {
    if (typeof router === 'object') {
      Object.values(router).forEach((hook: any) => {
        if (hook && typeof hook === 'object') {
          if (hook.useQuery) {
            vi.mocked(hook.useQuery).mockReset();
          }
          if (hook.useMutation) {
            vi.mocked(hook.useMutation).mockReset();
          }
        }
      });
    }
  });
};
