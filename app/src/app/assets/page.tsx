"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import { useToastHelpers } from "@/lib/toast-context";
import { api } from "@/utils/api";

// Asset type and status mapping for display
const assetTypeConfig = {
  hardware: { label: "Hardware", icon: "💻", bg: "rgba(59, 130, 246, 0.1)", color: "#2563eb" },
  software: { label: "Software", icon: "📱", bg: "rgba(16, 185, 129, 0.1)", color: "#059669" },
  network: { label: "Network", icon: "🌐", bg: "rgba(245, 158, 11, 0.1)", color: "#d97706" },
  mobile: { label: "Mobile", icon: "📱", bg: "rgba(139, 92, 246, 0.1)", color: "#7c3aed" },
  peripherals: { label: "Peripherals", icon: "🖱️", bg: "rgba(236, 72, 153, 0.1)", color: "#be185d" },
  server: { label: "Server", icon: "🖥️", bg: "rgba(75, 85, 99, 0.1)", color: "#374151" },
  other: { label: "Other", icon: "📦", bg: "rgba(107, 114, 128, 0.1)", color: "#6b7280" },
};

const assetStatusConfig = {
  active: { label: "Active", bg: "rgba(16, 185, 129, 0.1)", color: "#059669" },
  inactive: { label: "Inactive", bg: "rgba(107, 114, 128, 0.1)", color: "#6b7280" },
  maintenance: { label: "Maintenance", bg: "rgba(245, 158, 11, 0.1)", color: "#d97706" },
  retired: { label: "Retired", bg: "rgba(239, 68, 68, 0.1)", color: "#dc2626" },
  lost_stolen: { label: "Lost/Stolen", bg: "rgba(220, 38, 38, 0.1)", color: "#b91c1c" },
};

