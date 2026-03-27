import { z } from "zod"
import { createTRPCRouter, protectedProcedure } from "../trpc"
import { automationRules, automationRuleExecutions, users } from "@/db/schema"
import { and, eq, desc, count } from "drizzle-orm"
import { TRPCError } from "@trpc/server"
import { AutomationService } from "@/lib/automation/AutomationService"
import type { AutomationCondition, AutomationAction } from "@/lib/automation/AutomationService"

// Input validation schemas
const automationConditionSchema = z.object({
  type: z.enum(['client_match', 'priority_match', 'status_match', 'time_elapsed', 'subject_contains', 'category_match']),
  operator: z.enum(['equals', 'not_equals', 'contains', 'not_contains', 'greater_than', 'less_than']),
  value: z.union([z.string(), z.number()]),
  field: z.string().optional(),
})

const automationActionSchema = z.object({
  type: z.enum(['assign_user', 'change_status', 'change_priority', 'add_note', 'send_notification']),
  value: z.string(),
  parameters: z.record(z.any()).optional(),
})

const createAutomationRuleSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  description: z.string().optional(),
  ruleType: z.enum(['auto_assign', 'auto_close', 'auto_escalate', 'auto_notify']),
  priority: z.number().int().min(1).max(100).default(1),
  conditions: z.array(automationConditionSchema).min(1, "At least one condition is required"),
  actions: z.array(automationActionSchema).min(1, "At least one action is required"),
})

const updateAutomationRuleSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  ruleType: z.enum(['auto_assign', 'auto_close', 'auto_escalate', 'auto_notify']).optional(),
  priority: z.number().int().min(1).max(100).optional(),
  conditions: z.array(automationConditionSchema).optional(),
  actions: z.array(automationActionSchema).optional(),
  isActive: z.boolean().optional(),
})

