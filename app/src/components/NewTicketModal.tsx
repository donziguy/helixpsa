"use client";

import { useState, useEffect, useRef } from "react";
import { clients, priorityConfig, type Priority, type Ticket } from "@/lib/mock-data";

interface NewTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (ticket: Omit<Ticket, "id" | "number" | "status" | "created" | "updated" | "timeSpent">) => void;
}

const assignees = ["Cory S.", "Mike T.", "Jake R."];

export default function NewTicketModal({ isOpen, onClose, onSubmit }: NewTicketModalProps) {
  const [title, setTitle] = useState("");
  const [client, setClient] = useState("");
  const [assignee, setAssignee] = useState(assignees[0]);
  const [priority, setPriority] = useState<Priority>("medium");
  const [description, setDescription] = useState("");
  const [sla, setSla] = useState("24h remaining");
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      // Reset form
      setTitle("");
      setClient("");
      setAssignee(assignees[0]);
      setPriority("medium");
      setDescription("");
      setSla("24h remaining");
      // Focus title field
      setTimeout(() => titleRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    }
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    if (!title.trim() || !client) return;

    onSubmit({
      title: title.trim(),
      client,
      assignee,
      priority,
      description: description.trim(),
      sla,
    });

    onClose();
  };

  const canSubmit = title.trim() && client;

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "20px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%", maxWidth: 600,
          background: "var(--bg-secondary)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div style={{
          padding: "20px 24px",
          borderBottom: "1px solid var(--border-subtle)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <h2 style={{
            fontSize: 18, fontWeight: 600, color: "var(--text)",
            margin: 0, display: "flex", alignItems: "center", gap: 8,
          }}>
            <span>➕</span>
            New Ticket
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: "var(--text-secondary)", fontSize: 16, padding: 4,
              borderRadius: 4,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-tertiary)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "none"; }}
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <div style={{ padding: "24px" }}>
          <div style={{ display: "grid", gap: 16 }}>
            {/* Title */}
            <div>
              <label style={{
                display: "block", fontSize: 13, fontWeight: 500,
                color: "var(--text)", marginBottom: 6,
              }}>
                Title *
              </label>
              <input
                ref={titleRef}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Brief description of the issue"
                style={{
                  width: "100%", padding: "10px 12px", borderRadius: 8,
                  border: "1px solid var(--border)", background: "var(--bg)",
                  color: "var(--text)", fontSize: 14, fontFamily: "inherit",
                  outline: "none", transition: "border-color 100ms ease",
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
              />
            </div>

            {/* Client & Assignee Row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <label style={{
                  display: "block", fontSize: 13, fontWeight: 500,
                  color: "var(--text)", marginBottom: 6,
                }}>
                  Client *
                </label>
                <select
                  value={client}
                  onChange={(e) => setClient(e.target.value)}
                  style={{
                    width: "100%", padding: "10px 12px", borderRadius: 8,
                    border: "1px solid var(--border)", background: "var(--bg)",
                    color: "var(--text)", fontSize: 14, fontFamily: "inherit",
                    outline: "none", cursor: "pointer",
                  }}
                >
                  <option value="">Select client...</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{
                  display: "block", fontSize: 13, fontWeight: 500,
                  color: "var(--text)", marginBottom: 6,
                }}>
                  Assignee
                </label>
                <select
                  value={assignee}
                  onChange={(e) => setAssignee(e.target.value)}
                  style={{
                    width: "100%", padding: "10px 12px", borderRadius: 8,
                    border: "1px solid var(--border)", background: "var(--bg)",
                    color: "var(--text)", fontSize: 14, fontFamily: "inherit",
                    outline: "none", cursor: "pointer",
                  }}
                >
                  {assignees.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Priority */}
            <div>
              <label style={{
                display: "block", fontSize: 13, fontWeight: 500,
                color: "var(--text)", marginBottom: 6,
              }}>
                Priority
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                {(Object.keys(priorityConfig) as Priority[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPriority(p)}
                    style={{
                      padding: "8px 16px", borderRadius: 6, fontSize: 13, fontWeight: 500,
                      border: priority === p ? `2px solid ${priorityConfig[p].color}` : "1px solid var(--border)",
                      background: priority === p ? priorityConfig[p].bg : "var(--bg-tertiary)",
                      color: priority === p ? priorityConfig[p].color : "var(--text-secondary)",
                      cursor: "pointer", transition: "all 100ms ease",
                    }}
                  >
                    {priorityConfig[p].label}
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <label style={{
                display: "block", fontSize: 13, fontWeight: 500,
                color: "var(--text)", marginBottom: 6,
              }}>
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Additional details about the issue..."
                rows={4}
                style={{
                  width: "100%", padding: "10px 12px", borderRadius: 8,
                  border: "1px solid var(--border)", background: "var(--bg)",
                  color: "var(--text)", fontSize: 14, fontFamily: "inherit",
                  outline: "none", resize: "vertical", transition: "border-color 100ms ease",
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: "16px 24px", borderTop: "1px solid var(--border-subtle)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ fontSize: 11, color: "var(--text-muted)", display: "flex", gap: 16 }}>
            <span>ESC Cancel</span>
            <span>⌘↵ Submit</span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={onClose}
              style={{
                padding: "8px 16px", borderRadius: 6, fontSize: 13,
                border: "1px solid var(--border)", background: "var(--bg-tertiary)",
                color: "var(--text-secondary)", cursor: "pointer",
                fontFamily: "inherit", transition: "background 100ms ease",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "var(--bg-tertiary)"; }}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              style={{
                padding: "8px 16px", borderRadius: 6, fontSize: 13, fontWeight: 500,
                border: "none", background: canSubmit ? "var(--accent)" : "var(--bg-tertiary)",
                color: canSubmit ? "white" : "var(--text-muted)",
                cursor: canSubmit ? "pointer" : "not-allowed",
                fontFamily: "inherit", transition: "all 100ms ease",
                opacity: canSubmit ? 1 : 0.6,
              }}
            >
              Create Ticket
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}