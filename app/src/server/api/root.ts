import { createTRPCRouter } from "./trpc"
import { ticketsRouter } from "./routers/tickets"
import { clientsRouter } from "./routers/clients"
import { timeEntriesRouter } from "./routers/time-entries"
import { usersRouter } from "./routers/users"
import { billingRouter } from "./routers/billing"
import { slaRouter } from "./routers/sla"
import { assetsRouter } from "./routers/assets"
import { scheduleRouter } from "./routers/schedule"
import { reportsRouter } from "./routers/reports"
import { aiRouter } from "./routers/ai"
import { knowledgeRouter } from "./routers/knowledge"
import { emailRouter } from "./routers/email"
import { portalRouter } from "./routers/portal"
import { notificationsRouter } from "./routers/notifications"
import { automationRouter } from "./routers/automation"

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
  sla: slaRouter,
  assets: assetsRouter,
  schedule: scheduleRouter,
  reports: reportsRouter,
  ai: aiRouter,
  knowledge: knowledgeRouter,
  email: emailRouter,
  portal: portalRouter,
  notifications: notificationsRouter,
  automation: automationRouter,
})

// export type definition of API
export type AppRouter = typeof appRouter