export const automationRouter = createTRPCRouter({
  // Get all automation rules for the organization
  getAll: protectedProcedure
    .query(async ({ ctx }) => {
      const rules = await ctx.db
        .select({
          id: automationRules.id,
          name: automationRules.name,
          description: automationRules.description,
          ruleType: automationRules.ruleType,
          priority: automationRules.priority,
          conditions: automationRules.conditions,
          actions: automationRules.actions,
          isActive: automationRules.isActive,
          lastTriggered: automationRules.lastTriggered,
          triggerCount: automationRules.triggerCount,
          createdAt: automationRules.createdAt,
          updatedAt: automationRules.updatedAt,
          createdBy: {
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email,
          },
        })
        .from(automationRules)
        .leftJoin(users, eq(automationRules.createdBy, users.id))
        .where(eq(automationRules.organizationId, ctx.organizationId))
        .orderBy(automationRules.priority, desc(automationRules.createdAt))

      return rules.map(rule => ({
        ...rule,
        conditions: JSON.parse(rule.conditions) as AutomationCondition[],
        actions: JSON.parse(rule.actions) as AutomationAction[],
      }))
    }),

  // Get single automation rule by ID
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const rule = await ctx.db
        .select({
          id: automationRules.id,
          name: automationRules.name,
          description: automationRules.description,
          ruleType: automationRules.ruleType,
          priority: automationRules.priority,
          conditions: automationRules.conditions,
          actions: automationRules.actions,
          isActive: automationRules.isActive,
          lastTriggered: automationRules.lastTriggered,
          triggerCount: automationRules.triggerCount,
          createdAt: automationRules.createdAt,
          updatedAt: automationRules.updatedAt,
          createdBy: {
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email,
          },
        })
        .from(automationRules)
        .leftJoin(users, eq(automationRules.createdBy, users.id))
        .where(and(
          eq(automationRules.id, input.id),
          eq(automationRules.organizationId, ctx.organizationId)
        ))
        .then(rows => rows[0])

      if (!rule) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Automation rule not found',
        })
      }

      return {
        ...rule,
        conditions: JSON.parse(rule.conditions) as AutomationCondition[],
        actions: JSON.parse(rule.actions) as AutomationAction[],
      }
    }),

  // Create new automation rule
  create: protectedProcedure
    .input(createAutomationRuleSchema)
    .mutation(async ({ ctx, input }) => {
      // Validate conditions and actions
      if (input.ruleType === 'auto_close') {
        const hasTimeCondition = input.conditions.some(c => c.type === 'time_elapsed')
        if (!hasTimeCondition) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Auto-close rules must include a time_elapsed condition',
          })
        }

        const hasStatusAction = input.actions.some(a => a.type === 'change_status' && a.value === 'closed')
        if (!hasStatusAction) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Auto-close rules must include a change_status action to "closed"',
          })
        }
      }

      if (input.ruleType === 'auto_assign') {
        const hasAssignAction = input.actions.some(a => a.type === 'assign_user')
        if (!hasAssignAction) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Auto-assign rules must include an assign_user action',
          })
        }
      }

      const [newRule] = await ctx.db
        .insert(automationRules)
        .values({
          organizationId: ctx.organizationId,
          name: input.name,
          description: input.description,
          ruleType: input.ruleType,
          priority: input.priority,
          conditions: JSON.stringify(input.conditions),
          actions: JSON.stringify(input.actions),
          createdBy: ctx.userId,
        })
        .returning()

      return {
        ...newRule,
        conditions: input.conditions,
        actions: input.actions,
      }
    }),

  // Update automation rule
  update: protectedProcedure
    .input(updateAutomationRuleSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify rule belongs to organization
      const existingRule = await ctx.db
        .select()
        .from(automationRules)
        .where(and(
          eq(automationRules.id, input.id),
          eq(automationRules.organizationId, ctx.organizationId)
        ))
        .then(rows => rows[0])

      if (!existingRule) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Automation rule not found',
        })
      }

      const updateData: any = {
        updatedAt: new Date(),
      }

      if (input.name !== undefined) updateData.name = input.name
      if (input.description !== undefined) updateData.description = input.description
      if (input.ruleType !== undefined) updateData.ruleType = input.ruleType
      if (input.priority !== undefined) updateData.priority = input.priority
      if (input.isActive !== undefined) updateData.isActive = input.isActive
      
      if (input.conditions !== undefined) {
        updateData.conditions = JSON.stringify(input.conditions)
      }
      
      if (input.actions !== undefined) {
        updateData.actions = JSON.stringify(input.actions)
      }

      const [updatedRule] = await ctx.db
        .update(automationRules)
        .set(updateData)
        .where(eq(automationRules.id, input.id))
        .returning()

      return {
        ...updatedRule,
        conditions: JSON.parse(updatedRule.conditions) as AutomationCondition[],
        actions: JSON.parse(updatedRule.actions) as AutomationAction[],
      }
    }),

  // Delete automation rule
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Verify rule belongs to organization
      const existingRule = await ctx.db
        .select()
        .from(automationRules)
        .where(and(
          eq(automationRules.id, input.id),
          eq(automationRules.organizationId, ctx.organizationId)
        ))
        .then(rows => rows[0])

      if (!existingRule) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Automation rule not found',
        })
      }

      await ctx.db
        .delete(automationRules)
        .where(eq(automationRules.id, input.id))

      return { success: true }
    }),

  // Get automation rule execution history
  getExecutions: protectedProcedure
    .input(z.object({
      ruleId: z.string().uuid().optional(),
      limit: z.number().min(1).max(100).default(50),
    }))
    .query(async ({ ctx, input }) => {
      let query = ctx.db
        .select({
          id: automationRuleExecutions.id,
          ruleId: automationRuleExecutions.ruleId,
          ticketId: automationRuleExecutions.ticketId,
          status: automationRuleExecutions.status,
          executionData: automationRuleExecutions.executionData,
          errorMessage: automationRuleExecutions.errorMessage,
          executedAt: automationRuleExecutions.executedAt,
          rule: {
            name: automationRules.name,
            ruleType: automationRules.ruleType,
          },
        })
        .from(automationRuleExecutions)
        .leftJoin(automationRules, eq(automationRuleExecutions.ruleId, automationRules.id))
        .where(eq(automationRuleExecutions.organizationId, ctx.organizationId))
        .orderBy(desc(automationRuleExecutions.executedAt))
        .limit(input.limit)

      if (input.ruleId) {
        query = query.where(and(
          eq(automationRuleExecutions.organizationId, ctx.organizationId),
          eq(automationRuleExecutions.ruleId, input.ruleId)
        )) as any
      }

      const executions = await query

      return executions.map(execution => ({
        ...execution,
        executionData: execution.executionData ? JSON.parse(execution.executionData) : null,
      }))
    }),

  // Execute automation rules manually for a specific ticket
  executeForTicket: protectedProcedure
    .input(z.object({
      ticketId: z.string().uuid(),
    }))
    .mutation(async ({ ctx, input }) => {
      const automationService = new AutomationService(ctx.db)
      
      const result = await automationService.executeRulesForTicket(
        input.ticketId,
        ctx.organizationId,
        'updated' // Manual execution counts as an update
      )

      return result
    }),

  // Execute auto-close rules manually
  executeAutoClose: protectedProcedure
    .mutation(async ({ ctx }) => {
      const automationService = new AutomationService(ctx.db)
      
      const result = await automationService.executeAutoCloseRules(ctx.organizationId)

      return result
    }),

  // Get automation statistics
  getStats: protectedProcedure
    .query(async ({ ctx }) => {
      const totalRules = await ctx.db
        .select({ count: count() })
        .from(automationRules)
        .where(eq(automationRules.organizationId, ctx.organizationId))
        .then(rows => rows[0]?.count || 0)

      const activeRules = await ctx.db
        .select({ count: count() })
        .from(automationRules)
        .where(and(
          eq(automationRules.organizationId, ctx.organizationId),
          eq(automationRules.isActive, true)
        ))
        .then(rows => rows[0]?.count || 0)

      const totalExecutions = await ctx.db
        .select({ count: count() })
        .from(automationRuleExecutions)
        .where(eq(automationRuleExecutions.organizationId, ctx.organizationId))
        .then(rows => rows[0]?.count || 0)

      const successfulExecutions = await ctx.db
        .select({ count: count() })
        .from(automationRuleExecutions)
        .where(and(
          eq(automationRuleExecutions.organizationId, ctx.organizationId),
          eq(automationRuleExecutions.status, 'success')
        ))
        .then(rows => rows[0]?.count || 0)

      return {
        totalRules,
        activeRules,
        totalExecutions,
        successfulExecutions,
        successRate: totalExecutions > 0 ? Math.round((successfulExecutions / totalExecutions) * 100) : 0,
      }
    }),
})