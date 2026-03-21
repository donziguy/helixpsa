export type Priority = "critical" | "high" | "medium" | "low";
export type Status = "open" | "in_progress" | "waiting" | "resolved" | "closed";

export interface Ticket {
  id: string;
  number: string;
  title: string;
  client: string;
  assignee: string;
  priority: Priority;
  status: Status;
  sla: string;
  created: string;
  updated: string;
  description: string;
  timeSpent: number; // minutes
}

export interface Client {
  id: string;
  name: string;
  ticketCount: number;
  monthlyHours: number;
  contact: {
    name: string;
    email: string;
    phone: string;
  };
  sla: {
    tier: string;
    responseTime: string;
    health: "good" | "warning" | "breach";
  };
  industry: string;
  onboardDate: string;
}

export interface TimeEntry {
  id: string;
  ticketId: string;
  ticketNumber: string;
  ticketTitle: string;
  client: string;
  assignee: string;
  description: string;
  startTime: string;
  endTime: string | null;
  duration: number; // minutes
  billable: boolean;
  hourlyRate: number;
  date: string; // YYYY-MM-DD
}

export const clients: Client[] = [
  { 
    id: "c1", 
    name: "Acme Corp", 
    ticketCount: 12, 
    monthlyHours: 45,
    contact: { name: "John Smith", email: "john.smith@acmecorp.com", phone: "(555) 123-4567" },
    sla: { tier: "Premium", responseTime: "1 hour", health: "warning" },
    industry: "Manufacturing",
    onboardDate: "2023-01-15"
  },
  { 
    id: "c2", 
    name: "Globex Industries", 
    ticketCount: 8, 
    monthlyHours: 32,
    contact: { name: "Sarah Johnson", email: "s.johnson@globex.com", phone: "(555) 234-5678" },
    sla: { tier: "Standard", responseTime: "4 hours", health: "good" },
    industry: "Logistics",
    onboardDate: "2022-08-22"
  },
  { 
    id: "c3", 
    name: "Wayne Enterprises", 
    ticketCount: 15, 
    monthlyHours: 67,
    contact: { name: "Bruce Wayne", email: "b.wayne@wayneent.com", phone: "(555) 345-6789" },
    sla: { tier: "Enterprise", responseTime: "30 minutes", health: "good" },
    industry: "Technology",
    onboardDate: "2021-12-03"
  },
  { 
    id: "c4", 
    name: "Stark Medical", 
    ticketCount: 5, 
    monthlyHours: 18,
    contact: { name: "Pepper Potts", email: "p.potts@starkmed.com", phone: "(555) 456-7890" },
    sla: { tier: "Premium", responseTime: "1 hour", health: "breach" },
    industry: "Healthcare",
    onboardDate: "2023-06-10"
  },
  { 
    id: "c5", 
    name: "Umbrella Legal", 
    ticketCount: 3, 
    monthlyHours: 12,
    contact: { name: "Ada Wong", email: "a.wong@umbrellalegal.com", phone: "(555) 567-8901" },
    sla: { tier: "Standard", responseTime: "4 hours", health: "good" },
    industry: "Legal",
    onboardDate: "2024-01-28"
  },
];

