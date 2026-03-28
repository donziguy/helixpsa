import { pgTable, uuid, varchar, text, timestamp, integer, boolean, decimal, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const priorityEnum = pgEnum('priority', ['critical', 'high', 'medium', 'low']);
export const statusEnum = pgEnum('status', ['open', 'in_progress', 'waiting', 'resolved', 'closed']);
export const slaHealthEnum = pgEnum('sla_health', ['good', 'warning', 'breach']);
export const slaTierEnum = pgEnum('sla_tier', ['Enterprise', 'Premium', 'Standard']);
export const slaAlertTypeEnum = pgEnum('sla_alert_type', ['breach', 'warning', 'escalation']);
export const slaAlertStatusEnum = pgEnum('sla_alert_status', ['active', 'acknowledged', 'resolved']);
export const assetTypeEnum = pgEnum('asset_type', ['hardware', 'software', 'network', 'mobile', 'peripherals', 'server', 'other']);
export const assetStatusEnum = pgEnum('asset_status', ['active', 'inactive', 'maintenance', 'retired', 'lost_stolen']);
export const articleStatusEnum = pgEnum('article_status', ['draft', 'published', 'archived']);
export const articleTypeEnum = pgEnum('article_type', ['how_to', 'troubleshooting', 'faq', 'procedure', 'policy', 'reference']);
export const notificationTypeEnum = pgEnum('notification_type', ['sla_breach', 'sla_warning', 'warranty_expiring', 'maintenance_due', 'ticket_assigned', 'ticket_overdue', 'system_alert']);
export const notificationStatusEnum = pgEnum('notification_status', ['pending', 'sent', 'failed', 'bounced']);
export const notificationChannelEnum = pgEnum('notification_channel', ['email', 'sms', 'webhook', 'internal', 'slack']);
export const automationRuleTypeEnum = pgEnum('automation_rule_type', ['auto_assign', 'auto_close', 'auto_escalate', 'auto_notify']);
export const automationConditionTypeEnum = pgEnum('automation_condition_type', ['client_match', 'priority_match', 'status_match', 'time_elapsed', 'subject_contains', 'category_match']);

// Organizations table (multi-tenancy)
export const organizations = pgTable('organizations', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  domain: varchar('domain', { length: 255 }).unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Users table
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  role: varchar('role', { length: 50 }).notNull().default('technician'), // admin, manager, technician
  isActive: boolean('is_active').notNull().default(true),
  emailVerified: timestamp('email_verified'),
  hourlyRate: decimal('hourly_rate', { precision: 10, scale: 2 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Auth.js required tables
export const accounts = pgTable('accounts', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: varchar('type', { length: 255 }).notNull(),
  provider: varchar('provider', { length: 255 }).notNull(),
  providerAccountId: varchar('provider_account_id', { length: 255 }).notNull(),
  refresh_token: text('refresh_token'),
  access_token: text('access_token'),
  expires_at: integer('expires_at'),
  token_type: varchar('token_type', { length: 255 }),
  scope: varchar('scope', { length: 255 }),
  id_token: text('id_token'),
  session_state: varchar('session_state', { length: 255 }),
});

export const sessions = pgTable('sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  sessionToken: varchar('session_token', { length: 255 }).notNull().unique(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires').notNull(),
});

export const verificationTokens = pgTable('verification_tokens', {
  identifier: varchar('identifier', { length: 255 }).notNull(),
  token: varchar('token', { length: 255 }).notNull().unique(),
  expires: timestamp('expires').notNull(),
});

// Clients table
export const clients = pgTable('clients', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  industry: varchar('industry', { length: 100 }),
  slaTier: slaTierEnum('sla_tier').notNull().default('Standard'),
  responseTime: varchar('response_time', { length: 50 }).notNull().default('4 hours'),
  slaHealth: slaHealthEnum('sla_health').notNull().default('good'),
  onboardDate: timestamp('onboard_date').notNull().defaultNow(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Contacts table (for clients)
export const contacts = pgTable('contacts', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  clientId: uuid('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 50 }),
  isPrimary: boolean('is_primary').notNull().default(false),
  title: varchar('title', { length: 100 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Tickets table
export const tickets = pgTable('tickets', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  number: varchar('number', { length: 50 }).notNull(),
  title: varchar('title', { length: 500 }).notNull(),
  description: text('description'),
  clientId: uuid('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  assigneeId: uuid('assignee_id').references(() => users.id, { onDelete: 'set null' }),
  priority: priorityEnum('priority').notNull().default('medium'),
  status: statusEnum('status').notNull().default('open'),
  slaDeadline: timestamp('sla_deadline'),
  estimatedHours: decimal('estimated_hours', { precision: 8, scale: 2 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  resolvedAt: timestamp('resolved_at'),
  closedAt: timestamp('closed_at'),
});

// Time entries table
export const timeEntries = pgTable('time_entries', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  ticketId: uuid('ticket_id').notNull().references(() => tickets.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  description: text('description').notNull(),
  startTime: timestamp('start_time').notNull(),
  endTime: timestamp('end_time'),
  duration: integer('duration'), // minutes
  billable: boolean('billable').notNull().default(true),
  hourlyRate: decimal('hourly_rate', { precision: 10, scale: 2 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Notes table (for tickets, clients, etc.)
export const notes = pgTable('notes', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  ticketId: uuid('ticket_id').references(() => tickets.id, { onDelete: 'cascade' }),
  clientId: uuid('client_id').references(() => clients.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  isInternal: boolean('is_internal').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Invoices table
export const invoices = pgTable('invoices', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  clientId: uuid('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  invoiceNumber: varchar('invoice_number', { length: 50 }).notNull().unique(),
  status: varchar('status', { length: 20 }).notNull().default('draft'), // draft, sent, paid, overdue, void
  dateIssued: timestamp('date_issued').notNull().defaultNow(),
  dateDue: timestamp('date_due').notNull(),
  datePaid: timestamp('date_paid'),
  subtotal: decimal('subtotal', { precision: 10, scale: 2 }).notNull(),
  tax: decimal('tax', { precision: 10, scale: 2 }).notNull().default('0'),
  total: decimal('total', { precision: 10, scale: 2 }).notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Invoice line items table
export const invoiceLineItems = pgTable('invoice_line_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  invoiceId: uuid('invoice_id').notNull().references(() => invoices.id, { onDelete: 'cascade' }),
  timeEntryId: uuid('time_entry_id').references(() => timeEntries.id, { onDelete: 'set null' }),
  description: text('description').notNull(),
  quantity: decimal('quantity', { precision: 8, scale: 2 }).notNull(),
  rate: decimal('rate', { precision: 10, scale: 2 }).notNull(),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// SLA Policies table
export const slaPolicies = pgTable('sla_policies', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  slaTier: slaTierEnum('sla_tier').notNull(),
  priority: priorityEnum('priority').notNull(),
  responseTimeMinutes: integer('response_time_minutes').notNull(), // Response time in minutes
  resolutionTimeMinutes: integer('resolution_time_minutes').notNull(), // Resolution time in minutes
  warningThresholdPercent: integer('warning_threshold_percent').notNull().default(80), // % of time elapsed before warning
  escalationTimeMinutes: integer('escalation_time_minutes'), // Auto-escalation time (optional)
  businessHoursOnly: boolean('business_hours_only').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// SLA Alerts table
export const slaAlerts = pgTable('sla_alerts', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  ticketId: uuid('ticket_id').notNull().references(() => tickets.id, { onDelete: 'cascade' }),
  policyId: uuid('policy_id').notNull().references(() => slaPolicies.id, { onDelete: 'cascade' }),
  alertType: slaAlertTypeEnum('alert_type').notNull(),
  status: slaAlertStatusEnum('status').notNull().default('active'),
  message: text('message').notNull(),
  deadlineAt: timestamp('deadline_at').notNull(),
  acknowledgedBy: uuid('acknowledged_by').references(() => users.id, { onDelete: 'set null' }),
  acknowledgedAt: timestamp('acknowledged_at'),
  resolvedAt: timestamp('resolved_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Assets table
export const assets = pgTable('assets', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  clientId: uuid('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  type: assetTypeEnum('type').notNull(),
  status: assetStatusEnum('status').notNull().default('active'),
  serialNumber: varchar('serial_number', { length: 255 }),
  model: varchar('model', { length: 255 }),
  manufacturer: varchar('manufacturer', { length: 255 }),
  location: varchar('location', { length: 255 }),
  assignedTo: varchar('assigned_to', { length: 255 }),
  purchaseDate: timestamp('purchase_date'),
  warrantyExpiry: timestamp('warranty_expiry'),
  purchasePrice: decimal('purchase_price', { precision: 10, scale: 2 }),
  notes: text('notes'),
  lastMaintenanceDate: timestamp('last_maintenance_date'),
  nextMaintenanceDate: timestamp('next_maintenance_date'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Knowledge Base Articles table
export const knowledgeArticles = pgTable('knowledge_articles', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 500 }).notNull(),
  content: text('content').notNull(),
  summary: text('summary'),
  type: articleTypeEnum('type').notNull().default('reference'),
  status: articleStatusEnum('status').notNull().default('draft'),
  tags: varchar('tags', { length: 1000 }), // JSON array of strings
  authorId: uuid('author_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  viewCount: integer('view_count').notNull().default(0),
  lastViewedAt: timestamp('last_viewed_at'),
  searchVector: text('search_vector'), // For full-text search
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  publishedAt: timestamp('published_at'),
});

// Knowledge Base Article Links to Tickets
export const articleTicketLinks = pgTable('article_ticket_links', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  articleId: uuid('article_id').notNull().references(() => knowledgeArticles.id, { onDelete: 'cascade' }),
  ticketId: uuid('ticket_id').notNull().references(() => tickets.id, { onDelete: 'cascade' }),
  createdBy: uuid('created_by').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Email configurations table
export const emailConfigurations = pgTable('email_configurations', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  imapHost: varchar('imap_host', { length: 255 }).notNull(),
  imapPort: integer('imap_port').notNull().default(993),
  imapSecure: boolean('imap_secure').notNull().default(true),
  email: varchar('email', { length: 255 }).notNull(),
  password: varchar('password', { length: 500 }).notNull(), // Encrypted
  defaultClientId: uuid('default_client_id').references(() => clients.id, { onDelete: 'set null' }),
  defaultAssigneeId: uuid('default_assignee_id').references(() => users.id, { onDelete: 'set null' }),
  defaultPriority: priorityEnum('default_priority').notNull().default('medium'),
  folderName: varchar('folder_name', { length: 255 }).notNull().default('INBOX'),
  lastProcessedUid: integer('last_processed_uid').default(0),
  isActive: boolean('is_active').notNull().default(true),
  autoAssignBySubject: boolean('auto_assign_by_subject').notNull().default(false),
  subjectClientMappings: text('subject_client_mappings'), // JSON object for client mappings
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Email processing log table
export const emailProcessingLogs = pgTable('email_processing_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  configurationId: uuid('configuration_id').notNull().references(() => emailConfigurations.id, { onDelete: 'cascade' }),
  ticketId: uuid('ticket_id').references(() => tickets.id, { onDelete: 'set null' }),
  emailUid: integer('email_uid').notNull(),
  fromEmail: varchar('from_email', { length: 255 }).notNull(),
  subject: varchar('subject', { length: 500 }).notNull(),
  messageId: varchar('message_id', { length: 255 }).unique(),
  status: varchar('status', { length: 50 }).notNull(), // 'processed', 'failed', 'duplicate', 'filtered'
  errorMessage: text('error_message'),
  processedAt: timestamp('processed_at').notNull().defaultNow(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Notification preferences table
export const notificationPreferences = pgTable('notification_preferences', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  notificationType: notificationTypeEnum('notification_type').notNull(),
  channel: notificationChannelEnum('channel').notNull(),
  isEnabled: boolean('is_enabled').notNull().default(true),
  settings: text('settings'), // JSON object for channel-specific settings (email templates, phone numbers, etc.)
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Email notifications table
export const emailNotifications = pgTable('email_notifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  recipientId: uuid('recipient_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  recipientEmail: varchar('recipient_email', { length: 255 }).notNull(),
  notificationType: notificationTypeEnum('notification_type').notNull(),
  subject: varchar('subject', { length: 500 }).notNull(),
  htmlBody: text('html_body').notNull(),
  textBody: text('text_body'),
  status: notificationStatusEnum('status').notNull().default('pending'),
  errorMessage: text('error_message'),
  sentAt: timestamp('sent_at'),
  relatedTicketId: uuid('related_ticket_id').references(() => tickets.id, { onDelete: 'set null' }),
  relatedAssetId: uuid('related_asset_id').references(() => assets.id, { onDelete: 'set null' }),
  relatedSlaAlertId: uuid('related_sla_alert_id').references(() => slaAlerts.id, { onDelete: 'set null' }),
  metadata: text('metadata'), // JSON object for additional notification-specific data
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Slack workspace integrations table
export const slackIntegrations = pgTable('slack_integrations', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  teamId: varchar('team_id', { length: 255 }).notNull(), // Slack workspace ID
  teamName: varchar('team_name', { length: 255 }).notNull(),
  botUserId: varchar('bot_user_id', { length: 255 }).notNull(),
  botAccessToken: text('bot_access_token').notNull(), // Encrypted
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// QuickBooks integrations table
export const quickbooksIntegrations = pgTable('quickbooks_integrations', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  companyId: varchar('company_id', { length: 255 }).notNull(), // QuickBooks company ID
  accessToken: text('access_token').notNull(), // Encrypted OAuth token
  refreshToken: text('refresh_token').notNull(), // Encrypted refresh token
  clientId: varchar('client_id', { length: 255 }).notNull(),
  clientSecret: text('client_secret').notNull(), // Encrypted
  tokenExpiresAt: timestamp('token_expires_at').notNull(),
  sandbox: boolean('sandbox').notNull().default(true), // True for sandbox, false for production
  isActive: boolean('is_active').notNull().default(true),
  lastSyncAt: timestamp('last_sync_at'),
  syncErrors: text('sync_errors'), // JSON array of recent errors
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Slack notifications table
export const slackNotifications = pgTable('slack_notifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  recipientId: uuid('recipient_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  slackChannelId: varchar('slack_channel_id', { length: 255 }).notNull(), // Slack channel or DM ID
  slackChannelName: varchar('slack_channel_name', { length: 255 }),
  notificationType: notificationTypeEnum('notification_type').notNull(),
  message: text('message').notNull(),
  blocks: text('blocks'), // JSON for Slack blocks format
  status: notificationStatusEnum('status').notNull().default('pending'),
  errorMessage: text('error_message'),
  sentAt: timestamp('sent_at'),
  slackTimestamp: varchar('slack_timestamp', { length: 100 }), // Slack message timestamp for updates/threading
  relatedTicketId: uuid('related_ticket_id').references(() => tickets.id, { onDelete: 'set null' }),
  relatedAssetId: uuid('related_asset_id').references(() => assets.id, { onDelete: 'set null' }),
  relatedSlaAlertId: uuid('related_sla_alert_id').references(() => slaAlerts.id, { onDelete: 'set null' }),
  metadata: text('metadata'), // JSON object for additional notification-specific data
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Automation rules table
export const automationRules = pgTable('automation_rules', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  ruleType: automationRuleTypeEnum('rule_type').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  priority: integer('priority').notNull().default(1), // Higher number = higher priority
  conditions: text('conditions').notNull(), // JSON array of condition objects
  actions: text('actions').notNull(), // JSON array of action objects
  createdBy: uuid('created_by').notNull().references(() => users.id, { onDelete: 'cascade' }),
  lastTriggered: timestamp('last_triggered'),
  triggerCount: integer('trigger_count').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Automation rule execution logs table
export const automationRuleExecutions = pgTable('automation_rule_executions', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  ruleId: uuid('rule_id').notNull().references(() => automationRules.id, { onDelete: 'cascade' }),
  ticketId: uuid('ticket_id').references(() => tickets.id, { onDelete: 'set null' }),
  status: varchar('status', { length: 50 }).notNull(), // 'success', 'failed', 'skipped'
  executionData: text('execution_data'), // JSON object with execution details
  errorMessage: text('error_message'),
  executedAt: timestamp('executed_at').defaultNow().notNull(),
});

// Relations
export const organizationsRelations = relations(organizations, ({ many }) => ({
  users: many(users),
  clients: many(clients),
  tickets: many(tickets),
  timeEntries: many(timeEntries),
  notes: many(notes),
  contacts: many(contacts),
  invoices: many(invoices),
  invoiceLineItems: many(invoiceLineItems),
  slaPolicies: many(slaPolicies),
  slaAlerts: many(slaAlerts),
  assets: many(assets),
  knowledgeArticles: many(knowledgeArticles),
  articleTicketLinks: many(articleTicketLinks),
  emailConfigurations: many(emailConfigurations),
  emailProcessingLogs: many(emailProcessingLogs),
  notificationPreferences: many(notificationPreferences),
  emailNotifications: many(emailNotifications),
  slackIntegrations: many(slackIntegrations),
  slackNotifications: many(slackNotifications),
  automationRules: many(automationRules),
  automationRuleExecutions: many(automationRuleExecutions),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [users.organizationId],
    references: [organizations.id],
  }),
  assignedTickets: many(tickets),
  timeEntries: many(timeEntries),
  notes: many(notes),
  accounts: many(accounts),
  sessions: many(sessions),
  knowledgeArticles: many(knowledgeArticles),
  articleTicketLinksCreated: many(articleTicketLinks),
  notificationPreferences: many(notificationPreferences),
  emailNotifications: many(emailNotifications),
  automationRulesCreated: many(automationRules),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const clientsRelations = relations(clients, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [clients.organizationId],
    references: [organizations.id],
  }),
  tickets: many(tickets),
  contacts: many(contacts),
  notes: many(notes),
  invoices: many(invoices),
  assets: many(assets),
}));

export const contactsRelations = relations(contacts, ({ one }) => ({
  organization: one(organizations, {
    fields: [contacts.organizationId],
    references: [organizations.id],
  }),
  client: one(clients, {
    fields: [contacts.clientId],
    references: [clients.id],
  }),
}));

export const ticketsRelations = relations(tickets, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [tickets.organizationId],
    references: [organizations.id],
  }),
  client: one(clients, {
    fields: [tickets.clientId],
    references: [clients.id],
  }),
  assignee: one(users, {
    fields: [tickets.assigneeId],
    references: [users.id],
  }),
  timeEntries: many(timeEntries),
  notes: many(notes),
  articleLinks: many(articleTicketLinks),
}));

export const timeEntriesRelations = relations(timeEntries, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [timeEntries.organizationId],
    references: [organizations.id],
  }),
  ticket: one(tickets, {
    fields: [timeEntries.ticketId],
    references: [tickets.id],
  }),
  user: one(users, {
    fields: [timeEntries.userId],
    references: [users.id],
  }),
  invoiceLineItems: many(invoiceLineItems),
}));

export const notesRelations = relations(notes, ({ one }) => ({
  organization: one(organizations, {
    fields: [notes.organizationId],
    references: [organizations.id],
  }),
  ticket: one(tickets, {
    fields: [notes.ticketId],
    references: [tickets.id],
  }),
  client: one(clients, {
    fields: [notes.clientId],
    references: [clients.id],
  }),
  user: one(users, {
    fields: [notes.userId],
    references: [users.id],
  }),
}));

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [invoices.organizationId],
    references: [organizations.id],
  }),
  client: one(clients, {
    fields: [invoices.clientId],
    references: [clients.id],
  }),
  lineItems: many(invoiceLineItems),
}));

export const invoiceLineItemsRelations = relations(invoiceLineItems, ({ one }) => ({
  organization: one(organizations, {
    fields: [invoiceLineItems.organizationId],
    references: [organizations.id],
  }),
  invoice: one(invoices, {
    fields: [invoiceLineItems.invoiceId],
    references: [invoices.id],
  }),
  timeEntry: one(timeEntries, {
    fields: [invoiceLineItems.timeEntryId],
    references: [timeEntries.id],
  }),
}));

export const slaPoliciesRelations = relations(slaPolicies, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [slaPolicies.organizationId],
    references: [organizations.id],
  }),
  alerts: many(slaAlerts),
}));

export const slaAlertsRelations = relations(slaAlerts, ({ one }) => ({
  organization: one(organizations, {
    fields: [slaAlerts.organizationId],
    references: [organizations.id],
  }),
  ticket: one(tickets, {
    fields: [slaAlerts.ticketId],
    references: [tickets.id],
  }),
  policy: one(slaPolicies, {
    fields: [slaAlerts.policyId],
    references: [slaPolicies.id],
  }),
  acknowledgedByUser: one(users, {
    fields: [slaAlerts.acknowledgedBy],
    references: [users.id],
  }),
}));

export const assetsRelations = relations(assets, ({ one }) => ({
  organization: one(organizations, {
    fields: [assets.organizationId],
    references: [organizations.id],
  }),
  client: one(clients, {
    fields: [assets.clientId],
    references: [clients.id],
  }),
}));

export const knowledgeArticlesRelations = relations(knowledgeArticles, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [knowledgeArticles.organizationId],
    references: [organizations.id],
  }),
  author: one(users, {
    fields: [knowledgeArticles.authorId],
    references: [users.id],
  }),
  ticketLinks: many(articleTicketLinks),
}));

export const articleTicketLinksRelations = relations(articleTicketLinks, ({ one }) => ({
  organization: one(organizations, {
    fields: [articleTicketLinks.organizationId],
    references: [organizations.id],
  }),
  article: one(knowledgeArticles, {
    fields: [articleTicketLinks.articleId],
    references: [knowledgeArticles.id],
  }),
  ticket: one(tickets, {
    fields: [articleTicketLinks.ticketId],
    references: [tickets.id],
  }),
  createdBy: one(users, {
    fields: [articleTicketLinks.createdBy],
    references: [users.id],
  }),
}));

export const emailConfigurationsRelations = relations(emailConfigurations, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [emailConfigurations.organizationId],
    references: [organizations.id],
  }),
  defaultClient: one(clients, {
    fields: [emailConfigurations.defaultClientId],
    references: [clients.id],
  }),
  defaultAssignee: one(users, {
    fields: [emailConfigurations.defaultAssigneeId],
    references: [users.id],
  }),
  processingLogs: many(emailProcessingLogs),
}));

export const emailProcessingLogsRelations = relations(emailProcessingLogs, ({ one }) => ({
  organization: one(organizations, {
    fields: [emailProcessingLogs.organizationId],
    references: [organizations.id],
  }),
  configuration: one(emailConfigurations, {
    fields: [emailProcessingLogs.configurationId],
    references: [emailConfigurations.id],
  }),
  ticket: one(tickets, {
    fields: [emailProcessingLogs.ticketId],
    references: [tickets.id],
  }),
}));

export const notificationPreferencesRelations = relations(notificationPreferences, ({ one }) => ({
  organization: one(organizations, {
    fields: [notificationPreferences.organizationId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [notificationPreferences.userId],
    references: [users.id],
  }),
}));

export const emailNotificationsRelations = relations(emailNotifications, ({ one }) => ({
  organization: one(organizations, {
    fields: [emailNotifications.organizationId],
    references: [organizations.id],
  }),
  recipient: one(users, {
    fields: [emailNotifications.recipientId],
    references: [users.id],
  }),
  relatedTicket: one(tickets, {
    fields: [emailNotifications.relatedTicketId],
    references: [tickets.id],
  }),
  relatedAsset: one(assets, {
    fields: [emailNotifications.relatedAssetId],
    references: [assets.id],
  }),
  relatedSlaAlert: one(slaAlerts, {
    fields: [emailNotifications.relatedSlaAlertId],
    references: [slaAlerts.id],
  }),
}));

export const slackIntegrationsRelations = relations(slackIntegrations, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [slackIntegrations.organizationId],
    references: [organizations.id],
  }),
  slackNotifications: many(slackNotifications),
}));

