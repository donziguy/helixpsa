"use client";

import { tickets, clients, timeEntries } from "@/lib/mock-data";

interface StatCardProps {
  title: string;
  value: string | number;
  subtext?: string;
  icon: string;
  color: string;
  trend?: {
    direction: "up" | "down";
    value: string;
  };
}

function StatCard({ title, value, subtext, icon, color, trend }: StatCardProps) {
  return (
    <div style={{
      background: "var(--bg-secondary)",
      border: "1px solid var(--border-subtle)",
      borderRadius: 12,
      padding: 24,
      display: "flex",
      flexDirection: "column",
      gap: 16,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{
          width: 48,
          height: 48,
          borderRadius: 12,
          background: color,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 20,
        }}>
          {icon}
        </div>
        {trend && (
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            fontSize: 12,
            fontWeight: 500,
            color: trend.direction === "up" ? "#22c55e" : "#ef4444",
          }}>
            <span>{trend.direction === "up" ? "↗" : "↘"}</span>
            <span>{trend.value}</span>
          </div>
        )}
      </div>
      
      <div>
        <div style={{ fontSize: 32, fontWeight: 700, color: "var(--text)", lineHeight: 1 }}>
          {value}
        </div>
        {subtext && (
          <div style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 4 }}>
            {subtext}
          </div>
        )}
        <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 2 }}>
          {title}
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  // Calculate stats
  const openTickets = tickets.filter(t => t.status === "open" || t.status === "in_progress").length;
  const criticalTickets = tickets.filter(t => t.priority === "critical").length;
  const slaBreaches = clients.filter(c => c.sla.health === "breach").length;
  
  // Calculate today's hours (mock calculation)
  const today = new Date().toISOString().split("T")[0];
  const todaysEntries = timeEntries.filter(entry => entry.date === today);
  const hoursToday = todaysEntries.reduce((sum, entry) => sum + entry.duration, 0) / 60;
  
  // Calculate revenue (mock calculation)
  const billableEntries = timeEntries.filter(entry => entry.billable);
  const totalRevenue = billableEntries.reduce((sum, entry) => {
    return sum + (entry.duration / 60) * entry.hourlyRate;
  }, 0);

  // Recent activity (last 5 tickets by update time)
  const recentTickets = [...tickets]
    .sort((a, b) => {
      // Simple sort by update time (newest first)
      const timeA = a.updated.includes("m") ? parseInt(a.updated) : 
                   a.updated.includes("h") ? parseInt(a.updated) * 60 :
                   a.updated.includes("d") ? parseInt(a.updated) * 1440 : 0;
      const timeB = b.updated.includes("m") ? parseInt(b.updated) : 
                   b.updated.includes("h") ? parseInt(b.updated) * 60 :
                   b.updated.includes("d") ? parseInt(b.updated) * 1440 : 0;
      return timeA - timeB;
    })
    .slice(0, 5);

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>
          Dashboard
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
          Welcome back! Here's what's happening with your PSA today.
        </p>
      </div>

      {/* Stats Grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
        gap: 20,
        marginBottom: 32,
      }}>
        <StatCard
          title="Open Tickets"
          value={openTickets}
          subtext={`${criticalTickets} critical`}
          icon="🎫"
          color="rgba(59,130,246,0.1)"
          trend={{ direction: "up", value: "+3" }}
        />
        <StatCard
          title="SLA Breaches"
          value={slaBreaches}
          subtext="Needs attention"
          icon="⚠️"
          color="rgba(239,68,68,0.1)"
          trend={{ direction: "down", value: "-1" }}
        />
        <StatCard
          title="Hours Today"
          value={hoursToday.toFixed(1)}
          subtext={`${todaysEntries.length} entries`}
          icon="⏱️"
          color="rgba(34,197,94,0.1)"
          trend={{ direction: "up", value: "+2.5h" }}
        />
        <StatCard
          title="Monthly Revenue"
          value={`$${Math.round(totalRevenue).toLocaleString()}`}
          subtext="Billable time"
          icon="💰"
          color="rgba(245,158,11,0.1)"
          trend={{ direction: "up", value: "+8%" }}
        />
      </div>

      {/* Content Grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "2fr 1fr",
        gap: 24,
      }}>
        {/* Recent Activity */}
        <div style={{
          background: "var(--bg-secondary)",
          border: "1px solid var(--border-subtle)",
          borderRadius: 12,
          padding: 24,
        }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: "var(--text)", marginBottom: 16 }}>
            Recent Activity
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {recentTickets.map((ticket) => (
              <div
                key={ticket.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: 12,
                  background: "var(--bg)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: 8,
                  cursor: "pointer",
                }}
              >
                <div style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: 
                    ticket.priority === "critical" ? "#ef4444" :
                    ticket.priority === "high" ? "#f59e0b" :
                    ticket.priority === "medium" ? "#3b82f6" : "#6b7280",
                  flexShrink: 0,
                }} />
                
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text)" }}>
                    {ticket.number} • {ticket.title}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    {ticket.client} • Updated {ticket.updated}
                  </div>
                </div>
                
                <div style={{
                  padding: "4px 8px",
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 500,
                  background: 
                    ticket.status === "open" ? "rgba(59,130,246,0.15)" :
                    ticket.status === "in_progress" ? "rgba(245,158,11,0.15)" :
                    ticket.status === "waiting" ? "rgba(168,85,247,0.15)" :
                    ticket.status === "resolved" ? "rgba(34,197,94,0.15)" :
                    "rgba(107,114,128,0.15)",
                  color:
                    ticket.status === "open" ? "#3b82f6" :
                    ticket.status === "in_progress" ? "#f59e0b" :
                    ticket.status === "waiting" ? "#a855f7" :
                    ticket.status === "resolved" ? "#22c55e" :
                    "#6b7280",
                }}>
                  {ticket.status.replace("_", " ")}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Stats */}
        <div style={{
          background: "var(--bg-secondary)",
          border: "1px solid var(--border-subtle)",
          borderRadius: 12,
          padding: 24,
        }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: "var(--text)", marginBottom: 16 }}>
            Quick Stats
          </h2>
          
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Client Health */}
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text)", marginBottom: 8 }}>
                Client Health
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {["good", "warning", "breach"].map((health) => {
                  const count = clients.filter(c => c.sla.health === health).length;
                  const color = health === "good" ? "#22c55e" : health === "warning" ? "#f59e0b" : "#ef4444";
                  const percentage = Math.round((count / clients.length) * 100);
                  
                  return (
                    <div key={health} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{
                        width: 12,
                        height: 12,
                        borderRadius: "50%",
                        background: color,
                      }} />
                      <span style={{ fontSize: 13, color: "var(--text-secondary)", flex: 1 }}>
                        {health.charAt(0).toUpperCase() + health.slice(1)}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text)" }}>
                        {count} ({percentage}%)
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Priority Distribution */}
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text)", marginBottom: 8 }}>
                Ticket Priorities
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {["critical", "high", "medium", "low"].map((priority) => {
                  const count = tickets.filter(t => t.priority === priority && (t.status === "open" || t.status === "in_progress")).length;
                  const color = 
                    priority === "critical" ? "#ef4444" :
                    priority === "high" ? "#f59e0b" :
                    priority === "medium" ? "#3b82f6" : "#6b7280";
                  
                  return (
                    <div key={priority} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{
                        width: 12,
                        height: 12,
                        borderRadius: "50%",
                        background: color,
                      }} />
                      <span style={{ fontSize: 13, color: "var(--text-secondary)", flex: 1 }}>
                        {priority.charAt(0).toUpperCase() + priority.slice(1)}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text)" }}>
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}