import type { Database } from "@/db"
import { automationRules, automationRuleExecutions, tickets, users, clients } from "@/db/schema"
import { and, eq, isNull, sql } from "drizzle-orm"
import type { AutomationRule, Ticket, User, Client } from "@/db/schema"

export interface AutomationCondition {
  type: 'client_match' | 'priority_match' | 'status_match' | 'time_elapsed' | 'subject_contains' | 'category_match'
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than'
  value: string | number
  field?: string
}

export interface AutomationAction {
  type: 'assign_user' | 'change_status' | 'change_priority' | 'add_note' | 'send_notification'
  value: string
  parameters?: Record<string, any>
}

export class AutomationService {
  constructor(private db: Database) {}

  /**
   * Execute all applicable automation rules for a ticket
   */
  async executeRulesForTicket(
    ticketId: string, 
    organizationId: string,
    trigger: 'created' | 'updated' | 'status_changed' | 'scheduled'
  ): Promise<{ rulesExecuted: number; errors: string[] }> {
    const errors: string[] = []
    let rulesExecuted = 0

    // Get the ticket with related data
    const ticketData = await this.db
      .select({
        ticket: tickets,
        client: clients,
        assignee: users,
      })
      .from(tickets)
      .leftJoin(clients, eq(tickets.clientId, clients.id))
      .leftJoin(users, eq(tickets.assigneeId, users.id))
      .where(and(
        eq(tickets.id, ticketId),
        eq(tickets.organizationId, organizationId)
      ))
      .then(rows => rows[0])

    if (!ticketData) {
      errors.push(`Ticket ${ticketId} not found`)
      return { rulesExecuted, errors }
    }

    // Get all active automation rules for this organization
    const rules = await this.db
      .select()
      .from(automationRules)
      .where(and(
        eq(automationRules.organizationId, organizationId),
        eq(automationRules.isActive, true)
      ))
      .orderBy(automationRules.priority)

    for (const rule of rules) {
      try {
        const shouldExecute = await this.evaluateRuleConditions(rule, ticketData, trigger)
        if (shouldExecute) {
          await this.executeRuleActions(rule, ticketData, organizationId)
          rulesExecuted++

          // Log the execution
          await this.logRuleExecution(rule.id, ticketId, organizationId, 'success', {
            trigger,
            ticketData: {
              id: ticketData.ticket.id,
              title: ticketData.ticket.title,
              status: ticketData.ticket.status,
              priority: ticketData.ticket.priority,
            }
          })

          // Update rule statistics
          await this.db
            .update(automationRules)
            .set({
              lastTriggered: new Date(),
              triggerCount: sql`${automationRules.triggerCount} + 1`,
              updatedAt: new Date(),
            })
            .where(eq(automationRules.id, rule.id))
        }
      } catch (error) {
        const errorMsg = `Rule ${rule.name}: ${error instanceof Error ? error.message : 'Unknown error'}`
        errors.push(errorMsg)

        await this.logRuleExecution(rule.id, ticketId, organizationId, 'failed', null, errorMsg)
      }
    }

    return { rulesExecuted, errors }
  }

  /**
   * Execute auto-close rules for tickets that have been resolved for X days
   */
  async executeAutoCloseRules(organizationId: string): Promise<{ ticketsClosed: number; errors: string[] }> {
    const errors: string[] = []
    let ticketsClosed = 0

    // Get auto-close rules
    const autoCloseRules = await this.db
      .select()
      .from(automationRules)
      .where(and(
        eq(automationRules.organizationId, organizationId),
        eq(automationRules.ruleType, 'auto_close'),
        eq(automationRules.isActive, true)
      ))

    for (const rule of autoCloseRules) {
      try {
        const conditions = JSON.parse(rule.conditions) as AutomationCondition[]
        const actions = JSON.parse(rule.actions) as AutomationAction[]

        // Find time_elapsed condition to get the number of days
        const timeCondition = conditions.find(c => c.type === 'time_elapsed')
        if (!timeCondition) continue

        const daysToWait = Number(timeCondition.value)
        const cutoffDate = new Date()
        cutoffDate.setDate(cutoffDate.getDate() - daysToWait)

        // Find tickets that are resolved and older than the cutoff
        const eligibleTickets = await this.db
          .select({
            ticket: tickets,
            client: clients,
          })
          .from(tickets)
          .leftJoin(clients, eq(tickets.clientId, clients.id))
          .where(and(
            eq(tickets.organizationId, organizationId),
            eq(tickets.status, 'resolved'),
            isNull(tickets.closedAt),
            sql`${tickets.resolvedAt} <= ${cutoffDate}`
          ))

        for (const ticketData of eligibleTickets) {
          // Execute the close action
          await this.executeRuleActions(rule, ticketData, organizationId)
          ticketsClosed++

          // Log the execution
          await this.logRuleExecution(rule.id, ticketData.ticket.id, organizationId, 'success', {
            trigger: 'scheduled',
            daysResolved: Math.floor((new Date().getTime() - ticketData.ticket.resolvedAt!.getTime()) / (1000 * 60 * 60 * 24)),
          })
        }

        // Update rule statistics
        if (eligibleTickets.length > 0) {
          await this.db
            .update(automationRules)
            .set({
              lastTriggered: new Date(),
              triggerCount: sql`${automationRules.triggerCount} + ${eligibleTickets.length}`,
              updatedAt: new Date(),
            })
            .where(eq(automationRules.id, rule.id))
        }
      } catch (error) {
        const errorMsg = `Auto-close rule ${rule.name}: ${error instanceof Error ? error.message : 'Unknown error'}`
        errors.push(errorMsg)
        await this.logRuleExecution(rule.id, null, organizationId, 'failed', null, errorMsg)
      }
    }

    return { ticketsClosed, errors }
  }

