import type { Database } from '@/db'

export interface MockContext {
  db: Database
  organizationId: string
  userId: string
  user: {
    id: string
    email: string
    firstName: string
    lastName: string
    organizationId: string
  }
}

export function createMockContext(overrides: Partial<MockContext> = {}): MockContext {
  const defaultContext: MockContext = {
    db: {} as Database,
    organizationId: 'org-123',
    userId: 'user-123',
    user: {
      id: 'user-123',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      organizationId: 'org-123',
    },
  }

  return { ...defaultContext, ...overrides }
}