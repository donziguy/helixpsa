"use client";

import { useState } from "react";

const navItems = [
  { icon: "📊", label: "Dashboard", href: "/", active: false },
  { icon: "🎫", label: "Tickets", href: "/tickets", active: true },
  { icon: "👥", label: "Clients", href: "/clients", active: false },
  { icon: "⏱️", label: "Time", href: "/time", active: false },
  { icon: "💰", label: "Billing", href: "/billing", active: false },
  { icon: "📋", label: "Assets", href: "/assets", active: false },
  { icon: "📅", label: "Schedule", href: "/schedule", active: false },
  { icon: "📈", label: "Reports", href: "/reports", active: false },
];

const bottomItems = [
  { icon: "⚙️", label: "Settings", href: "/settings" },
  { icon: "❓", label: "Help", href: "/help" },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      style={{
        width: collapsed ? 60 : 220,
        background: "var(--bg-secondary)",
        borderRight: "1px solid var(--border-subtle)",
        display: "flex",
        flexDirection: "column",
        transition: "width 150ms ease",
        flexShrink: 0,
        overflow: "hidden",
      }}
    >
      {/* Logo */}
      <div
        style={{
          padding: collapsed ? "16px 12px" : "16px 20px",
          borderBottom: "1px solid var(--border-subtle)",
          display: "flex",
          alignItems: "center",
          gap: 10,
          cursor: "pointer",
        }}
        onClick={() => setCollapsed(!collapsed)}
      >
        <span style={{ fontSize: 22 }}>🧬</span>
        {!collapsed && (
          <span style={{ fontWeight: 700, fontSize: 16, letterSpacing: "-0.02em" }}>
            HelixPSA
          </span>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "8px", display: "flex", flexDirection: "column", gap: 2 }}>
        {navItems.map((item) => (
          <a
            key={item.label}
            href={item.href}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: collapsed ? "10px 14px" : "8px 12px",
              borderRadius: 6,
              textDecoration: "none",
              color: item.active ? "var(--text)" : "var(--text-secondary)",
              background: item.active ? "var(--accent-muted)" : "transparent",
              fontSize: 14,
              fontWeight: item.active ? 500 : 400,
              transition: "all 100ms ease",
              whiteSpace: "nowrap",
            }}
            onMouseEnter={(e) => {
              if (!item.active) e.currentTarget.style.background = "var(--bg-hover)";
            }}
            onMouseLeave={(e) => {
              if (!item.active) e.currentTarget.style.background = "transparent";
            }}
          >
            <span style={{ fontSize: 16, width: 20, textAlign: "center" }}>{item.icon}</span>
            {!collapsed && <span>{item.label}</span>}
          </a>
        ))}
      </nav>

      {/* Bottom nav */}
      <div style={{ padding: "8px", borderTop: "1px solid var(--border-subtle)", display: "flex", flexDirection: "column", gap: 2 }}>
        {bottomItems.map((item) => (
          <a
            key={item.label}
            href={item.href}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: collapsed ? "10px 14px" : "8px 12px",
              borderRadius: 6,
              textDecoration: "none",
              color: "var(--text-muted)",
              fontSize: 14,
              whiteSpace: "nowrap",
              transition: "all 100ms ease",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-hover)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-muted)"; }}
          >
            <span style={{ fontSize: 16, width: 20, textAlign: "center" }}>{item.icon}</span>
            {!collapsed && <span>{item.label}</span>}
          </a>
        ))}

        {/* User */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: collapsed ? "10px 14px" : "10px 12px",
          borderRadius: 6, marginTop: 4,
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: "50%",
            background: "var(--accent)", display: "flex",
            alignItems: "center", justifyContent: "center",
            fontSize: 12, fontWeight: 600, color: "white", flexShrink: 0,
          }}>CS</div>
          {!collapsed && (
            <div style={{ overflow: "hidden" }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text)" }}>Cory S.</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Admin</div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