  /**
   * Evaluate if rule conditions are met for a ticket
   */
  private async evaluateRuleConditions(
    rule: AutomationRule,
    ticketData: { ticket: Ticket; client: Client | null; assignee: User | null },
    trigger: string
  ): Promise<boolean> {
    const conditions = JSON.parse(rule.conditions) as AutomationCondition[]

    // Skip time-based conditions for non-scheduled triggers
    if (trigger !== 'scheduled') {
      const hasTimeCondition = conditions.some(c => c.type === 'time_elapsed')
      if (hasTimeCondition && rule.ruleType === 'auto_close') {
        return false // Time-based rules only run on scheduled triggers
      }
    }

    for (const condition of conditions) {
      if (!this.evaluateCondition(condition, ticketData)) {
        return false
      }
    }

    return true
  }

  private evaluateCondition(
    condition: AutomationCondition,
    ticketData: { ticket: Ticket; client: Client | null; assignee: User | null }
  ): boolean {
    const { ticket, client } = ticketData

    switch (condition.type) {
      case 'client_match':
        return this.compareValue(client?.name || '', condition.operator, condition.value.toString())
        
      case 'priority_match':
        return this.compareValue(ticket.priority, condition.operator, condition.value.toString())
        
      case 'status_match':
        return this.compareValue(ticket.status, condition.operator, condition.value.toString())
        
      case 'subject_contains':
        return this.compareValue(ticket.title, condition.operator, condition.value.toString())
        
      case 'time_elapsed':
        if (!ticket.resolvedAt) return false
        const daysSinceResolved = Math.floor(
          (new Date().getTime() - ticket.resolvedAt.getTime()) / (1000 * 60 * 60 * 24)
        )
        return this.compareValue(daysSinceResolved, condition.operator, Number(condition.value))
        
      default:
        return false
    }
  }

  private compareValue(actual: string | number, operator: string, expected: string | number): boolean {
    switch (operator) {
      case 'equals':
        return actual === expected
      case 'not_equals':
        return actual !== expected
      case 'contains':
        return actual.toString().toLowerCase().includes(expected.toString().toLowerCase())
      case 'not_contains':
        return !actual.toString().toLowerCase().includes(expected.toString().toLowerCase())
      case 'greater_than':
        return Number(actual) > Number(expected)
      case 'less_than':
        return Number(actual) < Number(expected)
      default:
        return false
    }
  }

  /**
   * Execute the actions defined in a rule
   */
  private async executeRuleActions(
    rule: AutomationRule,
    ticketData: { ticket: Ticket; client: Client | null; assignee: User | null },
    organizationId: string
  ): Promise<void> {
    const actions = JSON.parse(rule.actions) as AutomationAction[]

    for (const action of actions) {
      switch (action.type) {
        case 'assign_user':
          await this.db
            .update(tickets)
            .set({
              assigneeId: action.value,
              updatedAt: new Date(),
            })
            .where(eq(tickets.id, ticketData.ticket.id))
          break

        case 'change_status':
          const updateData: any = {
            status: action.value,
            updatedAt: new Date(),
          }

          // Set resolved/closed timestamps
          if (action.value === 'resolved' && ticketData.ticket.status !== 'resolved') {
            updateData.resolvedAt = new Date()
          } else if (action.value === 'closed' && ticketData.ticket.status !== 'closed') {
            updateData.closedAt = new Date()
          }

          await this.db
            .update(tickets)
            .set(updateData)
            .where(eq(tickets.id, ticketData.ticket.id))
          break

        case 'change_priority':
          await this.db
            .update(tickets)
            .set({
              priority: action.value as any,
              updatedAt: new Date(),
            })
            .where(eq(tickets.id, ticketData.ticket.id))
          break

        // Additional actions can be implemented here
      }
    }
  }

  /**
   * Log the execution of an automation rule
   */
  private async logRuleExecution(
    ruleId: string,
    ticketId: string | null,
    organizationId: string,
    status: 'success' | 'failed' | 'skipped',
    executionData?: any,
    errorMessage?: string
  ): Promise<void> {
    await this.db
      .insert(automationRuleExecutions)
      .values({
        organizationId,
        ruleId,
        ticketId,
        status,
        executionData: executionData ? JSON.stringify(executionData) : null,
        errorMessage,
      })
      .catch(() => {}) // Ignore logging errors
  }
}