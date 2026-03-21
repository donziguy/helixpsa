import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
import SessionProvider from './SessionProvider';

// Mock NextAuth session provider
vi.mock('next-auth/react', () => ({
  SessionProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="session-provider">{children}</div>
  ),
}));

describe('SessionProvider', () => {
  it('renders children within session provider', () => {
    render(
      <SessionProvider>
        <div data-testid="child-component">Test Child</div>
      </SessionProvider>
    );

    expect(screen.getByTestId('session-provider')).toBeInTheDocument();
    expect(screen.getByTestId('child-component')).toBeInTheDocument();
    expect(screen.getByText('Test Child')).toBeInTheDocument();
  });

  it('wraps content correctly', () => {
    render(
      <SessionProvider>
        <h1>Header</h1>
        <p>Paragraph</p>
        <button>Button</button>
      </SessionProvider>
    );

    expect(screen.getByRole('heading')).toBeInTheDocument();
    expect(screen.getByText('Paragraph')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeInTheDocument();
  });
});