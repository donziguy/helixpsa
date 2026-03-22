import { z } from "zod"
import { createTRPCRouter, protectedProcedure } from "../trpc"
import { tickets, clients, users } from "@/db/schema"
import { and, eq, desc, like, or, count, sql } from "drizzle-orm"
import { TRPCError } from "@trpc/server"

// Input validation schemas
const triageTicketSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  clientId: z.string().uuid().optional(),
})

const suggestTimeSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  ticketId: z.string().uuid().optional(),
})

// AI categorization keywords and weights
const PRIORITY_KEYWORDS = {
  critical: [
    'down', 'outage', 'urgent', 'critical', 'emergency', 'server down',
    'network down', 'can\'t access', 'complete failure', 'production',
    'all users affected', 'business critical', 'site down', 'database down'
  ],
  high: [
    'important', 'asap', 'high priority', 'major issue', 'multiple users',
    'slow performance', 'intermittent', 'login issues', 'email down',
    'backup failed', 'security issue', 'virus', 'malware'
  ],
  medium: [
    'request', 'question', 'help', 'support', 'assistance', 'setup',
    'configuration', 'training', 'how to', 'feature request'
  ],
  low: [
    'cosmetic', 'minor', 'enhancement', 'suggestion', 'documentation',
    'nice to have', 'when possible', 'future', 'low priority'
  ]
}

const CATEGORY_KEYWORDS = {
  'Hardware Issue': [
    'hardware', 'computer', 'laptop', 'desktop', 'monitor', 'printer',
    'keyboard', 'mouse', 'webcam', 'speaker', 'microphone', 'tablet',
    'phone', 'device', 'broken', 'damaged', 'not working', 'dead'
  ],
  'Network/Connectivity': [
    'network', 'internet', 'wifi', 'connection', 'vpn', 'firewall',
    'router', 'switch', 'cable', 'ethernet', 'bandwidth', 'slow internet',
    'can\'t connect', 'timeout', 'ping', 'dns', 'ip address'
  ],
  'Software Issue': [
    'software', 'application', 'program', 'app', 'install', 'update',
    'upgrade', 'bug', 'error', 'crash', 'freeze', 'slow', 'license',
    'activation', 'compatibility', 'driver'
  ],
  'Email/Communication': [
    'email', 'outlook', 'gmail', 'exchange', 'calendar', 'contacts',
    'meeting', 'teams', 'skype', 'zoom', 'slack', 'phone system',
    'voicemail', 'conference', 'sync'
  ],
  'Security': [
    'security', 'password', 'login', 'authentication', 'access', 'permissions',
    'virus', 'malware', 'antivirus', 'firewall', 'suspicious', 'hack',
    'breach', 'phishing', 'spam', 'encryption'
  ],
  'Account/Access': [
    'account', 'user', 'permission', 'access', 'login', 'password reset',
    'locked out', 'disabled', 'new user', 'termination', 'role',
    'group', 'directory', 'active directory'
  ],
  'Backup/Recovery': [
    'backup', 'restore', 'recovery', 'data loss', 'file missing',
    'corrupt', 'version', 'archive', 'sync', 'cloud backup'
  ],
  'General Support': [
    'help', 'question', 'how to', 'training', 'documentation',
    'support', 'assistance', 'guidance', 'explanation'
  ]
}

const TIME_ESTIMATES = {
  'Hardware Issue': { min: 30, max: 120, avg: 60 },
  'Network/Connectivity': { min: 45, max: 180, avg: 90 },
  'Software Issue': { min: 15, max: 90, avg: 45 },
  'Email/Communication': { min: 20, max: 60, avg: 30 },
  'Security': { min: 30, max: 120, avg: 75 },
  'Account/Access': { min: 10, max: 45, avg: 20 },
  'Backup/Recovery': { min: 60, max: 240, avg: 120 },
  'General Support': { min: 15, max: 60, avg: 30 }
}

/**
 * Analyze text and determine priority based on keywords
 */
function analyzePriority(title: string, description?: string): 'critical' | 'high' | 'medium' | 'low' {
  const text = `${title} ${description || ''}`.toLowerCase()
  
  let scores = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0
  }
  
  // Check for keywords and weight them
  Object.entries(PRIORITY_KEYWORDS).forEach(([priority, keywords]) => {
    keywords.forEach(keyword => {
      if (text.includes(keyword.toLowerCase())) {
        scores[priority as keyof typeof scores]++
      }
    })
  })
  
  // Additional priority logic
  if (text.includes('urgent') || text.includes('asap') || text.includes('emergency')) {
    scores.critical += 2
  }
  
  if (text.includes('all users') || text.includes('everyone') || text.includes('company wide')) {
    scores.critical += 1
    scores.high += 1
  }
  
  if (text.includes('?') && !text.includes('down') && !text.includes('error')) {
    scores.medium += 1
  }
  
  // Find highest score
  const maxScore = Math.max(...Object.values(scores))
  if (maxScore === 0) return 'medium' // Default
  
  const topPriority = Object.entries(scores).find(([_, score]) => score === maxScore)?.[0] as keyof typeof scores
  return topPriority || 'medium'
}

