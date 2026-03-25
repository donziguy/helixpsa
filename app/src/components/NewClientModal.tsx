"use client";

import { useState, useEffect, useRef } from "react";
import { api } from "@/utils/api";
import { useToastHelpers } from "@/lib/toast-context";

interface NewClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const slaTiers = ["Standard", "Premium", "Enterprise"] as const;
const responseTimeOptions = {
  Standard: "4 hours",
  Premium: "1 hour",
  Enterprise: "30 minutes"
};

export default function NewClientModal({ isOpen, onClose, onSuccess }: NewClientModalProps) {
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [slaTier, setSlaTier] = useState<"Standard" | "Premium" | "Enterprise">("Standard");
  const [responseTime, setResponseTime] = useState("4 hours");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const nameRef = useRef<HTMLInputElement>(null);
  const toast = useToastHelpers();
  
  const createClientMutation = api.clients.create.useMutation();

  useEffect(() => {
    if (isOpen) {
      // Reset form
      setName("");
      setIndustry("");
      setSlaTier("Standard");
      setResponseTime("4 hours");
      setIsSubmitting(false);
      // Focus name field
      setTimeout(() => nameRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    // Update response time when SLA tier changes
    setResponseTime(responseTimeOptions[slaTier]);
  }, [slaTier]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    }
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("Error", "Client name is required");
      return;
    }

    setIsSubmitting(true);
    try {
      await createClientMutation.mutateAsync({
        name: name.trim(),
        industry: industry.trim() || undefined,
        slaTier,
        responseTime,
      });

      onSuccess();
      onClose();
    } catch (error) {
      toast.error("Error", "Failed to create client");
      console.error("Create client error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit = name.trim() && !isSubmitting;

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "20px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%", maxWidth: 500,
          background: "var(--bg-secondary)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div style={{
          padding: "20px 24px",
          borderBottom: "1px solid var(--border-subtle)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <h2 style={{
            fontSize: 18, fontWeight: 600, color: "var(--text)",
            margin: 0, display: "flex", alignItems: "center", gap: 8,
          }}>
            <span>👥</span> New Client
          </h2>
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
        <div style={{ padding: "24px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Client Name */}
            <div>
              <label style={{
                display: "block", fontSize: 14, fontWeight: 500,
                color: "var(--text)", marginBottom: 6,
              }}>
                Client Name *
              </label>
              <input
                ref={nameRef}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Acme Corporation"
                style={{
                  width: "100%", padding: "10px 12px",
                  border: "1px solid var(--border)", borderRadius: 6,
                  fontSize: 14, background: "var(--bg)", color: "var(--text)",
                }}
              />
            </div>

            {/* Industry */}
            <div>
              <label style={{
                display: "block", fontSize: 14, fontWeight: 500,
                color: "var(--text)", marginBottom: 6,
              }}>
                Industry
              </label>
              <input
                type="text"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                placeholder="e.g., Healthcare, Manufacturing, Technology"
                style={{
                  width: "100%", padding: "10px 12px",
                  border: "1px solid var(--border)", borderRadius: 6,
                  fontSize: 14, background: "var(--bg)", color: "var(--text)",
                }}
              />
            </div>

            {/* SLA Tier */}
            <div>
              <label style={{
                display: "block", fontSize: 14, fontWeight: 500,
                color: "var(--text)", marginBottom: 6,
              }}>
                SLA Tier
              </label>
              <select
                value={slaTier}
                onChange={(e) => setSlaTier(e.target.value as "Standard" | "Premium" | "Enterprise")}
                style={{
                  width: "100%", padding: "10px 12px",
                  border: "1px solid var(--border)", borderRadius: 6,
                  fontSize: 14, background: "var(--bg)", color: "var(--text)",
                }}
              >
                {slaTiers.map(tier => (
                  <option key={tier} value={tier}>{tier}</option>
                ))}
              </select>
            </div>

            {/* Response Time */}
            <div>
              <label style={{
                display: "block", fontSize: 14, fontWeight: 500,
                color: "var(--text)", marginBottom: 6,
              }}>
                Response Time
              </label>
              <input
                type="text"
                value={responseTime}
                onChange={(e) => setResponseTime(e.target.value)}
                style={{
                  width: "100%", padding: "10px 12px",
                  border: "1px solid var(--border)", borderRadius: 6,
                  fontSize: 14, background: "var(--bg)", color: "var(--text)",
                }}
              />
              <p style={{
                fontSize: 12, color: "var(--text-muted)", margin: "4px 0 0 0"
              }}>
                Changes automatically based on SLA tier
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: "16px 24px", borderTop: "1px solid var(--border-subtle)",
          display: "flex", justifyContent: "flex-end", gap: 12,
        }}>
          <button
            onClick={onClose}
            style={{
              background: "var(--bg-hover)", color: "var(--text)",
              border: "1px solid var(--border)", borderRadius: 6,
              padding: "8px 16px", fontSize: 14, cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            style={{
              background: canSubmit ? "var(--accent)" : "var(--bg-subtle)",
              color: canSubmit ? "white" : "var(--text-muted)",
              border: "none", borderRadius: 6,
              padding: "8px 16px", fontSize: 14, fontWeight: 500,
              cursor: canSubmit ? "pointer" : "not-allowed",
              opacity: isSubmitting ? 0.7 : 1,
            }}
          >
            {isSubmitting ? "Creating..." : "Create Client"}
          </button>
        </div>
      </div>
    </div>
  );
}