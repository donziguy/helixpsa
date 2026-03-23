import { z } from "zod"
import { createTRPCRouter, protectedProcedure } from "../trpc"
import { assets, clients } from "@/db/schema"
import { and, eq, desc, count, like, or, lte, isNotNull } from "drizzle-orm"
import { TRPCError } from "@trpc/server"

// Input validation schemas
const createAssetSchema = z.object({
  clientId: z.string().uuid(),
  name: z.string().min(1, "Name is required").max(255),
  type: z.enum(['hardware', 'software', 'network', 'mobile', 'peripherals', 'server', 'other']),
  status: z.enum(['active', 'inactive', 'maintenance', 'retired', 'lost_stolen']).default('active'),
  serialNumber: z.string().max(255).optional(),
  model: z.string().max(255).optional(),
  manufacturer: z.string().max(255).optional(),
  location: z.string().max(255).optional(),
  assignedTo: z.string().max(255).optional(),
  purchaseDate: z.date().optional(),
  warrantyExpiry: z.date().optional(),
  purchasePrice: z.number().optional(),
  notes: z.string().optional(),
  lastMaintenanceDate: z.date().optional(),
  nextMaintenanceDate: z.date().optional(),
})

const updateAssetSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255).optional(),
  type: z.enum(['hardware', 'software', 'network', 'mobile', 'peripherals', 'server', 'other']).optional(),
  status: z.enum(['active', 'inactive', 'maintenance', 'retired', 'lost_stolen']).optional(),
  serialNumber: z.string().max(255).optional(),
  model: z.string().max(255).optional(),
  manufacturer: z.string().max(255).optional(),
  location: z.string().max(255).optional(),
  assignedTo: z.string().max(255).optional(),
  purchaseDate: z.date().optional(),
  warrantyExpiry: z.date().optional(),
  purchasePrice: z.number().optional(),
  notes: z.string().optional(),
  lastMaintenanceDate: z.date().optional(),
  nextMaintenanceDate: z.date().optional(),
  isActive: z.boolean().optional(),
})

const searchAssetsSchema = z.object({
  query: z.string().optional(),
  clientId: z.string().uuid().optional(),
  type: z.enum(['hardware', 'software', 'network', 'mobile', 'peripherals', 'server', 'other']).optional(),
  status: z.enum(['active', 'inactive', 'maintenance', 'retired', 'lost_stolen']).optional(),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
})