export const tickets: Ticket[] = [
  {
    id: "t1", number: "HLX-001", title: "Exchange server not syncing emails",
    client: "Acme Corp", assignee: "Mike T.", priority: "critical", status: "in_progress",
    sla: "1h remaining", created: "2h ago", updated: "15m ago",
    description: "Users reporting emails stuck in outbox since 9am. Exchange 2019 on-prem.",
    timeSpent: 45
  },
  {
    id: "t2", number: "HLX-002", title: "New employee onboarding - Sarah Chen",
    client: "Globex Industries", assignee: "Jake R.", priority: "medium", status: "open",
    sla: "4h remaining", created: "3h ago", updated: "3h ago",
    description: "New hire starting Monday. Need M365 license, laptop setup, AD account.",
    timeSpent: 0
  },
  {
    id: "t3", number: "HLX-003", title: "Firewall rule change request",
    client: "Wayne Enterprises", assignee: "Cory S.", priority: "high", status: "waiting",
    sla: "2h remaining", created: "1d ago", updated: "4h ago",
    description: "Need to open port 8443 for new VPN appliance. Change window approved for tonight.",
    timeSpent: 30
  },
  {
    id: "t4", number: "HLX-004", title: "Printer offline on 3rd floor",
    client: "Acme Corp", assignee: "Mike T.", priority: "low", status: "open",
    sla: "8h remaining", created: "5h ago", updated: "5h ago",
    description: "HP LaserJet in conference room showing offline. Users printing to 2nd floor instead.",
    timeSpent: 0
  },
  {
    id: "t5", number: "HLX-005", title: "Ransomware alert - endpoint quarantined",
    client: "Stark Medical", assignee: "Cory S.", priority: "critical", status: "in_progress",
    sla: "30m remaining", created: "45m ago", updated: "5m ago",
    description: "SentinelOne flagged suspicious process on WORKSTATION-042. Machine isolated. Investigating.",
    timeSpent: 40
  },
  {
    id: "t6", number: "HLX-006", title: "VPN disconnecting intermittently",
    client: "Umbrella Legal", assignee: "Jake R.", priority: "high", status: "in_progress",
    sla: "3h remaining", created: "6h ago", updated: "1h ago",
    description: "3 remote users dropping VPN every 15-20 min. FortiClient on Windows 11.",
    timeSpent: 90
  },
  {
    id: "t7", number: "HLX-007", title: "Azure AD conditional access policy review",
    client: "Wayne Enterprises", assignee: "Cory S.", priority: "medium", status: "open",
    sla: "24h remaining", created: "1d ago", updated: "1d ago",
    description: "Annual review of conditional access policies. Check MFA enrollment and compliant device requirements.",
    timeSpent: 0
  },
  {
    id: "t8", number: "HLX-008", title: "Backup job failed - SQL server",
    client: "Globex Industries", assignee: "Mike T.", priority: "high", status: "waiting",
    sla: "6h remaining", created: "8h ago", updated: "2h ago",
    description: "Veeam backup of SQL-PROD-01 failed with insufficient space. Waiting on storage approval.",
    timeSpent: 25
  },
  {
    id: "t9", number: "HLX-009", title: "Teams meeting room display not working",
    client: "Acme Corp", assignee: "Jake R.", priority: "low", status: "resolved",
    sla: "Completed", created: "2d ago", updated: "4h ago",
    description: "Board room Teams display showing black screen. Power cycled, updated firmware.",
    timeSpent: 35
  },
  {
    id: "t10", number: "HLX-010", title: "SSL certificate expiring in 7 days",
    client: "Stark Medical", assignee: "Cory S.", priority: "medium", status: "open",
    sla: "48h remaining", created: "1d ago", updated: "1d ago",
    description: "Wildcard cert for *.starkmedical.com expiring 3/27. Need to renew and deploy.",
    timeSpent: 0
  },
];

export const statusLabels: Record<Status, string> = {
  open: "Open",
  in_progress: "In Progress",
  waiting: "Waiting",
  resolved: "Resolved",
  closed: "Closed",
};

export const priorityConfig: Record<Priority, { label: string; color: string; bg: string }> = {
  critical: { label: "Critical", color: "#ef4444", bg: "rgba(239,68,68,0.15)" },
  high: { label: "High", color: "#f59e0b", bg: "rgba(245,158,11,0.15)" },
  medium: { label: "Medium", color: "#3b82f6", bg: "rgba(59,130,246,0.15)" },
  low: { label: "Low", color: "#6b7280", bg: "rgba(107,114,128,0.15)" },
};

export const statusConfig: Record<Status, { label: string; color: string; bg: string }> = {
  open: { label: "Open", color: "#3b82f6", bg: "rgba(59,130,246,0.15)" },
  in_progress: { label: "In Progress", color: "#f59e0b", bg: "rgba(245,158,11,0.15)" },
  waiting: { label: "Waiting", color: "#a855f7", bg: "rgba(168,85,247,0.15)" },
  resolved: { label: "Resolved", color: "#22c55e", bg: "rgba(34,197,94,0.15)" },
  closed: { label: "Closed", color: "#6b7280", bg: "rgba(107,114,128,0.15)" },
};

export const slaHealthConfig = {
  good: { label: "Good", color: "#22c55e", bg: "rgba(34,197,94,0.15)" },
  warning: { label: "Warning", color: "#f59e0b", bg: "rgba(245,158,11,0.15)" },
  breach: { label: "Breach", color: "#ef4444", bg: "rgba(239,68,68,0.15)" },
};

