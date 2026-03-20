"use client";

import { useState } from "react";
import { tickets, priorityConfig, statusConfig, type Ticket, type Status } from "@/lib/mock-data";

function TicketCard({ ticket }: { ticket: Ticket }) {
  const priority = priorityConfig[ticket.priority];
  const status = statusConfig[ticket.status];

  return (
    <div
      style={{
        background: "var(--bg-secondary)",
        border: "1px solid var(--border-subtle)",
        borderRadius: 8,
        padding: "12px 14px",
        cursor: "pointer",
        transition: "all 100ms ease",
        borderLeft: `3px solid ${priority.color}`,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "var(--border)";
        e.currentTarget.style.background = "var(--bg-tertiary)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--border-subtle)";
        e.currentTarget.style.borderLeftColor = priority.color;
        e.currentTarget.style.background = "var(--bg-secondary)";
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "monospace" }}>{ticket.number}</span>
        <span style={{
          fontSize: 11, padding: "2px 8px", borderRadius: 99,
          background: priority.bg, color: priority.color, fontWeight: 500,
        }}>{priority.label}</span>
      </div>

      {/* Title */}
      <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text)", marginBottom: 8, lineHeight: 1.4 }}>
        {ticket.title}
      </div>

      {/* Meta */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12 }}>
        <span style={{ color: "var(--text-secondary)" }}>{ticket.client}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {ticket.timeSpent > 0 && (
            <span style={{ color: "var(--text-muted)" }}>⏱ {ticket.timeSpent}m</span>
          )}
          <span style={{ color: "var(--text-muted)" }}>{ticket.updated}</span>
        </div>
      </div>

      {/* Assignee & SLA */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8, fontSize: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{
            width: 20, height: 20, borderRadius: "50%",
            background: "var(--accent)", display: "flex",
            alignItems: "center", justifyContent: "center",
            fontSize: 9, fontWeight: 600, color: "white",
          }}>{ticket.assignee.split(" ").map(n => n[0]).join("")}</div>
          <span style={{ color: "var(--text-secondary)" }}>{ticket.assignee}</span>
        </div>
        <span style={{
          color: ticket.sla.includes("30m") || ticket.sla.includes("1h") ? "var(--danger)" : "var(--text-muted)",
          fontWeight: ticket.sla.includes("30m") || ticket.sla.includes("1h") ? 500 : 400,
        }}>
          {ticket.sla !== "Completed" ? "⏳ " : "✅ "}{ticket.sla}
        </span>
      </div>
    </div>
  );
}

const columns: { status: Status; label: string }[] = [
  { status: "open", label: "Open" },
  { status: "in_progress", label: "In Progress" },
  { status: "waiting", label: "Waiting" },
  { status: "resolved", label: "Resolved" },
];

