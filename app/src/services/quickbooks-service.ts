import crypto from 'crypto';
import { db } from '../db';
import { quickbooksIntegrations, timeEntries, clients, users, tickets } from '../db/schema';
import { eq, and, gte, lte } from 'drizzle-orm';

export interface QuickBooksConfig {
  organizationId: string;
  companyId: string;
  accessToken: string;
  refreshToken: string;
  clientId: string;
  clientSecret: string;
  baseUrl: string; // sandbox or production
  tokenExpiresAt: Date;
}

export interface QuickBooksInvoiceItem {
  description: string;
  quantity: number;
  rate: number;
  amount: number;
  serviceDate: string;
  ticketId?: string;
  timeEntryIds: string[];
}

export interface QuickBooksInvoice {
  clientId: string;
  clientName: string;
  items: QuickBooksInvoiceItem[];
  totalAmount: number;
  dueDate: string;
  invoiceDate: string;
  invoiceNumber?: string;
}

export interface QuickBooksSyncResult {
  success: boolean;
  invoiceId?: string;
  invoiceNumber?: string;
  totalAmount: number;
  itemCount: number;
  error?: string;
}

export class QuickBooksService {
  private config: QuickBooksConfig;

  constructor(config: QuickBooksConfig) {
    this.config = config;
  }

  /**
   * Get or refresh access token
   */
  async getValidToken(): Promise<string> {
    if (new Date() < this.config.tokenExpiresAt) {
      return this.config.accessToken;
    }

    // Token expired, refresh it
    return await this.refreshAccessToken();
  }

