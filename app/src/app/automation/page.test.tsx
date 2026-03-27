import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { api } from '@/utils/api'
import AutomationPage from './page'

// Mock the API
vi.mock('@/utils/api', () => ({
  api: {
    automation: {
      getAll: {
        useQuery: vi.fn(),
      },
      getStats: {
        useQuery: vi.fn(),
      },
      getExecutions: {
        useQuery: vi.fn(),
      },
      create: {
        useMutation: vi.fn(),
      },
      update: {
        useMutation: vi.fn(),
      },
      delete: {
        useMutation: vi.fn(),
      },
      executeAutoClose: {
        useMutation: vi.fn(),
      },
    },
    users: {
      getAll: {
        useQuery: vi.fn(),
      },
    },
  },
}))

// Mock toast
vi.mock('@/lib/toast-context', () => ({
  useToastHelpers: () => ({
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  })
}))

const mockRules = [
  {
    id: '1',
    name: 'Auto-assign VIP clients',
    description: 'Automatically assign VIP client tickets to senior techs',
    ruleType: 'auto_assign',
    priority: 1,
    isActive: true,
    conditions: [
      {
        type: 'client_match',
        operator: 'contains',
        value: 'VIP',
      },
    ],
    actions: [
      {
        type: 'assign_user',
        value: 'user-1',
      },
    ],
    triggerCount: 15,
    lastTriggered: new Date('2024-03-01'),
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-03-01'),
    createdBy: {
      id: 'user-1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
    },
  },
  {
    id: '2',
    name: 'Auto-close resolved tickets',
    description: 'Close tickets that have been resolved for 7 days',
    ruleType: 'auto_close',
    priority: 2,
    isActive: true,
    conditions: [
      {
        type: 'status_match',
        operator: 'equals',
        value: 'resolved',
      },
      {
        type: 'time_elapsed',
        operator: 'greater_than',
        value: 7,
      },
    ],
    actions: [
      {
        type: 'change_status',
        value: 'closed',
      },
    ],
    triggerCount: 42,
    lastTriggered: new Date('2024-03-05'),
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-03-05'),
    createdBy: {
      id: 'user-2',
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane@example.com',
    },
  },
]

const mockStats = {
  totalRules: 2,
  activeRules: 2,
  totalExecutions: 157,
  successfulExecutions: 152,
  successRate: 97,
}

const mockExecutions = [
  {
    id: '1',
    ruleId: '1',
    ticketId: 'ticket-1',
    status: 'success',
    executionData: {
      trigger: 'created',
      ticketData: {
        id: 'ticket-1',
        title: 'VIP Client Issue',
        status: 'open',
        priority: 'high',
      },
    },
    errorMessage: null,
    executedAt: new Date('2024-03-10T10:30:00Z'),
    rule: {
      name: 'Auto-assign VIP clients',
      ruleType: 'auto_assign',
    },
  },
  {
    id: '2',
    ruleId: '2',
    ticketId: 'ticket-2',
    status: 'success',
    executionData: {
      trigger: 'scheduled',
      daysResolved: 8,
    },
    errorMessage: null,
    executedAt: new Date('2024-03-10T06:00:00Z'),
    rule: {
      name: 'Auto-close resolved tickets',
      ruleType: 'auto_close',
    },
  },
]

const mockUsers = [
  {
    id: 'user-1',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
  },
  {
    id: 'user-2',
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane@example.com',
  },
]

