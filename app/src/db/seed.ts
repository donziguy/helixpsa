import { db } from './index';
import * as schema from './schema';
import { readFileSync } from 'fs';
import { join } from 'path';

// Helper to execute raw SQL
async function executeSQL(sql: string) {
  await db.execute(sql);
}

export async function seedDatabase() {
  console.log('🌱 Seeding database...');

  try {
    // First, set up RLS policies
    console.log('Setting up Row Level Security...');
    const rlsSQL = readFileSync(join(__dirname, 'setup-rls.sql'), 'utf-8');
    await executeSQL(rlsSQL);

    // Create test organizations
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

    // Create users for each organization
    console.log('Creating users...');
    const users1 = await db.insert(schema.users).values([
      {
        organizationId: org1.id,
        email: 'cory@primeits.com',
        firstName: 'Cory',
        lastName: 'Simmons',
        role: 'admin',
        hourlyRate: '175.00',
      },
      {
        organizationId: org1.id,
        email: 'mike@primeits.com',
        firstName: 'Mike',
        lastName: 'Torres',
        role: 'technician',
        hourlyRate: '150.00',
      },
      {
        organizationId: org1.id,
        email: 'jake@primeits.com',
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
        firstName: 'Sarah',
        lastName: 'Chen',
        role: 'admin',
        hourlyRate: '160.00',
      },
      {
        organizationId: org2.id,
        email: 'tech@techflow.com',
        firstName: 'Alex',
        lastName: 'Kim',
        role: 'technician',
        hourlyRate: '140.00',
      },
    ]).returning();

    // Create clients for organization 1
    console.log('Creating clients...');
    const clients1 = await db.insert(schema.clients).values([
      {
        organizationId: org1.id,
        name: 'Acme Corp',
        industry: 'Manufacturing',
        slaTier: 'Premium',
        responseTime: '1 hour',
        slaHealth: 'warning',
        onboardDate: new Date('2023-01-15'),
      },
      {
        organizationId: org1.id,
        name: 'Globex Industries',
        industry: 'Logistics',
        slaTier: 'Standard',
        responseTime: '4 hours',
        slaHealth: 'good',
        onboardDate: new Date('2022-08-22'),
      },
      {
        organizationId: org1.id,
        name: 'Wayne Enterprises',
        industry: 'Technology',
        slaTier: 'Enterprise',
        responseTime: '30 minutes',
        slaHealth: 'good',
        onboardDate: new Date('2021-12-03'),
      },
      {
        organizationId: org1.id,
        name: 'Stark Medical',
        industry: 'Healthcare',
        slaTier: 'Premium',
        responseTime: '1 hour',
        slaHealth: 'breach',
        onboardDate: new Date('2023-06-10'),
      },
      {
        organizationId: org1.id,
        name: 'Umbrella Legal',
        industry: 'Legal',
        slaTier: 'Standard',
        responseTime: '4 hours',
        slaHealth: 'good',
        onboardDate: new Date('2024-01-28'),
      },
    ]).returning();

    // Create contacts for clients
    console.log('Creating contacts...');
    await db.insert(schema.contacts).values([
      {
        organizationId: org1.id,
        clientId: clients1[0].id,
        name: 'John Smith',
        email: 'john.smith@acmecorp.com',
        phone: '(555) 123-4567',
        isPrimary: true,
        title: 'IT Director',
      },
      {
        organizationId: org1.id,
        clientId: clients1[1].id,
        name: 'Sarah Johnson',
        email: 's.johnson@globex.com',
        phone: '(555) 234-5678',
        isPrimary: true,
        title: 'Operations Manager',
      },
      {
        organizationId: org1.id,
        clientId: clients1[2].id,
        name: 'Bruce Wayne',
        email: 'b.wayne@wayneent.com',
        phone: '(555) 345-6789',
        isPrimary: true,
        title: 'CEO',
      },
      {
        organizationId: org1.id,
        clientId: clients1[3].id,
        name: 'Pepper Potts',
        email: 'p.potts@starkmed.com',
        phone: '(555) 456-7890',
        isPrimary: true,
        title: 'CTO',
      },
      {
        organizationId: org1.id,
        clientId: clients1[4].id,
        name: 'Ada Wong',
        email: 'a.wong@umbrellalegal.com',
        phone: '(555) 567-8901',
        isPrimary: true,
        title: 'IT Manager',
      },
    ]);

    // Create tickets
    console.log('Creating tickets...');
    const tickets1 = await db.insert(schema.tickets).values([
      {
        organizationId: org1.id,
        number: 'HLX-001',
        title: 'Exchange server not syncing emails',
        description: 'Users reporting emails stuck in outbox since 9am. Exchange 2019 on-prem.',
        clientId: clients1[0].id,
        assigneeId: users1[1].id, // Mike T.
        priority: 'critical',
        status: 'in_progress',
        slaDeadline: new Date(Date.now() + 3600000), // 1 hour from now
        estimatedHours: '2.0',
        createdAt: new Date(Date.now() - 7200000), // 2 hours ago
        updatedAt: new Date(Date.now() - 900000), // 15 minutes ago
      },
      {
        organizationId: org1.id,
        number: 'HLX-002',
        title: 'New employee onboarding - Sarah Chen',
        description: 'New hire starting Monday. Need M365 license, laptop setup, AD account.',
        clientId: clients1[1].id,
        assigneeId: users1[2].id, // Jake R.
        priority: 'medium',
        status: 'open',
        slaDeadline: new Date(Date.now() + 14400000), // 4 hours from now
        estimatedHours: '1.5',
        createdAt: new Date(Date.now() - 10800000), // 3 hours ago
      },
      {
        organizationId: org1.id,
        number: 'HLX-003',
        title: 'Firewall rule change request',
        description: 'Need to open port 8443 for new VPN appliance. Change window approved for tonight.',
        clientId: clients1[2].id,
        assigneeId: users1[0].id, // Cory S.
        priority: 'high',
        status: 'waiting',
        slaDeadline: new Date(Date.now() + 7200000), // 2 hours from now
        estimatedHours: '1.0',
        createdAt: new Date(Date.now() - 86400000), // 1 day ago
        updatedAt: new Date(Date.now() - 14400000), // 4 hours ago
      },
      {
        organizationId: org1.id,
        number: 'HLX-004',
        title: 'Printer offline on 3rd floor',
        description: 'HP LaserJet in conference room showing offline. Users printing to 2nd floor instead.',
        clientId: clients1[0].id,
        assigneeId: users1[1].id, // Mike T.
        priority: 'low',
        status: 'open',
        slaDeadline: new Date(Date.now() + 28800000), // 8 hours from now
        estimatedHours: '0.5',
        createdAt: new Date(Date.now() - 18000000), // 5 hours ago
      },
      {
        organizationId: org1.id,
        number: 'HLX-005',
        title: 'Ransomware alert - endpoint quarantined',
        description: 'SentinelOne flagged suspicious process on WORKSTATION-042. Machine isolated. Investigating.',
        clientId: clients1[3].id,
        assigneeId: users1[0].id, // Cory S.
        priority: 'critical',
        status: 'in_progress',
        slaDeadline: new Date(Date.now() + 1800000), // 30 minutes from now
        estimatedHours: '3.0',
        createdAt: new Date(Date.now() - 2700000), // 45 minutes ago
        updatedAt: new Date(Date.now() - 300000), // 5 minutes ago
      },
    ]).returning();

    // Create time entries
    console.log('Creating time entries...');
    await db.insert(schema.timeEntries).values([
      {
        organizationId: org1.id,
        ticketId: tickets1[0].id,
        userId: users1[1].id, // Mike T.
        description: 'Investigating email sync issues',
        startTime: new Date('2026-03-20T14:30:00'),
        endTime: new Date('2026-03-20T15:15:00'),
        duration: 45,
        billable: true,
        hourlyRate: '150.00',
      },
      {
        organizationId: org1.id,
        ticketId: tickets1[2].id,
        userId: users1[0].id, // Cory S.
        description: 'Research and planning for firewall changes',
        startTime: new Date('2026-03-20T10:00:00'),
        endTime: new Date('2026-03-20T10:30:00'),
        duration: 30,
        billable: true,
        hourlyRate: '175.00',
      },
      {
        organizationId: org1.id,
        ticketId: tickets1[4].id,
        userId: users1[0].id, // Cory S.
        description: 'Initial response and investigation',
        startTime: new Date('2026-03-20T18:45:00'),
        endTime: new Date('2026-03-20T19:25:00'),
        duration: 40,
        billable: true,
        hourlyRate: '175.00',
      },
    ]);

    // Create some notes
    console.log('Creating notes...');
    await db.insert(schema.notes).values([
      {
        organizationId: org1.id,
        ticketId: tickets1[0].id,
        userId: users1[1].id,
        content: 'Checked Exchange services - all running. Issue appears to be with mail flow rules.',
        isInternal: true,
      },
      {
        organizationId: org1.id,
        ticketId: tickets1[4].id,
        userId: users1[0].id,
        content: 'SentinelOne detected TrojanDropper behavior. Machine isolated and scanning in progress.',
        isInternal: false,
      },
    ]);

    console.log('✅ Database seeded successfully!');
    console.log(`Organizations created: ${org1.name}, ${org2.name}`);
    console.log(`Users created: ${users1.length + users2.length} total`);
    console.log(`Clients created: ${clients1.length} for ${org1.name}`);
    console.log(`Tickets created: ${tickets1.length}`);
    
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

// Run seed if called directly
if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('Seed completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seed failed:', error);
      process.exit(1);
    });
}