/**
 * Analyze text and suggest category
 */
function analyzeCategory(title: string, description?: string): string {
  const text = `${title} ${description || ''}`.toLowerCase()
  
  let scores: Record<string, number> = {}
  
  Object.entries(CATEGORY_KEYWORDS).forEach(([category, keywords]) => {
    scores[category] = 0
    keywords.forEach(keyword => {
      if (text.includes(keyword.toLowerCase())) {
        scores[category]++
      }
    })
  })
  
  // Find highest scoring category
  const maxScore = Math.max(...Object.values(scores))
  if (maxScore === 0) return 'General Support'
  
  const topCategory = Object.entries(scores).find(([_, score]) => score === maxScore)?.[0]
  return topCategory || 'General Support'
}

/**
 * Suggest best assignee based on historical data and category
 */
async function suggestAssignee(
  db: any,
  organizationId: string,
  category: string,
  priority: 'critical' | 'high' | 'medium' | 'low'
): Promise<string | null> {
  // Get users who have handled similar tickets
  const similarTickets = await db
    .select({
      assigneeId: tickets.assigneeId,
      count: count()
    })
    .from(tickets)
    .where(and(
      eq(tickets.organizationId, organizationId),
      or(
        like(tickets.title, `%${category.split('/')[0].toLowerCase()}%`),
        like(tickets.description, `%${category.split('/')[0].toLowerCase()}%`)
      ),
      eq(tickets.status, 'resolved')
    ))
    .groupBy(tickets.assigneeId)
    .orderBy(desc(count()))

  // Get available users (active technicians/managers)
  const availableUsers = await db
    .select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      role: users.role
    })
    .from(users)
    .where(and(
      eq(users.organizationId, organizationId),
      eq(users.isActive, true),
      or(
        eq(users.role, 'technician'),
        eq(users.role, 'manager'),
        eq(users.role, 'admin')
      )
    ))

  if (availableUsers.length === 0) return null

  // Prefer users who have handled similar tickets
  if (similarTickets.length > 0 && similarTickets[0]?.assigneeId) {
    const preferredUser = availableUsers.find((u: { id: string }) => u.id === similarTickets[0].assigneeId)
    if (preferredUser) return preferredUser.id
  }

  // For critical/high priority, prefer managers/admins
  if (priority === 'critical' || priority === 'high') {
    const seniorUser = availableUsers.find((u: { id: string, role: string }) => u.role === 'admin' || u.role === 'manager')
    if (seniorUser) return seniorUser.id
  }

  // Get current workload for load balancing
  const currentWorkload = await db
    .select({
      assigneeId: tickets.assigneeId,
      openTickets: count()
    })
    .from(tickets)
    .where(and(
      eq(tickets.organizationId, organizationId),
      or(
        eq(tickets.status, 'open'),
        eq(tickets.status, 'in_progress')
      )
    ))
    .groupBy(tickets.assigneeId)

  // Find user with least workload
  const workloadMap = new Map(currentWorkload.map((w: { assigneeId: string, openTickets: number }) => [w.assigneeId, w.openTickets]))
  const leastBusyUser = availableUsers.reduce((least: { id: string, role: string }, user: { id: string, role: string }) => {
    const userWorkload = workloadMap.get(user.id) || 0
    const leastWorkload = workloadMap.get(least.id) || 0
    return userWorkload < leastWorkload ? user : least
  })

  return leastBusyUser.id
}

/**
 * Estimate time based on category and historical data
 */
