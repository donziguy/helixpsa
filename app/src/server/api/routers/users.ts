import { z } from "zod"
import { createTRPCRouter, protectedProcedure } from "../trpc"
import { users } from "@/db/schema"
import { and, eq } from "drizzle-orm"

export const usersRouter = createTRPCRouter({
  // Get all users in the organization
  getAll: protectedProcedure
    .query(async ({ ctx }) => {
      const orgUsers = await ctx.db
        .select({
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          role: users.role,
          isActive: users.isActive,
          hourlyRate: users.hourlyRate,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(and(
          eq(users.organizationId, ctx.organizationId),
          eq(users.isActive, true)
        ))

      return orgUsers
    }),

  // Get current user profile
  getMe: protectedProcedure
    .query(async ({ ctx }) => {
      const user = await ctx.db
        .select({
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          role: users.role,
          hourlyRate: users.hourlyRate,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(eq(users.id, ctx.userId))
        .then(rows => rows[0])

      return user
    }),

  // Update user profile
  updateProfile: protectedProcedure
    .input(z.object({
      firstName: z.string().min(1).max(100).optional(),
      lastName: z.string().min(1).max(100).optional(),
      hourlyRate: z.number().positive().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const updateData: any = {}
      if (input.firstName !== undefined) updateData.firstName = input.firstName
      if (input.lastName !== undefined) updateData.lastName = input.lastName
      if (input.hourlyRate !== undefined) updateData.hourlyRate = input.hourlyRate.toString()

      const [updatedUser] = await ctx.db
        .update(users)
        .set({
          ...updateData,
          updatedAt: new Date(),
        })
        .where(eq(users.id, ctx.userId))
        .returning()

      return updatedUser
    }),
})