export const timeEntries: TimeEntry[] = [
  {
    id: "te1",
    ticketId: "t1",
    ticketNumber: "HLX-001",
    ticketTitle: "Exchange server not syncing emails",
    client: "Acme Corp",
    assignee: "Mike T.",
    description: "Investigating email sync issues",
    startTime: "2026-03-20T14:30:00",
    endTime: "2026-03-20T15:15:00",
    duration: 45,
    billable: true,
    hourlyRate: 150,
    date: "2026-03-20"
  },
  {
    id: "te2",
    ticketId: "t3",
    ticketNumber: "HLX-003",
    ticketTitle: "Firewall rule change request",
    client: "Wayne Enterprises",
    assignee: "Cory S.",
    description: "Research and planning for firewall changes",
    startTime: "2026-03-20T10:00:00",
    endTime: "2026-03-20T10:30:00",
    duration: 30,
    billable: true,
    hourlyRate: 175,
    date: "2026-03-20"
  },
  {
    id: "te3",
    ticketId: "t5",
    ticketNumber: "HLX-005",
    ticketTitle: "Ransomware alert - endpoint quarantined",
    client: "Stark Medical",
    assignee: "Cory S.",
    description: "Initial response and investigation",
    startTime: "2026-03-20T18:45:00",
    endTime: "2026-03-20T19:25:00",
    duration: 40,
    billable: true,
    hourlyRate: 175,
    date: "2026-03-20"
  },
  {
    id: "te4",
    ticketId: "t6",
    ticketNumber: "HLX-006",
    ticketTitle: "VPN disconnecting intermittently",
    client: "Umbrella Legal",
    assignee: "Jake R.",
    description: "Client troubleshooting and log review",
    startTime: "2026-03-20T13:00:00",
    endTime: "2026-03-20T14:30:00",
    duration: 90,
    billable: true,
    hourlyRate: 125,
    date: "2026-03-20"
  },
  {
    id: "te5",
    ticketId: "t8",
    ticketNumber: "HLX-008",
    ticketTitle: "Backup job failed - SQL server",
    client: "Globex Industries",
    assignee: "Mike T.",
    description: "Backup troubleshooting",
    startTime: "2026-03-20T11:30:00",
    endTime: "2026-03-20T11:55:00",
    duration: 25,
    billable: true,
    hourlyRate: 150,
    date: "2026-03-20"
  },
  {
    id: "te6",
    ticketId: "t9",
    ticketNumber: "HLX-009",
    ticketTitle: "Teams meeting room display not working",
    client: "Acme Corp",
    assignee: "Jake R.",
    description: "Hardware troubleshooting and firmware update",
    startTime: "2026-03-19T15:00:00",
    endTime: "2026-03-19T15:35:00",
    duration: 35,
    billable: true,
    hourlyRate: 125,
    date: "2026-03-19"
  },
  {
    id: "te7",
    ticketId: "t1",
    ticketNumber: "HLX-001",
    ticketTitle: "Exchange server not syncing emails",
    client: "Acme Corp",
    assignee: "Mike T.",
    description: "Team standup meeting",
    startTime: "2026-03-19T09:00:00",
    endTime: "2026-03-19T09:30:00",
    duration: 30,
    billable: false,
    hourlyRate: 150,
    date: "2026-03-19"
  },
  {
    id: "te8",
    ticketId: "t2",
    ticketNumber: "HLX-002",
    ticketTitle: "New employee onboarding - Sarah Chen",
    client: "Globex Industries",
    assignee: "Jake R.",
    description: "Prep work for new hire setup",
    startTime: "2026-03-19T16:00:00",
    endTime: "2026-03-19T16:45:00",
    duration: 45,
    billable: true,
    hourlyRate: 125,
    date: "2026-03-19"
  },
  {
    id: "te9",
    ticketId: "t7",
    ticketNumber: "HLX-007",
    ticketTitle: "Azure AD conditional access policy review",
    client: "Wayne Enterprises",
    assignee: "Cory S.",
    description: "Policy review and documentation",
    startTime: "2026-03-18T14:00:00",
    endTime: "2026-03-18T15:30:00",
    duration: 90,
    billable: true,
    hourlyRate: 175,
    date: "2026-03-18"
  },
  {
    id: "te10",
    ticketId: "t4",
    ticketNumber: "HLX-004",
    ticketTitle: "Printer offline on 3rd floor",
    client: "Acme Corp",
    assignee: "Mike T.",
    description: "On-site printer diagnostics",
    startTime: "2026-03-18T10:15:00",
    endTime: "2026-03-18T11:00:00",
    duration: 45,
    billable: true,
    hourlyRate: 150,
    date: "2026-03-18"
  }
];
