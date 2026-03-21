"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";

const navItems = [
  { icon: "📊", label: "Dashboard", href: "/" },
  { icon: "🎫", label: "Tickets", href: "/tickets" },
  { icon: "👥", label: "Clients", href: "/clients" },
  { icon: "⏱️", label: "Time", href: "/time" },
  { icon: "💰", label: "Billing", href: "/billing" },
  { icon: "📋", label: "Assets", href: "/assets" },
  { icon: "📅", label: "Schedule", href: "/schedule" },
  { icon: "📈", label: "Reports", href: "/reports" },
];

const bottomItems = [
  { icon: "⚙️", label: "Settings", href: "/settings" },
  { icon: "❓", label: "Help", href: "/help" },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [showLogoutMenu, setShowLogoutMenu] = useState(false);
  const pathname = usePathname();
  const { data: session } = useSession();
  const logoutMenuRef = useRef<HTMLDivElement>(null);

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/auth/signin' });
  };

  // Get user initials
  const getUserInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Close logout menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (logoutMenuRef.current && !logoutMenuRef.current.contains(event.target as Node)) {
        setShowLogoutMenu(false);
      }
    };

    if (showLogoutMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showLogoutMenu]);

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
        {navItems.map((item) => {
          const isActive = pathname === item.href || (pathname === "/" && item.href === "/");
          
          return (
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
                color: isActive ? "var(--text)" : "var(--text-secondary)",
                background: isActive ? "var(--accent-muted)" : "transparent",
                fontSize: 14,
                fontWeight: isActive ? 500 : 400,
                transition: "all 100ms ease",
                whiteSpace: "nowrap",
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.background = "var(--bg-hover)";
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.background = "transparent";
              }}
            >
              <span style={{ fontSize: 16, width: 20, textAlign: "center" }}>{item.icon}</span>
              {!collapsed && <span>{item.label}</span>}
            </a>
          );
        })}
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
        <div 
          ref={logoutMenuRef}
          style={{
            position: "relative",
          }}
        >
          <button
            style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: collapsed ? "10px 14px" : "10px 12px",
              borderRadius: 6, marginTop: 4, width: "100%",
              background: showLogoutMenu ? "var(--bg-hover)" : "transparent",
              border: "none", cursor: "pointer",
              transition: "all 100ms ease",
            }}
            onClick={() => setShowLogoutMenu(!showLogoutMenu)}
            onMouseEnter={(e) => {
              if (!showLogoutMenu) e.currentTarget.style.background = "var(--bg-hover)";
            }}
            onMouseLeave={(e) => {
              if (!showLogoutMenu) e.currentTarget.style.background = "transparent";
            }}
          >
            <div style={{
              width: 28, height: 28, borderRadius: "50%",
              background: "var(--accent)", display: "flex",
              alignItems: "center", justifyContent: "center",
              fontSize: 12, fontWeight: 600, color: "white", flexShrink: 0,
            }}>
              {getUserInitials(session?.user?.name)}
            </div>
            {!collapsed && (
              <div style={{ overflow: "hidden", flex: 1, textAlign: "left" }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text)" }}>
                  {session?.user?.name || 'User'}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                  {(session?.user as any)?.role || 'Member'} • {(session?.user as any)?.organizationName || 'Organization'}
                </div>
              </div>
            )}
          </button>

          {/* Logout menu */}
          {showLogoutMenu && !collapsed && (
            <div style={{
              position: "absolute",
              bottom: "100%",
              left: 0,
              right: 0,
              marginBottom: 8,
              background: "var(--bg-secondary)",
              border: "1px solid var(--border-subtle)",
              borderRadius: 8,
              padding: 4,
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.4)",
              zIndex: 1000,
            }}>
              <button
                onClick={handleLogout}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  background: "transparent",
                  border: "none",
                  borderRadius: 4,
                  color: "var(--text-secondary)",
                  fontSize: 14,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  transition: "all 100ms ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--bg-hover)";
                  e.currentTarget.style.color = "var(--text)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "var(--text-secondary)";
                }}
              >
                <span style={{ fontSize: 16 }}>🚪</span>
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
