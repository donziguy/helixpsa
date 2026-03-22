"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import { api } from "@/utils/api";
import { useToastHelpers } from "@/lib/toast-context";

interface CreateInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function CreateInvoiceModal({ isOpen, onClose, onSuccess }: CreateInvoiceModalProps) {
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedTimeEntryIds, setSelectedTimeEntryIds] = useState<string[]>([]);
  const [dateDue, setDateDue] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const toast = useToastHelpers();
  
  const { data: clients } = api.clients.getAll.useQuery();
  const { data: unbilledEntries } = api.billing.getUnbilledTimeEntries.useQuery(
    { clientId: selectedClientId },
    { enabled: !!selectedClientId }
  );
  
  const createInvoiceMutation = api.billing.create.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId || selectedTimeEntryIds.length === 0 || !dateDue) {
      toast.error("Error", "Please fill all required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      await createInvoiceMutation.mutateAsync({
        clientId: selectedClientId,
        timeEntryIds: selectedTimeEntryIds,
        dateDue: new Date(dateDue),
        notes: notes || undefined,
      });
      
      toast.success("Success", "Invoice created successfully");
      onSuccess();
      onClose();
      
      // Reset form
      setSelectedClientId("");
      setSelectedTimeEntryIds([]);
      setDateDue("");
      setNotes("");
    } catch (error) {
      toast.error("Error", "Failed to create invoice");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleTimeEntry = (entryId: string) => {
    setSelectedTimeEntryIds(prev => 
      prev.includes(entryId) 
        ? prev.filter(id => id !== entryId)
        : [...prev, entryId]
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD' 
    }).format(amount);
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}:${mins.toString().padStart(2, '0')}`;
  };

  const calculateTotal = () => {
    if (!unbilledEntries) return 0;
    return selectedTimeEntryIds.reduce((total, entryId) => {
      const entry = unbilledEntries.find(e => e.id === entryId);
      if (!entry) return total;
      const hours = (entry.duration || 0) / 60;
      const rate = parseFloat(entry.hourlyRate || '0');
      return total + (hours * rate);
    }, 0);
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "rgba(0, 0, 0, 0.5)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000,
      padding: 20,
    }}>
      <div style={{
        background: "var(--bg)",
        borderRadius: 12,
        padding: 24,
        width: "100%",
        maxWidth: 600,
        maxHeight: "90vh",
        overflow: "auto",
        border: "1px solid var(--border)",
        boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
      }}>
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 20, fontWeight: 600, margin: "0 0 8px 0" }}>Create Invoice</h2>
          <p style={{ color: "var(--text-muted)", margin: 0 }}>
            Generate an invoice from unbilled time entries
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Client Selection */}
          <div>
            <label style={{ display: "block", marginBottom: 8, fontSize: 14, fontWeight: 500 }}>
              Client *
            </label>
            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid var(--border)",
                borderRadius: 6,
                fontSize: 14,
                background: "var(--bg-secondary)",
                color: "var(--text)",
              }}
              required
            >
              <option value="">Select a client...</option>
              {clients?.map(client => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </div>

          {/* Due Date */}
          <div>
            <label style={{ display: "block", marginBottom: 8, fontSize: 14, fontWeight: 500 }}>
              Due Date *
            </label>
            <input
              type="date"
              value={dateDue}
              onChange={(e) => setDateDue(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid var(--border)",
                borderRadius: 6,
                fontSize: 14,
                background: "var(--bg-secondary)",
                color: "var(--text)",
              }}
              required
            />
          </div>

          {/* Time Entries */}
          {selectedClientId && (
            <div>
              <label style={{ display: "block", marginBottom: 8, fontSize: 14, fontWeight: 500 }}>
                Time Entries to Invoice *
              </label>
              {unbilledEntries && unbilledEntries.length > 0 ? (
                <div style={{
                  maxHeight: 200,
                  overflow: "auto",
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  padding: 8,
                  background: "var(--bg-secondary)",
                }}>
                  {unbilledEntries.map(entry => {
                    const hours = (entry.duration || 0) / 60;
                    const rate = parseFloat(entry.hourlyRate || '0');
                    const amount = hours * rate;
                    
                    return (
                      <label
                        key={entry.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          padding: "8px 12px",
                          borderRadius: 4,
                          cursor: "pointer",
                          marginBottom: 4,
                          background: selectedTimeEntryIds.includes(entry.id) ? "var(--accent-muted)" : "transparent",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedTimeEntryIds.includes(entry.id)}
                          onChange={() => toggleTimeEntry(entry.id)}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 14, fontWeight: 500 }}>
                            {entry.description}
                          </div>
                          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                            {formatTime(entry.duration || 0)} × ${rate}/hr by {entry.userName}
                          </div>
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 500 }}>
                          {formatCurrency(amount)}
                        </div>
                      </label>
                    );
                  })}
                </div>
              ) : (
                <div style={{
                  padding: 20,
                  textAlign: "center",
                  color: "var(--text-muted)",
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  background: "var(--bg-secondary)",
                }}>
                  No unbilled time entries found for this client
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          <div>
            <label style={{ display: "block", marginBottom: 8, fontSize: 14, fontWeight: 500 }}>
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes for this invoice..."
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid var(--border)",
                borderRadius: 6,
                fontSize: 14,
                background: "var(--bg-secondary)",
                color: "var(--text)",
                minHeight: 80,
                resize: "vertical",
              }}
            />
          </div>

          {/* Total */}
          {selectedTimeEntryIds.length > 0 && (
            <div style={{
              padding: 16,
              background: "var(--accent-muted)",
              borderRadius: 6,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}>
              <span style={{ fontWeight: 500 }}>Total Amount:</span>
              <span style={{ fontSize: 18, fontWeight: 600 }}>
                {formatCurrency(calculateTotal())}
              </span>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "8px 16px",
                border: "1px solid var(--border)",
                borderRadius: 6,
                background: "transparent",
                color: "var(--text-secondary)",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || selectedTimeEntryIds.length === 0}
              style={{
                padding: "8px 16px",
                background: "var(--accent)",
                color: "white",
                border: "none",
                borderRadius: 6,
                cursor: isSubmitting ? "not-allowed" : "pointer",
                opacity: isSubmitting || selectedTimeEntryIds.length === 0 ? 0.6 : 1,
              }}
            >
              {isSubmitting ? "Creating..." : "Create Invoice"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function BillingPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  
  const toast = useToastHelpers();
  
  const { data: invoices, refetch: refetchInvoices } = api.billing.getAll.useQuery();
  const { data: stats } = api.billing.getStats.useQuery();
  const updateInvoiceMutation = api.billing.update.useMutation();

  // Filter invoices
  const filteredInvoices = invoices?.filter(invoice => {
    const matchesSearch = 
      invoice.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (invoice.clientName || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || invoice.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  }) || [];

  const formatCurrency = (amount: string | number) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD' 
    }).format(numAmount);
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return { bg: 'var(--bg-hover)', text: 'var(--text-muted)' };
      case 'sent': return { bg: '#fef3c7', text: '#92400e' };
      case 'paid': return { bg: '#d1fae5', text: '#065f46' };
      case 'overdue': return { bg: '#fee2e2', text: '#991b1b' };
      case 'void': return { bg: 'var(--bg-hover)', text: 'var(--text-muted)' };
      default: return { bg: 'var(--bg-hover)', text: 'var(--text-muted)' };
    }
  };

  const handleStatusChange = async (invoiceId: string, newStatus: string) => {
    try {
      await updateInvoiceMutation.mutateAsync({
        id: invoiceId,
        status: newStatus as any,
        ...(newStatus === 'paid' ? { datePaid: new Date() } : {}),
      });
      
      toast.success("Success", `Invoice marked as ${newStatus}`);
      refetchInvoices();
    } catch (error) {
      toast.error("Error", "Failed to update invoice status");
    }
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
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
            <div>
              <h1 style={{ 
                fontSize: 24, 
                fontWeight: 700, 
                margin: 0,
                color: "var(--text)"
              }}>
                Billing & Invoices
              </h1>
              <p style={{ 
                fontSize: 14, 
                color: "var(--text-muted)", 
                margin: "4px 0 0 0" 
              }}>
                {filteredInvoices.length} invoices
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
              + Create Invoice
            </button>
          </div>

          {/* Stats Cards */}
          {stats && (
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: 12,
              marginBottom: 16,
              maxWidth: 800
            }}>
              <div style={{
                background: "var(--bg-secondary)",
                padding: "12px",
                borderRadius: 6,
                border: "1px solid var(--border-subtle)"
              }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", marginBottom: 2 }}>
                  {formatCurrency(stats.monthlyInvoices.total)}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>This Month</div>
                <div style={{ fontSize: 10, color: "var(--text-muted)" }}>
                  {stats.monthlyInvoices.count} invoices
                </div>
              </div>

              <div style={{
                background: "var(--bg-secondary)",
                padding: "12px",
                borderRadius: 6,
                border: "1px solid var(--border-subtle)"
              }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#f59e0b", marginBottom: 2 }}>
                  {formatCurrency(stats.outstanding.total)}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Outstanding</div>
                <div style={{ fontSize: 10, color: "var(--text-muted)" }}>
                  {stats.outstanding.count} invoices
                </div>
              </div>

              <div style={{
                background: "var(--bg-secondary)",
                padding: "12px",
                borderRadius: 6,
                border: "1px solid var(--border-subtle)"
              }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: "var(--accent)", marginBottom: 2 }}>
                  {formatCurrency(stats.yearlyRevenue)}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Yearly Revenue</div>
                <div style={{ fontSize: 10, color: "var(--text-muted)" }}>
                  Paid invoices
                </div>
              </div>

              <div style={{
                background: "var(--bg-secondary)",
                padding: "12px",
                borderRadius: 6,
                border: "1px solid var(--border-subtle)"
              }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: stats.overdueCount > 0 ? "#ef4444" : "var(--text)", marginBottom: 2 }}>
                  {stats.overdueCount}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Overdue</div>
                <div style={{ fontSize: 10, color: "var(--text-muted)" }}>
                  Requires attention
                </div>
              </div>
            </div>
          )}

          {/* Filters */}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            {/* Search */}
            <div style={{ position: "relative", flex: 1, minWidth: 200, maxWidth: 300 }}>
              <input
                type="text"
                placeholder="Search invoices..."
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

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                padding: "8px 12px",
                border: "1px solid var(--border)",
                borderRadius: 6,
                fontSize: 14,
                background: "var(--bg-secondary)",
                color: "var(--text)",
                cursor: "pointer"
              }}
            >
              <option value="all">All statuses</option>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
              <option value="void">Void</option>
            </select>
          </div>
        </div>

        {/* Invoice List */}
        <div style={{ 
          padding: "24px", 
          overflow: "auto", 
          height: "calc(100vh - 280px)" 
        }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {filteredInvoices.map((invoice) => {
              const statusStyle = getStatusColor(invoice.status);
              
              return (
                <div
                  key={invoice.id}
                  style={{
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: 8,
                    padding: "16px",
                    cursor: "pointer",
                    transition: "all 100ms ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "var(--border)";
                    e.currentTarget.style.transform = "translateY(-1px)";
                    e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--border-subtle)";
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: "var(--accent)",
                          background: "var(--accent-muted)",
                          padding: "2px 6px",
                          borderRadius: 4,
                        }}>
                          {invoice.invoiceNumber}
                        </span>
                        <span style={{
                          fontSize: 14,
                          fontWeight: 500,
                          color: "var(--text)"
                        }}>
                          {invoice.clientName || 'Unknown Client'}
                        </span>
                      </div>
                      <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 2 }}>
                        Issued: {formatDate(invoice.dateIssued)} • Due: {formatDate(invoice.dateDue)}
                      </div>
                      {invoice.datePaid && (
                        <div style={{ fontSize: 13, color: "var(--accent)" }}>
                          Paid: {formatDate(invoice.datePaid)}
                        </div>
                      )}
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <div style={{
                        fontSize: 16,
                        fontWeight: 600,
                        color: "var(--text)",
                        marginBottom: 4
                      }}>
                        {formatCurrency(invoice.total)}
                      </div>
                      <div style={{
                        display: "inline-block",
                        fontSize: 11,
                        fontWeight: 500,
                        color: statusStyle.text,
                        background: statusStyle.bg,
                        padding: "2px 8px",
                        borderRadius: 12,
                        textTransform: "uppercase",
                        letterSpacing: "0.5px"
                      }}>
                        {invoice.status}
                      </div>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    paddingTop: 8,
                    borderTop: "1px solid var(--border-subtle)",
                    fontSize: 12,
                  }}>
                    <div style={{ color: "var(--text-muted)" }}>
                      {invoice.notes && (
                        <span>📝 {invoice.notes.substring(0, 50)}{invoice.notes.length > 50 ? '...' : ''}</span>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      {invoice.status === 'draft' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStatusChange(invoice.id, 'sent');
                          }}
                          style={{
                            padding: "4px 8px",
                            background: "var(--accent)",
                            color: "white",
                            border: "none",
                            borderRadius: 4,
                            fontSize: 11,
                            cursor: "pointer",
                          }}
                        >
                          Send
                        </button>
                      )}
                      {['sent', 'overdue'].includes(invoice.status) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStatusChange(invoice.id, 'paid');
                          }}
                          style={{
                            padding: "4px 8px",
                            background: "#10b981",
                            color: "white",
                            border: "none",
                            borderRadius: 4,
                            fontSize: 11,
                            cursor: "pointer",
                          }}
                        >
                          Mark Paid
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Empty State */}
          {filteredInvoices.length === 0 && (
            <div style={{
              textAlign: "center",
              padding: "64px 20px",
              color: "var(--text-muted)"
            }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>💰</div>
              <h3 style={{ fontSize: 18, fontWeight: 500, margin: "0 0 8px 0" }}>
                No invoices found
              </h3>
              <p style={{ fontSize: 14, margin: 0 }}>
                {searchQuery || statusFilter !== "all" ? 
                  "Try adjusting your filters" : 
                  "Create your first invoice from billable time entries"
                }
              </p>
            </div>
          )}
        </div>
      </main>

      <CreateInvoiceModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => refetchInvoices()}
      />
    </div>
  );
}