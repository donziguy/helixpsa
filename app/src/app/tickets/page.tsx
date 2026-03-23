"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Sidebar from "@/components/Sidebar";
import TicketBoard from "@/components/TicketBoard";
import CommandPalette from "@/components/CommandPalette";
import TicketDetail from "@/components/TicketDetail";
import NewTicketModal from "@/components/NewTicketModal";
import { tickets as initialTickets, type Ticket, type Status } from "@/lib/mock-data";
import { useToastHelpers } from "@/lib/toast-context";

export default function TicketsPage() {
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [newTicketModalOpen, setNewTicketModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>(initialTickets);
  const [timer, setTimer] = useState<{ ticketId: string; seconds: number; running: boolean } | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const toast = useToastHelpers();

  // Timer tick
  useEffect(() => {
    if (timer?.running) {
      timerRef.current = setInterval(() => {
        setTimer((prev) => prev ? { ...prev, seconds: prev.seconds + 1 } : null);
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timer?.running, timer?.ticketId]);

  const handleTimerToggle = useCallback((ticketId: string) => {
    setTimer((prev) => {
      if (prev?.ticketId === ticketId && prev.running) {
        return { ...prev, running: false };
      }
      if (prev?.ticketId === ticketId) {
        return { ...prev, running: true };
      }
      return { ticketId, seconds: 0, running: true };
    });
  }, []);

  const handleStatusChange = useCallback((ticketId: string, status: Status) => {
    const ticket = tickets.find(t => t.id === ticketId);
    setTickets((prev) => prev.map((t) => t.id === ticketId ? { ...t, status } : t));
    setSelectedTicket((prev) => prev?.id === ticketId ? { ...prev, status } : prev);
    
    // Show toast notification
    if (ticket) {
      toast.success(
        "Status Updated", 
        `${ticket.number} changed to ${status.replace("_", " ")}`
      );
    }
  }, [tickets, toast]);

  const handleTicketUpdate = useCallback((ticketId: string, updates: Partial<Ticket>) => {
    const ticket = tickets.find(t => t.id === ticketId);
    setTickets((prev) => prev.map((t) => t.id === ticketId ? { ...t, ...updates } : t));
    setSelectedTicket((prev) => prev?.id === ticketId ? { ...prev, ...updates } : prev);
    
    // Show toast notification for updates
    if (ticket) {
      const updateKeys = Object.keys(updates);
      const updateType = updateKeys.includes('title') ? 'Title' : 
                        updateKeys.includes('description') ? 'Description' :
                        updateKeys.includes('priority') ? 'Priority' : 'Details';
      toast.success(
        `${updateType} Updated`,
        `${ticket.number} has been updated`
      );
    }
  }, [tickets, toast]);

  const handleTicketClick = useCallback((ticket: Ticket) => {
    const fresh = tickets.find(t => t.id === ticket.id);
    setSelectedTicket(fresh || ticket);
    // Auto-start timer when opening a ticket
    setTimer((prev) => {
      if (prev?.ticketId === ticket.id) return prev; // already on this ticket
      return { ticketId: ticket.id, seconds: 0, running: true };
    });
  }, [tickets]);

  const handleNewTicket = useCallback((newTicketData: Omit<Ticket, "id" | "number" | "status" | "created" | "updated" | "timeSpent">) => {
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
    // Auto-open the new ticket
    setSelectedTicket(newTicket);
    // Auto-start timer
    setTimer({ ticketId: newTicket.id, seconds: 0, running: true });
    
    // Show success toast
    toast.success(
      "Ticket Created",
      `${nextNumber} - ${newTicketData.title}`
    );
  }, [tickets, toast]);

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

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  const activeTicket = timer?.running ? tickets.find(t => t.id === timer.ticketId) : null;

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

          {/* Keyboard shortcuts hint */}
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            fontSize: 12, color: "var(--text-muted)",
            padding: "4px 8px", borderRadius: 4,
            background: "var(--bg-tertiary)",
            border: "1px solid var(--border-subtle)"
          }}>
            <span>💡</span>
            <span>j/k navigate • Enter select • ⌘N new</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {/* Active timer */}
            {activeTicket && timer && (
              <div
                onClick={() => handleTicketClick(activeTicket)}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "6px 12px", borderRadius: 6,
                  background: "rgba(34,197,94,0.1)",
                  border: "1px solid rgba(34,197,94,0.2)",
                  fontSize: 13, color: "#22c55e", fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                <span style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: "#22c55e", animation: "pulse 2s infinite",
                }} />
                <span>{activeTicket.number}</span>
                <span style={{ fontFamily: "monospace" }}>{formatTime(timer.seconds)}</span>
              </div>
            )}
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

        <div style={{ flex: 1, padding: 24, overflow: "auto" }}>
          <TicketBoard
            tickets={tickets}
            onTicketClick={handleTicketClick}
            onStatusChange={handleStatusChange}
            onTicketUpdate={handleTicketUpdate}
            timer={timer}
            onNewTicket={() => setNewTicketModalOpen(true)}
          />
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

      <TicketDetail
        ticket={selectedTicket}
        onClose={() => setSelectedTicket(null)}
        onStatusChange={handleStatusChange}
        onTicketUpdate={handleTicketUpdate}
        timer={timer}
        onTimerToggle={handleTimerToggle}
      />

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}