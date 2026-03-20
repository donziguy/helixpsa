"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import TicketBoard from "@/components/TicketBoard";
import CommandPalette from "@/components/CommandPalette";

export default function Home() {
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
      // / to open (when not in input)
      if (e.key === "/" && !["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
      // Escape to close
      if (e.key === "Escape") {
        setCommandPaletteOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <Sidebar />

      <main style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column" }}>
        {/* Top bar */}
        <header style={{
          padding: "12px 24px",
          borderBottom: "1px solid var(--border-subtle)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}>
          {/* Search trigger */}
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
              background: "var(--bg)", border: "1px solid var(--border)",
              color: "var(--text-muted)",
            }}>⌘K</kbd>
          </button>

          {/* Right side */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {/* Active timer indicator */}
            <div style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "6px 12px", borderRadius: 6,
              background: "rgba(34,197,94,0.1)",
              border: "1px solid rgba(34,197,94,0.2)",
              fontSize: 13, color: "#22c55e", fontWeight: 500,
            }}>
              <span style={{
                width: 8, height: 8, borderRadius: "50%",
                background: "#22c55e",
                animation: "pulse 2s infinite",
              }} />
              <span>HLX-005</span>
              <span style={{ fontFamily: "monospace" }}>0:40:12</span>
            </div>

            {/* Notifications */}
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

        {/* Content */}
        <div style={{ flex: 1, padding: 24, overflow: "auto" }}>
          <TicketBoard />
        </div>
      </main>

      <CommandPalette isOpen={commandPaletteOpen} onClose={() => setCommandPaletteOpen(false)} />

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
