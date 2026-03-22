import Imap from 'imap';
import { simpleParser } from 'mailparser';
import { db } from '../db';
import { emailConfigurations, emailProcessingLogs, tickets, clients } from '../db/schema';
import { eq, and, sql } from 'drizzle-orm';
import * as crypto from 'crypto';

const algorithm = 'aes-256-cbc';
const secretKey = crypto.createHash('sha256').update(process.env.EMAIL_ENCRYPTION_KEY || 'default-secret-key-change-in-prod').digest();

function decrypt(encryptedText: string): string {
  const textParts = encryptedText.split(':');
  const iv = Buffer.from(textParts.shift()!, 'hex');
  const encrypted = textParts.join(':');
  const decipher = crypto.createDecipheriv(algorithm, secretKey, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

interface EmailMessage {
  uid: number;
  subject: string;
  from: string;
  text: string;
  html?: string;
  messageId: string;
  date: Date;
}

export class EmailProcessor {
  private imap: Imap | null = null;

  async processAllConfigurations(): Promise<void> {
    console.log('Starting email processing for all active configurations...');
    
    const activeConfigurations = await db
      .select()
      .from(emailConfigurations)
      .where(eq(emailConfigurations.isActive, true));

    for (const config of activeConfigurations) {
      try {
        console.log(`Processing emails for configuration: ${config.name} (${config.email})`);
        await this.processConfiguration(config);
      } catch (error) {
        console.error(`Error processing configuration ${config.name}:`, error);
        await this.logProcessingError(config.id, config.organizationId, {
          error: error instanceof Error ? error.message : 'Unknown error',
          configurationName: config.name,
        });
      }
    }
  }

  async processConfiguration(config: any): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const decryptedPassword = decrypt(config.password);
        
        this.imap = new Imap({
          user: config.email,
          password: decryptedPassword,
          host: config.imapHost,
          port: config.imapPort,
          tls: config.imapSecure,
          tlsOptions: {
            rejectUnauthorized: false
          }
        });

        this.imap.once('ready', async () => {
          try {
            await this.openMailbox(config.folderName);
            const emails = await this.fetchNewEmails(config.lastProcessedUid || 0);
            
            for (const email of emails) {
              try {
                await this.processEmail(email, config);
              } catch (emailError) {
                console.error(`Error processing email ${email.uid}:`, emailError);
                await this.logEmailError(config.id, config.organizationId, email, emailError);
              }
            }

            // Update last processed UID
            if (emails.length > 0) {
              const maxUid = Math.max(...emails.map(e => e.uid));
              await db
                .update(emailConfigurations)
                .set({ lastProcessedUid: maxUid, updatedAt: new Date() })
                .where(eq(emailConfigurations.id, config.id));
            }

            this.imap!.end();
            resolve();
          } catch (error) {
            this.imap!.end();
            reject(error);
          }
        });

        this.imap.once('error', (err: Error) => {
          console.error('IMAP error:', err);
          reject(err);
        });

        this.imap.connect();
      } catch (error) {
        reject(error);
      }
    });
  }

  private openMailbox(folderName: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.imap!.openBox(folderName, false, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  private fetchNewEmails(lastProcessedUid: number): Promise<EmailMessage[]> {
    return new Promise((resolve, reject) => {
      const searchCriteria = lastProcessedUid > 0 
        ? [`UID`, `${lastProcessedUid + 1}:*`]
        : ['ALL'];

      this.imap!.search(searchCriteria, (err, results) => {
        if (err) {
          reject(err);
          return;
        }

        if (!results || results.length === 0) {
          resolve([]);
          return;
        }

        const emails: EmailMessage[] = [];
        const fetch = this.imap!.fetch(results, { 
          bodies: '',
          struct: true,
          envelope: true 
        });

        fetch.on('message', (msg, seqno) => {
          let uid: number;
          let rawEmail = '';

          msg.on('body', (stream) => {
            stream.on('data', (chunk) => {
              rawEmail += chunk.toString('utf8');
            });
          });

          msg.once('attributes', (attrs) => {
            uid = attrs.uid;
          });

          msg.once('end', async () => {
            try {
              const parsed = await simpleParser(rawEmail);
              emails.push({
                uid,
                subject: parsed.subject || 'No Subject',
                from: parsed.from?.text || 'Unknown Sender',
                text: parsed.text || '',
                html: parsed.html || undefined,
                messageId: parsed.messageId || `generated-${uid}-${Date.now()}`,
                date: parsed.date || new Date(),
              });
            } catch (parseError) {
              console.error(`Error parsing email ${uid}:`, parseError);
            }
          });
        });

        fetch.once('error', (err) => {
          reject(err);
        });

        fetch.once('end', () => {
          resolve(emails);
        });
      });
    });
  }

  private async processEmail(email: EmailMessage, config: any): Promise<void> {
    console.log(`Processing email: ${email.subject} from ${email.from}`);

    // Check if we've already processed this email
    const existingLog = await db
      .select()
      .from(emailProcessingLogs)
      .where(
        and(
          eq(emailProcessingLogs.configurationId, config.id),
          eq(emailProcessingLogs.messageId, email.messageId)
        )
      )
      .limit(1);

    if (existingLog.length > 0) {
      console.log(`Email already processed: ${email.messageId}`);
      await this.logProcessing(config.id, config.organizationId, email, null, 'duplicate');
      return;
    }

    try {
      // Determine client based on subject mappings or use default
      const clientId = await this.determineClient(email, config);
      
      // Determine assignee
      const assigneeId = config.defaultAssigneeId;

      // Generate ticket number
      const ticketNumber = await this.generateTicketNumber(config.organizationId);

      // Create ticket
      const newTicket = await db
        .insert(tickets)
        .values({
          organizationId: config.organizationId,
          number: ticketNumber,
          title: this.cleanSubject(email.subject),
          description: this.formatEmailDescription(email),
          clientId: clientId,
          assigneeId: assigneeId,
          priority: config.defaultPriority,
          status: 'open',
          estimatedHours: null,
        })
        .returning();

      console.log(`Created ticket ${ticketNumber} for email from ${email.from}`);

      // Log successful processing
      await this.logProcessing(config.id, config.organizationId, email, newTicket[0]!.id, 'processed');

    } catch (error) {
      console.error(`Error creating ticket for email ${email.uid}:`, error);
      await this.logProcessing(config.id, config.organizationId, email, null, 'failed', 
        error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async determineClient(email: EmailMessage, config: any): Promise<string> {
    // If auto-assign by subject is enabled and mappings exist
    if (config.autoAssignBySubject && config.subjectClientMappings) {
      try {
        const mappings = JSON.parse(config.subjectClientMappings);
        for (const [keyword, clientId] of Object.entries(mappings)) {
          if (email.subject.toLowerCase().includes(keyword.toLowerCase())) {
            return clientId as string;
          }
        }
      } catch (error) {
        console.error('Error parsing subject client mappings:', error);
      }
    }

    // Try to find client by email domain
    const fromDomain = email.from.includes('@') ? email.from.split('@')[1] : '';
    if (fromDomain) {
      const clientByDomain = await db
        .select()
        .from(clients)
        .where(
          and(
            eq(clients.organizationId, config.organizationId),
            eq(clients.isActive, true),
            // Simple domain matching - you might want to make this more sophisticated
            sql`lower(${clients.name}) LIKE '%' || lower(${fromDomain.split('.')[0]}) || '%'`
          )
        )
        .limit(1);

      if (clientByDomain.length > 0) {
        return clientByDomain[0]!.id;
      }
    }

    // Fall back to default client or the first active client
    if (config.defaultClientId) {
      return config.defaultClientId;
    }

    // Get the first active client for this organization
    const firstClient = await db
      .select()
      .from(clients)
      .where(
        and(
          eq(clients.organizationId, config.organizationId),
          eq(clients.isActive, true)
        )
      )
      .limit(1);

    if (firstClient.length === 0) {
      throw new Error('No active clients found for this organization');
    }

    return firstClient[0]!.id;
  }

  private async generateTicketNumber(organizationId: string): Promise<string> {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    
    // Get count of tickets created today for this org
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    const todayTickets = await db
      .select({ count: sql<number>`count(*)` })
      .from(tickets)
      .where(
        and(
          eq(tickets.organizationId, organizationId),
          sql`${tickets.createdAt} >= ${startOfDay}`,
          sql`${tickets.createdAt} < ${endOfDay}`
        )
      );

    const ticketCount = (todayTickets[0]?.count || 0) + 1;
    return `${year}${month}-${String(ticketCount).padStart(4, '0')}-EMAIL`;
  }

  private cleanSubject(subject: string): string {
    // Remove common email prefixes and clean up
    return subject
      .replace(/^(Re:|Fwd?:|FW:)\s*/i, '')
      .trim()
      .substring(0, 450); // Ensure it fits in the title field
  }

  private formatEmailDescription(email: EmailMessage): string {
    const description = `
**Email Details:**
- From: ${email.from}
- Date: ${email.date.toISOString()}
- Message ID: ${email.messageId}

**Content:**
${email.text || 'No text content available'}
    `.trim();

    return description;
  }

  private async logProcessing(
    configurationId: string,
    organizationId: string,
    email: EmailMessage,
    ticketId: string | null,
    status: string,
    errorMessage?: string
  ): Promise<void> {
    await db.insert(emailProcessingLogs).values({
      organizationId,
      configurationId,
      ticketId,
      emailUid: email.uid,
      fromEmail: email.from,
      subject: email.subject,
      messageId: email.messageId,
      status,
      errorMessage: errorMessage || null,
      processedAt: new Date(),
    });
  }

  private async logEmailError(
    configurationId: string,
    organizationId: string,
    email: EmailMessage,
    error: any
  ): Promise<void> {
    await this.logProcessing(
      configurationId,
      organizationId,
      email,
      null,
      'failed',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }

  private async logProcessingError(
    configurationId: string,
    organizationId: string,
    error: { error: string; configurationName: string }
  ): Promise<void> {
    await db.insert(emailProcessingLogs).values({
      organizationId,
      configurationId,
      ticketId: null,
      emailUid: 0,
      fromEmail: 'system',
      subject: `Configuration Error: ${error.configurationName}`,
      messageId: `error-${Date.now()}`,
      status: 'failed',
      errorMessage: error.error,
      processedAt: new Date(),
    });
  }
}

// Export singleton instance
export const emailProcessor = new EmailProcessor();

// API endpoint for manual processing
export async function processEmailsManually(configurationId?: string): Promise<{ success: boolean; message: string }> {
  try {
    if (configurationId) {
      const config = await db
        .select()
        .from(emailConfigurations)
        .where(eq(emailConfigurations.id, configurationId))
        .limit(1);

      if (config.length === 0) {
        throw new Error('Configuration not found');
      }

      await emailProcessor.processConfiguration(config[0]);
    } else {
      await emailProcessor.processAllConfigurations();
    }

    return {
      success: true,
      message: 'Email processing completed successfully'
    };
  } catch (error) {
    console.error('Email processing failed:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}