export default function TicketBoard() {
  const [view, setView] = useState<"board" | "list">("board");

  if (view === "list") {
    return (
      <div>
        <BoardHeader view={view} setView={setView} />
        <TicketList />
      </div>
    );
  }

  return (
    <div>
      <BoardHeader view={view} setView={setView} />
      <div style={{
        display: "grid",
        gridTemplateColumns: `repeat(${columns.length}, 1fr)`,
        gap: 16,
        padding: "0 0 24px",
        minHeight: "calc(100vh - 160px)",
      }}>
        {columns.map((col) => {
          const colTickets = tickets.filter((t) => t.status === col.status);
          const sc = statusConfig[col.status];
          return (
            <div key={col.status} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {/* Column header */}
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "8px 4px", borderBottom: `2px solid ${sc.color}`, marginBottom: 4,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{
                    width: 8, height: 8, borderRadius: "50%", background: sc.color,
                  }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{col.label}</span>
                  <span style={{
                    fontSize: 12, color: "var(--text-muted)",
                    background: "var(--bg-tertiary)", padding: "1px 8px", borderRadius: 99,
                  }}>{colTickets.length}</span>
                </div>
                <button style={{
                  background: "none", border: "none", color: "var(--text-muted)",
                  cursor: "pointer", fontSize: 18, lineHeight: 1, padding: "0 4px",
                }}>+</button>
              </div>

              {/* Cards */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {colTickets.map((ticket) => (
                  <TicketCard key={ticket.id} ticket={ticket} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BoardHeader({ view, setView }: { view: string; setView: (v: "board" | "list") => void }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      marginBottom: 20,
    }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em" }}>Tickets</h1>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>
          {tickets.length} active tickets across {new Set(tickets.map(t => t.client)).size} clients
        </p>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {/* View toggle */}
        <div style={{
          display: "flex", background: "var(--bg-tertiary)", borderRadius: 6,
          border: "1px solid var(--border-subtle)", overflow: "hidden",
        }}>
          <button
            onClick={() => setView("board")}
            style={{
              padding: "6px 12px", fontSize: 13, border: "none", cursor: "pointer",
              background: view === "board" ? "var(--accent-muted)" : "transparent",
              color: view === "board" ? "var(--accent-hover)" : "var(--text-muted)",
              fontWeight: view === "board" ? 500 : 400, fontFamily: "inherit",
            }}
          >Board</button>
          <button
            onClick={() => setView("list")}
            style={{
              padding: "6px 12px", fontSize: 13, border: "none", cursor: "pointer",
              background: view === "list" ? "var(--accent-muted)" : "transparent",
              color: view === "list" ? "var(--accent-hover)" : "var(--text-muted)",
              fontWeight: view === "list" ? 500 : 400, fontFamily: "inherit",
            }}
          >List</button>
        </div>
        {/* New ticket */}
        <button style={{
          padding: "8px 16px", fontSize: 13, fontWeight: 500,
          background: "var(--accent)", color: "white", border: "none",
          borderRadius: 6, cursor: "pointer", fontFamily: "inherit",
          transition: "background 100ms ease",
        }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--accent-hover)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "var(--accent)"; }}
        >+ New Ticket</button>
      </div>
    </div>
  );
}

function TicketList() {
  return (
    <div style={{
      background: "var(--bg-secondary)", borderRadius: 8,
      border: "1px solid var(--border-subtle)", overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "80px 1fr 140px 100px 90px 80px 100px",
        padding: "10px 16px", borderBottom: "1px solid var(--border)",
        fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em",
      }}>
        <span>ID</span><span>Title</span><span>Client</span><span>Assignee</span>
        <span>Priority</span><span>Time</span><span>SLA</span>
      </div>

      {/* Rows */}
      {tickets.map((ticket) => {
        const priority = priorityConfig[ticket.priority];
        const status = statusConfig[ticket.status];
        return (
          <div
            key={ticket.id}
            style={{
              display: "grid",
              gridTemplateColumns: "80px 1fr 140px 100px 90px 80px 100px",
              padding: "10px 16px", borderBottom: "1px solid var(--border-subtle)",
              fontSize: 13, cursor: "pointer", transition: "background 50ms ease",
              alignItems: "center",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-hover)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            <span style={{ fontFamily: "monospace", color: "var(--accent)", fontSize: 12 }}>{ticket.number}</span>
            <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
              <span style={{
                width: 8, height: 8, borderRadius: "50%", background: status.color, flexShrink: 0,
              }} />
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ticket.title}</span>
            </div>
            <span style={{ color: "var(--text-secondary)" }}>{ticket.client}</span>
            <span style={{ color: "var(--text-secondary)" }}>{ticket.assignee}</span>
            <span style={{
              fontSize: 11, padding: "2px 8px", borderRadius: 99,
              background: priority.bg, color: priority.color, fontWeight: 500, textAlign: "center",
            }}>{priority.label}</span>
            <span style={{ color: "var(--text-muted)" }}>{ticket.timeSpent > 0 ? `${ticket.timeSpent}m` : "—"}</span>
            <span style={{
              fontSize: 12,
              color: ticket.sla.includes("30m") || ticket.sla.includes("1h") ? "var(--danger)" : "var(--text-muted)",
              fontWeight: ticket.sla.includes("30m") || ticket.sla.includes("1h") ? 500 : 400,
            }}>{ticket.sla}</span>
          </div>
        );
      })}
    </div>
  );
}