export const assetsRouter = createTRPCRouter({
  // Get all assets for the organization with optional filtering
  getAll: protectedProcedure
    .input(searchAssetsSchema)
    .query(async ({ ctx, input }) => {
      let whereConditions = [eq(assets.organizationId, ctx.organizationId)]

      // Add filters
      if (input.clientId) {
        whereConditions.push(eq(assets.clientId, input.clientId))
      }
      if (input.type) {
        whereConditions.push(eq(assets.type, input.type))
      }
      if (input.status) {
        whereConditions.push(eq(assets.status, input.status))
      }
      if (input.query) {
        const searchCondition = or(
          like(assets.name, `%${input.query}%`),
          like(assets.serialNumber, `%${input.query}%`),
          like(assets.model, `%${input.query}%`),
          like(assets.manufacturer, `%${input.query}%`),
          like(assets.assignedTo, `%${input.query}%`)
        );
        if (searchCondition) {
          whereConditions.push(searchCondition);
        }
      }

      const assetsWithClient = await ctx.db
        .select({
          id: assets.id,
          name: assets.name,
          type: assets.type,
          status: assets.status,
          serialNumber: assets.serialNumber,
          model: assets.model,
          manufacturer: assets.manufacturer,
          location: assets.location,
          assignedTo: assets.assignedTo,
          purchaseDate: assets.purchaseDate,
          warrantyExpiry: assets.warrantyExpiry,
          purchasePrice: assets.purchasePrice,
          notes: assets.notes,
          lastMaintenanceDate: assets.lastMaintenanceDate,
          nextMaintenanceDate: assets.nextMaintenanceDate,
          isActive: assets.isActive,
          createdAt: assets.createdAt,
          updatedAt: assets.updatedAt,
          clientName: clients.name,
        })
        .from(assets)
        .innerJoin(clients, eq(assets.clientId, clients.id))
        .where(and(...whereConditions))
        .limit(input.limit)
        .offset(input.offset)
        .orderBy(desc(assets.createdAt))

      return assetsWithClient
    }),

  // Get single asset by ID
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const asset = await ctx.db
        .select({
          id: assets.id,
          clientId: assets.clientId,
          name: assets.name,
          type: assets.type,
          status: assets.status,
          serialNumber: assets.serialNumber,
          model: assets.model,
          manufacturer: assets.manufacturer,
          location: assets.location,
          assignedTo: assets.assignedTo,
          purchaseDate: assets.purchaseDate,
          warrantyExpiry: assets.warrantyExpiry,
          purchasePrice: assets.purchasePrice,
          notes: assets.notes,
          lastMaintenanceDate: assets.lastMaintenanceDate,
          nextMaintenanceDate: assets.nextMaintenanceDate,
          isActive: assets.isActive,
          createdAt: assets.createdAt,
          updatedAt: assets.updatedAt,
          clientName: clients.name,
        })
        .from(assets)
        .innerJoin(clients, eq(assets.clientId, clients.id))
        .where(and(
          eq(assets.id, input.id),
          eq(assets.organizationId, ctx.organizationId)
        ))
        .then(rows => rows[0])

      if (!asset) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Asset not found',
        })
      }

      return asset
    }),

  // Get asset statistics
  getStats: protectedProcedure
    .query(async ({ ctx }) => {
      // Get total asset counts by type and status
      const assetList = await ctx.db
        .select({
          type: assets.type,
          status: assets.status,
        })
        .from(assets)
        .where(eq(assets.organizationId, ctx.organizationId))

      const stats = {
        total: assetList.length,
        byType: {} as Record<string, number>,
        byStatus: {} as Record<string, number>,
        warrantyExpiringSoon: 0, // within 30 days
        maintenanceDue: 0, // maintenance date passed or within 7 days
      }

      const now = new Date()
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
      const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

      assetList.forEach(asset => {
        // Count by type
        stats.byType[asset.type] = (stats.byType[asset.type] || 0) + 1
        
        // Count by status
        stats.byStatus[asset.status] = (stats.byStatus[asset.status] || 0) + 1
      })

      // Get warranty expiring soon (within 30 days)
      const warrantyExpiringSoon = await ctx.db
        .select({ count: count() })
        .from(assets)
        .where(and(
          eq(assets.organizationId, ctx.organizationId),
          eq(assets.isActive, true),
          isNotNull(assets.warrantyExpiry),
          lte(assets.warrantyExpiry, thirtyDaysFromNow)
        ))
        .then(rows => rows[0]?.count || 0)

      // Get maintenance due (maintenance date passed or within 7 days)
      const maintenanceDue = await ctx.db
        .select({ count: count() })
        .from(assets)
        .where(and(
          eq(assets.organizationId, ctx.organizationId),
          eq(assets.isActive, true),
          isNotNull(assets.nextMaintenanceDate),
          lte(assets.nextMaintenanceDate, sevenDaysFromNow)
        ))
        .then(rows => rows[0]?.count || 0)

      return {
        ...stats,
        warrantyExpiringSoon: warrantyExpiringSoon,
        maintenanceDue: maintenanceDue,
      }
    }),

  // Create new asset
  create: protectedProcedure
    .input(createAssetSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify client belongs to organization
      const client = await ctx.db
        .select()
        .from(clients)
        .where(and(
          eq(clients.id, input.clientId),
          eq(clients.organizationId, ctx.organizationId)
        ))
        .then(rows => rows[0])

      if (!client) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Client not found or does not belong to your organization',
        })
      }

      const [newAsset] = await ctx.db
        .insert(assets)
        .values({
          organizationId: ctx.organizationId,
          clientId: input.clientId,
          name: input.name,
          type: input.type,
          status: input.status,
          serialNumber: input.serialNumber,
          model: input.model,
          manufacturer: input.manufacturer,
          location: input.location,
          assignedTo: input.assignedTo,
          purchaseDate: input.purchaseDate,
          warrantyExpiry: input.warrantyExpiry,
          purchasePrice: input.purchasePrice?.toString(),
          notes: input.notes,
          lastMaintenanceDate: input.lastMaintenanceDate,
          nextMaintenanceDate: input.nextMaintenanceDate,
        })
        .returning()

      return newAsset
    }),

  // Update asset
  update: protectedProcedure
    .input(updateAssetSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify asset belongs to organization
      const existingAsset = await ctx.db
        .select()
        .from(assets)
        .where(and(
          eq(assets.id, input.id),
          eq(assets.organizationId, ctx.organizationId)
        ))
        .then(rows => rows[0])

      if (!existingAsset) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Asset not found',
        })
      }

      const updateData: any = {}
      if (input.name !== undefined) updateData.name = input.name
      if (input.type !== undefined) updateData.type = input.type
      if (input.status !== undefined) updateData.status = input.status
      if (input.serialNumber !== undefined) updateData.serialNumber = input.serialNumber
      if (input.model !== undefined) updateData.model = input.model
      if (input.manufacturer !== undefined) updateData.manufacturer = input.manufacturer
      if (input.location !== undefined) updateData.location = input.location
      if (input.assignedTo !== undefined) updateData.assignedTo = input.assignedTo
      if (input.purchaseDate !== undefined) updateData.purchaseDate = input.purchaseDate
      if (input.warrantyExpiry !== undefined) updateData.warrantyExpiry = input.warrantyExpiry
      if (input.purchasePrice !== undefined) updateData.purchasePrice = input.purchasePrice?.toString()
      if (input.notes !== undefined) updateData.notes = input.notes
      if (input.lastMaintenanceDate !== undefined) updateData.lastMaintenanceDate = input.lastMaintenanceDate
      if (input.nextMaintenanceDate !== undefined) updateData.nextMaintenanceDate = input.nextMaintenanceDate
      if (input.isActive !== undefined) updateData.isActive = input.isActive

      const [updatedAsset] = await ctx.db
        .update(assets)
        .set({
          ...updateData,
          updatedAt: new Date(),
        })
        .where(eq(assets.id, input.id))
        .returning()

      return updatedAsset
    }),

  // Delete asset
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Verify asset belongs to organization
      const existingAsset = await ctx.db
        .select()
        .from(assets)
        .where(and(
          eq(assets.id, input.id),
          eq(assets.organizationId, ctx.organizationId)
        ))
        .then(rows => rows[0])

      if (!existingAsset) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Asset not found',
        })
      }

      await ctx.db
        .delete(assets)
        .where(eq(assets.id, input.id))

      return { success: true }
    }),

  // Get assets with expiring warranties
  getWarrantyExpiringSoon: protectedProcedure
    .input(z.object({
      daysAhead: z.number().min(1).max(365).default(30),
      limit: z.number().min(1).max(100).default(50),
    }))
    .query(async ({ ctx, input }) => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + input.daysAhead)

      const assetsWithClient = await ctx.db
        .select({
          id: assets.id,
          name: assets.name,
          type: assets.type,
          serialNumber: assets.serialNumber,
          model: assets.model,
          manufacturer: assets.manufacturer,
          warrantyExpiry: assets.warrantyExpiry,
          clientName: clients.name,
          clientId: clients.id,
        })
        .from(assets)
        .innerJoin(clients, eq(assets.clientId, clients.id))
        .where(and(
          eq(assets.organizationId, ctx.organizationId),
          eq(assets.isActive, true),
          isNotNull(assets.warrantyExpiry),
          lte(assets.warrantyExpiry, futureDate)
        ))
        .limit(input.limit)
        .orderBy(assets.warrantyExpiry)

      return assetsWithClient
    }),

  // Get assets with maintenance due
  getMaintenanceDue: protectedProcedure
    .input(z.object({
      daysAhead: z.number().min(1).max(365).default(7),
      limit: z.number().min(1).max(100).default(50),
    }))
    .query(async ({ ctx, input }) => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + input.daysAhead)

      const assetsWithClient = await ctx.db
        .select({
          id: assets.id,
          name: assets.name,
          type: assets.type,
          serialNumber: assets.serialNumber,
          model: assets.model,
          manufacturer: assets.manufacturer,
          nextMaintenanceDate: assets.nextMaintenanceDate,
          lastMaintenanceDate: assets.lastMaintenanceDate,
          clientName: clients.name,
          clientId: clients.id,
        })
        .from(assets)
        .innerJoin(clients, eq(assets.clientId, clients.id))
        .where(and(
          eq(assets.organizationId, ctx.organizationId),
          eq(assets.isActive, true),
          isNotNull(assets.nextMaintenanceDate),
          lte(assets.nextMaintenanceDate, futureDate)
        ))
        .limit(input.limit)
        .orderBy(assets.nextMaintenanceDate)

      return assetsWithClient
    }),
})