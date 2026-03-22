import { db } from './index';
import * as schema from './schema';
import { readFileSync } from 'fs';
import { join } from 'path';
import bcrypt from 'bcryptjs';

// Helper to execute raw SQL
async function executeSQL(sql: string) {
  await db.execute(sql);
}

// Helper to generate random dates
function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

// Helper to generate random integer between min and max (inclusive)
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Helper to pick random item from array
function randomChoice<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

export async function seedEnhancedDatabase() {
  console.log('🌱 Seeding enhanced database...');

  try {
    // First, set up RLS policies
    console.log('Setting up Row Level Security...');
    const rlsSQL = readFileSync(join(__dirname, 'setup-rls.sql'), 'utf-8');
    await executeSQL(rlsSQL);

    // Create organizations
    console.log('Creating organizations...');
    const [org1, org2] = await db.insert(schema.organizations).values([
      {
        name: 'Prime ITS',
        domain: 'primeits.com',
      },
      {
        name: 'TechFlow MSP',
        domain: 'techflow.com',
      },
    ]).returning();

    // Create users (5 total across orgs)
    console.log('Creating users...');
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    const users1 = await db.insert(schema.users).values([
      {
        organizationId: org1.id,
        email: 'cory@primeits.com',
        password: hashedPassword,
        firstName: 'Cory',
        lastName: 'Simmons',
        role: 'admin',
        hourlyRate: '175.00',
      },
      {
        organizationId: org1.id,
        email: 'mike@primeits.com',
        password: hashedPassword,
        firstName: 'Mike',
        lastName: 'Torres',
        role: 'technician',
        hourlyRate: '150.00',
      },
      {
        organizationId: org1.id,
        email: 'jake@primeits.com',
        password: hashedPassword,
        firstName: 'Jake',
        lastName: 'Rodriguez',
        role: 'technician',
        hourlyRate: '125.00',
      },
    ]).returning();

    const users2 = await db.insert(schema.users).values([
      {
        organizationId: org2.id,
        email: 'admin@techflow.com',
        password: hashedPassword,
        firstName: 'Sarah',
        lastName: 'Chen',
        role: 'admin',
        hourlyRate: '160.00',
      },
      {
        organizationId: org2.id,
        email: 'tech@techflow.com',
        password: hashedPassword,
        firstName: 'Alex',
        lastName: 'Kim',
        role: 'technician',
        hourlyRate: '140.00',
      },
    ]).returning();

    const allUsers = [...users1, ...users2];

    // Create 20 clients across both orgs
    console.log('Creating 20 clients...');
    const clientNames = [
      'Acme Corporation', 'Globex Industries', 'Wayne Enterprises', 'Stark Medical', 'Umbrella Legal',
      'Oscorp Technologies', 'LexCorp Dynamics', 'Aperture Science', 'Cyberdyne Systems', 'InGen Biotech',
      'Weyland Industries', 'Tyrell Corporation', 'Soylent Corp', 'Massive Dynamic', 'Blue Sun Corporation',
      'Abstergo Industries', 'Atlas Corporation', 'Dunder Mifflin', 'Sterling Cooper', 'Initech'
    ];

    const industries = ['Technology', 'Healthcare', 'Manufacturing', 'Legal', 'Finance', 'Education', 'Retail', 'Construction', 'Transportation', 'Energy'];
    const slaTiers: ('Enterprise' | 'Premium' | 'Standard')[] = ['Enterprise', 'Premium', 'Standard'];
    const slaHealthStates: ('good' | 'warning' | 'breach')[] = ['good', 'good', 'good', 'warning', 'breach']; // Weighted toward good

    const clients1 = await db.insert(schema.clients).values(
      clientNames.slice(0, 12).map((name, i) => ({
        organizationId: org1.id,
        name,
        industry: randomChoice(industries),
        slaTier: randomChoice(slaTiers),
        responseTime: randomChoice(['30 minutes', '1 hour', '2 hours', '4 hours', '8 hours']),
        slaHealth: randomChoice(slaHealthStates),
        onboardDate: randomDate(new Date('2021-01-01'), new Date('2025-12-31')),
        isActive: Math.random() > 0.1, // 90% active
      }))
    ).returning();

    const clients2 = await db.insert(schema.clients).values(
      clientNames.slice(12).map((name, i) => ({
        organizationId: org2.id,
        name,
        industry: randomChoice(industries),
        slaTier: randomChoice(slaTiers),
        responseTime: randomChoice(['30 minutes', '1 hour', '2 hours', '4 hours', '8 hours']),
        slaHealth: randomChoice(slaHealthStates),
        onboardDate: randomDate(new Date('2021-01-01'), new Date('2025-12-31')),
        isActive: Math.random() > 0.1, // 90% active
      }))
    ).returning();

    const allClients = [...clients1, ...clients2];

    // Create contacts for each client (1-3 per client)
    console.log('Creating contacts...');
    const contactData = [];
    const firstNames = ['John', 'Sarah', 'Mike', 'Lisa', 'David', 'Jennifer', 'Robert', 'Emily', 'Chris', 'Amanda'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];
    const titles = ['IT Director', 'CEO', 'CTO', 'Operations Manager', 'IT Manager', 'System Administrator', 'Network Engineer', 'Security Analyst'];

    for (const client of allClients) {
      const numContacts = randomInt(1, 3);
      for (let i = 0; i < numContacts; i++) {
        const firstName = randomChoice(firstNames);
        const lastName = randomChoice(lastNames);
        contactData.push({
          organizationId: client.organizationId,
          clientId: client.id,
          name: `${firstName} ${lastName}`,
          email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${client.name.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
          phone: `(555) ${randomInt(100, 999)}-${randomInt(1000, 9999)}`,
          isPrimary: i === 0, // First contact is primary
          title: randomChoice(titles),
        });
      }
    }

    if (contactData.length > 0) {
      await db.insert(schema.contacts).values(contactData);
    }

    // Generate 50 tickets with variety
    console.log('Creating 50 tickets...');
    const ticketTitles = [
      'Exchange server not syncing emails',
      'New employee onboarding setup',
      'Firewall rule change request', 
      'Printer offline on 3rd floor',
      'Ransomware alert - endpoint quarantined',
      'WiFi connectivity issues in conference room',
      'VPN client not connecting',
      'Backup job failed - need investigation',
      'Software license renewal needed',
      'Performance issues with domain controller',
      'Email phishing attempt reported',
      'Workstation replacement request',
      'Network switch showing errors',
      'Database maintenance window',
      'Security audit compliance items',
      'Microsoft Office 365 migration',
      'Antivirus deployment across fleet',
      'File server capacity upgrade',
      'Multi-factor authentication setup',
      'Password policy enforcement',
      'Network monitoring alerts',
      'SSL certificate expiring soon',
      'User account lockout issues',
      'VOIP phone system problems',
      'Remote access setup for new hire',
      'Patch management deployment',
      'Data recovery request',
      'Network performance optimization',
      'Cloud backup configuration',
      'Compliance documentation review',
      'IT asset inventory update',
      'Help desk software configuration',
      'Mobile device management setup',
      'Email archiving solution',
      'Disaster recovery testing',
      'Server virtualization project',
      'Network security assessment',
      'Software update deployment',
      'User training session planning',
      'Hardware warranty renewal',
      'Internet connection upgrade',
      'Application compatibility testing',
      'Remote monitoring setup',
      'Cybersecurity awareness training',
      'System performance monitoring',
      'Data migration project',
      'Network infrastructure upgrade',
      'IT budget planning review',
      'Vendor relationship management',
      'Technology refresh planning'
    ];

    const priorities: ('critical' | 'high' | 'medium' | 'low')[] = ['critical', 'high', 'medium', 'low'];
    const statuses: ('open' | 'in_progress' | 'waiting' | 'resolved' | 'closed')[] = ['open', 'in_progress', 'waiting', 'resolved', 'closed'];

    const ticketData = [];
    for (let i = 0; i < 50; i++) {
      const client = randomChoice(allClients);
      const org = client.organizationId === org1.id ? org1 : org2;
      const orgUsers = allUsers.filter(u => u.organizationId === org.id);
      const assignee = Math.random() > 0.1 ? randomChoice(orgUsers) : null; // 90% assigned
      const priority = randomChoice(priorities);
      const status = randomChoice(statuses);
      
      // Generate SLA deadline based on priority and response time
      const responseHours = parseInt(client.responseTime.split(' ')[0]) || 4;
      const priorityMultiplier = priority === 'critical' ? 0.5 : priority === 'high' ? 1 : priority === 'medium' ? 2 : 4;
      const slaHours = responseHours * priorityMultiplier;
      
      const createdAt = randomDate(new Date('2026-01-01'), new Date());
      const slaDeadline = new Date(createdAt.getTime() + (slaHours * 60 * 60 * 1000));
      
      let resolvedAt = null;
      let closedAt = null;
      
      if (status === 'resolved' || status === 'closed') {
        resolvedAt = randomDate(createdAt, new Date());
        if (status === 'closed') {
          closedAt = new Date(resolvedAt.getTime() + randomInt(1, 24) * 60 * 60 * 1000);
        }
      }

      ticketData.push({
        organizationId: org.id,
        number: `HLX-${String(i + 1).padStart(3, '0')}`,
        title: randomChoice(ticketTitles),
        description: `Detailed description for ticket ${i + 1}. This includes context about the issue, steps taken so far, and expected resolution.`,
        clientId: client.id,
        assigneeId: assignee?.id || null,
        priority,
        status,
        slaDeadline,
        estimatedHours: `${randomInt(1, 8)}.${randomChoice(['0', '5'])}`,
        createdAt,
        updatedAt: randomDate(createdAt, new Date()),
        resolvedAt,
        closedAt,
      });
    }

    const tickets = await db.insert(schema.tickets).values(ticketData).returning();

    // Generate 200 time entries
    console.log('Creating 200 time entries...');
    const timeEntryDescriptions = [
      'Initial investigation and diagnosis',
      'Implementing solution',
      'Testing and verification',
      'Documentation and cleanup',
      'Client communication and updates',
      'Research and planning',
      'Configuration changes',
      'Monitoring and validation',
      'Follow-up and support',
      'Troubleshooting additional issues',
      'User training and handoff',
      'System optimization',
      'Security review and hardening',
      'Performance tuning',
      'Backup and recovery testing'
    ];

    const timeEntryData = [];
    for (let i = 0; i < 200; i++) {
      const ticket = randomChoice(tickets);
      const org = ticket.organizationId === org1.id ? org1 : org2;
      const orgUsers = allUsers.filter(u => u.organizationId === org.id);
      const user = randomChoice(orgUsers);
      
      // Create realistic time entries within ticket lifecycle
      const ticketStart = ticket.createdAt;
      const ticketEnd = ticket.resolvedAt || new Date();
      const entryDate = randomDate(ticketStart, ticketEnd);
      
      const duration = randomInt(15, 480); // 15 minutes to 8 hours
      const startTime = new Date(entryDate.getTime() + randomInt(8, 16) * 60 * 60 * 1000); // Business hours
      const endTime = new Date(startTime.getTime() + duration * 60 * 1000);
      
      timeEntryData.push({
        organizationId: org.id,
        ticketId: ticket.id,
        userId: user.id,
        description: randomChoice(timeEntryDescriptions),
        startTime,
        endTime,
        duration,
        billable: Math.random() > 0.1, // 90% billable
        hourlyRate: user.hourlyRate,
        createdAt: startTime,
        updatedAt: endTime,
      });
    }

    await db.insert(schema.timeEntries).values(timeEntryData);

    // Create some notes
    console.log('Creating notes...');
    const noteContents = [
      'Initial client contact completed. Issue confirmed.',
      'Remote access established. Beginning diagnosis.',
      'Found root cause. Implementing fix.',
      'Solution tested and verified working.',
      'Client training provided. Case ready for closure.',
      'Escalated to senior technician for advanced troubleshooting.',
      'Waiting for vendor support response.',
      'Change window scheduled for tonight.',
      'Backup completed before making changes.',
      'Security scan passed. System hardened.'
    ];

    const noteData = [];
    for (let i = 0; i < 50; i++) {
      const ticket = randomChoice(tickets.slice(0, 30)); // Add notes to first 30 tickets
      const org = ticket.organizationId === org1.id ? org1 : org2;
      const orgUsers = allUsers.filter(u => u.organizationId === org.id);
      const user = randomChoice(orgUsers);
      
      noteData.push({
        organizationId: org.id,
        ticketId: ticket.id,
        userId: user.id,
        content: randomChoice(noteContents),
        isInternal: Math.random() > 0.7, // 30% internal notes
        createdAt: randomDate(ticket.createdAt, ticket.resolvedAt || new Date()),
        updatedAt: new Date(),
      });
    }

    if (noteData.length > 0) {
      await db.insert(schema.notes).values(noteData);
    }

    // Create invoices and invoice line items
    console.log('Creating invoices...');
    const invoiceData: any[] = [];
    const invoiceLineItemData: any[] = [];
    
    // Create 15 invoices across both orgs
    for (let i = 1; i <= 15; i++) {
      const org = i <= 8 ? org1 : org2;
      const orgClients = allClients.filter(c => c.organizationId === org.id);
      const client = randomChoice(orgClients);
      
      // Generate invoice date (last 6 months)
      const dateIssued = randomDate(
        new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000), // 6 months ago
        new Date()
      );
      
      // Due date is typically 30 days after issue date
      const dateDue = new Date(dateIssued.getTime() + 30 * 24 * 60 * 60 * 1000);
      
      // Determine status based on due date and randomness
      let status: string;
      let datePaid: Date | undefined;
      
      if (dateDue < new Date() && Math.random() < 0.8) {
        // 80% of past due invoices are paid
        status = 'paid';
        datePaid = randomDate(dateIssued, dateDue);
      } else if (dateDue < new Date()) {
        status = Math.random() < 0.5 ? 'overdue' : 'sent';
      } else {
        // Future due date
        if (Math.random() < 0.2) {
          status = 'draft';
        } else if (Math.random() < 0.7) {
          status = 'sent';
        } else {
          status = 'paid';
          datePaid = randomDate(dateIssued, new Date());
        }
      }
      
      const invoiceNumber = `INV-${String(i).padStart(4, '0')}`;
      
      // Get some billable time entries for this client to calculate total
      const clientTickets = tickets.filter(t => t.clientId === client.id);
      let subtotal = 0;
      const selectedEntryIndices: number[] = [];
      
      // Pick 2-5 time entries from this client's tickets
      const numEntries = randomInt(2, Math.min(5, clientTickets.length));
      for (let j = 0; j < numEntries && j < clientTickets.length; j++) {
        const ticket = randomChoice(clientTickets);
        const ticketEntries = timeEntryData.filter(te => te.ticketId === ticket.id && te.billable);
        
        if (ticketEntries.length > 0) {
          const entryIndex = timeEntryData.findIndex(te => te.ticketId === ticket.id && te.billable);
          if (entryIndex !== -1 && !selectedEntryIndices.includes(entryIndex)) {
            selectedEntryIndices.push(entryIndex);
            const entry = timeEntryData[entryIndex];
            
            const hours = (entry.duration || 0) / 60;
            const rate = parseFloat(entry.hourlyRate || '125');
            const amount = hours * rate;
            subtotal += amount;
            
            // Create line item (timeEntryId will be set later after time entries are created)
            invoiceLineItemData.push({
              organizationId: org.id,
              invoiceId: `invoice-${i}`, // Will be replaced after invoice creation
              timeEntryId: null, // Will be set later
              description: `${ticket.title} - ${entry.description}`,
              quantity: hours.toFixed(2),
              rate: rate.toFixed(2),
              amount: amount.toFixed(2),
            });
          }
        }
      }
      
      // If no time entries found, create manual line items
      if (subtotal === 0) {
        const numItems = randomInt(1, 3);
        for (let j = 0; j < numItems; j++) {
          const hours = randomInt(2, 8);
          const rate = randomChoice([125, 150, 175, 200]);
          const amount = hours * rate;
          subtotal += amount;
          
          invoiceLineItemData.push({
            organizationId: org.id,
            invoiceId: `invoice-${i}`,
            timeEntryId: null,
            description: randomChoice([
              'Network maintenance and monitoring',
              'Security audit and remediation', 
              'Server configuration and updates',
              'User support and training',
              'Backup system management',
              'Software licensing and installation'
            ]),
            quantity: hours.toFixed(2),
            rate: rate.toFixed(2),
            amount: amount.toFixed(2),
          });
        }
      }
      
      const tax = subtotal * 0.08; // 8% tax
      const total = subtotal + tax;
      
      const notes = Math.random() < 0.6 ? randomChoice([
        'Monthly IT support services',
        'Emergency response and system recovery',
        'Scheduled maintenance and updates',
        'Security consultation and implementation',
        'Network optimization project',
        'Hardware refresh and migration',
        null, null // Some chance of no notes
      ]) : undefined;
      
      invoiceData.push({
        id: `invoice-${i}`,
        organizationId: org.id,
        clientId: client.id,
        invoiceNumber,
        status,
        dateIssued,
        dateDue,
        datePaid,
        subtotal: subtotal.toFixed(2),
        tax: tax.toFixed(2),
        total: total.toFixed(2),
        notes,
      });
    }
    
    // Insert invoices
    const invoices = await db.insert(schema.invoices).values(invoiceData).returning();
    
    // Update line items with actual invoice IDs and insert
    const updatedLineItemData = invoiceLineItemData.map((item, index) => {
      const invoiceIndex = parseInt(item.invoiceId.replace('invoice-', '')) - 1;
      return {
        ...item,
        invoiceId: invoices[invoiceIndex].id,
      };
    });
    
    if (updatedLineItemData.length > 0) {
      await db.insert(schema.invoiceLineItems).values(updatedLineItemData);
    }

    console.log('✅ Enhanced database seeded successfully!');
    console.log(`Organizations: 2`);
    console.log(`Users: ${allUsers.length}`);
    console.log(`Clients: ${allClients.length}`);
    console.log(`Contacts: ${contactData.length}`);
    console.log(`Tickets: ${tickets.length}`);
    console.log(`Time Entries: ${timeEntryData.length}`);
    console.log(`Notes: ${noteData.length}`);
    console.log(`Invoices: ${invoices.length}`);
    console.log(`Invoice Line Items: ${updatedLineItemData.length}`);
    
  } catch (error) {
    console.error('❌ Error seeding enhanced database:', error);
    throw error;
  }
}

