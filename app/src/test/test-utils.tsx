import { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink } from '@trpc/client';
import { api } from '@/utils/api';
import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '@/server/api/root';

// Create test query client
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

// Create test tRPC client
const createTestTRPCClient = () => createTRPCReact<AppRouter>().createClient({
  links: [
    httpBatchLink({
      url: 'http://localhost:3000/api/trpc',
      fetch: () => Promise.resolve(new Response('{}', { status: 200 })),
    }),
  ],
});

function AllProviders({ children }: { children: React.ReactNode }) {
  const queryClient = createTestQueryClient();
  const trpcClient = createTestTRPCClient();

  // Use simple div wrapper instead of complex providers for tests
  return (
    <api.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <div data-testid="test-wrapper">
          {children}
        </div>
      </QueryClientProvider>
    </api.Provider>
  );
}

export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, { wrapper: AllProviders, ...options });
}

export * from '@testing-library/react';
export { renderWithProviders as render };
