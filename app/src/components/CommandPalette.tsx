"use client";

import { useState, useEffect, useRef } from "react";
import { tickets, clients } from "@/lib/mock-data";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

type Result = { type: "ticket" | "client" | "action"; label: string; sub: string; icon: string };

const actions: Result[] = [
  { type: "action", label: "New Ticket", sub: "Create a new support ticket", icon: "➕" },
  { type: "action", label: "Start Timer", sub: "Begin tracking time", icon: "⏱️" },
  { type: "action", label: "View Dashboard", sub: "Go to main dashboard", icon: "📊" },
  { type: "action", label: "New Client", sub: "Add a new client", icon: "👥" },
];

export default function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const results: Result[] = query.length === 0
    ? actions
    : [
        ...actions.filter(a => a.label.toLowerCase().includes(query.toLowerCase())),
        ...tickets
          .filter(t => t.title.toLowerCase().includes(query.toLowerCase()) || t.number.toLowerCase().includes(query.toLowerCase()))
          .map(t => ({ type: "ticket" as const, label: t.number + " — " + t.title, sub: t.client, icon: "🎫" })),
        ...clients
          .filter(c => c.name.toLowerCase().includes(query.toLowerCase()))
          .map(c => ({ type: "client" as const, label: c.name, sub: `${c.ticketCount} tickets`, icon: "🏢" })),
      ];

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIndex(i => Math.min(i + 1, results.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setSelectedIndex(i => Math.max(i - 1, 0)); }
    if (e.key === "Escape") onClose();
    if (e.key === "Enter" && results.length > 0) onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "flex-start", justifyContent: "center",
        paddingTop: "20vh",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%", maxWidth: 560,
          background: "var(--bg-secondary)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ color: "var(--text-muted)", fontSize: 18 }}>🔍</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search tickets, clients, actions..."
            style={{
              flex: 1, background: "transparent", border: "none", outline: "none",
              color: "var(--text)", fontSize: 15, fontFamily: "inherit",
            }}
          />
          <kbd style={{
            padding: "2px 6px", borderRadius: 4, fontSize: 11,
            background: "var(--bg-tertiary)", color: "var(--text-muted)",
            border: "1px solid var(--border)",
          }}>ESC</kbd>
        </div>

        {/* Results */}
        <div style={{ maxHeight: 320, overflowY: "auto", padding: "6px" }}>
          {results.length === 0 && (
            <div style={{ padding: "24px 16px", textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>
              No results found
            </div>
          )}
          {results.map((result, i) => (
            <div
              key={i}
              style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "10px 12px", borderRadius: 8, cursor: "pointer",
                background: i === selectedIndex ? "var(--accent-muted)" : "transparent",
                transition: "background 50ms ease",
              }}
              onMouseEnter={() => setSelectedIndex(i)}
            >
              <span style={{ fontSize: 16, width: 24, textAlign: "center" }}>{result.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {result.label}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{result.sub}</div>
              </div>
              <span style={{
                fontSize: 11, padding: "2px 8px", borderRadius: 4,
                background: "var(--bg-tertiary)", color: "var(--text-muted)",
                textTransform: "capitalize",
              }}>{result.type}</span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{
          padding: "8px 16px", borderTop: "1px solid var(--border-subtle)",
          display: "flex", gap: 16, fontSize: 11, color: "var(--text-muted)",
        }}>
          <span>↑↓ Navigate</span>
          <span>↵ Select</span>
          <span>ESC Close</span>
        </div>
      </div>
    </div>
  );
}
