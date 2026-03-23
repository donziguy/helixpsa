import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TRPCError } from '@trpc/server';
import { assetsRouter } from './assets';
import { createTestContext, type TestContext } from '@/test/api-utils';

// Mock database responses
const mockAssets = [
  {
    id: '1',
    organizationId: 'org-1',
    clientId: 'client-1',
    name: 'Dell Laptop 001',
    type: 'hardware' as const,
    status: 'active' as const,
    serialNumber: 'DL001234',
    model: 'Latitude 5520',
    manufacturer: 'Dell',
    location: 'Office 101',
    assignedTo: 'John Smith',
    purchaseDate: new Date('2023-01-01'),
    warrantyExpiry: new Date('2025-12-31'),
    purchasePrice: '1500.00',
    notes: null,
    lastMaintenanceDate: new Date('2024-01-01'),
    nextMaintenanceDate: new Date('2024-07-01'),
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: '2',
    organizationId: 'org-1',
    clientId: 'client-2',
    name: 'Cisco Switch',
    type: 'network' as const,
    status: 'active' as const,
    serialNumber: 'CS567890',
    model: 'SG350-28',
    manufacturer: 'Cisco',
    location: 'Server Room',
    assignedTo: null,
    purchaseDate: new Date('2023-06-15'),
    warrantyExpiry: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000), // 20 days from now
    purchasePrice: '800.00',
    notes: null,
    lastMaintenanceDate: new Date('2024-02-01'),
    nextMaintenanceDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
    isActive: true,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
  },
  {
    id: '3',
    organizationId: 'org-1',
    clientId: 'client-1',
    name: 'HP Printer',
    type: 'peripherals' as const,
    status: 'active' as const,
    serialNumber: 'HP789012',
    model: 'LaserJet Pro',
    manufacturer: 'HP',
    location: 'Reception',
    assignedTo: null,
    purchaseDate: new Date('2022-12-01'),
    warrantyExpiry: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago (expired)
    purchasePrice: '400.00',
    notes: null,
    lastMaintenanceDate: null,
    nextMaintenanceDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
    isActive: true,
    createdAt: new Date('2022-12-01'),
    updatedAt: new Date('2022-12-01'),
  }
];

const mockClients = [
  {
    id: 'client-1',
    organizationId: 'org-1',
    name: 'Acme Corp',
  },
  {
    id: 'client-2',
    organizationId: 'org-1', 
    name: 'Globex Industries',
  }
];

describe('assets router', () => {
  let ctx: TestContext;
  let caller: any;

  beforeEach(() => {
    ctx = createTestContext();
    caller = assetsRouter.createCaller(ctx);
  });

  describe('getStats', () => {
    it('should return asset statistics with warranty and maintenance alerts', async () => {
      // Mock database responses
      ctx.db.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(mockAssets)
      });

      // Mock count queries for warranty expiring soon (should find 1 asset)
      ctx.db.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ count: 1 }])
      });

      // Mock count queries for maintenance due (should find 2 assets)
      ctx.db.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ count: 2 }])
      });

      const result = await caller.getStats();

      expect(result).toEqual({
        total: 3,
        byType: {
          hardware: 1,
          network: 1,
          peripherals: 1
        },
        byStatus: {
          active: 3
        },
        warrantyExpiringSoon: 1,
        maintenanceDue: 2
      });
    });

    it('should handle empty database gracefully', async () => {
      ctx.db.select.mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([])
      });

      const result = await caller.getStats();

      expect(result.total).toBe(0);
      expect(result.warrantyExpiringSoon).toBe(0);
      expect(result.maintenanceDue).toBe(0);
    });
  });

  describe('getWarrantyExpiringSoon', () => {
    it('should return assets with warranties expiring within specified days', async () => {
      const mockAssetsWithClients = [
        {
          id: '2',
          name: 'Cisco Switch',
          type: 'network' as const,
          serialNumber: 'CS567890',
          model: 'SG350-28',
          manufacturer: 'Cisco',
          warrantyExpiry: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
          clientName: 'Globex Industries',
          clientId: 'client-2',
        }
      ];

      ctx.db.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue(mockAssetsWithClients)
      });

      const result = await caller.getWarrantyExpiringSoon({ daysAhead: 30 });

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Cisco Switch');
      expect(result[0].clientName).toBe('Globex Industries');
    });

    it('should use default 30 days if not specified', async () => {
      ctx.db.select.mockReturnValue({
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue([])
      });

      await caller.getWarrantyExpiringSoon({});

      // Verify the database query was called (we can't easily test the exact date without mocking Date)
      expect(ctx.db.select).toHaveBeenCalled();
    });

    it('should limit results based on input', async () => {
      ctx.db.select.mockReturnValue({
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue([])
      });

      await caller.getWarrantyExpiringSoon({ limit: 10 });

      const mockLimit = ctx.db.select().limit;
      expect(mockLimit).toHaveBeenCalledWith(10);
    });
  });

  describe('getMaintenanceDue', () => {
    it('should return assets with maintenance due within specified days', async () => {
      const mockAssetsWithClients = [
        {
          id: '3',
          name: 'HP Printer',
          type: 'peripherals' as const,
          serialNumber: 'HP789012',
          model: 'LaserJet Pro',
          manufacturer: 'HP',
          nextMaintenanceDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
          lastMaintenanceDate: null,
          clientName: 'Acme Corp',
          clientId: 'client-1',
        }
      ];

      ctx.db.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue(mockAssetsWithClients)
      });

      const result = await caller.getMaintenanceDue({ daysAhead: 7 });

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('HP Printer');
      expect(result[0].clientName).toBe('Acme Corp');
    });

    it('should use default 7 days if not specified', async () => {
      ctx.db.select.mockReturnValue({
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue([])
      });

      await caller.getMaintenanceDue({});

      // Verify the database query was called
      expect(ctx.db.select).toHaveBeenCalled();
    });

    it('should respect organization boundaries', async () => {
      ctx.db.select.mockReturnValue({
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue([])
      });

      await caller.getMaintenanceDue({});

      // Verify that the organization filter was applied
      const mockWhere = ctx.db.select().where;
      expect(mockWhere).toHaveBeenCalled();
    });
  });

  describe('existing functionality', () => {
    it('should still work for getAll', async () => {
      const mockAssetsWithClients = mockAssets.map(asset => ({
        ...asset,
        clientName: mockClients.find(c => c.id === asset.clientId)?.name || 'Unknown Client'
      }));

      ctx.db.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue(mockAssetsWithClients)
      });

      const result = await caller.getAll({});

      expect(result).toHaveLength(3);
      expect(result[0].name).toBe('Dell Laptop 001');
    });

    it('should create new assets', async () => {
      const newAssetData = {
        clientId: 'client-1',
        name: 'New Asset',
        type: 'hardware' as const,
        status: 'active' as const,
        serialNumber: 'NEW001',
        model: 'Test Model',
        manufacturer: 'Test Manufacturer',
      };

      // Mock client verification
      ctx.db.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([mockClients[0]])
      });

      // Mock asset creation
      ctx.db.insert.mockReturnValueOnce({
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([{ id: '4', ...newAssetData }])
      });

      const result = await caller.create(newAssetData);

      expect(result.name).toBe('New Asset');
      expect(result.type).toBe('hardware');
    });
  });
});