export const quickbooksIntegrationsRelations = relations(quickbooksIntegrations, ({ one }) => ({
  organization: one(organizations, {
    fields: [quickbooksIntegrations.organizationId],
    references: [organizations.id],
  }),
}));

export const slackNotificationsRelations = relations(slackNotifications, ({ one }) => ({
  organization: one(organizations, {
    fields: [slackNotifications.organizationId],
    references: [organizations.id],
  }),
  recipient: one(users, {
    fields: [slackNotifications.recipientId],
    references: [users.id],
  }),
  relatedTicket: one(tickets, {
    fields: [slackNotifications.relatedTicketId],
    references: [tickets.id],
  }),
  relatedAsset: one(assets, {
    fields: [slackNotifications.relatedAssetId],
    references: [assets.id],
  }),
  relatedSlaAlert: one(slaAlerts, {
    fields: [slackNotifications.relatedSlaAlertId],
    references: [slaAlerts.id],
  }),
}));

export const automationRulesRelations = relations(automationRules, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [automationRules.organizationId],
    references: [organizations.id],
  }),
  createdBy: one(users, {
    fields: [automationRules.createdBy],
    references: [users.id],
  }),
  executions: many(automationRuleExecutions),
}));

export const automationRuleExecutionsRelations = relations(automationRuleExecutions, ({ one }) => ({
  organization: one(organizations, {
    fields: [automationRuleExecutions.organizationId],
    references: [organizations.id],
  }),
  rule: one(automationRules, {
    fields: [automationRuleExecutions.ruleId],
    references: [automationRules.id],
  }),
  ticket: one(tickets, {
    fields: [automationRuleExecutions.ticketId],
    references: [tickets.id],
  }),
}));

