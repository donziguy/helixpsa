import { describe, it, expect, beforeEach, vi } from 'vitest'
import { quickbooksRouter } from './quickbooks'
import { createMockContext } from '../../../test-utils/mock-context'

// Mock the QuickBooks service
vi.mock('@/services/quickbooks-service', () => ({
  createQuickBooksService: vi.fn()
}))

describe('quickbooksRouter', () => {
  let mockCtx: ReturnType<typeof createMockContext>
  let caller: ReturnType<typeof quickbooksRouter.createCaller>

  beforeEach(() => {
    vi.clearAllMocks()
    mockCtx = createMockContext()
    caller = quickbooksRouter.createCaller(mockCtx)
  })

  describe('getIntegration', () => {
    it('should return null when no integration exists', async () => {
      mockCtx.db.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([])
        })
      })

      const result = await caller.getIntegration()
      expect(result).toBeNull()
    })

    it('should return integration without sensitive tokens', async () => {
      const mockIntegration = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        organizationId: '123e4567-e89b-12d3-a456-426614174001',
        companyId: 'qb-company-123',
        sandbox: true,
        isActive: true,
        lastSyncAt: new Date('2024-01-01T00:00:00Z'),
        syncErrors: '[]',
        tokenExpiresAt: new Date(Date.now() + 86400000), // future date
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z')
      }

      mockCtx.db.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockIntegration])
        })
      })

      const result = await caller.getIntegration()
      
      expect(result).toEqual({
        ...mockIntegration,
        hasValidTokens: true,
        syncErrors: []
      })
    })

    it('should throw error when user has no organization', async () => {
      mockCtx.user.organizationId = null

      await expect(caller.getIntegration()).rejects.toThrow('User must belong to an organization')
    })
  })

  describe('addIntegration', () => {
    const validInput = {
      companyId: 'qb-company-123',
      accessToken: 'access-token-123',
      refreshToken: 'refresh-token-123',
      clientId: 'client-id-123',
      clientSecret: 'client-secret-123',
      expiresIn: 3600,
      sandbox: true
    }

    it('should create new QuickBooks integration', async () => {
      // Mock no existing integration
      mockCtx.db.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([])
        })
      })

      // Mock successful insert
      const mockNewIntegration = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        companyId: 'qb-company-123',
        sandbox: true,
        tokenExpiresAt: expect.any(Date)
      }

      mockCtx.db.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockNewIntegration])
        })
      })

      const result = await caller.addIntegration(validInput)
      
      expect(result).toEqual(mockNewIntegration)
      expect(mockCtx.db.insert).toHaveBeenCalledWith(expect.anything())
    })

    it('should throw error when integration already exists', async () => {
      // Mock existing integration
      mockCtx.db.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ id: 'existing-id' }])
        })
      })

      await expect(caller.addIntegration(validInput)).rejects.toThrow(
        'QuickBooks integration already exists for this organization'
      )
    })

    it('should throw error when user has no organization', async () => {
      mockCtx.user.organizationId = null

      await expect(caller.addIntegration(validInput)).rejects.toThrow(
        'User must belong to an organization'
      )
    })

    it('should validate required fields', async () => {
      await expect(caller.addIntegration({
        ...validInput,
        companyId: ''
      })).rejects.toThrow('Company ID is required')

      await expect(caller.addIntegration({
        ...validInput,
        accessToken: ''
      })).rejects.toThrow('Access token is required')
    })
  })

  describe('testConnection', () => {
    it('should test QuickBooks connection successfully', async () => {
      const { createQuickBooksService } = await import('@/services/quickbooks-service')
      
      const mockQBService = {
        testConnection: vi.fn().mockResolvedValue({
          success: true,
          companyName: 'Test Company'
        })
      }
      
      vi.mocked(createQuickBooksService).mockResolvedValue(mockQBService as any)

      const result = await caller.testConnection()
      
      expect(result).toEqual({
        success: true,
        companyName: 'Test Company'
      })
      expect(mockQBService.testConnection).toHaveBeenCalled()
    })

    it('should throw error when no integration found', async () => {
      const { createQuickBooksService } = await import('@/services/quickbooks-service')
      vi.mocked(createQuickBooksService).mockResolvedValue(null)

      await expect(caller.testConnection()).rejects.toThrow(
        'No QuickBooks integration found for this organization'
      )
    })

    it('should throw error when connection test fails', async () => {
      const { createQuickBooksService } = await import('@/services/quickbooks-service')
      
      const mockQBService = {
        testConnection: vi.fn().mockResolvedValue({
          success: false,
          error: 'Invalid credentials'
        })
      }
      
      vi.mocked(createQuickBooksService).mockResolvedValue(mockQBService as any)

      await expect(caller.testConnection()).rejects.toThrow(
        'QuickBooks connection test failed: Invalid credentials'
      )
    })
  })

  describe('syncTimeEntries', () => {
    const validSyncInput = {
      clientId: '123e4567-e89b-12d3-a456-426614174000',
      startDate: '2024-01-01',
      endDate: '2024-01-31',
      includeDescription: false
    }

    it('should sync time entries successfully', async () => {
      const { createQuickBooksService } = await import('@/services/quickbooks-service')
      
      const mockQBService = {
        syncTimeEntriesToInvoice: vi.fn().mockResolvedValue({
          success: true,
          invoiceId: 'qb-invoice-123',
          invoiceNumber: 'INV-001',
          totalAmount: 1500.00,
          itemCount: 5
        })
      }
      
      vi.mocked(createQuickBooksService).mockResolvedValue(mockQBService as any)

      // Mock database update
      mockCtx.db.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([])
        })
      })

      const result = await caller.syncTimeEntries(validSyncInput)
      
      expect(result).toEqual({
        success: true,
        invoiceId: 'qb-invoice-123',
        invoiceNumber: 'INV-001',
        totalAmount: 1500.00,
        itemCount: 5
      })
      
      expect(mockQBService.syncTimeEntriesToInvoice).toHaveBeenCalledWith(validSyncInput)
      expect(mockCtx.db.update).toHaveBeenCalled()
    })

    it('should handle sync errors gracefully', async () => {
      const { createQuickBooksService } = await import('@/services/quickbooks-service')
      
      const mockQBService = {
        syncTimeEntriesToInvoice: vi.fn().mockResolvedValue({
          success: false,
          error: 'No billable time entries found',
          totalAmount: 0,
          itemCount: 0
        })
      }
      
      vi.mocked(createQuickBooksService).mockResolvedValue(mockQBService as any)

      // Mock database update for error logging
      mockCtx.db.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([])
        })
      })

      await expect(caller.syncTimeEntries(validSyncInput)).rejects.toThrow(
        'QuickBooks sync failed: No billable time entries found'
      )
      
      // Verify error was logged
      expect(mockCtx.db.update).toHaveBeenCalled()
    })

    it('should validate date format', async () => {
      await expect(caller.syncTimeEntries({
        ...validSyncInput,
        startDate: 'invalid-date'
      })).rejects.toThrow('Invalid start date format')

      await expect(caller.syncTimeEntries({
        ...validSyncInput,
        endDate: '2024/01/31'
      })).rejects.toThrow('Invalid end date format')
    })

    it('should validate client ID format', async () => {
      await expect(caller.syncTimeEntries({
        ...validSyncInput,
        clientId: 'invalid-uuid'
      })).rejects.toThrow('Invalid client ID')
    })
  })

  describe('updateIntegration', () => {
    const validUpdateInput = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      isActive: false,
      sandbox: false
    }

    it('should update integration settings', async () => {
      const mockUpdatedIntegration = {
        id: validUpdateInput.id,
        isActive: false,
        sandbox: false,
        updatedAt: new Date()
      }

      mockCtx.db.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([mockUpdatedIntegration])
          })
        })
      })

      const result = await caller.updateIntegration(validUpdateInput)
      
      expect(result).toEqual(mockUpdatedIntegration)
      expect(mockCtx.db.update).toHaveBeenCalled()
    })

    it('should throw error when integration not found', async () => {
      mockCtx.db.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([])
          })
        })
      })

      await expect(caller.updateIntegration(validUpdateInput)).rejects.toThrow(
        'QuickBooks integration not found'
      )
    })
  })

  describe('removeIntegration', () => {
    it('should remove integration successfully', async () => {
      const mockDeletedId = '123e4567-e89b-12d3-a456-426614174000'
      
      mockCtx.db.delete.mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: mockDeletedId }])
        })
      })

      const result = await caller.removeIntegration()
      
      expect(result).toEqual({
        success: true,
        removedIntegrationId: mockDeletedId
      })
      expect(mockCtx.db.delete).toHaveBeenCalled()
    })

    it('should throw error when no integration found to remove', async () => {
      mockCtx.db.delete.mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([])
        })
      })

      await expect(caller.removeIntegration()).rejects.toThrow(
        'No QuickBooks integration found to remove'
      )
    })
  })
})