async function estimateTime(
  db: any,
  organizationId: string,
  category: string,
  title: string,
  description?: string
): Promise<number> {
  // Get historical data for similar tickets
  const text = `${title} ${description || ''}`.toLowerCase()
  const categoryBase = category.split('/')[0].toLowerCase()
  
  const historicalTimes = await db
    .select({
      estimatedHours: tickets.estimatedHours
    })
    .from(tickets)
    .where(and(
      eq(tickets.organizationId, organizationId),
      or(
        like(tickets.title, `%${categoryBase}%`),
        like(tickets.description, `%${categoryBase}%`)
      ),
      eq(tickets.status, 'resolved')
    ))

  // Calculate average from historical data
  const validTimes = historicalTimes
    .map((t: { estimatedHours?: string }) => parseFloat(t.estimatedHours || '0'))
    .filter((t: number) => t > 0)

  if (validTimes.length > 3) {
    const avg = validTimes.reduce((sum: number, time: number) => sum + time, 0) / validTimes.length
    return Math.round(avg * 10) / 10 // Round to 1 decimal
  }

  // Fall back to category-based estimates
  const estimate = TIME_ESTIMATES[category as keyof typeof TIME_ESTIMATES] || TIME_ESTIMATES['General Support']
  
  // Adjust based on complexity indicators in text
  let multiplier = 1
  if (text.includes('complex') || text.includes('multiple') || text.includes('integration')) {
    multiplier = 1.5
  } else if (text.includes('simple') || text.includes('quick') || text.includes('minor')) {
    multiplier = 0.7
  }
  
  return Math.round((estimate.avg * multiplier) / 60 * 10) / 10 // Convert minutes to hours
}

