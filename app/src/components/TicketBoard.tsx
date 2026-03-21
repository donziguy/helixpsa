"use client";

import { useState, useRef } from "react";
import { priorityConfig, statusConfig, type Ticket, type Status, type Priority } from "@/lib/mock-data";
import InlineEdit from "./InlineEdit";

interface TicketBoardProps {
  tickets: Ticket[];
  onTicketClick: (ticket: Ticket) => void;
  onStatusChange: (ticketId: string, status: Status) => void;
  onTicketUpdate: (ticketId: string, updates: Partial<Ticket>) => void;
  timer: { ticketId: string; seconds: number; running: boolean } | null;
}

function TicketCard({ ticket, onClick, isDragging, timer, onUpdate }: {
  ticket: Ticket; onClick: () => void; isDragging: boolean;
  timer: { ticketId: string; seconds: number; running: boolean } | null;
  onUpdate: (ticketId: string, updates: Partial<Ticket>) => void;
}) {
  const priority = priorityConfig[ticket.priority];
  const isTimerActive = timer?.ticketId === ticket.id && timer.running;

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("ticketId", ticket.id);
        e.dataTransfer.effectAllowed = "move";
        (e.target as HTMLElement).style.opacity = "0.5";
      }}
      onDragEnd={(e) => { (e.target as HTMLElement).style.opacity = "1"; }}
      onClick={onClick}
      style={{
        background: isTimerActive ? "rgba(34,197,94,0.05)" : "var(--bg-secondary)",
        border: `1px solid ${isTimerActive ? "rgba(34,197,94,0.2)" : "var(--border-subtle)"}`,
        borderRadius: 8,
        padding: "12px 14px",
        cursor: "pointer",
        transition: "all 100ms ease",
        borderLeft: `3px solid ${priority.color}`,
        opacity: isDragging ? 0.5 : 1,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "var(--border)";
        e.currentTarget.style.background = isTimerActive ? "rgba(34,197,94,0.08)" : "var(--bg-tertiary)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = isTimerActive ? "rgba(34,197,94,0.2)" : "var(--border-subtle)";
        e.currentTarget.style.borderLeftColor = priority.color;
        e.currentTarget.style.background = isTimerActive ? "rgba(34,197,94,0.05)" : "var(--bg-secondary)";
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "monospace" }}>{ticket.number}</span>
          {isTimerActive && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", animation: "pulse 2s infinite" }} />}
        </div>
        <InlineEdit
          value={ticket.priority}
          onSave={(newPriority) => onUpdate(ticket.id, { priority: newPriority as Priority })}
          selectOptions={Object.entries(priorityConfig).map(([value, config]) => ({
            value,
            label: config.label,
          }))}
          style={{
            fontSize: 11, padding: "2px 8px", borderRadius: 99,
            background: priority.bg, color: priority.color, fontWeight: 500,
            border: "none", display: "inline-block", minWidth: "auto",
          }}
        />
      </div>
      <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text)", marginBottom: 8, lineHeight: 1.4 }}>
        <InlineEdit
          value={ticket.title}
          onSave={(newTitle) => onUpdate(ticket.id, { title: newTitle })}
          style={{ fontSize: 14, fontWeight: 500, color: "var(--text)", lineHeight: 1.4 }}
        />
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12 }}>
        <span style={{ color: "var(--text-secondary)" }}>{ticket.client}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {ticket.timeSpent > 0 && <span style={{ color: "var(--text-muted)" }}>⏱ {ticket.timeSpent}m</span>}
          <span style={{ color: "var(--text-muted)" }}>{ticket.updated}</span>
        </div>
      </div>
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