  /**
   * Refresh the QuickBooks access token
   */
  async refreshAccessToken(): Promise<string> {
    const response = await fetch('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64')}`
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: this.config.refreshToken
      })
    });

    if (!response.ok) {
      throw new Error('Failed to refresh QuickBooks token');
    }

    const tokenData = await response.json() as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
    };

    // Update stored tokens in database
    const newExpiresAt = new Date(Date.now() + (tokenData.expires_in * 1000));
    
    await db
      .update(quickbooksIntegrations)
      .set({
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        tokenExpiresAt: newExpiresAt
      })
      .where(eq(quickbooksIntegrations.organizationId, this.config.organizationId));

    this.config.accessToken = tokenData.access_token;
    this.config.refreshToken = tokenData.refresh_token;
    this.config.tokenExpiresAt = newExpiresAt;

    return tokenData.access_token;
  }

  /**
   * Create customer in QuickBooks if not exists
   */
  async createOrGetCustomer(client: { id: string; name: string; email?: string }): Promise<string> {
    const token = await this.getValidToken();

    // First, search for existing customer
    const searchUrl = `${this.config.baseUrl}/v3/companyid/${this.config.companyId}/query`;
    const searchQuery = `SELECT * FROM Customer WHERE Name = '${client.name.replace(/'/g, "\\'")}'`;

    const searchResponse = await fetch(`${searchUrl}?query=${encodeURIComponent(searchQuery)}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    if (searchResponse.ok) {
      const searchResult = await searchResponse.json() as { QueryResponse?: { Customer?: { Id: string }[] } };
      if (searchResult.QueryResponse?.Customer?.[0]) {
        return searchResult.QueryResponse.Customer[0].Id;
      }
    }

    // Customer doesn't exist, create new one
    const createUrl = `${this.config.baseUrl}/v3/companyid/${this.config.companyId}/customer`;
    const customerData = {
      Name: client.name,
      CompanyName: client.name,
      ...(client.email && { PrimaryEmailAddr: { Address: client.email } })
    };

    const createResponse = await fetch(createUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(customerData)
    });

    if (!createResponse.ok) {
      throw new Error(`Failed to create QuickBooks customer: ${createResponse.statusText}`);
    }

    const createResult = await createResponse.json() as { QueryResponse: { Customer: { Id: string }[] } };
    return createResult.QueryResponse.Customer[0].Id;
  }

  /**
   * Create invoice in QuickBooks
   */
  async createInvoice(invoice: QuickBooksInvoice): Promise<QuickBooksSyncResult> {
    try {
      const token = await this.getValidToken();
      
      // Get or create customer
      const customerId = await this.createOrGetCustomer({
        id: invoice.clientId,
        name: invoice.clientName
      });

      // Prepare invoice data
      const invoiceData = {
        CustomerRef: { value: customerId },
        TxnDate: invoice.invoiceDate,
        DueDate: invoice.dueDate,
        DocNumber: invoice.invoiceNumber,
        Line: invoice.items.map((item, index) => ({
          Id: (index + 1).toString(),
          LineNum: index + 1,
          Amount: item.amount,
          DetailType: "SalesItemLineDetail",
          SalesItemLineDetail: {
            ServiceDate: item.serviceDate,
            Qty: item.quantity,
            UnitPrice: item.rate,
            ItemRef: { value: "1", name: "Services" }, // Default service item
            TaxCodeRef: { value: "NON" }
          },
          Description: item.description
        }))
      };

      const createUrl = `${this.config.baseUrl}/v3/companyid/${this.config.companyId}/invoice`;
      const response = await fetch(createUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(invoiceData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`QuickBooks API error: ${response.status} ${errorText}`);
      }

      const result = await response.json() as {
        QueryResponse: {
          Invoice: [{
            Id: string;
            DocNumber: string;
            TotalAmt: number;
          }]
        }
      };

      const qbInvoice = result.QueryResponse.Invoice[0];
      
      return {
        success: true,
        invoiceId: qbInvoice.Id,
        invoiceNumber: qbInvoice.DocNumber,
        totalAmount: qbInvoice.TotalAmt,
        itemCount: invoice.items.length
      };

    } catch (error) {
      return {
        success: false,
        totalAmount: invoice.totalAmount,
        itemCount: invoice.items.length,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Sync billable time entries to QuickBooks as an invoice
   */
  async syncTimeEntriesToInvoice(params: {
    clientId: string;
    startDate: string;
    endDate: string;
    includeDescription?: boolean;
  }): Promise<QuickBooksSyncResult> {
    // Get client info
    const client = await db
      .select()
      .from(clients)
      .where(and(
        eq(clients.id, params.clientId),
        eq(clients.organizationId, this.config.organizationId)
      ))
      .then(rows => rows[0]);

    if (!client) {
      throw new Error('Client not found');
    }

    // Get billable time entries for the period
    const entries = await db
      .select({
        id: timeEntries.id,
        description: timeEntries.description,
        duration: timeEntries.duration,
        billable: timeEntries.billable,
        startTime: timeEntries.startTime,
        endTime: timeEntries.endTime,
        hourlyRate: timeEntries.hourlyRate,
        ticketId: timeEntries.ticketId,
        userName: users.name,
        ticketTitle: tickets.title
      })
      .from(timeEntries)
      .leftJoin(users, eq(timeEntries.userId, users.id))
      .leftJoin(tickets, eq(timeEntries.ticketId, tickets.id))
      .where(and(
        eq(timeEntries.organizationId, this.config.organizationId),
        eq(timeEntries.clientId, params.clientId),
        eq(timeEntries.billable, true),
        gte(timeEntries.startTime, new Date(params.startDate)),
        lte(timeEntries.endTime, new Date(params.endDate))
      ));

    if (entries.length === 0) {
      throw new Error('No billable time entries found for the specified period');
    }

    // Group entries by date and ticket (or by date if no ticket grouping desired)
    const groupedEntries = entries.reduce((acc, entry) => {
      const dateKey = entry.startTime.toISOString().split('T')[0];
      const groupKey = `${dateKey}-${entry.ticketId || 'general'}`;
      
      if (!acc[groupKey]) {
        acc[groupKey] = {
          date: dateKey,
          entries: [],
          totalMinutes: 0,
          ticketTitle: entry.ticketTitle || 'General Time'
        };
      }
      
      acc[groupKey].entries.push(entry);
      acc[groupKey].totalMinutes += entry.duration;
      
      return acc;
    }, {} as Record<string, { date: string; entries: typeof entries; totalMinutes: number; ticketTitle: string }>);

    // Create invoice items
    const invoiceItems: QuickBooksInvoiceItem[] = Object.values(groupedEntries).map(group => {
      const hours = group.totalMinutes / 60;
      const rate = group.entries[0].hourlyRate || client.hourlyRate || 100;
      const amount = hours * rate;
      
      const description = params.includeDescription 
        ? `${group.ticketTitle} - ${group.entries.map(e => e.description || 'Time logged').join(', ')}`
        : `${group.ticketTitle} (${hours.toFixed(2)} hours)`;

      return {
        description,
        quantity: hours,
        rate,
        amount,
        serviceDate: group.date,
        ticketId: group.entries[0].ticketId || undefined,
        timeEntryIds: group.entries.map(e => e.id)
      };
    });

    const totalAmount = invoiceItems.reduce((sum, item) => sum + item.amount, 0);

    const invoice: QuickBooksInvoice = {
      clientId: client.id,
      clientName: client.name,
      items: invoiceItems,
      totalAmount,
      dueDate: new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0], // 30 days from now
      invoiceDate: new Date().toISOString().split('T')[0],
      invoiceNumber: `INV-${client.name.replace(/\s+/g, '').toUpperCase()}-${Date.now()}`
    };

    return await this.createInvoice(invoice);
  }

  /**
   * Test QuickBooks connection
   */
  async testConnection(): Promise<{ success: boolean; companyName?: string; error?: string }> {
    try {
      const token = await this.getValidToken();
      
      const response = await fetch(
        `${this.config.baseUrl}/v3/companyid/${this.config.companyId}/companyinfo/${this.config.companyId}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const result = await response.json() as {
        QueryResponse: {
          CompanyInfo: [{
            CompanyName: string;
          }]
        }
      };

      return {
        success: true,
        companyName: result.QueryResponse.CompanyInfo[0].CompanyName
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

/**
 * Factory function to create QuickBooks service from database config
 */
export async function createQuickBooksService(organizationId: string): Promise<QuickBooksService | null> {
  const config = await db
    .select()
    .from(quickbooksIntegrations)
    .where(eq(quickbooksIntegrations.organizationId, organizationId))
    .then(rows => rows[0]);

  if (!config) {
    return null;
  }

  return new QuickBooksService({
    organizationId: config.organizationId,
    companyId: config.companyId,
    accessToken: config.accessToken,
    refreshToken: config.refreshToken,
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    baseUrl: config.sandbox ? 'https://sandbox-quickbooks.api.intuit.com' : 'https://quickbooks.api.intuit.com',
    tokenExpiresAt: config.tokenExpiresAt
  });
}