export const aiRouter = createTRPCRouter({
  // Analyze ticket and suggest priority, category, and assignee
  triageTicket: protectedProcedure
    .input(triageTicketSchema)
    .mutation(async ({ ctx, input }) => {
      const { title, description, clientId } = input

      // Analyze priority
      const suggestedPriority = analyzePriority(title, description)
      
      // Analyze category
      const suggestedCategory = analyzeCategory(title, description)
      
      // Suggest assignee
      const suggestedAssigneeId = await suggestAssignee(
        ctx.db, 
        ctx.organizationId, 
        suggestedCategory, 
        suggestedPriority
      )
      
      // Get assignee details if found
      let suggestedAssignee = null
      if (suggestedAssigneeId) {
        suggestedAssignee = await ctx.db
          .select({
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email,
            role: users.role
          })
          .from(users)
          .where(eq(users.id, suggestedAssigneeId))
          .then(rows => rows[0] || null)
      }
      
      // Estimate time
      const estimatedHours = await estimateTime(
        ctx.db,
        ctx.organizationId,
        suggestedCategory,
        title,
        description
      )
      
      // Get client info for context
      let clientInfo = null
      if (clientId) {
        clientInfo = await ctx.db
          .select({
            id: clients.id,
            name: clients.name,
            slaTier: clients.slaTier
          })
          .from(clients)
          .where(and(
            eq(clients.id, clientId),
            eq(clients.organizationId, ctx.organizationId)
          ))
          .then(rows => rows[0] || null)
      }
      
      // Generate explanation
      const explanation = [
        `Category: ${suggestedCategory} (based on keywords in title/description)`,
        `Priority: ${suggestedPriority} (${suggestedPriority === 'critical' ? 'urgent language detected' : 
          suggestedPriority === 'high' ? 'important issue indicators' :
          suggestedPriority === 'low' ? 'enhancement/minor issue' : 'standard support request'})`,
        suggestedAssignee ? `Assignee: ${suggestedAssignee.firstName} ${suggestedAssignee.lastName} (${
          suggestedAssignee.role === 'admin' || suggestedAssignee.role === 'manager' ? 'senior staff for high priority' :
          'balanced workload assignment'
        })` : 'No suitable assignee found',
        `Time estimate: ${estimatedHours}h (${estimatedHours < 1 ? 'quick task' : 
          estimatedHours > 2 ? 'complex task requiring detailed work' : 'standard task'})`
      ]
      
      return {
        suggestions: {
          priority: suggestedPriority,
          category: suggestedCategory,
          assignee: suggestedAssignee,
          estimatedHours,
          explanation: explanation.join('\n• ')
        },
        confidence: {
          priority: 0.8, // Mock confidence scores
          category: 0.75,
          assignee: suggestedAssignee ? 0.7 : 0.0,
          timeEstimate: estimatedHours > 0 ? 0.65 : 0.4
        },
        clientContext: clientInfo
      }
    }),

  // Suggest time estimate for existing ticket
  suggestTime: protectedProcedure
    .input(suggestTimeSchema)
    .mutation(async ({ ctx, input }) => {
      const { title, description, ticketId } = input
      
      // Get existing ticket context if provided
      let existingTicket = null
      if (ticketId) {
        existingTicket = await ctx.db
          .select({
            id: tickets.id,
            priority: tickets.priority,
            status: tickets.status,
            client: {
              name: clients.name,
              slaTier: clients.slaTier
            }
          })
          .from(tickets)
          .leftJoin(clients, eq(tickets.clientId, clients.id))
          .where(and(
            eq(tickets.id, ticketId),
            eq(tickets.organizationId, ctx.organizationId)
          ))
          .then(rows => rows[0] || null)
      }
      
      // Analyze category for time estimation
      const category = analyzeCategory(title, description)
      
      // Get time estimate
      const estimatedHours = await estimateTime(
        ctx.db,
        ctx.organizationId,
        category,
        title,
        description
      )
      
      // Get similar resolved tickets for context
      const text = `${title} ${description || ''}`.toLowerCase()
      const categoryBase = category.split('/')[0].toLowerCase()
      
      const similarTickets = await ctx.db
        .select({
          title: tickets.title,
          estimatedHours: tickets.estimatedHours,
          priority: tickets.priority
        })
        .from(tickets)
        .where(and(
          eq(tickets.organizationId, ctx.organizationId),
          or(
            like(tickets.title, `%${categoryBase}%`),
            like(tickets.description, `%${categoryBase}%`)
          ),
          eq(tickets.status, 'resolved')
        ))
        .limit(5)
      
      return {
        estimatedHours,
        category,
        confidence: 0.7,
        reasoning: `Based on ${category} category and historical data from similar tickets`,
        similarTickets: similarTickets.map(ticket => ({
          title: ticket.title,
          estimatedHours: parseFloat(ticket.estimatedHours || '0'),
          priority: ticket.priority
        })),
        existingTicket
      }
    }),

  // Get AI insights for tickets dashboard
  getInsights: protectedProcedure
    .query(async ({ ctx }) => {
      // Get current open tickets needing triage
      const openTickets = await ctx.db
        .select({
          id: tickets.id,
          title: tickets.title,
          priority: tickets.priority,
          assigneeId: tickets.assigneeId,
          createdAt: tickets.createdAt
        })
        .from(tickets)
        .where(and(
          eq(tickets.organizationId, ctx.organizationId),
          eq(tickets.status, 'open')
        ))
        .orderBy(desc(tickets.createdAt))
        .limit(10)
      
      // Identify tickets that may need attention
      const insights = []
      
      // Unassigned critical/high priority tickets
      const unassignedCritical = openTickets.filter(t => 
        !t.assigneeId && (t.priority === 'critical' || t.priority === 'high')
      )
      
      if (unassignedCritical.length > 0) {
        insights.push({
          type: 'warning',
          title: 'Unassigned High Priority Tickets',
          description: `${unassignedCritical.length} critical/high priority tickets need assignment`,
          action: 'Review and assign immediately',
          tickets: unassignedCritical.map(t => ({ id: t.id, title: t.title }))
        })
      }
      
      // Old unassigned tickets
      const oldUnassigned = openTickets.filter(t => {
        if (t.assigneeId) return false
        const daysSinceCreated = (Date.now() - t.createdAt.getTime()) / (1000 * 60 * 60 * 24)
        return daysSinceCreated > 1
      })
      
      if (oldUnassigned.length > 0) {
        insights.push({
          type: 'info',
          title: 'Stale Unassigned Tickets',
          description: `${oldUnassigned.length} tickets have been unassigned for over 1 day`,
          action: 'Consider auto-assignment or manual review',
          tickets: oldUnassigned.map(t => ({ id: t.id, title: t.title }))
        })
      }
      
      // Get workload distribution
      const workloadStats = await ctx.db
        .select({
          assigneeId: tickets.assigneeId,
          openTickets: count()
        })
        .from(tickets)
        .where(and(
          eq(tickets.organizationId, ctx.organizationId),
          or(
            eq(tickets.status, 'open'),
            eq(tickets.status, 'in_progress')
          )
        ))
        .groupBy(tickets.assigneeId)
      
      const maxWorkload = Math.max(...workloadStats.map(w => w.openTickets))
      const avgWorkload = workloadStats.reduce((sum, w) => sum + w.openTickets, 0) / workloadStats.length
      
      if (maxWorkload > avgWorkload * 2) {
        insights.push({
          type: 'warning',
          title: 'Workload Imbalance',
          description: 'Some technicians have significantly more tickets than others',
          action: 'Consider redistributing workload',
          tickets: []
        })
      }
      
      return {
        insights,
        stats: {
          totalOpenTickets: openTickets.length,
          unassignedTickets: openTickets.filter(t => !t.assigneeId).length,
          highPriorityTickets: openTickets.filter(t => t.priority === 'critical' || t.priority === 'high').length,
          avgWorkload: Math.round(avgWorkload * 10) / 10
        }
      }
    })
})