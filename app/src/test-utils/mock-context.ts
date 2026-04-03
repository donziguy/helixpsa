import type { Database } from '@/db'
import { createMockDb } from './mock-db'

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

export function createMockContext(overrides: Partial<MockContext> = {}) {
  const mocks = createMockDb()
  const defaultContext = {
    db: mocks.db as Database,
    session: {
      user: {
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        organizationId: 'org-123',
      },
    },
    organizationId: 'org-123',
    userId: 'user-123',
    user: {
      id: 'user-123',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      organizationId: 'org-123',
    },
    ...mocks,
  }

  return { ...defaultContext, ...overrides }
}