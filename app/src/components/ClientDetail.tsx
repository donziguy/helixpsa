"use client";

import { useState, useEffect, useRef } from "react";
import { api } from "@/utils/api";
import { useToastHelpers } from "@/lib/toast-context";
import InlineEdit from "./InlineEdit";

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

interface Contact {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  title?: string | null;
  isPrimary: boolean;
}

interface ClientDetailProps {
  client: Client | null;
  onClose: () => void;
  onUpdate: () => void;
}

const slaHealthConfig = {
  good: { label: "Good", bg: "rgba(34, 197, 94, 0.1)", color: "#22c55e" },
  warning: { label: "Warning", bg: "rgba(245, 158, 11, 0.1)", color: "#f59e0b" },
  breach: { label: "Breach", bg: "rgba(239, 68, 68, 0.1)", color: "#ef4444" },
};

const slaTiers = ["Standard", "Premium", "Enterprise"];

export default function ClientDetail({ client, onClose, onUpdate }: ClientDetailProps) {
  const [newContactName, setNewContactName] = useState("");
  const [newContactEmail, setNewContactEmail] = useState("");
  const [newContactPhone, setNewContactPhone] = useState("");
  const [newContactTitle, setNewContactTitle] = useState("");
  const [isAddingContact, setIsAddingContact] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const toast = useToastHelpers();

  const { data: clientWithContacts, refetch: refetchClient } = api.clients.getById.useQuery(
    { id: client?.id || "" },
    { enabled: !!client?.id }
  );

  const updateClientMutation = api.clients.update.useMutation();
  const createContactMutation = api.clients.contacts.create.useMutation();
  const deleteContactMutation = api.clients.contacts.delete.useMutation();

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { 
      if (e.key === "Escape") onClose(); 
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  if (!client || !clientWithContacts) return null;

  const slaHealth = slaHealthConfig[client.slaHealth as keyof typeof slaHealthConfig] || slaHealthConfig.good;

  const handleClientUpdate = async (field: string, value: string) => {
    try {
      await updateClientMutation.mutateAsync({
        id: client.id,
        [field]: value,
      });
      onUpdate();
      toast.success("Success", "Client updated successfully");
    } catch (error) {
      toast.error("Error", "Failed to update client");
      console.error("Update client error:", error);
    }
  };

  const handleAddContact = async () => {
    if (!newContactName.trim()) {
      toast.error("Error", "Contact name is required");
      return;
    }

    try {
      await createContactMutation.mutateAsync({
        clientId: client.id,
        name: newContactName.trim(),
        email: newContactEmail.trim() || undefined,
        phone: newContactPhone.trim() || undefined,
        title: newContactTitle.trim() || undefined,
        isPrimary: clientWithContacts.contacts.length === 0, // First contact is primary
      });
      
      refetchClient();
      setNewContactName("");
      setNewContactEmail("");
      setNewContactPhone("");
      setNewContactTitle("");
      setIsAddingContact(false);
      toast.success("Success", "Contact added successfully");
    } catch (error) {
      toast.error("Error", "Failed to add contact");
      console.error("Add contact error:", error);
    }
  };

  const handleDeleteContact = async (contactId: string) => {
    try {
      await deleteContactMutation.mutateAsync({ id: contactId });
      refetchClient();
      toast.success("Success", "Contact deleted successfully");
    } catch (error) {
      toast.error("Error", "Failed to delete contact");
      console.error("Delete contact error:", error);
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
          backdropFilter: "blur(2px)", zIndex: 900,
        }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        style={{
          position: "fixed", top: 0, right: 0, bottom: 0,
          width: 520, maxWidth: "90vw", zIndex: 901,
          background: "var(--bg-secondary)",
          borderLeft: "1px solid var(--border)",
          display: "flex", flexDirection: "column",
          animation: "slideIn 150ms ease-out",
          boxShadow: "-8px 0 30px rgba(0,0,0,0.3)",
        }}
      >
        {/* Header */}
        <div style={{
          padding: "16px 20px", borderBottom: "1px solid var(--border-subtle)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0, color: "var(--text)" }}>
              {client.name}
            </h2>
            <div style={{
              display: "flex", alignItems: "center", gap: 4,
              padding: "4px 8px", borderRadius: 4,
              background: slaHealth.bg, fontSize: 11, fontWeight: 500, color: slaHealth.color,
            }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: slaHealth.color }} />
              SLA {slaHealth.label}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none", border: "none", color: "var(--text-muted)",
              cursor: "pointer", fontSize: 20, padding: 4,
            }}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: "auto", padding: "20px" }}>
          {/* Client Info */}
          <div style={{ marginBottom: 32 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 16px 0", color: "var(--text)" }}>
              Client Information
            </h3>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>
                  Name
                </label>
                <InlineEdit
                  value={client.name}
                  onSave={(value) => handleClientUpdate("name", value)}
                  style={{ fontSize: 14, color: "var(--text)" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>
                  Industry
                </label>
                <InlineEdit
                  value={client.industry || "Not specified"}
                  onSave={(value) => handleClientUpdate("industry", value)}
                  style={{ fontSize: 14, color: "var(--text)" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>
                  SLA Tier
                </label>
                <select
                  value={client.slaTier}
                  onChange={(e) => handleClientUpdate("slaTier", e.target.value)}
                  style={{
                    padding: "6px 8px", borderRadius: 4, border: "1px solid var(--border)",
                    background: "var(--bg)", color: "var(--text)", fontSize: 14,
                  }}
                >
                  {slaTiers.map(tier => (
                    <option key={tier} value={tier}>{tier}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>
                  Response Time
                </label>
                <div style={{ fontSize: 14, color: "var(--text)" }}>{client.responseTime}</div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>
                  Client Since
                </label>
                <div style={{ fontSize: 14, color: "var(--text)" }}>{formatDate(client.onboardDate)}</div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div style={{ marginBottom: 32 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 16px 0", color: "var(--text)" }}>
              Statistics
            </h3>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div style={{
                padding: 16, border: "1px solid var(--border-subtle)", borderRadius: 6,
                background: "var(--bg)"
              }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>
                  {client.ticketCounts.open}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Open Tickets</div>
              </div>
              
              <div style={{
                padding: 16, border: "1px solid var(--border-subtle)", borderRadius: 6,
                background: "var(--bg)"
              }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>
                  {client.ticketCounts.total}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Total Tickets</div>
              </div>
            </div>
          </div>

          {/* Contacts */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, margin: 0, color: "var(--text)" }}>
                Contacts
              </h3>
              <button
                onClick={() => setIsAddingContact(true)}
                style={{
                  background: "var(--accent)", color: "white", border: "none",
                  borderRadius: 4, padding: "6px 12px", fontSize: 12, cursor: "pointer",
                }}
              >
                + Add Contact
              </button>
            </div>

            {/* Add Contact Form */}
            {isAddingContact && (
              <div style={{
                padding: 16, border: "1px solid var(--border)", borderRadius: 6,
                background: "var(--bg)", marginBottom: 16,
              }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <input
                    type="text"
                    placeholder="Name *"
                    value={newContactName}
                    onChange={(e) => setNewContactName(e.target.value)}
                    style={{
                      padding: "8px 10px", border: "1px solid var(--border)", borderRadius: 4,
                      background: "var(--bg-secondary)", color: "var(--text)", fontSize: 14,
                    }}
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    value={newContactEmail}
                    onChange={(e) => setNewContactEmail(e.target.value)}
                    style={{
                      padding: "8px 10px", border: "1px solid var(--border)", borderRadius: 4,
                      background: "var(--bg-secondary)", color: "var(--text)", fontSize: 14,
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Phone"
                    value={newContactPhone}
                    onChange={(e) => setNewContactPhone(e.target.value)}
                    style={{
                      padding: "8px 10px", border: "1px solid var(--border)", borderRadius: 4,
                      background: "var(--bg-secondary)", color: "var(--text)", fontSize: 14,
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Title"
                    value={newContactTitle}
                    onChange={(e) => setNewContactTitle(e.target.value)}
                    style={{
                      padding: "8px 10px", border: "1px solid var(--border)", borderRadius: 4,
                      background: "var(--bg-secondary)", color: "var(--text)", fontSize: 14,
                    }}
                  />
                  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                    <button
                      onClick={() => setIsAddingContact(false)}
                      style={{
                        background: "var(--bg-hover)", color: "var(--text)", border: "1px solid var(--border)",
                        borderRadius: 4, padding: "6px 12px", fontSize: 12, cursor: "pointer",
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddContact}
                      style={{
                        background: "var(--accent)", color: "white", border: "none",
                        borderRadius: 4, padding: "6px 12px", fontSize: 12, cursor: "pointer",
                      }}
                    >
                      Add Contact
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Contact List */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {clientWithContacts.contacts.map((contact: Contact) => (
                <div
                  key={contact.id}
                  style={{
                    padding: 16, border: "1px solid var(--border-subtle)", borderRadius: 6,
                    background: "var(--bg)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text)" }}>
                          {contact.name}
                        </div>
                        {contact.isPrimary && (
                          <span style={{
                            fontSize: 10, padding: "2px 6px", borderRadius: 4,
                            background: "var(--accent)", color: "white", fontWeight: 500,
                          }}>
                            PRIMARY
                          </span>
                        )}
                      </div>
                      
                      {contact.title && (
                        <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>
                          {contact.title}
                        </div>
                      )}
                      
                      {contact.email && (
                        <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                          📧 {contact.email}
                        </div>
                      )}
                      
                      {contact.phone && (
                        <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                          📞 {contact.phone}
                        </div>
                      )}
                    </div>
                    
                    <button
                      onClick={() => handleDeleteContact(contact.id)}
                      style={{
                        background: "none", border: "none", color: "var(--text-muted)",
                        cursor: "pointer", fontSize: 12, padding: "4px 8px",
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}

              {clientWithContacts.contacts.length === 0 && !isAddingContact && (
                <div style={{
                  textAlign: "center", padding: "32px 16px", color: "var(--text-muted)",
                  border: "1px solid var(--border-subtle)", borderRadius: 6, background: "var(--bg)",
                }}>
                  <div style={{ fontSize: 24, marginBottom: 8 }}>👤</div>
                  <div style={{ fontSize: 14 }}>No contacts yet</div>
                  <div style={{ fontSize: 12, marginTop: 4 }}>Add a contact to get started</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </>
  );
}