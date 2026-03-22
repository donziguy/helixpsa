import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TimeEstimationPanel from './TimeEstimationPanel';
import { api } from '@/utils/api';
import { ToastProvider } from '@/lib/toast-context';

// Mock the API
vi.mock('@/utils/api', () => ({
  api: {
    ai: {
      suggestTime: {
        useMutation: vi.fn(),
      },
    },
  },
}));

// Mock toast context
const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
};

vi.mock('@/lib/toast-context', () => ({
  ToastProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useToastHelpers: () => mockToast,
}));

const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        {children}
      </ToastProvider>
    </QueryClientProvider>
  );
};

const mockMutateAsync = vi.fn();
const mockUseMutation = vi.mocked(api.ai.suggestTime.useMutation);

describe('TimeEstimationPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseMutation.mockReturnValue({
      mutateAsync: mockMutateAsync,
      mutate: vi.fn(),
      isLoading: false,
      isError: false,
      error: null,
      data: undefined,
      isSuccess: false,
      reset: vi.fn(),
    } as any);
  });

  const defaultProps = {
    title: 'Test ticket title',
    description: 'Test ticket description',
  };

  it('should render the time estimation panel', () => {
    render(
      <TestWrapper>
        <TimeEstimationPanel {...defaultProps} />
      </TestWrapper>
    );

    expect(screen.getByText('⏱️ Time Estimation')).toBeInTheDocument();
    expect(screen.getByText('🤖 Get AI Estimate')).toBeInTheDocument();
    expect(screen.getByLabelText('Estimated Hours')).toBeInTheDocument();
  });

  it('should disable button when title is empty', () => {
    render(
      <TestWrapper>
        <TimeEstimationPanel title="" description="Test description" />
      </TestWrapper>
    );

    const estimateButton = screen.getByText('🤖 Get AI Estimate');
    expect(estimateButton).toBeDisabled();
  });

  it('should call AI estimate and update UI with results', async () => {
    const mockResponse = {
      estimatedHours: 2.5,
      category: 'Software Issue',
      confidence: 0.8,
      reasoning: 'Based on Software Issue category and historical data from similar tickets',
      similarTickets: [
        { title: 'Similar ticket 1', estimatedHours: 2, priority: 'medium' },
        { title: 'Similar ticket 2', estimatedHours: 3, priority: 'high' },
      ],
      existingTicket: null,
    };

    mockMutateAsync.mockResolvedValue(mockResponse);

    const onEstimateUpdate = vi.fn();
    
    render(
      <TestWrapper>
        <TimeEstimationPanel 
          {...defaultProps} 
          onEstimateUpdate={onEstimateUpdate}
        />
      </TestWrapper>
    );

    const estimateButton = screen.getByText('🤖 Get AI Estimate');
    fireEvent.click(estimateButton);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        title: 'Test ticket title',
        description: 'Test ticket description',
        ticketId: undefined,
      });
    });

    await waitFor(() => {
      expect(screen.getByText('AI suggests: 2.5h')).toBeInTheDocument();
      expect(screen.getByText('High Confidence')).toBeInTheDocument();
      expect(onEstimateUpdate).toHaveBeenCalledWith(2.5);
      expect(mockToast.success).toHaveBeenCalledWith(
        'Estimate Generated',
        'AI suggests 2.5h based on Software Issue category'
      );
    });

    // Check that manual estimate field was auto-filled
    const manualInput = screen.getByDisplayValue('2.5') as HTMLInputElement;
    expect(manualInput).toBeInTheDocument();
  });

  it('should show details when expanded', async () => {
    const mockResponse = {
      estimatedHours: 1.5,
      category: 'Network/Connectivity',
      confidence: 0.6,
      reasoning: 'Based on Network/Connectivity category and historical data',
      similarTickets: [
        { title: 'Network issue resolved', estimatedHours: 1, priority: 'high' },
        { title: 'Connectivity problem', estimatedHours: 2, priority: 'medium' },
      ],
      existingTicket: null,
    };

    mockMutateAsync.mockResolvedValue(mockResponse);

    render(
      <TestWrapper>
        <TimeEstimationPanel {...defaultProps} />
      </TestWrapper>
    );

    // Get AI estimate first
    const estimateButton = screen.getByText('🤖 Get AI Estimate');
    fireEvent.click(estimateButton);

    await waitFor(() => {
      expect(screen.getByText('Medium Confidence')).toBeInTheDocument();
    });

    // Show details
    const showDetailsButton = screen.getByText('Show details');
    fireEvent.click(showDetailsButton);

    await waitFor(() => {
      expect(screen.getByText('Category: Network/Connectivity')).toBeInTheDocument();
      expect(screen.getByText('Based on Network/Connectivity category and historical data')).toBeInTheDocument();
      expect(screen.getByText('Similar Resolved Tickets:')).toBeInTheDocument();
      expect(screen.getByText('Network issue resolved')).toBeInTheDocument();
      expect(screen.getByText('1h')).toBeInTheDocument();
    });

    // Hide details
    fireEvent.click(screen.getByText('Hide details'));
    expect(screen.queryByText('Category: Network/Connectivity')).not.toBeInTheDocument();
  });

  it('should handle manual estimate input changes', () => {
    const onEstimateUpdate = vi.fn();
    
    render(
      <TestWrapper>
        <TimeEstimationPanel 
          {...defaultProps} 
          onEstimateUpdate={onEstimateUpdate}
        />
      </TestWrapper>
    );

    const manualInput = screen.getByLabelText('Estimated Hours') as HTMLInputElement;
    
    fireEvent.change(manualInput, { target: { value: '3.5' } });

    expect(manualInput.value).toBe('3.5');
    expect(onEstimateUpdate).toHaveBeenCalledWith(3.5);
  });

  it('should not call onEstimateUpdate for invalid manual input', () => {
    const onEstimateUpdate = vi.fn();
    
    render(
      <TestWrapper>
        <TimeEstimationPanel 
          {...defaultProps} 
          onEstimateUpdate={onEstimateUpdate}
        />
      </TestWrapper>
    );

    const manualInput = screen.getByLabelText('Estimated Hours') as HTMLInputElement;
    
    fireEvent.change(manualInput, { target: { value: 'invalid' } });

    expect(onEstimateUpdate).not.toHaveBeenCalled();
  });

  it('should initialize manual estimate from currentEstimate prop', () => {
    render(
      <TestWrapper>
        <TimeEstimationPanel 
          {...defaultProps} 
          currentEstimate={4.2}
        />
      </TestWrapper>
    );

    const manualInput = screen.getByDisplayValue('4.2') as HTMLInputElement;
    expect(manualInput).toBeInTheDocument();
  });

  it('should handle API errors gracefully', async () => {
    const mockError = new Error('API Error');
    mockMutateAsync.mockRejectedValue(mockError);

    render(
      <TestWrapper>
        <TimeEstimationPanel {...defaultProps} />
      </TestWrapper>
    );

    const estimateButton = screen.getByText('🤖 Get AI Estimate');
    fireEvent.click(estimateButton);

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith(
        'Error',
        'Failed to generate time estimate'
      );
    });
  });

  it('should show loading state during API call', async () => {
    // Make the promise pending
    let resolvePromise: (value: any) => void;
    const pendingPromise = new Promise(resolve => {
      resolvePromise = resolve;
    });
    mockMutateAsync.mockReturnValue(pendingPromise);

    render(
      <TestWrapper>
        <TimeEstimationPanel {...defaultProps} />
      </TestWrapper>
    );

    const estimateButton = screen.getByText('🤖 Get AI Estimate');
    fireEvent.click(estimateButton);

    await waitFor(() => {
      expect(screen.getByText('Analyzing...')).toBeInTheDocument();
    });

    // Resolve the promise
    resolvePromise!({
      estimatedHours: 1,
      category: 'Test',
      confidence: 0.5,
      reasoning: 'Test reasoning',
      similarTickets: [],
      existingTicket: null,
    });

    await waitFor(() => {
      expect(screen.queryByText('Analyzing...')).not.toBeInTheDocument();
      expect(screen.getByText('🤖 Get AI Estimate')).toBeInTheDocument();
    });
  });

  it('should disable inputs when disabled prop is true', () => {
    render(
      <TestWrapper>
        <TimeEstimationPanel {...defaultProps} disabled={true} />
      </TestWrapper>
    );

    const estimateButton = screen.getByText('🤖 Get AI Estimate');
    const manualInput = screen.getByLabelText('Estimated Hours');

    expect(estimateButton).toBeDisabled();
    expect(manualInput).toBeDisabled();
  });

  it('should show confidence levels correctly', async () => {
    const testCases = [
      { confidence: 0.9, expectedText: 'High Confidence' },
      { confidence: 0.7, expectedText: 'Medium Confidence' },
      { confidence: 0.4, expectedText: 'Low Confidence' },
    ];

    for (const testCase of testCases) {
      vi.clearAllMocks();
      
      mockMutateAsync.mockResolvedValue({
        estimatedHours: 1,
        category: 'Test',
        confidence: testCase.confidence,
        reasoning: 'Test reasoning',
        similarTickets: [],
        existingTicket: null,
      });

      const { unmount } = render(
        <TestWrapper>
          <TimeEstimationPanel {...defaultProps} />
        </TestWrapper>
      );

      const estimateButton = screen.getByText('🤖 Get AI Estimate');
      fireEvent.click(estimateButton);

      await waitFor(() => {
        expect(screen.getByText(testCase.expectedText)).toBeInTheDocument();
      });

      unmount();
    }
  });

  it('should pass ticketId when provided', async () => {
    const ticketId = 'test-ticket-123';
    
    render(
      <TestWrapper>
        <TimeEstimationPanel {...defaultProps} ticketId={ticketId} />
      </TestWrapper>
    );

    const estimateButton = screen.getByText('🤖 Get AI Estimate');
    fireEvent.click(estimateButton);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        title: 'Test ticket title',
        description: 'Test ticket description',
        ticketId: ticketId,
      });
    });
  });
});