export default function TicketBoard({ tickets, onTicketClick, onStatusChange, onTicketUpdate, timer }: TicketBoardProps) {
  const [view, setView] = useState<"board" | "list">("board");
  const [dragOverColumn, setDragOverColumn] = useState<Status | null>(null);
  
  // Filter and search state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClient, setSelectedClient] = useState("");
  const [selectedAssignee, setSelectedAssignee] = useState("");
  const [selectedPriority, setSelectedPriority] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  
  // Get unique values for filters
  const allClients = [...new Set(tickets.map(t => t.client))].sort();
  const allAssignees = [...new Set(tickets.map(t => t.assignee))].sort();
  const allPriorities = Object.keys(priorityConfig);
  const allStatuses = Object.keys(statusConfig);
  
  // Filter tickets based on search and filters
  const filteredTickets = tickets.filter(ticket => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch = 
        ticket.title.toLowerCase().includes(query) ||
        ticket.number.toLowerCase().includes(query) ||
        ticket.client.toLowerCase().includes(query) ||
        ticket.assignee.toLowerCase().includes(query) ||
        ticket.description.toLowerCase().includes(query);
      
      if (!matchesSearch) return false;
    }
    
    // Client filter
    if (selectedClient && ticket.client !== selectedClient) return false;
    
    // Assignee filter
    if (selectedAssignee && ticket.assignee !== selectedAssignee) return false;
    
    // Priority filter
    if (selectedPriority && ticket.priority !== selectedPriority) return false;
    
    // Status filter
    if (selectedStatus && ticket.status !== selectedStatus) return false;
    
    return true;
  });

  const handleDrop = (e: React.DragEvent, targetStatus: Status) => {
    e.preventDefault();
    const ticketId = e.dataTransfer.getData("ticketId");
    if (ticketId) onStatusChange(ticketId, targetStatus);
    setDragOverColumn(null);
  };

  const handleDragOver = (e: React.DragEvent, status: Status) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverColumn(status);
  };

  return (
    <div>
      <BoardHeader 
        view={view} 
        setView={setView} 
        ticketCount={filteredTickets.length} 
        totalTicketCount={tickets.length}
        clientCount={new Set(filteredTickets.map(t => t.client)).size}
      />
      
      <FiltersAndSearch
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedClient={selectedClient}
        setSelectedClient={setSelectedClient}
        selectedAssignee={selectedAssignee}
        setSelectedAssignee={setSelectedAssignee}
        selectedPriority={selectedPriority}
        setSelectedPriority={setSelectedPriority}
        selectedStatus={selectedStatus}
        setSelectedStatus={setSelectedStatus}
        allClients={allClients}
        allAssignees={allAssignees}
        allPriorities={allPriorities}
        allStatuses={allStatuses}
      />

      {view === "list" ? (
        <TicketList tickets={filteredTickets} onTicketClick={onTicketClick} onUpdate={onTicketUpdate} timer={timer} />
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: `repeat(${columns.length}, 1fr)`,
          gap: 16, paddingBottom: 24,
          minHeight: "calc(100vh - 160px)",
        }}>
          {columns.map((col) => {
            const colTickets = filteredTickets.filter((t) => t.status === col.status);
            const sc = statusConfig[col.status];
            const isOver = dragOverColumn === col.status;
            return (
              <div
                key={col.status}
                onDrop={(e) => handleDrop(e, col.status)}
                onDragOver={(e) => handleDragOver(e, col.status)}
                onDragLeave={() => setDragOverColumn(null)}
                style={{
                  display: "flex", flexDirection: "column", gap: 8,
                  borderRadius: 8,
                  background: isOver ? "var(--accent-muted)" : "transparent",
                  padding: isOver ? 8 : 0,
                  transition: "all 150ms ease",
                }}
              >
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "8px 4px", borderBottom: `2px solid ${sc.color}`, marginBottom: 4,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: sc.color }} />
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
                <div style={{ display: "flex", flexDirection: "column", gap: 8, minHeight: 60 }}>
                  {colTickets.map((ticket) => (
                    <TicketCard
                      key={ticket.id}
                      ticket={ticket}
                      onClick={() => onTicketClick(ticket)}
                      isDragging={false}
                      timer={timer}
                      onUpdate={onTicketUpdate}
                    />
                  ))}
                  {colTickets.length === 0 && isOver && (
                    <div style={{
                      padding: 20, borderRadius: 8,
                      border: "2px dashed var(--accent)",
                      textAlign: "center", color: "var(--accent)",
                      fontSize: 13,
                    }}>Drop here</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}

function BoardHeader({ view, setView, ticketCount, totalTicketCount, clientCount }: {
  view: string; setView: (v: "board" | "list") => void;
  ticketCount: number; totalTicketCount: number; clientCount: number;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em" }}>Tickets</h1>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>
          {ticketCount === totalTicketCount 
            ? `${ticketCount} active tickets across ${clientCount} clients`
            : `${ticketCount} of ${totalTicketCount} tickets showing`
          }
        </p>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{
          display: "flex", background: "var(--bg-tertiary)", borderRadius: 6,
          border: "1px solid var(--border-subtle)", overflow: "hidden",
        }}>
          {(["board", "list"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              style={{
                padding: "6px 12px", fontSize: 13, border: "none", cursor: "pointer",
                background: view === v ? "var(--accent-muted)" : "transparent",
                color: view === v ? "var(--accent-hover)" : "var(--text-muted)",
                fontWeight: view === v ? 500 : 400, fontFamily: "inherit",
                textTransform: "capitalize",
              }}
            >{v}</button>
          ))}
        </div>
        <button style={{
          padding: "8px 16px", fontSize: 13, fontWeight: 500,
          background: "var(--accent)", color: "white", border: "none",
          borderRadius: 6, cursor: "pointer", fontFamily: "inherit",
        }}>+ New Ticket</button>
      </div>
    </div>
  );
}

function TicketList({ tickets, onTicketClick, onUpdate, timer }: {
  tickets: Ticket[]; onTicketClick: (t: Ticket) => void;
  onUpdate: (ticketId: string, updates: Partial<Ticket>) => void;
  timer: { ticketId: string; seconds: number; running: boolean } | null;
}) {
  return (
    <div style={{
      background: "var(--bg-secondary)", borderRadius: 8,
      border: "1px solid var(--border-subtle)", overflow: "hidden",
    }}>
      <div style={{
        display: "grid",
        gridTemplateColumns: "80px 1fr 140px 100px 90px 80px 100px",
        padding: "10px 16px", borderBottom: "1px solid var(--border)",
        fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em",
      }}>
        <span>ID</span><span>Title</span><span>Client</span><span>Assignee</span>
        <span>Priority</span><span>Time</span><span>SLA</span>
      </div>
      {tickets.map((ticket) => {
        const priority = priorityConfig[ticket.priority];
        const status = statusConfig[ticket.status];
        const isTimerActive = timer?.ticketId === ticket.id && timer.running;
        return (
          <div
            key={ticket.id}
            onClick={() => onTicketClick(ticket)}
            style={{
              display: "grid",
              gridTemplateColumns: "80px 1fr 140px 100px 90px 80px 100px",
              padding: "10px 16px", borderBottom: "1px solid var(--border-subtle)",
              fontSize: 13, cursor: "pointer", transition: "background 50ms ease",
              alignItems: "center",
              background: isTimerActive ? "rgba(34,197,94,0.05)" : "transparent",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = isTimerActive ? "rgba(34,197,94,0.08)" : "var(--bg-hover)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = isTimerActive ? "rgba(34,197,94,0.05)" : "transparent"; }}
          >
            <span style={{ fontFamily: "monospace", color: "var(--accent)", fontSize: 12 }}>{ticket.number}</span>
            <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: status.color, flexShrink: 0 }} />
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                <InlineEdit
                  value={ticket.title}
                  onSave={(newTitle) => onUpdate(ticket.id, { title: newTitle })}
                  style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", width: "100%" }}
                />
              </span>
              {isTimerActive && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", animation: "pulse 2s infinite", flexShrink: 0 }} />}
            </div>
            <span style={{ color: "var(--text-secondary)" }}>{ticket.client}</span>
            <span style={{ color: "var(--text-secondary)" }}>{ticket.assignee}</span>
            <InlineEdit
              value={ticket.priority}
              onSave={(newPriority) => onUpdate(ticket.id, { priority: newPriority as Priority })}
              selectOptions={Object.entries(priorityConfig).map(([value, config]) => ({
                value,
                label: config.label,
              }))}
              style={{
                fontSize: 11, padding: "2px 8px", borderRadius: 99,
                background: priority.bg, color: priority.color, fontWeight: 500,
                textAlign: "center", border: "none", display: "inline-block", minWidth: "auto",
              }}
            />
            <span style={{ color: "var(--text-muted)" }}>{ticket.timeSpent > 0 ? `${ticket.timeSpent}m` : "—"}</span>
            <span style={{
              fontSize: 12,
              color: ticket.sla.includes("30m") || ticket.sla.includes("1h") ? "var(--danger)" : "var(--text-muted)",
            }}>{ticket.sla}</span>
          </div>
        );
      })}
    </div>
  );
}

function FiltersAndSearch({
  searchQuery, setSearchQuery,
  selectedClient, setSelectedClient,
  selectedAssignee, setSelectedAssignee,
  selectedPriority, setSelectedPriority,
  selectedStatus, setSelectedStatus,
  allClients, allAssignees, allPriorities, allStatuses
}: {
  searchQuery: string; setSearchQuery: (q: string) => void;
  selectedClient: string; setSelectedClient: (c: string) => void;
  selectedAssignee: string; setSelectedAssignee: (a: string) => void;
  selectedPriority: string; setSelectedPriority: (p: string) => void;
  selectedStatus: string; setSelectedStatus: (s: string) => void;
  allClients: string[]; allAssignees: string[];
  allPriorities: string[]; allStatuses: string[];
}) {
  const hasFilters = searchQuery || selectedClient || selectedAssignee || selectedPriority || selectedStatus;
  
  const clearFilters = () => {
    setSearchQuery("");
    setSelectedClient("");
    setSelectedAssignee("");
    setSelectedPriority("");
    setSelectedStatus("");
  };

  return (
    <div style={{ 
      marginBottom: 16,
      padding: "16px",
      background: "var(--bg-secondary)",
      borderRadius: 8,
      border: "1px solid var(--border-subtle)"
    }}>
      {/* Search Bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <div style={{ position: "relative", flex: 1, maxWidth: 400 }}>
          <input
            type="text"
            placeholder="Search tickets, clients, assignees..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 12px 8px 36px",
              borderRadius: 6,
              border: "1px solid var(--border-subtle)",
              background: "var(--bg-tertiary)",
              fontSize: 14,
              color: "var(--text)",
              fontFamily: "inherit",
              outline: "none",
            }}
          />
          <span style={{
            position: "absolute",
            left: 12,
            top: "50%",
            transform: "translateY(-50%)",
            color: "var(--text-muted)",
            fontSize: 14,
          }}>🔍</span>
        </div>
        
        {hasFilters && (
          <button
            onClick={clearFilters}
            style={{
              padding: "8px 12px",
              fontSize: 13,
              border: "1px solid var(--border-subtle)",
              borderRadius: 6,
              background: "var(--bg-tertiary)",
              color: "var(--text-muted)",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Clear filters
          </button>
        )}
      </div>
      
      {/* Filter Dropdowns */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <FilterSelect
          label="Client"
          value={selectedClient}
          onChange={setSelectedClient}
          options={allClients}
        />
        
        <FilterSelect
          label="Assignee"
          value={selectedAssignee}
          onChange={setSelectedAssignee}
          options={allAssignees}
        />
        
        <FilterSelect
          label="Priority"
          value={selectedPriority}
          onChange={setSelectedPriority}
          options={allPriorities}
          optionLabels={allPriorities.map(p => priorityConfig[p as Priority]?.label || p)}
        />
        
        <FilterSelect
          label="Status"
          value={selectedStatus}
          onChange={setSelectedStatus}
          options={allStatuses}
          optionLabels={allStatuses.map(s => statusConfig[s as Status]?.label || s)}
        />
      </div>
    </div>
  );
}

function FilterSelect({ label, value, onChange, options, optionLabels }: {
  label: string; value: string; onChange: (v: string) => void;
  options: string[]; optionLabels?: string[];
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 500, minWidth: "fit-content" }}>
        {label}:
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          padding: "6px 8px",
          fontSize: 13,
          border: "1px solid var(--border-subtle)",
          borderRadius: 4,
          background: "var(--bg-tertiary)",
          color: "var(--text)",
          fontFamily: "inherit",
          outline: "none",
          minWidth: 120,
        }}
      >
        <option value="">All</option>
        {options.map((option, index) => (
          <option key={option} value={option}>
            {optionLabels ? optionLabels[index] : option}
          </option>
        ))}
      </select>
    </div>
  );
}
