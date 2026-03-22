"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import { api } from "@/utils/api";
import { useToastHelpers } from "@/lib/toast-context";

interface CreatePolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editPolicy?: any;
}

function CreatePolicyModal({ isOpen, onClose, onSuccess, editPolicy }: CreatePolicyModalProps) {
  const [formData, setFormData] = useState({
    name: editPolicy?.name || "",
    description: editPolicy?.description || "",
    slaTier: editPolicy?.slaTier || "Standard",
    priority: editPolicy?.priority || "medium",
    responseTimeMinutes: editPolicy?.responseTimeMinutes || 240, // 4 hours default
    resolutionTimeMinutes: editPolicy?.resolutionTimeMinutes || 1440, // 24 hours default
    warningThresholdPercent: editPolicy?.warningThresholdPercent || 80,
    escalationTimeMinutes: editPolicy?.escalationTimeMinutes || "",
    businessHoursOnly: editPolicy?.businessHoursOnly || false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const toast = useToastHelpers();
  
  const createPolicyMutation = api.sla.policies.create.useMutation();
  const updatePolicyMutation = api.sla.policies.update.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const payload = {
        ...formData,
        escalationTimeMinutes: formData.escalationTimeMinutes ? Number(formData.escalationTimeMinutes) : undefined,
      };

      if (editPolicy) {
        await updatePolicyMutation.mutateAsync({
          id: editPolicy.id,
          ...payload,
        });
        toast.success("Success", "SLA policy updated successfully");
      } else {
        await createPolicyMutation.mutateAsync(payload);
        toast.success("Success", "SLA policy created successfully");
      }
      
      onSuccess();
      onClose();
      
      // Reset form
      setFormData({
        name: "",
        description: "",
        slaTier: "Standard",
        priority: "medium",
        responseTimeMinutes: 240,
        resolutionTimeMinutes: 1440,
        warningThresholdPercent: 80,
        escalationTimeMinutes: "",
        businessHoursOnly: false,
      });
    } catch (error: any) {
      toast.error("Error", error.message || "Failed to save SLA policy");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatMinutesToHours = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const hoursToMinutes = (hours: number) => hours * 60;

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
          <h2 style={{ fontSize: 20, fontWeight: 600, margin: "0 0 8px 0" }}>
            {editPolicy ? "Edit SLA Policy" : "Create SLA Policy"}
          </h2>
          <p style={{ color: "var(--text-muted)", margin: 0 }}>
            Define response and resolution time requirements for different client tiers and ticket priorities
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Basic Info */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <label style={{ display: "block", marginBottom: 8, fontSize: 14, fontWeight: 500 }}>
                Policy Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Enterprise Critical"
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

            <div>
              <label style={{ display: "block", marginBottom: 8, fontSize: 14, fontWeight: 500 }}>
                Warning Threshold (%)
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={formData.warningThresholdPercent}
                onChange={(e) => setFormData(prev => ({ ...prev, warningThresholdPercent: Number(e.target.value) }))}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  fontSize: 14,
                  background: "var(--bg-secondary)",
                  color: "var(--text)",
                }}
              />
              <small style={{ color: "var(--text-muted)", fontSize: 12 }}>
                Show warning at this % of resolution time
              </small>
            </div>
          </div>

          {/* Tier and Priority */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <label style={{ display: "block", marginBottom: 8, fontSize: 14, fontWeight: 500 }}>
                SLA Tier *
              </label>
              <select
                value={formData.slaTier}
                onChange={(e) => setFormData(prev => ({ ...prev, slaTier: e.target.value as any }))}
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
                <option value="Enterprise">Enterprise</option>
                <option value="Premium">Premium</option>
                <option value="Standard">Standard</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", marginBottom: 8, fontSize: 14, fontWeight: 500 }}>
                Priority *
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as any }))}
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
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>

          {/* Time Settings */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <label style={{ display: "block", marginBottom: 8, fontSize: 14, fontWeight: 500 }}>
                Response Time (minutes) *
              </label>
              <input
                type="number"
                min="1"
                value={formData.responseTimeMinutes}
                onChange={(e) => setFormData(prev => ({ ...prev, responseTimeMinutes: Number(e.target.value) }))}
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
              <small style={{ color: "var(--text-muted)", fontSize: 12 }}>
                {formatMinutesToHours(formData.responseTimeMinutes)}
              </small>
            </div>

            <div>
              <label style={{ display: "block", marginBottom: 8, fontSize: 14, fontWeight: 500 }}>
                Resolution Time (minutes) *
              </label>
              <input
                type="number"
                min="1"
                value={formData.resolutionTimeMinutes}
                onChange={(e) => setFormData(prev => ({ ...prev, resolutionTimeMinutes: Number(e.target.value) }))}
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
              <small style={{ color: "var(--text-muted)", fontSize: 12 }}>
                {formatMinutesToHours(formData.resolutionTimeMinutes)}
              </small>
            </div>
          </div>

          {/* Quick Time Presets */}
          <div>
            <label style={{ display: "block", marginBottom: 8, fontSize: 14, fontWeight: 500 }}>
              Quick Presets
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
              {[
                { label: "1h/4h", response: 60, resolution: 240 },
                { label: "2h/8h", response: 120, resolution: 480 },
                { label: "4h/24h", response: 240, resolution: 1440 },
                { label: "24h/72h", response: 1440, resolution: 4320 },
              ].map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => setFormData(prev => ({
                    ...prev,
                    responseTimeMinutes: preset.response,
                    resolutionTimeMinutes: preset.resolution,
                  }))}
                  style={{
                    padding: "6px 8px",
                    border: "1px solid var(--border)",
                    borderRadius: 4,
                    background: "var(--bg-secondary)",
                    color: "var(--text-secondary)",
                    fontSize: 12,
                    cursor: "pointer",
                    transition: "all 100ms ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--accent-muted)";
                    e.currentTarget.style.color = "var(--accent)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "var(--bg-secondary)";
                    e.currentTarget.style.color = "var(--text-secondary)";
                  }}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Additional Settings */}
          <div>
            <label style={{ display: "block", marginBottom: 8, fontSize: 14, fontWeight: 500 }}>
              Escalation Time (minutes, optional)
            </label>
            <input
              type="number"
              min="1"
              value={formData.escalationTimeMinutes}
              onChange={(e) => setFormData(prev => ({ ...prev, escalationTimeMinutes: e.target.value }))}
              placeholder="e.g., 60 (1 hour)"
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid var(--border)",
                borderRadius: 6,
                fontSize: 14,
                background: "var(--bg-secondary)",
                color: "var(--text)",
              }}
            />
            <small style={{ color: "var(--text-muted)", fontSize: 12 }}>
              Auto-escalate unresponded tickets after this time
            </small>
          </div>

          <div>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 500, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={formData.businessHoursOnly}
                onChange={(e) => setFormData(prev => ({ ...prev, businessHoursOnly: e.target.checked }))}
              />
              Business Hours Only
            </label>
            <small style={{ color: "var(--text-muted)", fontSize: 12, marginLeft: 20 }}>
              Only count business hours in SLA calculations
            </small>
          </div>

          {/* Description */}
          <div>
            <label style={{ display: "block", marginBottom: 8, fontSize: 14, fontWeight: 500 }}>
              Description (Optional)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Additional details about this SLA policy..."
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
              disabled={isSubmitting}
              style={{
                padding: "8px 16px",
                background: "var(--accent)",
                color: "white",
                border: "none",
                borderRadius: 6,
                cursor: isSubmitting ? "not-allowed" : "pointer",
                opacity: isSubmitting ? 0.6 : 1,
              }}
            >
              {isSubmitting ? "Saving..." : (editPolicy ? "Update Policy" : "Create Policy")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function SlaPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"policies" | "alerts">("policies");
  
  const toast = useToastHelpers();
  
  const { data: policies, refetch: refetchPolicies } = api.sla.policies.getAll.useQuery();
  const { data: alerts, refetch: refetchAlerts } = api.sla.alerts.getAll.useQuery({});
  const { data: alertStats } = api.sla.alerts.getStats.useQuery();
  
  const deletePolicyMutation = api.sla.policies.delete.useMutation();
  const acknowledgeAlertMutation = api.sla.alerts.acknowledge.useMutation();

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return { bg: '#fee2e2', color: '#991b1b' };
      case 'high': return { bg: '#fef3c7', color: '#92400e' };
      case 'medium': return { bg: '#dbeafe', color: '#1e40af' };
      case 'low': return { bg: '#f0f9ff', color: '#0369a1' };
      default: return { bg: 'var(--bg-hover)', color: 'var(--text-muted)' };
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'Enterprise': return { bg: '#f3e8ff', color: '#7c2d12' };
      case 'Premium': return { bg: '#fef3c7', color: '#92400e' };
      case 'Standard': return { bg: '#f0f9ff', color: '#0369a1' };
      default: return { bg: 'var(--bg-hover)', color: 'var(--text-muted)' };
    }
  };

  const getAlertColor = (alertType: string) => {
    switch (alertType) {
      case 'breach': return { bg: '#fee2e2', color: '#991b1b' };
      case 'warning': return { bg: '#fef3c7', color: '#92400e' };
      case 'escalation': return { bg: '#dbeafe', color: '#1e40af' };
      default: return { bg: 'var(--bg-hover)', color: 'var(--text-muted)' };
    }
  };

  const handleDeletePolicy = async (policy: any) => {
    if (!confirm(`Are you sure you want to delete the SLA policy "${policy.name}"?`)) {
      return;
    }

    try {
      await deletePolicyMutation.mutateAsync({ id: policy.id });
      toast.success("Success", "SLA policy deleted successfully");
      refetchPolicies();
    } catch (error: any) {
      toast.error("Error", error.message || "Failed to delete SLA policy");
    }
  };

  const handleAcknowledgeAlert = async (alert: any) => {
    try {
      await acknowledgeAlertMutation.mutateAsync({ alertId: alert.id });
      toast.success("Success", "Alert acknowledged");
      refetchAlerts();
    } catch (error: any) {
      toast.error("Error", error.message || "Failed to acknowledge alert");
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
                SLA Management
              </h1>
              <p style={{ 
                fontSize: 14, 
                color: "var(--text-muted)", 
                margin: "4px 0 0 0" 
              }}>
                Configure service level agreements and monitor compliance
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
              + New SLA Policy
            </button>
          </div>

          {/* Stats */}
          {alertStats && (
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
                <div style={{ fontSize: 18, fontWeight: 700, color: alertStats.activeBreaches > 0 ? "#ef4444" : "var(--text)", marginBottom: 2 }}>
                  {alertStats.activeBreaches}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Active Breaches</div>
              </div>

              <div style={{
                background: "var(--bg-secondary)",
                padding: "12px",
                borderRadius: 6,
                border: "1px solid var(--border-subtle)"
              }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: alertStats.approachingDeadline > 0 ? "#f59e0b" : "var(--text)", marginBottom: 2 }}>
                  {alertStats.approachingDeadline}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Approaching Deadline</div>
                <div style={{ fontSize: 10, color: "var(--text-muted)" }}>Next 2 hours</div>
              </div>

              <div style={{
                background: "var(--bg-secondary)",
                padding: "12px",
                borderRadius: 6,
                border: "1px solid var(--border-subtle)"
              }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", marginBottom: 2 }}>
                  {policies?.filter(p => p.isActive).length || 0}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Active Policies</div>
              </div>

              <div style={{
                background: "var(--bg-secondary)",
                padding: "12px",
                borderRadius: 6,
                border: "1px solid var(--border-subtle)"
              }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", marginBottom: 2 }}>
                  {alertStats.alertCounts.find(a => a.status === 'active')?.count || 0}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Open Alerts</div>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div style={{ display: "flex", gap: 0 }}>
            {[
              { key: "policies", label: "SLA Policies" },
              { key: "alerts", label: "Alerts" },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                style={{
                  padding: "8px 16px",
                  border: "none",
                  borderBottom: activeTab === tab.key ? "2px solid var(--accent)" : "2px solid transparent",
                  background: "transparent",
                  color: activeTab === tab.key ? "var(--accent)" : "var(--text-muted)",
                  fontWeight: activeTab === tab.key ? 600 : 400,
                  cursor: "pointer",
                  fontSize: 14,
                  transition: "all 100ms ease",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div style={{ 
          padding: "24px", 
          overflow: "auto", 
          height: "calc(100vh - 220px)" 
        }}>
          {activeTab === "policies" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {policies?.map((policy) => {
                const priorityStyle = getPriorityColor(policy.priority);
                const tierStyle = getTierColor(policy.slaTier);
                
                return (
                  <div
                    key={policy.id}
                    style={{
                      background: "var(--bg-secondary)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: 8,
                      padding: 20,
                      transition: "all 100ms ease",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                          <h3 style={{
                            fontSize: 16,
                            fontWeight: 600,
                            margin: 0,
                            color: "var(--text)",
                          }}>
                            {policy.name}
                          </h3>
                          
                          <span style={{
                            fontSize: 11,
                            fontWeight: 500,
                            color: tierStyle.color,
                            background: tierStyle.bg,
                            padding: "2px 8px",
                            borderRadius: 12,
                            textTransform: "uppercase",
                            letterSpacing: "0.5px"
                          }}>
                            {policy.slaTier}
                          </span>
                          
                          <span style={{
                            fontSize: 11,
                            fontWeight: 500,
                            color: priorityStyle.color,
                            background: priorityStyle.bg,
                            padding: "2px 8px",
                            borderRadius: 12,
                            textTransform: "uppercase",
                            letterSpacing: "0.5px"
                          }}>
                            {policy.priority}
                          </span>

                          {!policy.isActive && (
                            <span style={{
                              fontSize: 11,
                              fontWeight: 500,
                              color: "var(--text-muted)",
                              background: "var(--bg-hover)",
                              padding: "2px 8px",
                              borderRadius: 12,
                              textTransform: "uppercase",
                              letterSpacing: "0.5px"
                            }}>
                              Inactive
                            </span>
                          )}
                        </div>
                        
                        {policy.description && (
                          <p style={{ 
                            fontSize: 14, 
                            color: "var(--text-muted)", 
                            margin: "0 0 12px 0" 
                          }}>
                            {policy.description}
                          </p>
                        )}
                        
                        <div style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
                          gap: 16,
                          fontSize: 13
                        }}>
                          <div>
                            <div style={{ color: "var(--text-muted)", fontSize: 11, marginBottom: 2 }}>Response Time</div>
                            <div style={{ fontWeight: 600, color: "var(--accent)" }}>{formatTime(policy.responseTimeMinutes)}</div>
                          </div>
                          <div>
                            <div style={{ color: "var(--text-muted)", fontSize: 11, marginBottom: 2 }}>Resolution Time</div>
                            <div style={{ fontWeight: 600, color: "var(--accent)" }}>{formatTime(policy.resolutionTimeMinutes)}</div>
                          </div>
                          <div>
                            <div style={{ color: "var(--text-muted)", fontSize: 11, marginBottom: 2 }}>Warning At</div>
                            <div style={{ fontWeight: 600 }}>{policy.warningThresholdPercent}%</div>
                          </div>
                          {policy.escalationTimeMinutes && (
                            <div>
                              <div style={{ color: "var(--text-muted)", fontSize: 11, marginBottom: 2 }}>Escalation</div>
                              <div style={{ fontWeight: 600 }}>{formatTime(policy.escalationTimeMinutes)}</div>
                            </div>
                          )}
                          {policy.businessHoursOnly && (
                            <div>
                              <div style={{ color: "var(--text-muted)", fontSize: 11, marginBottom: 2 }}>Schedule</div>
                              <div style={{ fontWeight: 600, color: "var(--accent)" }}>Business Hours</div>
                            </div>
                          )}
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          onClick={() => {
                            setEditingPolicy(policy);
                            setShowCreateModal(true);
                          }}
                          style={{
                            padding: "6px 12px",
                            border: "1px solid var(--border)",
                            borderRadius: 4,
                            background: "transparent",
                            color: "var(--text-secondary)",
                            fontSize: 12,
                            cursor: "pointer",
                          }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeletePolicy(policy)}
                          style={{
                            padding: "6px 12px",
                            border: "1px solid #ef4444",
                            borderRadius: 4,
                            background: "transparent",
                            color: "#ef4444",
                            fontSize: 12,
                            cursor: "pointer",
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    <div style={{
                      fontSize: 11,
                      color: "var(--text-muted)",
                      paddingTop: 8,
                      borderTop: "1px solid var(--border-subtle)"
                    }}>
                      Created {formatDate(policy.createdAt)}
                    </div>
                  </div>
                );
              })}

              {/* Empty State */}
              {(!policies || policies.length === 0) && (
                <div style={{
                  textAlign: "center",
                  padding: "64px 20px",
                  color: "var(--text-muted)"
                }}>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>⏱️</div>
                  <h3 style={{ fontSize: 18, fontWeight: 500, margin: "0 0 8px 0" }}>
                    No SLA policies configured
                  </h3>
                  <p style={{ fontSize: 14, margin: "0 0 16px 0" }}>
                    Create your first SLA policy to start tracking service level agreements
                  </p>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    style={{
                      background: "var(--accent)",
                      color: "white",
                      border: "none",
                      padding: "8px 16px",
                      borderRadius: 6,
                      fontSize: 14,
                      cursor: "pointer",
                    }}
                  >
                    Create SLA Policy
                  </button>
                </div>
              )}
            </div>
          ) : (
            // Alerts Tab
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {alerts?.map((alert) => {
                const alertStyle = getAlertColor(alert.alertType);
                
                return (
                  <div
                    key={alert.id}
                    style={{
                      background: "var(--bg-secondary)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: 8,
                      padding: 16,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                          <span style={{
                            fontSize: 11,
                            fontWeight: 500,
                            color: alertStyle.color,
                            background: alertStyle.bg,
                            padding: "2px 8px",
                            borderRadius: 12,
                            textTransform: "uppercase",
                            letterSpacing: "0.5px"
                          }}>
                            {alert.alertType}
                          </span>
                          
                          <span style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: "var(--accent)",
                          }}>
                            {alert.ticket?.number}
                          </span>
                          
                          <span style={{ fontSize: 14, fontWeight: 500 }}>
                            {alert.ticket?.title}
                          </span>
                        </div>
                        
                        <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 4 }}>
                          {alert.client?.name} • {alert.policy?.name}
                        </div>
                        
                        <div style={{ fontSize: 13, color: "var(--text)", marginBottom: 8 }}>
                          {alert.message}
                        </div>
                        
                        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                          Deadline: {formatDate(alert.deadlineAt)} • Created: {formatDate(alert.createdAt)}
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: 8 }}>
                        {alert.status === 'active' && (
                          <button
                            onClick={() => handleAcknowledgeAlert(alert)}
                            style={{
                              padding: "6px 12px",
                              background: "var(--accent)",
                              color: "white",
                              border: "none",
                              borderRadius: 4,
                              fontSize: 12,
                              cursor: "pointer",
                            }}
                          >
                            Acknowledge
                          </button>
                        )}
                        
                        {alert.status === 'acknowledged' && (
                          <span style={{
                            padding: "6px 12px",
                            background: "var(--accent-muted)",
                            color: "var(--accent)",
                            fontSize: 12,
                            borderRadius: 4,
                            fontWeight: 500,
                          }}>
                            Acknowledged
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Empty State */}
              {(!alerts || alerts.length === 0) && (
                <div style={{
                  textAlign: "center",
                  padding: "64px 20px",
                  color: "var(--text-muted)"
                }}>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>🔔</div>
                  <h3 style={{ fontSize: 18, fontWeight: 500, margin: "0 0 8px 0" }}>
                    No SLA alerts
                  </h3>
                  <p style={{ fontSize: 14, margin: 0 }}>
                    All tickets are within their SLA requirements
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <CreatePolicyModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setEditingPolicy(null);
        }}
        onSuccess={() => {
          refetchPolicies();
          setEditingPolicy(null);
        }}
        editPolicy={editingPolicy}
      />
    </div>
  );
}