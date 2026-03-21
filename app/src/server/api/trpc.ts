import { initTRPC, TRPCError } from '@trpc/server'
import { type FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch'
import { auth } from '@/lib/auth'
import superjson from 'superjson'
import { db } from '@/db'

/**
 * tRPC context - includes database and session information
 */
export const createTRPCContext = async (opts: FetchCreateContextFnOptions) => {
  const session = await auth()
  
  return {
    db,
    session,
  }
}

/**
 * Initialize tRPC with context
 */
const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
})

/**
 * Reusable middleware that enforces users are logged in before running the procedure
 */
const enforceUserIsAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.session || !ctx.session.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }
  
  const user = ctx.session.user as any
  if (!user.organizationId) {
    throw new TRPCError({ 
      code: 'FORBIDDEN',
      message: 'User must belong to an organization' 
    })
  }

  return next({
    ctx: {
      // infers the `session` as non-nullable
      session: { ...ctx.session, user },
      db: ctx.db,
      organizationId: user.organizationId,
      userId: user.id,
    },
  })
})

/**
 * Export reusable router and procedure helpers
 * that can be used throughout the router
 */
export const createTRPCRouter = t.router
export const publicProcedure = t.procedure
export const protectedProcedure = t.procedure.use(enforceUserIsAuthed)