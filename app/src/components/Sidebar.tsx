"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useIsMobile } from "@/hooks/useMediaQuery";

const navItems = [
  { icon: "📊", label: "Dashboard", href: "/" },
  { icon: "🎫", label: "Tickets", href: "/tickets" },
  { icon: "👥", label: "Clients", href: "/clients" },
  { icon: "⏱️", label: "Time", href: "/time" },
  { icon: "💰", label: "Billing", href: "/billing" },
  { icon: "🚨", label: "SLA", href: "/sla" },
  { icon: "📋", label: "Assets", href: "/assets" },
  { icon: "📅", label: "Schedule", href: "/schedule" },
  { icon: "📈", label: "Reports", href: "/reports" },
  { icon: "📚", label: "Knowledge", href: "/knowledge" },
  { icon: "📧", label: "Email", href: "/email" },
  { icon: "🔔", label: "Notifications", href: "/notifications" },
];

const bottomItems = [
  { icon: "⚙️", label: "Settings", href: "/settings" },
  { icon: "❓", label: "Help", href: "/help" },
];

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export default function Sidebar({ mobileOpen = false, onMobileClose }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [showLogoutMenu, setShowLogoutMenu] = useState(false);
  const pathname = usePathname();
  const { data: session } = useSession();
  const logoutMenuRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

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

  // Handle mobile menu clicks
  const handleNavClick = (href: string) => {
    if (isMobile && onMobileClose) {
      onMobileClose();
    }
    window.location.href = href;
  };

  // Auto-collapse on mobile
  useEffect(() => {
    if (isMobile) {
      setCollapsed(true);
    }
  }, [isMobile]);

  return (
    <>
      {/* Mobile overlay */}
      {isMobile && mobileOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.5)",
            zIndex: 998,
          }}
          onClick={onMobileClose}
        />
      )}

      <aside
        style={{
          width: isMobile ? (mobileOpen ? 280 : 0) : (collapsed ? 60 : 220),
          background: "var(--bg-secondary)",
          borderRight: "1px solid var(--border-subtle)",
          display: "flex",
          flexDirection: "column",
          transition: "width 150ms ease",
          flexShrink: 0,
          overflow: "hidden",
          position: isMobile ? "fixed" : "relative",
          top: isMobile ? 0 : "auto",
          left: isMobile ? 0 : "auto",
          height: isMobile ? "100vh" : "auto",
          zIndex: isMobile ? 999 : "auto",
        }}
      >
        {/* Logo */}
        <div
          style={{
            padding: (collapsed && !isMobile) ? "16px 12px" : "16px 20px",
            borderBottom: "1px solid var(--border-subtle)",
            display: "flex",
            alignItems: "center",
            gap: 10,
            cursor: isMobile ? "default" : "pointer",
            minHeight: isMobile ? 64 : "auto",
          }}
          onClick={() => !isMobile && setCollapsed(!collapsed)}
        >
          <span style={{ fontSize: 22 }}>🧬</span>
          {(!collapsed || isMobile) && (
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
              <button
                key={item.label}
                onClick={() => handleNavClick(item.href)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: (collapsed && !isMobile) ? "10px 14px" : "12px 12px",
                  borderRadius: 6,
                  textDecoration: "none",
                  color: isActive ? "var(--text)" : "var(--text-secondary)",
                  background: isActive ? "var(--accent-muted)" : "transparent",
                  fontSize: isMobile ? 16 : 14,
                  fontWeight: isActive ? 500 : 400,
                  transition: "all 100ms ease",
                  whiteSpace: "nowrap",
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  minHeight: isMobile ? 44 : "auto", // Touch-friendly height on mobile
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.background = "var(--bg-hover)";
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.background = "transparent";
                }}
              >
                <span style={{ fontSize: isMobile ? 18 : 16, width: 20, textAlign: "center" }}>{item.icon}</span>
                {(!collapsed || isMobile) && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Bottom nav */}
        <div style={{ padding: "8px", borderTop: "1px solid var(--border-subtle)", display: "flex", flexDirection: "column", gap: 2 }}>
          {bottomItems.map((item) => (
            <button
              key={item.label}
              onClick={() => handleNavClick(item.href)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: (collapsed && !isMobile) ? "10px 14px" : "12px 12px",
                borderRadius: 6,
                textDecoration: "none",
                color: "var(--text-muted)",
                fontSize: isMobile ? 16 : 14,
                whiteSpace: "nowrap",
                transition: "all 100ms ease",
                border: "none",
                cursor: "pointer",
                fontFamily: "inherit",
                background: "transparent",
                minHeight: isMobile ? 44 : "auto",
              }}
              onMouseEnter={(e) => { 
                e.currentTarget.style.background = "var(--bg-hover)"; 
                e.currentTarget.style.color = "var(--text-secondary)"; 
              }}
              onMouseLeave={(e) => { 
                e.currentTarget.style.background = "transparent"; 
                e.currentTarget.style.color = "var(--text-muted)"; 
              }}
            >
              <span style={{ fontSize: isMobile ? 18 : 16, width: 20, textAlign: "center" }}>{item.icon}</span>
              {(!collapsed || isMobile) && <span>{item.label}</span>}
            </button>
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
                padding: (collapsed && !isMobile) ? "10px 14px" : "10px 12px",
                borderRadius: 6, marginTop: 4, width: "100%",
                background: showLogoutMenu ? "var(--bg-hover)" : "transparent",
                border: "none", cursor: "pointer",
                transition: "all 100ms ease",
                minHeight: isMobile ? 44 : "auto",
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
              {(!collapsed || isMobile) && (
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
            {showLogoutMenu && (!collapsed || isMobile) && (
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
                    minHeight: isMobile ? 44 : "auto",
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
    </>
  );
}