import { db, pool } from './index';
import * as schema from './schema';
import bcrypt from 'bcryptjs';

async function seedDev() {
  console.log('🌱 Seeding dev database (no RLS)...');

  try {
    // Create test organization
    console.log('Creating organization...');
    const [org] = await db.insert(schema.organizations).values({
      name: 'Prime ITS',
      domain: 'primeits.com',
    }).returning();

    // Create admin user (password: admin123)
    console.log('Creating users...');
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const [admin] = await db.insert(schema.users).values({
      organizationId: org.id,
      email: 'admin@primeits.com',
      password: hashedPassword,
      firstName: 'Cory',
      lastName: 'Simmons',
      role: 'admin',
      hourlyRate: '150.00',
    }).returning();

    const [tech] = await db.insert(schema.users).values({
      organizationId: org.id,
      email: 'tech@primeits.com',
      password: hashedPassword,
      firstName: 'Jake',
      lastName: 'Torres',
      role: 'technician',
      hourlyRate: '85.00',
    }).returning();

    // Create clients
    console.log('Creating clients...');
    const clients = await db.insert(schema.clients).values([
      { organizationId: org.id, name: 'Acme Corp', industry: 'Manufacturing', slaTier: 'Enterprise', responseTime: '1 hour', slaHealth: 'good' },
      { organizationId: org.id, name: 'Baker Law Group', industry: 'Legal', slaTier: 'Premium', responseTime: '2 hours', slaHealth: 'good' },
      { organizationId: org.id, name: 'Coastal Medical', industry: 'Healthcare', slaTier: 'Enterprise', responseTime: '1 hour', slaHealth: 'warning' },
      { organizationId: org.id, name: 'Delta Logistics', industry: 'Transportation', slaTier: 'Standard', responseTime: '4 hours', slaHealth: 'good' },
      { organizationId: org.id, name: 'Evergreen Dental', industry: 'Healthcare', slaTier: 'Premium', responseTime: '2 hours', slaHealth: 'good' },
    ]).returning();

    // Create contacts
    console.log('Creating contacts...');
    for (const client of clients) {
      await db.insert(schema.contacts).values({
        organizationId: org.id,
        clientId: client.id,
        name: `Contact at ${client.name}`,
        email: `contact@${client.name.toLowerCase().replace(/\s+/g, '')}.com`,
        phone: '555-0100',
        isPrimary: true,
      });
    }

    // Create tickets
    console.log('Creating tickets...');
    const ticketData = [
      { clientId: clients[0].id, title: 'Server down - production environment', priority: 'critical' as const, status: 'in_progress' as const, assigneeId: admin.id },
      { clientId: clients[0].id, title: 'Email not syncing on mobile devices', priority: 'medium' as const, status: 'open' as const, assigneeId: tech.id },
      { clientId: clients[1].id, title: 'VPN connection dropping intermittently', priority: 'high' as const, status: 'in_progress' as const, assigneeId: tech.id },
      { clientId: clients[2].id, title: 'HIPAA compliance audit prep', priority: 'high' as const, status: 'open' as const, assigneeId: admin.id },
      { clientId: clients[2].id, title: 'Printer not connecting to network', priority: 'low' as const, status: 'open' as const, assigneeId: null },
      { clientId: clients[3].id, title: 'New employee onboarding - 3 workstations', priority: 'medium' as const, status: 'waiting' as const, assigneeId: tech.id },
      { clientId: clients[4].id, title: 'Backup job failing nightly', priority: 'high' as const, status: 'in_progress' as const, assigneeId: admin.id },
      { clientId: clients[1].id, title: 'Software license renewal', priority: 'low' as const, status: 'resolved' as const, assigneeId: tech.id },
    ];

    const tickets = [];
    for (let i = 0; i < ticketData.length; i++) {
      const [ticket] = await db.insert(schema.tickets).values({
        organizationId: org.id,
        number: `TKT-${String(i + 1).padStart(4, '0')}`,
        title: ticketData[i].title,
        description: `Test ticket: ${ticketData[i].title}`,
        clientId: ticketData[i].clientId,
        assigneeId: ticketData[i].assigneeId,
        priority: ticketData[i].priority,
        status: ticketData[i].status,
      }).returning();
      tickets.push(ticket);
    }

    // Create time entries
    console.log('Creating time entries...');
    const now = new Date();
    for (const ticket of tickets.slice(0, 5)) {
      await db.insert(schema.timeEntries).values({
        organizationId: org.id,
        ticketId: ticket.id,
        userId: admin.id,
        description: `Work on: ${ticket.title}`,
        startTime: new Date(now.getTime() - 3600000 * 2),
        endTime: new Date(now.getTime() - 3600000),
        duration: 60,
        billable: true,
        hourlyRate: '150.00',
      });
    }

    // Create assets
    console.log('Creating assets...');
    await db.insert(schema.assets).values([
      { organizationId: org.id, clientId: clients[0].id, name: 'Dell PowerEdge R750', type: 'server' as const, status: 'active' as const, serialNumber: 'SRV-2024-001', manufacturer: 'Dell', model: 'PowerEdge R750', location: 'Server Room A' },
      { organizationId: org.id, clientId: clients[0].id, name: 'Cisco Catalyst 9300', type: 'network' as const, status: 'active' as const, serialNumber: 'NET-2024-001', manufacturer: 'Cisco', model: 'Catalyst 9300', location: 'MDF' },
      { organizationId: org.id, clientId: clients[1].id, name: 'HP EliteBook 840 G9', type: 'hardware' as const, status: 'active' as const, serialNumber: 'LPT-2024-001', manufacturer: 'HP', model: 'EliteBook 840 G9', assignedTo: 'John Baker' },
      { organizationId: org.id, clientId: clients[2].id, name: 'Sophos XGS 2100', type: 'network' as const, status: 'active' as const, serialNumber: 'FW-2024-001', manufacturer: 'Sophos', model: 'XGS 2100', location: 'Server Room' },
      { organizationId: org.id, clientId: clients[3].id, name: 'Microsoft 365 Business Premium', type: 'software' as const, status: 'active' as const, serialNumber: 'SW-M365-001', manufacturer: 'Microsoft' },
      { organizationId: org.id, clientId: clients[4].id, name: 'Datto SIRIS 4', type: 'server' as const, status: 'maintenance' as const, serialNumber: 'BKP-2024-001', manufacturer: 'Datto', model: 'SIRIS 4', location: 'Server Closet' },
    ]);

    // Create invoices
    console.log('Creating invoices...');
    const [invoice1] = await db.insert(schema.invoices).values({
      organizationId: org.id,
      clientId: clients[0].id,
      invoiceNumber: 'INV-2026-001',
      status: 'sent',
      dateIssued: new Date('2026-03-01'),
      dateDue: new Date('2026-03-31'),
      subtotal: '4500.00',
      tax: '0.00',
      total: '4500.00',
    }).returning();

    await db.insert(schema.invoices).values({
      organizationId: org.id,
      clientId: clients[1].id,
      invoiceNumber: 'INV-2026-002',
      status: 'paid',
      dateIssued: new Date('2026-02-01'),
      dateDue: new Date('2026-02-28'),
      datePaid: new Date('2026-02-25'),
      subtotal: '2850.00',
      tax: '0.00',
      total: '2850.00',
    });

    await db.insert(schema.invoices).values({
      organizationId: org.id,
      clientId: clients[2].id,
      invoiceNumber: 'INV-2026-003',
      status: 'draft',
      dateIssued: new Date('2026-03-15'),
      dateDue: new Date('2026-04-15'),
      subtotal: '7200.00',
      tax: '0.00',
      total: '7200.00',
    });

    // Create SLA policies
    console.log('Creating SLA policies...');
    await db.insert(schema.slaPolicies).values([
      { organizationId: org.id, name: 'Enterprise Critical', slaTier: 'Enterprise', priority: 'critical', responseTimeMinutes: 15, resolutionTimeMinutes: 240, warningThresholdPercent: 70, escalationTimeMinutes: 30 },
      { organizationId: org.id, name: 'Enterprise High', slaTier: 'Enterprise', priority: 'high', responseTimeMinutes: 30, resolutionTimeMinutes: 480, warningThresholdPercent: 80 },
      { organizationId: org.id, name: 'Premium Critical', slaTier: 'Premium', priority: 'critical', responseTimeMinutes: 30, resolutionTimeMinutes: 480, warningThresholdPercent: 75 },
      { organizationId: org.id, name: 'Standard Medium', slaTier: 'Standard', priority: 'medium', responseTimeMinutes: 240, resolutionTimeMinutes: 1440, warningThresholdPercent: 80 },
    ]);

    console.log('✅ Dev seed complete!');
    console.log('');
    console.log('Login credentials:');
    console.log('  Email: admin@primeits.com');
    console.log('  Password: admin123');
    console.log('');

  } catch (error) {
    console.error('❌ Seed error:', error);
  } finally {
    await pool.end();
  }
}

seedDev();