// Type exports for use in the application
export type Organization = typeof organizations.$inferSelect;
export type NewOrganization = typeof organizations.$inferInsert;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Client = typeof clients.$inferSelect;
export type NewClient = typeof clients.$inferInsert;
export type Contact = typeof contacts.$inferSelect;
export type NewContact = typeof contacts.$inferInsert;
export type Ticket = typeof tickets.$inferSelect;
export type NewTicket = typeof tickets.$inferInsert;
export type TimeEntry = typeof timeEntries.$inferSelect;
export type NewTimeEntry = typeof timeEntries.$inferInsert;
export type Note = typeof notes.$inferSelect;
export type NewNote = typeof notes.$inferInsert;
export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type VerificationToken = typeof verificationTokens.$inferSelect;
export type NewVerificationToken = typeof verificationTokens.$inferInsert;
export type Invoice = typeof invoices.$inferSelect;
export type NewInvoice = typeof invoices.$inferInsert;
export type InvoiceLineItem = typeof invoiceLineItems.$inferSelect;
export type NewInvoiceLineItem = typeof invoiceLineItems.$inferInsert;
export type SlaPolicy = typeof slaPolicies.$inferSelect;
export type NewSlaPolicy = typeof slaPolicies.$inferInsert;
export type SlaAlert = typeof slaAlerts.$inferSelect;
export type NewSlaAlert = typeof slaAlerts.$inferInsert;
export type Asset = typeof assets.$inferSelect;
export type NewAsset = typeof assets.$inferInsert;
export type KnowledgeArticle = typeof knowledgeArticles.$inferSelect;
export type NewKnowledgeArticle = typeof knowledgeArticles.$inferInsert;
export type ArticleTicketLink = typeof articleTicketLinks.$inferSelect;
export type NewArticleTicketLink = typeof articleTicketLinks.$inferInsert;
export type EmailConfiguration = typeof emailConfigurations.$inferSelect;
export type NewEmailConfiguration = typeof emailConfigurations.$inferInsert;
export type EmailProcessingLog = typeof emailProcessingLogs.$inferSelect;
export type NewEmailProcessingLog = typeof emailProcessingLogs.$inferInsert;
export type NotificationPreference = typeof notificationPreferences.$inferSelect;
export type NewNotificationPreference = typeof notificationPreferences.$inferInsert;
export type EmailNotification = typeof emailNotifications.$inferSelect;
export type NewEmailNotification = typeof emailNotifications.$inferInsert;
export type SlackIntegration = typeof slackIntegrations.$inferSelect;
export type NewSlackIntegration = typeof slackIntegrations.$inferInsert;
export type SlackNotification = typeof slackNotifications.$inferSelect;
export type NewSlackNotification = typeof slackNotifications.$inferInsert;
export type QuickBooksIntegration = typeof quickbooksIntegrations.$inferSelect;
export type NewQuickBooksIntegration = typeof quickbooksIntegrations.$inferInsert;
export type AutomationRule = typeof automationRules.$inferSelect;
export type NewAutomationRule = typeof automationRules.$inferInsert;
export type AutomationRuleExecution = typeof automationRuleExecutions.$inferSelect;
export type NewAutomationRuleExecution = typeof automationRuleExecutions.$inferInsert;