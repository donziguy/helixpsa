"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import { clients, slaHealthConfig } from "@/lib/mock-data";

export default function ClientsPage() {
  const [searchQuery, setSearchQuery] = useState("");

  // Filter clients based on search query
  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.industry.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
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
                Clients
              </h1>
              <p style={{ 
                fontSize: 14, 
                color: "var(--text-muted)", 
                margin: "4px 0 0 0" 
              }}>
                {filteredClients.length} active clients
              </p>
            </div>
            
            <button style={{
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
            }}>
              + New Client
            </button>
          </div>

          {/* Search */}
          <div style={{ position: "relative", maxWidth: 400 }}>
            <input
              type="text"
              placeholder="Search clients..."
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
        </div>

        {/* Client List */}
        <div style={{ 
          padding: "24px", 
          overflow: "auto", 
          height: "calc(100vh - 140px)" 
        }}>
          <div style={{ 
            display: "grid", 
            gap: 16,
            gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))"
          }}>
            {filteredClients.map((client) => {
              const slaHealth = slaHealthConfig[client.sla.health];
              
              return (
                <div
                  key={client.id}
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
                  {/* Client Header */}
                  <div style={{ 
                    display: "flex", 
                    justifyContent: "space-between", 
                    alignItems: "flex-start",
                    marginBottom: 16
                  }}>
                    <div>
                      <h3 style={{
                        fontSize: 18,
                        fontWeight: 600,
                        margin: 0,
                        color: "var(--text)",
                        marginBottom: 4
                      }}>
                        {client.name}
                      </h3>
                      <span style={{
                        fontSize: 12,
                        color: "var(--text-muted)",
                        background: "var(--bg-hover)",
                        padding: "2px 8px",
                        borderRadius: 4,
                      }}>
                        {client.industry}
                      </span>
                    </div>
                    
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      padding: "4px 8px",
                      borderRadius: 4,
                      background: slaHealth.bg,
                      fontSize: 12,
                      fontWeight: 500,
                      color: slaHealth.color,
                    }}>
                      <div style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: slaHealth.color,
                      }} />
                      SLA {slaHealth.label}
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div style={{ marginBottom: 16 }}>
                    <div style={{
                      fontSize: 14,
                      fontWeight: 500,
                      color: "var(--text-secondary)",
                      marginBottom: 4
                    }}>
                      {client.contact.name}
                    </div>
                    <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                      📧 {client.contact.email}
                    </div>
                    <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                      📞 {client.contact.phone}
                    </div>
                  </div>

                  {/* Stats */}
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    gap: 16,
                    paddingTop: 16,
                    borderTop: "1px solid var(--border-subtle)"
                  }}>
                    <div>
                      <div style={{
                        fontSize: 20,
                        fontWeight: 700,
                        color: "var(--text)",
                        marginBottom: 2
                      }}>
                        {client.ticketCount}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                        Open Tickets
                      </div>
                    </div>
                    
                    <div>
                      <div style={{
                        fontSize: 20,
                        fontWeight: 700,
                        color: "var(--text)",
                        marginBottom: 2
                      }}>
                        {client.monthlyHours}h
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                        This Month
                      </div>
                    </div>
                    
                    <div>
                      <div style={{
                        fontSize: 12,
                        fontWeight: 500,
                        color: "var(--text-secondary)",
                        marginBottom: 2
                      }}>
                        {client.sla.tier}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                        {client.sla.responseTime}
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div style={{
                    fontSize: 11,
                    color: "var(--text-muted)",
                    marginTop: 12,
                    paddingTop: 12,
                    borderTop: "1px solid var(--border-subtle)"
                  }}>
                    Client since {formatDate(client.onboardDate)}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Empty State */}
          {filteredClients.length === 0 && (
            <div style={{
              textAlign: "center",
              padding: "64px 20px",
              color: "var(--text-muted)"
            }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>👥</div>
              <h3 style={{ fontSize: 18, fontWeight: 500, margin: "0 0 8px 0" }}>
                No clients found
              </h3>
              <p style={{ fontSize: 14, margin: 0 }}>
                {searchQuery ? `No clients match "${searchQuery}"` : "Get started by adding your first client"}
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}