export default function AssetsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const toast = useToastHelpers();

  // Fetch assets with filters
  const { data: assetsData = [], isLoading, refetch } = api.assets.getAll.useQuery({
    query: searchQuery || undefined,
    type: filterType as any || undefined,
    status: filterStatus as any || undefined,
  });

  // Fetch asset statistics
  const { data: stats } = api.assets.getStats.useQuery();

  const formatDate = (dateString: string | Date | null) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount: string | number | null) => {
    if (!amount) return "—";
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(Number(amount));
  };

  return (
    <div style={{ display: "flex", height: "100vh", background: "var(--bg)" }}>
      <Sidebar />
      
      <main style={{ flex: 1, overflow: "hidden" }}>
        {/* Header */}
        <div style={{
          borderBottom: "1px solid var(--border-subtle)",
          background: "var(--bg)",
          padding: "16px 24px",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div>
              <h1 style={{ 
                fontSize: 24, 
                fontWeight: 700, 
                margin: 0,
                color: "var(--text)"
              }}>
                Assets
              </h1>
              <p style={{ 
                fontSize: 14, 
                color: "var(--text-muted)", 
                margin: "4px 0 0 0" 
              }}>
                {stats ? `${stats.total} assets across all clients` : "Loading..."}
              </p>
            </div>
            
            <button 
              onClick={() => setShowCreateModal(true)}
              style={{
                background: "var(--accent)",
                color: "white",
                border: "none",
                padding: "8px 16px",
                borderRadius: 6,
                fontSize: 14,
                fontWeight: 500,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              + New Asset
            </button>
          </div>

          {/* Stats Cards */}
          {stats && (
            <div style={{ 
              display: "grid", 
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", 
              gap: 12, 
              marginBottom: 16 
            }}>
              <div style={{
                background: "var(--bg-secondary)",
                border: "1px solid var(--border-subtle)",
                borderRadius: 8,
                padding: 12,
              }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text)" }}>
                  {stats.total}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  Total Assets
                </div>
              </div>
              
              <div style={{
                background: "var(--bg-secondary)",
                border: "1px solid var(--border-subtle)",
                borderRadius: 8,
                padding: 12,
              }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#059669" }}>
                  {stats.byStatus.active || 0}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  Active
                </div>
              </div>
              
              <div style={{
                background: "var(--bg-secondary)",
                border: "1px solid var(--border-subtle)",
                borderRadius: 8,
                padding: 12,
              }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#d97706" }}>
                  {stats.byStatus.maintenance || 0}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  Maintenance
                </div>
              </div>
              
              <div style={{
                background: "var(--bg-secondary)",
                border: "1px solid var(--border-subtle)",
                borderRadius: 8,
                padding: 12,
              }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#dc2626" }}>
                  {stats.warrantyExpiringSoon}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  Warranty Expiring
                </div>
              </div>
            </div>
          )}

          {/* Filters */}
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ position: "relative", flex: 1, minWidth: 250 }}>
              <input
                type="text"
                placeholder="Search assets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 12px 8px 36px",
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  fontSize: 14,
                  background: "var(--bg-secondary)",
                  color: "var(--text)",
                }}
              />
              <span style={{
                position: "absolute",
                left: 12,
                top: "50%",
                transform: "translateY(-50%)",
                fontSize: 16,
                color: "var(--text-muted)",
              }}>
                🔍
              </span>
            </div>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              style={{
                padding: "8px 12px",
                border: "1px solid var(--border)",
                borderRadius: 6,
                fontSize: 14,
                background: "var(--bg-secondary)",
                color: "var(--text)",
              }}
            >
              <option value="">All Types</option>
              {Object.entries(assetTypeConfig).map(([key, config]) => (
                <option key={key} value={key}>
                  {config.label}
                </option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{
                padding: "8px 12px",
                border: "1px solid var(--border)",
                borderRadius: 6,
                fontSize: 14,
                background: "var(--bg-secondary)",
                color: "var(--text)",
              }}
            >
              <option value="">All Statuses</option>
              {Object.entries(assetStatusConfig).map(([key, config]) => (
                <option key={key} value={key}>
                  {config.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Asset List */}
        <div style={{ 
          padding: "24px", 
          overflow: "auto", 
          height: "calc(100vh - 240px)" 
        }}>
          {isLoading ? (
            <div style={{ textAlign: "center", padding: "48px", color: "var(--text-muted)" }}>
              Loading assets...
            </div>
          ) : assetsData.length === 0 ? (
            <div style={{
              textAlign: "center",
              padding: "64px 20px",
              color: "var(--text-muted)"
            }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📦</div>
              <h3 style={{ fontSize: 18, fontWeight: 500, margin: "0 0 8px 0" }}>
                No assets found
              </h3>
              <p style={{ fontSize: 14, margin: 0 }}>
                {searchQuery || filterType || filterStatus 
                  ? "No assets match your filters" 
                  : "Get started by adding your first asset"}
              </p>
            </div>
          ) : (
            <div style={{ 
              display: "grid", 
              gap: 16,
              gridTemplateColumns: "repeat(auto-fit, minmax(450px, 1fr))"
            }}>
              {assetsData.map((asset) => {
                const typeConfig = assetTypeConfig[asset.type as keyof typeof assetTypeConfig];
                const statusConfig = assetStatusConfig[asset.status as keyof typeof assetStatusConfig];
                
                return (
                  <div
                    key={asset.id}
                    onClick={() => {
                      toast.success("Asset Selected", `Viewing ${asset.name} details`);
                    }}
                    style={{
                      background: "var(--bg-secondary)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: 8,
                      padding: 20,
                      cursor: "pointer",
                      transition: "all 100ms ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "var(--border)";
                      e.currentTarget.style.transform = "translateY(-1px)";
                      e.currentTarget.style.boxShadow = "0 4px 8px rgba(0,0,0,0.1)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "var(--border-subtle)";
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    {/* Asset Header */}
                    <div style={{ 
                      display: "flex", 
                      justifyContent: "space-between", 
                      alignItems: "flex-start",
                      marginBottom: 16
                    }}>
                      <div style={{ flex: 1 }}>
                        <h3 style={{
                          fontSize: 16,
                          fontWeight: 600,
                          margin: 0,
                          color: "var(--text)",
                          marginBottom: 4
                        }}>
                          {asset.name}
                        </h3>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                          <span style={{
                            fontSize: 12,
                            color: typeConfig.color,
                            background: typeConfig.bg,
                            padding: "2px 6px",
                            borderRadius: 4,
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                          }}>
                            {typeConfig.icon} {typeConfig.label}
                          </span>
                          <span style={{
                            fontSize: 12,
                            color: statusConfig.color,
                            background: statusConfig.bg,
                            padding: "2px 6px",
                            borderRadius: 4,
                          }}>
                            {statusConfig.label}
                          </span>
                        </div>
                        <div style={{
                          fontSize: 13,
                          color: "var(--text-muted)",
                        }}>
                          {asset.clientName}
                        </div>
                      </div>
                    </div>

                    {/* Asset Details */}
                    <div style={{ 
                      display: "grid", 
                      gridTemplateColumns: "1fr 1fr", 
                      gap: 12, 
                      marginBottom: 16,
                      fontSize: 13
                    }}>
                      {asset.manufacturer && (
                        <div>
                          <div style={{ color: "var(--text-muted)", marginBottom: 2 }}>
                            Manufacturer
                          </div>
                          <div style={{ color: "var(--text)" }}>
                            {asset.manufacturer}
                          </div>
                        </div>
                      )}
                      
                      {asset.model && (
                        <div>
                          <div style={{ color: "var(--text-muted)", marginBottom: 2 }}>
                            Model
                          </div>
                          <div style={{ color: "var(--text)" }}>
                            {asset.model}
                          </div>
                        </div>
                      )}
                      
                      {asset.serialNumber && (
                        <div>
                          <div style={{ color: "var(--text-muted)", marginBottom: 2 }}>
                            Serial Number
                          </div>
                          <div style={{ color: "var(--text)" }}>
                            {asset.serialNumber}
                          </div>
                        </div>
                      )}
                      
                      {asset.location && (
                        <div>
                          <div style={{ color: "var(--text-muted)", marginBottom: 2 }}>
                            Location
                          </div>
                          <div style={{ color: "var(--text)" }}>
                            {asset.location}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Additional Info */}
                    {(asset.assignedTo || asset.purchasePrice || asset.warrantyExpiry) && (
                      <div style={{
                        paddingTop: 12,
                        borderTop: "1px solid var(--border-subtle)",
                        fontSize: 12,
                        color: "var(--text-muted)",
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
                        gap: 8,
                      }}>
                        {asset.assignedTo && (
                          <div>
                            <strong>Assigned:</strong> {asset.assignedTo}
                          </div>
                        )}
                        {asset.purchasePrice && (
                          <div>
                            <strong>Value:</strong> {formatCurrency(asset.purchasePrice)}
                          </div>
                        )}
                        {asset.warrantyExpiry && (
                          <div>
                            <strong>Warranty:</strong> {formatDate(asset.warrantyExpiry)}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Create Asset Modal */}
        {showCreateModal && (
          <div style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}>
            <div style={{
              background: "var(--bg-secondary)",
              borderRadius: 12,
              padding: 24,
              width: "90%",
              maxWidth: 500,
              maxHeight: "80vh",
              overflow: "auto",
            }}>
              <h2 style={{ 
                fontSize: 18, 
                fontWeight: 600, 
                margin: "0 0 16px 0", 
                color: "var(--text)" 
              }}>
                Add New Asset
              </h2>
              
              <div style={{ 
                textAlign: "center", 
                padding: "32px 20px",
                color: "var(--text-muted)"
              }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>🚧</div>
                <p>Asset creation form coming soon!</p>
              </div>

              <div style={{ 
                display: "flex", 
                justifyContent: "flex-end", 
                gap: 12,
                borderTop: "1px solid var(--border-subtle)",
                paddingTop: 16,
                marginTop: 16
              }}>
                <button
                  onClick={() => setShowCreateModal(false)}
                  style={{
                    padding: "8px 16px",
                    border: "1px solid var(--border)",
                    borderRadius: 6,
                    background: "transparent",
                    color: "var(--text)",
                    cursor: "pointer",
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}