"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import MobileHeader from "@/components/MobileHeader";
import ResponsiveTable from "@/components/ResponsiveTable";
import { api } from "@/utils/api";
import { useToastHelpers } from "@/lib/toast-context";
import { useIsMobile } from "@/hooks/useMediaQuery";
import NewClientModal from "@/components/NewClientModal";
import ClientDetail from "@/components/ClientDetail";

interface Client {
  id: string;
  name: string;
  industry: string | null;
  slaTier: string;
  responseTime: string;
  slaHealth: string;
  onboardDate: Date;
  isActive: boolean;
  ticketCounts: {
    open: number;
    total: number;
  };
}

const slaHealthConfig = {
  good: { label: "Good", bg: "rgba(34, 197, 94, 0.1)", color: "#22c55e" },
  warning: { label: "Warning", bg: "rgba(245, 158, 11, 0.1)", color: "#f59e0b" },
  breach: { label: "Breach", bg: "rgba(239, 68, 68, 0.1)", color: "#ef4444" },
};

export default function ClientsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [newClientModalOpen, setNewClientModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const toast = useToastHelpers();
  const isMobile = useIsMobile();

  const { data: clients = [], isLoading, refetch } = api.clients.getAll.useQuery();

  // Filter clients based on search query
  const filteredClients = clients.filter((client: Client) =>
    client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (client.industry && client.industry.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handleNewClientSuccess = () => {
    refetch();
    toast.success("Success", "Client created successfully");
  };

  const handleClientUpdate = () => {
    refetch();
  };

  const columns = [
    {
      key: "name",
      label: "Client Name",
      width: "25%",
      render: (value: string, client: Client) => (
        <div>
          <div style={{ fontWeight: 500, color: "var(--text)" }}>{value}</div>
          {client.industry && (
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
              {client.industry}
            </div>
          )}
        </div>
      )
    },
    {
      key: "slaTier",
      label: "SLA Tier",
      width: "15%",
      mobileHidden: true,
    },
    {
      key: "slaHealth",
      label: "SLA Health",
      width: "15%",
      render: (value: keyof typeof slaHealthConfig) => {
        const config = slaHealthConfig[value] || slaHealthConfig.good;
        return (
          <span style={{
            padding: "4px 8px",
            borderRadius: 12,
            fontSize: 12,
            fontWeight: 500,
            background: config.bg,
            color: config.color,
          }}>
            {config.label}
          </span>
        );
      }
    },
    {
      key: "ticketCounts",
      label: "Tickets",
      width: "15%",
      render: (value: { open: number; total: number }) => (
        <div>
          <div style={{ fontWeight: 500, color: "var(--text)" }}>
            {value.open} open
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
            {value.total} total
          </div>
        </div>
      )
    },
    {
      key: "onboardDate",
      label: "Onboarded",
      width: "15%",
      mobileHidden: true,
      render: (value: Date) => (
        <span style={{ color: "var(--text-secondary)" }}>
          {formatDate(value)}
        </span>
      )
    },
    {
      key: "isActive",
      label: "Status",
      width: "10%",
      render: (value: boolean) => (
        <span style={{
          padding: "4px 8px",
          borderRadius: 12,
          fontSize: 12,
          fontWeight: 500,
          background: value ? "rgba(34, 197, 94, 0.1)" : "rgba(156, 163, 175, 0.1)",
          color: value ? "#22c55e" : "#9ca3af",
        }}>
          {value ? "Active" : "Inactive"}
        </span>
      )
    },
  ];

  if (isLoading) {
    return (
      <div style={{ 
        display: "flex", 
        height: "100vh", 
        background: "var(--bg)",
        paddingTop: isMobile ? 56 : 0,
      }}>
        <MobileHeader 
          onMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
          title="Clients"
          mobileMenuOpen={mobileMenuOpen}
        />
        <Sidebar 
          mobileOpen={mobileMenuOpen}
          onMobileClose={() => setMobileMenuOpen(false)}
        />
        <main style={{ 
          flex: 1, 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "center" 
        }}>
          <div style={{ color: "var(--text-muted)" }}>Loading clients...</div>
        </main>
      </div>
    );
  }

  return (
    <div style={{ 
      display: "flex", 
      height: "100vh", 
      background: "var(--bg)",
      paddingTop: isMobile ? 56 : 0,
    }}>
      <MobileHeader 
        onMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
        title="Clients"
        mobileMenuOpen={mobileMenuOpen}
      />
      
      <Sidebar 
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />
      
      <main style={{ flex: 1, overflow: "hidden" }}>
        {/* Header */}
        <div style={{
          borderBottom: "1px solid var(--border-subtle)",
          background: "var(--bg)",
          padding: isMobile ? "16px" : "16px 24px",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}>
          <div style={{ 
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: isMobile ? "flex-start" : "center",
            flexDirection: isMobile ? "column" : "row",
            gap: isMobile ? 12 : 0,
            marginBottom: 12 
          }}>
            <div>
              <h1 style={{ 
                fontSize: isMobile ? 20 : 24, 
                fontWeight: 700, 
                margin: 0,
                color: "var(--text)"
              }}>
                Clients
              </h1>
              <p style={{ 
                color: "var(--text-secondary)", 
                fontSize: 14, 
                margin: "4px 0 0 0" 
              }}>
                Manage your client base and SLA performance
              </p>
            </div>
            
            <button
              onClick={() => setNewClientModalOpen(true)}
              style={{
                padding: isMobile ? "10px 16px" : "8px 16px",
                background: "var(--accent)",
                color: "white",
                border: "none",
                borderRadius: 6,
                fontSize: 14,
                fontWeight: 500,
                cursor: "pointer",
                transition: "background 100ms ease",
                minHeight: isMobile ? 44 : "auto",
                width: isMobile ? "100%" : "auto",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--accent-hover)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "var(--accent)";
              }}
            >
              + New Client
            </button>
          </div>

          {/* Search */}
          <div style={{ position: "relative" }}>
            <input
              type="text"
              placeholder="Search clients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: isMobile ? "12px 16px 12px 44px" : "10px 16px 10px 40px",
                background: "var(--bg-tertiary)",
                border: "1px solid var(--border-subtle)",
                borderRadius: 8,
                color: "var(--text)",
                fontSize: 14,
                fontFamily: "inherit",
                minHeight: isMobile ? 44 : "auto",
              }}
            />
            <span style={{
              position: "absolute",
              left: isMobile ? 16 : 14,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--text-muted)",
              fontSize: 16,
            }}>
              🔍
            </span>
          </div>
        </div>

        {/* Content */}
        <div style={{ 
          flex: 1, 
          overflow: "auto", 
          padding: isMobile ? 16 : 24 
        }}>
          <ResponsiveTable
            columns={columns}
            data={filteredClients}
            onRowClick={setSelectedClient}
            loading={isLoading}
          />

          {filteredClients.length === 0 && !isLoading && (
            <div style={{
              textAlign: "center",
              padding: "60px 20px",
              color: "var(--text-muted)"
            }}>
              {searchQuery ? "No clients match your search" : "No clients found"}
            </div>
          )}
        </div>
      </main>

      {/* Modals */}
      <NewClientModal
        isOpen={newClientModalOpen}
        onClose={() => setNewClientModalOpen(false)}
        onSuccess={handleNewClientSuccess}
      />

      <ClientDetail
        client={selectedClient}
        onClose={() => setSelectedClient(null)}
        onUpdate={handleClientUpdate}
      />
    </div>
  );
}