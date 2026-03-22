import { createTRPCRouter } from "./trpc"
import { ticketsRouter } from "./routers/tickets"
import { clientsRouter } from "./routers/clients"
import { timeEntriesRouter } from "./routers/time-entries"
import { usersRouter } from "./routers/users"
import { billingRouter } from "./routers/billing"

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  tickets: ticketsRouter,
  clients: clientsRouter,
  timeEntries: timeEntriesRouter,
  users: usersRouter,
  billing: billingRouter,
})

// export type definition of API
export type AppRouter = typeof appRouter