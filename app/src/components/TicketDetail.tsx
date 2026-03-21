"use client";

import { useState, useEffect, useRef } from "react";
import { type Ticket, priorityConfig, statusConfig, type Priority } from "@/lib/mock-data";
import InlineEdit from "./InlineEdit";

interface TicketDetailProps {
  ticket: Ticket | null;
  onClose: () => void;
  onStatusChange: (ticketId: string, status: Ticket["status"]) => void;
  onTicketUpdate: (ticketId: string, updates: Partial<Ticket>) => void;
  timer: { ticketId: string; seconds: number; running: boolean } | null;
  onTimerToggle: (ticketId: string) => void;
}

export default function TicketDetail({ ticket, onClose, onStatusChange, onTicketUpdate, timer, onTimerToggle }: TicketDetailProps) {
  const [note, setNote] = useState("");
  const [notes, setNotes] = useState<{ text: string; time: string; author: string }[]>([
    { text: "Checked event logs, found authentication errors starting at 8:47 AM.", time: "10:15 AM", author: "Mike T." },
    { text: "Restarted transport service, monitoring sync status.", time: "10:45 AM", author: "Mike T." },
  ]);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  if (!ticket) return null;

  const priority = priorityConfig[ticket.priority];
  const status = statusConfig[ticket.status];
  const isTimerActive = timer?.ticketId === ticket.id && timer.running;
  const timerSeconds = timer?.ticketId === ticket.id ? timer.seconds : 0;

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  const addNote = () => {
    if (!note.trim()) return;
    setNotes([...notes, { text: note, time: "Just now", author: "Cory S." }]);
    setNote("");
  };

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
          backdropFilter: "blur(2px)", zIndex: 900,
        }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        style={{
          position: "fixed", top: 0, right: 0, bottom: 0,
          width: 520, maxWidth: "90vw", zIndex: 901,
          background: "var(--bg-secondary)",
          borderLeft: "1px solid var(--border)",
          display: "flex", flexDirection: "column",
          animation: "slideIn 150ms ease-out",
          boxShadow: "-8px 0 30px rgba(0,0,0,0.3)",
        }}
      >
        {/* Header */}
        <div style={{
          padding: "16px 20px", borderBottom: "1px solid var(--border-subtle)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontFamily: "monospace", color: "var(--accent)", fontSize: 14 }}>{ticket.number}</span>
            <span style={{
              fontSize: 11, padding: "2px 8px", borderRadius: 99,
              background: priority.bg, color: priority.color, fontWeight: 500,
            }}>{priority.label}</span>
            <span style={{
              fontSize: 11, padding: "2px 8px", borderRadius: 99,
              background: status.bg, color: status.color, fontWeight: 500,
            }}>{status.label}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <kbd style={{
              padding: "2px 6px", borderRadius: 4, fontSize: 10,
              background: "var(--bg-tertiary)", color: "var(--text-muted)",
              border: "1px solid var(--border)",
            }}>ESC</kbd>
            <button
              onClick={onClose}
              style={{
                background: "none", border: "none", color: "var(--text-muted)",
                cursor: "pointer", fontSize: 20, lineHeight: 1,
              }}
            >✕</button>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: "auto", padding: "20px" }}>
          {/* Title */}
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, lineHeight: 1.4 }}>
            <InlineEdit
              value={ticket.title}
              onSave={(newTitle) => onTicketUpdate(ticket.id, { title: newTitle })}
              style={{ fontSize: 18, fontWeight: 600, lineHeight: 1.4 }}
            />
          </h2>

          {/* Timer */}
          <div style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "12px 16px", borderRadius: 8, marginBottom: 20,
            background: isTimerActive ? "rgba(34,197,94,0.1)" : "var(--bg-tertiary)",
            border: `1px solid ${isTimerActive ? "rgba(34,197,94,0.2)" : "var(--border-subtle)"}`,
          }}>
            <button
              onClick={() => onTimerToggle(ticket.id)}
              style={{
                width: 36, height: 36, borderRadius: "50%",
                background: isTimerActive ? "var(--danger)" : "var(--success)",
                border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 16, color: "white", transition: "transform 100ms ease",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.1)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
            >{isTimerActive ? "⏹" : "▶"}</button>
            <div>
              <div style={{ fontFamily: "monospace", fontSize: 22, fontWeight: 600, color: isTimerActive ? "#22c55e" : "var(--text)" }}>
                {formatTime(timerSeconds + (ticket.timeSpent * 60))}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                {isTimerActive ? "Timer running..." : "Click to start tracking"}
              </div>
            </div>
            <div style={{ marginLeft: "auto", textAlign: "right" }}>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Previous: {ticket.timeSpent}m</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>SLA: {ticket.sla}</div>
            </div>
          </div>

          {/* Meta grid */}
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20,
          }}>
            {[
              { label: "Client", value: ticket.client },
              { label: "Assignee", value: ticket.assignee },
              { label: "Created", value: ticket.created },
              { label: "Updated", value: ticket.updated },
            ].map((item) => (
              <div key={item.label} style={{
                padding: "10px 12px", borderRadius: 6,
                background: "var(--bg-tertiary)",
              }}>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 2, textTransform: "uppercase", letterSpacing: "0.05em" }}>{item.label}</div>
                <div style={{ fontSize: 14, color: "var(--text)" }}>{item.value}</div>
              </div>
            ))}
          </div>

          {/* Status change */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Status</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {(["open", "in_progress", "waiting", "resolved", "closed"] as const).map((s) => {
                const sc = statusConfig[s];
                const isActive = ticket.status === s;
                return (
                  <button
                    key={s}
                    onClick={() => onStatusChange(ticket.id, s)}
                    style={{
                      padding: "6px 12px", borderRadius: 6, fontSize: 12, fontWeight: 500,
                      background: isActive ? sc.bg : "var(--bg-tertiary)",
                      color: isActive ? sc.color : "var(--text-muted)",
                      border: `1px solid ${isActive ? sc.color + "40" : "var(--border-subtle)"}`,
                      cursor: "pointer", fontFamily: "inherit",
                      transition: "all 100ms ease",
                    }}
                  >{sc.label}</button>
                );
              })}
            </div>
          </div>

          {/* Description */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Description</div>
            <div style={{
              padding: "12px", borderRadius: 6, background: "var(--bg-tertiary)",
              fontSize: 14, lineHeight: 1.6, color: "var(--text-secondary)",
            }}>
              <InlineEdit
                value={ticket.description}
                onSave={(newDescription) => onTicketUpdate(ticket.id, { description: newDescription })}
                multiline
                style={{
                  fontSize: 14, lineHeight: 1.6, color: "var(--text-secondary)",
                  background: "transparent", border: "none", padding: 0,
                }}
                placeholder="Add a description..."
              />
            </div>
          </div>

          {/* Notes / Activity */}
          <div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>Activity</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
              {notes.map((n, i) => (
                <div key={i} style={{
                  padding: "10px 12px", borderRadius: 6,
                  background: "var(--bg-tertiary)",
                  borderLeft: "3px solid var(--accent)",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text)" }}>{n.author}</span>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{n.time}</span>
                  </div>
                  <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>{n.text}</div>
                </div>
              ))}
            </div>

            {/* Add note */}
            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") addNote(); }}
                placeholder="Add a note... (Enter to send)"
                style={{
                  flex: 1, padding: "10px 12px", borderRadius: 6,
                  background: "var(--bg-tertiary)", border: "1px solid var(--border-subtle)",
                  color: "var(--text)", fontSize: 13, fontFamily: "inherit",
                  outline: "none",
                }}
              />
              <button
                onClick={addNote}
                style={{
                  padding: "10px 16px", borderRadius: 6,
                  background: "var(--accent)", color: "white",
                  border: "none", cursor: "pointer", fontSize: 13, fontFamily: "inherit",
                }}
              >Send</button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </>
  );
}
