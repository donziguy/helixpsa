"use client";

import { useState, useEffect } from "react";
import { api } from "@/utils/api";
import { useToastHelpers } from "@/lib/toast-context";

interface TimeEstimationPanelProps {
  title: string;
  description?: string;
  ticketId?: string;
  currentEstimate?: number;
  onEstimateUpdate?: (hours: number) => void;
  disabled?: boolean;
}

interface SimilarTicket {
  title: string;
  estimatedHours: number;
  priority: string;
}

export default function TimeEstimationPanel({ 
  title, 
  description, 
  ticketId, 
  currentEstimate, 
  onEstimateUpdate,
  disabled = false 
}: TimeEstimationPanelProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [aiEstimate, setAiEstimate] = useState<number | null>(null);
  const [confidence, setConfidence] = useState<number>(0);
  const [reasoning, setReasoning] = useState<string>("");
  const [similarTickets, setSimilarTickets] = useState<SimilarTicket[]>([]);
  const [category, setCategory] = useState<string>("");
  const [manualEstimate, setManualEstimate] = useState<string>("");
  const [showDetails, setShowDetails] = useState(false);
  
  const toast = useToastHelpers();
  const suggestTimeMutation = api.ai.suggestTime.useMutation();

  // Initialize manual estimate from current value
  useEffect(() => {
    if (currentEstimate !== undefined) {
      setManualEstimate(currentEstimate.toString());
    }
  }, [currentEstimate]);

  const handleGetEstimate = async () => {
    if (!title.trim()) {
      toast.error("Error", "Please enter a ticket title first");
      return;
    }

    setIsLoading(true);
    try {
      const result = await suggestTimeMutation.mutateAsync({
        title: title.trim(),
        description: description?.trim(),
        ticketId: ticketId,
      });

      setAiEstimate(result.estimatedHours);
      setConfidence(result.confidence);
      setReasoning(result.reasoning);
      setSimilarTickets(result.similarTickets || []);
      setCategory(result.category);
      
      // Auto-fill manual estimate with AI suggestion
      setManualEstimate(result.estimatedHours.toString());
      
      // Notify parent component
      if (onEstimateUpdate) {
        onEstimateUpdate(result.estimatedHours);
      }

      toast.success("Estimate Generated", `AI suggests ${result.estimatedHours}h based on ${result.category} category`);
    } catch (error) {
      console.error('Failed to get time estimate:', error);
      toast.error("Error", "Failed to generate time estimate");
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualEstimateChange = (value: string) => {
    setManualEstimate(value);
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 0 && onEstimateUpdate) {
      onEstimateUpdate(numValue);
    }
  };

  const formatConfidence = (conf: number) => {
    if (conf >= 0.8) return { text: "High", color: "#22c55e" };
    if (conf >= 0.6) return { text: "Medium", color: "#f59e0b" };
    return { text: "Low", color: "#ef4444" };
  };

  const confidenceInfo = formatConfidence(confidence);

  return (
    <div style={{
      background: "var(--bg-tertiary)",
      border: "1px solid var(--border-subtle)",
      borderRadius: 8,
      overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        padding: "12px 16px",
        borderBottom: "1px solid var(--border-subtle)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 500, color: "var(--text)" }}>
            ⏱️ Time Estimation
          </span>
          {aiEstimate !== null && (
            <span style={{
              fontSize: 11,
              padding: "2px 6px",
              borderRadius: 4,
              background: confidenceInfo.color + "20",
              color: confidenceInfo.color,
              fontWeight: 500,
            }}>
              {confidenceInfo.text} Confidence
            </span>
          )}
        </div>
        <button
          onClick={() => setShowDetails(!showDetails)}
          style={{
            background: "none",
            border: "none",
            color: "var(--text-secondary)",
            cursor: "pointer",
            fontSize: 12,
            padding: "2px 4px",
          }}
        >
          {showDetails ? "Hide details" : "Show details"}
        </button>
      </div>

      {/* Content */}
      <div style={{ padding: "16px" }}>
        {/* AI Estimate Section */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <button
              onClick={handleGetEstimate}
              disabled={disabled || isLoading || !title.trim()}
              style={{
                padding: "8px 12px",
                borderRadius: 6,
                border: "1px solid var(--accent)",
                background: isLoading ? "var(--bg-tertiary)" : "var(--accent)",
                color: isLoading ? "var(--text-muted)" : "white",
                fontSize: 13,
                fontWeight: 500,
                cursor: disabled || isLoading ? "not-allowed" : "pointer",
                fontFamily: "inherit",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              {isLoading ? (
                <>
                  <span style={{ 
                    width: 12, 
                    height: 12, 
                    border: "2px solid transparent", 
                    borderTop: "2px solid currentColor",
                    borderRadius: "50%",
                    animation: "spin 1s linear infinite"
                  }} />
                  Analyzing...
                </>
              ) : (
                <>
                  🤖 Get AI Estimate
                </>
              )}
            </button>

            {aiEstimate !== null && (
              <div style={{
                padding: "8px 12px",
                borderRadius: 6,
                background: "var(--success-bg)",
                color: "var(--success)",
                fontSize: 13,
                fontWeight: 600,
                border: "1px solid var(--success-border)",
              }}>
                AI suggests: {aiEstimate}h
              </div>
            )}
          </div>

          {/* Manual Override */}
          <div>
            <label 
              htmlFor="estimated-hours-input"
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 500,
                color: "var(--text)",
                marginBottom: 4,
              }}
            >
              Estimated Hours
            </label>
            <input
              id="estimated-hours-input"
              type="number"
              min="0"
              max="999"
              step="0.1"
              value={manualEstimate}
              onChange={(e) => handleManualEstimateChange(e.target.value)}
              disabled={disabled}
              placeholder="Enter hours..."
              style={{
                width: "120px",
                padding: "6px 8px",
                borderRadius: 4,
                border: "1px solid var(--border)",
                background: "var(--bg)",
                color: "var(--text)",
                fontSize: 13,
                fontFamily: "inherit",
                outline: "none",
              }}
            />
            <span style={{
              marginLeft: 8,
              fontSize: 12,
              color: "var(--text-muted)",
            }}>
              hours
            </span>
          </div>
        </div>

        {/* Details Section */}
        {showDetails && (reasoning || similarTickets.length > 0) && (
          <div style={{
            padding: "12px",
            borderRadius: 6,
            background: "var(--bg)",
            border: "1px solid var(--border-subtle)",
          }}>
            {/* Category and Reasoning */}
            {category && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text)", marginBottom: 4 }}>
                  Category: {category}
                </div>
                {reasoning && (
                  <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.4 }}>
                    {reasoning}
                  </div>
                )}
              </div>
            )}

            {/* Similar Tickets */}
            {similarTickets.length > 0 && (
              <div>
                <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text)", marginBottom: 6 }}>
                  Similar Resolved Tickets:
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {similarTickets.slice(0, 3).map((ticket, index) => (
                    <div
                      key={index}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "6px 8px",
                        borderRadius: 4,
                        background: "var(--bg-tertiary)",
                        fontSize: 11,
                      }}
                    >
                      <span 
                        style={{ 
                          color: "var(--text-secondary)", 
                          flex: 1,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          marginRight: 8,
                        }}
                        title={ticket.title}
                      >
                        {ticket.title}
                      </span>
                      <span style={{ 
                        color: "var(--text)", 
                        fontWeight: 500,
                        fontFamily: "monospace",
                      }}>
                        {ticket.estimatedHours}h
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Loading Animation */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}