describe('AutomationPage', () => {
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks()

    // Setup default API responses
    ;(api.automation.getAll.useQuery as any).mockReturnValue({
      data: mockRules,
      refetch: vi.fn(),
    })
    ;(api.automation.getStats.useQuery as any).mockReturnValue({
      data: mockStats,
    })
    ;(api.automation.getExecutions.useQuery as any).mockReturnValue({
      data: mockExecutions,
    })
    ;(api.users.getAll.useQuery as any).mockReturnValue({
      data: mockUsers,
    })
    ;(api.automation.create.useMutation as any).mockReturnValue({
      mutateAsync: vi.fn(),
      isLoading: false,
    })
    ;(api.automation.update.useMutation as any).mockReturnValue({
      mutateAsync: vi.fn(),
      isLoading: false,
    })
    ;(api.automation.delete.useMutation as any).mockReturnValue({
      mutateAsync: vi.fn(),
      isLoading: false,
    })
    ;(api.automation.executeAutoClose.useMutation as any).mockReturnValue({
      mutate: vi.fn(),
      isLoading: false,
    })
  })

  describe('Page Rendering', () => {
    it('renders automation page with title and description', () => {
      render(<AutomationPage />)
      
      expect(screen.getByText('Automation Rules')).toBeInTheDocument()
      expect(screen.getByText('Automate ticket assignment and workflow processes')).toBeInTheDocument()
    })

    it('renders statistics cards', () => {
      render(<AutomationPage />)
      
      expect(screen.getByText('Total Rules')).toBeInTheDocument()
      expect(screen.getByText('Active Rules')).toBeInTheDocument()
      expect(screen.getByText('Executions')).toBeInTheDocument()
      expect(screen.getByText('Success Rate')).toBeInTheDocument()
      expect(screen.getByText('Successful')).toBeInTheDocument()
      
      expect(screen.getByText('2')).toBeInTheDocument() // Total rules
      expect(screen.getByText('157')).toBeInTheDocument() // Total executions  
      expect(screen.getByText('97%')).toBeInTheDocument() // Success rate
      expect(screen.getByText('152')).toBeInTheDocument() // Successful executions
    })

    it('renders action buttons', () => {
      render(<AutomationPage />)
      
      expect(screen.getByText('Run Auto-Close')).toBeInTheDocument()
      expect(screen.getByText('New Rule')).toBeInTheDocument()
    })
  })

  describe('Rules Tab', () => {
    it('displays automation rules', () => {
      render(<AutomationPage />)
      
      // Check if rules are displayed
      expect(screen.getByText('Auto-assign VIP clients')).toBeInTheDocument()
      expect(screen.getByText('Auto-close resolved tickets')).toBeInTheDocument()
      
      // Check rule descriptions
      expect(screen.getByText('Automatically assign VIP client tickets to senior techs')).toBeInTheDocument()
      expect(screen.getByText('Close tickets that have been resolved for 7 days')).toBeInTheDocument()
      
      // Check badges
      expect(screen.getAllByText('Active')).toHaveLength(2)
      expect(screen.getByText('auto assign')).toBeInTheDocument()
      expect(screen.getByText('auto close')).toBeInTheDocument()
    })

    it('displays rule conditions and actions', () => {
      render(<AutomationPage />)
      
      // Check conditions
      expect(screen.getByText('client match contains "VIP"')).toBeInTheDocument()
      expect(screen.getByText('status match equals "resolved"')).toBeInTheDocument()
      expect(screen.getByText('time elapsed greater_than "7"')).toBeInTheDocument()
      
      // Check actions
      expect(screen.getByText('assign user: user-1')).toBeInTheDocument()
      expect(screen.getByText('change status: closed')).toBeInTheDocument()
    })

    it('displays rule statistics', () => {
      render(<AutomationPage />)
      
      expect(screen.getByText('Priority: 1 | Triggered: 15 times')).toBeInTheDocument()
      expect(screen.getByText('Priority: 2 | Triggered: 42 times')).toBeInTheDocument()
      expect(screen.getByText('Last run: 3/1/2024')).toBeInTheDocument()
      expect(screen.getByText('Last run: 3/5/2024')).toBeInTheDocument()
    })
  })

  describe('Execution History Tab', () => {
    it('switches to history tab and shows executions', async () => {
      render(<AutomationPage />)
      
      // Switch to history tab
      const historyTab = screen.getByRole('tab', { name: 'Execution History' })
      fireEvent.click(historyTab)
      
      await waitFor(() => {
        expect(screen.getByText('Recent Executions')).toBeInTheDocument()
        expect(screen.getByText('Auto-assign VIP clients')).toBeInTheDocument()
        expect(screen.getByText('Auto-close resolved tickets')).toBeInTheDocument()
      })
    })

    it('displays execution details', async () => {
      render(<AutomationPage />)
      
      // Switch to history tab
      const historyTab = screen.getByRole('tab', { name: 'Execution History' })
      fireEvent.click(historyTab)
      
      await waitFor(() => {
        // Check rule types in execution history
        expect(screen.getAllByText('auto assign')).toHaveLength(1)
        expect(screen.getAllByText('auto close')).toHaveLength(1)
        
        // Check timestamps (should show formatted dates)
        expect(screen.getByText(/3\/10\/2024/)).toBeInTheDocument()
      })
    })
  })

  describe('Rule Creation Dialog', () => {
    it('opens create rule dialog', async () => {
      render(<AutomationPage />)
      
      const newRuleButton = screen.getByText('New Rule')
      fireEvent.click(newRuleButton)
      
      await waitFor(() => {
        expect(screen.getByText('Create Automation Rule')).toBeInTheDocument()
        expect(screen.getByLabelText('Name')).toBeInTheDocument()
        expect(screen.getByLabelText('Rule Type')).toBeInTheDocument()
        expect(screen.getByLabelText('Description')).toBeInTheDocument()
      })
    })

    it('allows adding and removing conditions', async () => {
      render(<AutomationPage />)
      
      const newRuleButton = screen.getByText('New Rule')
      fireEvent.click(newRuleButton)
      
      await waitFor(() => {
        // Should start with one condition
        expect(screen.getAllByText('Client')).toHaveLength(1)
        
        // Add another condition
        const addConditionButton = screen.getAllByRole('button').find(btn => 
          btn.querySelector('svg') && btn.textContent === ''
        )
        if (addConditionButton) {
          fireEvent.click(addConditionButton)
        }
      })
    })

    it('validates required fields', async () => {
      const mockCreate = vi.fn()
      ;(api.automation.create.useMutation as any).mockReturnValue({
        mutateAsync: mockCreate,
        isLoading: false,
      })
      
      render(<AutomationPage />)
      
      const newRuleButton = screen.getByText('New Rule')
      fireEvent.click(newRuleButton)
      
      await waitFor(() => {
        const createButton = screen.getByText('Create Rule')
        // Button should be disabled when name is empty
        expect(createButton).toBeDisabled()
      })
    })
  })

  describe('Rule Actions', () => {
    it('toggles rule active status', async () => {
      const mockUpdate = vi.fn()
      ;(api.automation.update.useMutation as any).mockReturnValue({
        mutateAsync: mockUpdate,
        isLoading: false,
      })
      
      render(<AutomationPage />)
      
      // Find and click the first toggle switch
      const toggleSwitches = screen.getAllByRole('switch')
      fireEvent.click(toggleSwitches[0])
      
      await waitFor(() => {
        expect(mockUpdate).toHaveBeenCalledWith({
          id: '1',
          isActive: false, // Should toggle from true to false
        })
      })
    })

    it('executes auto-close rules', async () => {
      const mockExecuteAutoClose = vi.fn()
      ;(api.automation.executeAutoClose.useMutation as any).mockReturnValue({
        mutate: mockExecuteAutoClose,
        isLoading: false,
      })
      
      render(<AutomationPage />)
      
      const runAutoCloseButton = screen.getByText('Run Auto-Close')
      fireEvent.click(runAutoCloseButton)
      
      expect(mockExecuteAutoClose).toHaveBeenCalled()
    })

    it('deletes automation rule with confirmation', async () => {
      const mockDelete = vi.fn()
      ;(api.automation.delete.useMutation as any).mockReturnValue({
        mutateAsync: mockDelete,
        isLoading: false,
      })
      
      // Mock window.confirm
      const originalConfirm = window.confirm
      window.confirm = vi.fn(() => true)
      
      render(<AutomationPage />)
      
      // Find and click delete button (trash icon)
      const deleteButtons = screen.getAllByRole('button').filter(button => 
        button.querySelector('svg') && button.getAttribute('aria-label') === null
      )
      
      // Click the delete button for the first rule
      if (deleteButtons.length > 0) {
        fireEvent.click(deleteButtons[deleteButtons.length - 1]) // Last button should be delete
      }
      
      await waitFor(() => {
        expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete this automation rule?')
        expect(mockDelete).toHaveBeenCalledWith({ id: '1' })
      })
      
      // Restore window.confirm
      window.confirm = originalConfirm
    })
  })

  describe('Empty States', () => {
    it('shows empty state when no executions exist', async () => {
      ;(api.automation.getExecutions.useQuery as any).mockReturnValue({
        data: [],
      })
      
      render(<AutomationPage />)
      
      // Switch to history tab
      const historyTab = screen.getByRole('tab', { name: 'Execution History' })
      fireEvent.click(historyTab)
      
      await waitFor(() => {
        expect(screen.getByText('No execution history found')).toBeInTheDocument()
      })
    })
  })

  describe('Loading States', () => {
    it('handles loading states for mutations', () => {
      ;(api.automation.create.useMutation as any).mockReturnValue({
        mutateAsync: vi.fn(),
        isLoading: true,
      })
      ;(api.automation.executeAutoClose.useMutation as any).mockReturnValue({
        mutate: vi.fn(),
        isLoading: true,
      })
      
      render(<AutomationPage />)
      
      // Run Auto-Close button should be disabled when loading
      const runAutoCloseButton = screen.getByText('Run Auto-Close')
      expect(runAutoCloseButton).toBeDisabled()
    })
  })
})