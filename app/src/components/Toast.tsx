"use client";

import { useEffect, useState } from "react";

export type ToastType = "success" | "error" | "info" | "warning";

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number; // milliseconds, default 5000
}

interface ToastItemProps {
  toast: Toast;
  onDismiss: (id: string) => void;
}

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    // Animate in
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (toast.duration !== 0) {
      const timer = setTimeout(() => {
        setIsLeaving(true);
        setTimeout(() => onDismiss(toast.id), 300);
      }, toast.duration || 5000);
      return () => clearTimeout(timer);
    }
  }, [toast.id, toast.duration, onDismiss]);

  const getToastStyles = () => {
    const baseColor = 
      toast.type === "success" ? "#22c55e" :
      toast.type === "error" ? "#ef4444" :
      toast.type === "warning" ? "#f59e0b" :
      "#3b82f6"; // info

    const backgroundAlpha = 
      toast.type === "success" ? "rgba(34, 197, 94, 0.1)" :
      toast.type === "error" ? "rgba(239, 68, 68, 0.1)" :
      toast.type === "warning" ? "rgba(245, 158, 11, 0.1)" :
      "rgba(59, 130, 246, 0.1)"; // info

    return {
      background: "var(--bg)",
      border: `1px solid ${baseColor}`,
      borderRadius: 8,
      padding: "12px 16px",
      minWidth: 320,
      maxWidth: 400,
      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
      transform: isVisible && !isLeaving ? "translateX(0)" : "translateX(100%)",
      opacity: isVisible && !isLeaving ? 1 : 0,
      transition: "transform 300ms ease, opacity 300ms ease",
      position: "relative" as const,
      overflow: "hidden" as const,
    };
  };

  const getIcon = () => {
    switch (toast.type) {
      case "success":
        return "✅";
      case "error":
        return "❌";
      case "warning":
        return "⚠️";
      case "info":
      default:
        return "ℹ️";
    }
  };

  return (
    <div style={getToastStyles()}>
      {/* Progress bar for timed toasts */}
      {toast.duration !== 0 && (
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            width: "100%",
            height: 2,
            background: 
              toast.type === "success" ? "#22c55e" :
              toast.type === "error" ? "#ef4444" :
              toast.type === "warning" ? "#f59e0b" :
              "#3b82f6",
            animation: `toast-progress ${toast.duration || 5000}ms linear`,
            transformOrigin: "left",
          }}
        />
      )}

      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div style={{ fontSize: 16, flexShrink: 0, marginTop: 2 }}>
          {getIcon()}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 14,
            fontWeight: 600,
            color: "var(--text)",
            marginBottom: toast.description ? 4 : 0,
            lineHeight: 1.3,
          }}>
            {toast.title}
          </div>
          
          {toast.description && (
            <div style={{
              fontSize: 13,
              color: "var(--text-secondary)",
              lineHeight: 1.4,
            }}>
              {toast.description}
            </div>
          )}
        </div>

        <button
          onClick={() => {
            setIsLeaving(true);
            setTimeout(() => onDismiss(toast.id), 300);
          }}
          style={{
            background: "none",
            border: "none",
            color: "var(--text-muted)",
            cursor: "pointer",
            fontSize: 12,
            padding: "2px 4px",
            borderRadius: 4,
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--bg-tertiary)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "none";
          }}
        >
          ✕
        </button>
      </div>

      {/* Add global CSS animation for progress bar */}
      <style>{`
        @keyframes toast-progress {
          from {
            transform: scaleX(1);
          }
          to {
            transform: scaleX(0);
          }
        }
      `}</style>
    </div>
  );
}

export interface ToastContainerProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

export default function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 24,
        right: 24,
        zIndex: 50,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        pointerEvents: "none",
      }}
    >
      {toasts.map((toast) => (
        <div key={toast.id} style={{ pointerEvents: "auto" }}>
          <ToastItem toast={toast} onDismiss={onDismiss} />
        </div>
      ))}
    </div>
  );
}