"use client";

import { useIsMobile } from "@/hooks/useMediaQuery";

interface MobileHeaderProps {
  onMenuToggle: () => void;
  title?: string;
  mobileMenuOpen: boolean;
}

export default function MobileHeader({ onMenuToggle, title, mobileMenuOpen }: MobileHeaderProps) {
  const isMobile = useIsMobile();

  if (!isMobile) return null;

  return (
    <header
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: 56,
        background: "var(--bg-secondary)",
        borderBottom: "1px solid var(--border-subtle)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 16px",
        zIndex: 1000,
      }}
    >
      <button
        onClick={onMenuToggle}
        style={{
          background: "none",
          border: "none",
          color: "var(--text)",
          fontSize: 18,
          cursor: "pointer",
          padding: 8,
          borderRadius: 6,
          minHeight: 44,
          minWidth: 44,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "background 100ms ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "var(--bg-hover)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
        }}
      >
        {mobileMenuOpen ? "✕" : "☰"}
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 18 }}>🧬</span>
        <span style={{ fontWeight: 600, fontSize: 16 }}>
          {title || "HelixPSA"}
        </span>
      </div>

      <div style={{ width: 44 }} /> {/* Spacer for balance */}
    </header>
  );
}