// Reset and reseed function
export async function resetAndReseedDatabase() {
  console.log('🔄 Resetting and reseeding database...');
  
  try {
    // Drop all data in reverse dependency order
    console.log('Clearing existing data...');
    await db.delete(schema.invoiceLineItems);
    await db.delete(schema.invoices);
    await db.delete(schema.notes);
    await db.delete(schema.timeEntries);
    await db.delete(schema.tickets);
    await db.delete(schema.contacts);
    await db.delete(schema.clients);
    await db.delete(schema.sessions);
    await db.delete(schema.accounts);
    await db.delete(schema.users);
    await db.delete(schema.organizations);
    await db.delete(schema.verificationTokens);
    
    console.log('✅ Database cleared');
    
    // Reseed with fresh data
    await seedEnhancedDatabase();
    
  } catch (error) {
    console.error('❌ Error resetting database:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  const command = process.argv[2];
  
  if (command === 'reset') {
    resetAndReseedDatabase()
      .then(() => {
        console.log('Reset and reseed completed');
        process.exit(0);
      })
      .catch((error) => {
        console.error('Reset and reseed failed:', error);
        process.exit(1);
      });
  } else {
    seedEnhancedDatabase()
      .then(() => {
        console.log('Enhanced seed completed');
        process.exit(0);
      })
      .catch((error) => {
        console.error('Enhanced seed failed:', error);
        process.exit(1);
      });
  }
}