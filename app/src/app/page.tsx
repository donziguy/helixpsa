"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import Dashboard from "@/components/Dashboard";
import CommandPalette from "@/components/CommandPalette";
import NewTicketModal from "@/components/NewTicketModal";
import { tickets as initialTickets, type Ticket } from "@/lib/mock-data";
import { useToastHelpers } from "@/lib/toast-context";

export default function Home() {
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [newTicketModalOpen, setNewTicketModalOpen] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>(initialTickets);
  const toast = useToastHelpers();

  const handleNewTicket = (newTicketData: Omit<Ticket, "id" | "number" | "status" | "created" | "updated" | "timeSpent">) => {
    const nextNumber = `HLX-${String(tickets.length + 1).padStart(3, '0')}`;
    const newTicket: Ticket = {
      ...newTicketData,
      id: `t${tickets.length + 1}`,
      number: nextNumber,
      status: "open",
      created: "Just now",
      updated: "Just now",
      timeSpent: 0,
    };
    
    setTickets((prev) => [newTicket, ...prev]);
    
    // Show success toast
    toast.success(
      "Ticket Created",
      `${nextNumber} - ${newTicketData.title}`
    );
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      const inInput = ["INPUT", "TEXTAREA"].includes(tag);

      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
      if (e.key === "/" && !inInput) {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "n" && !newTicketModalOpen) {
        e.preventDefault();
        setNewTicketModalOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [commandPaletteOpen, newTicketModalOpen]);

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <Sidebar />

      <main style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column" }}>
        {/* Top bar */}
        <header style={{
          padding: "12px 24px",
          borderBottom: "1px solid var(--border-subtle)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexShrink: 0,
        }}>
          <button
            onClick={() => setCommandPaletteOpen(true)}
            style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "7px 14px", borderRadius: 8,
              background: "var(--bg-tertiary)",
              border: "1px solid var(--border-subtle)",
              color: "var(--text-muted)", fontSize: 13,
              cursor: "pointer", width: 280, fontFamily: "inherit",
              transition: "border-color 100ms ease",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border-subtle)"; }}
          >
            <span>🔍</span>
            <span style={{ flex: 1, textAlign: "left" }}>Search or press /</span>
            <kbd style={{
              padding: "1px 6px", borderRadius: 4, fontSize: 11,
              background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-muted)",
            }}>⌘K</kbd>
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button style={{
              position: "relative",
              background: "none", border: "none", cursor: "pointer",
              color: "var(--text-secondary)", fontSize: 18, padding: 4,
            }}>
              🔔
              <span style={{
                position: "absolute", top: 0, right: 0,
                width: 8, height: 8, borderRadius: "50%",
                background: "var(--danger)", border: "2px solid var(--bg)",
              }} />
            </button>
          </div>
        </header>

        <div style={{ flex: 1, overflow: "auto" }}>
          <Dashboard />
        </div>
      </main>

      <CommandPalette 
        isOpen={commandPaletteOpen} 
        onClose={() => setCommandPaletteOpen(false)}
        onNewTicket={() => setNewTicketModalOpen(true)}
      />

      <NewTicketModal
        isOpen={newTicketModalOpen}
        onClose={() => setNewTicketModalOpen(false)}
        onSubmit={handleNewTicket}
      />
    </div>
  );
}