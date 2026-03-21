"use client";

import { createContext, useContext, useState, ReactNode, useCallback } from "react";
import ToastContainer, { Toast, ToastType } from "@/components/Toast";

interface ToastContextValue {
  showToast: (
    type: ToastType,
    title: string,
    description?: string,
    duration?: number
  ) => void;
  dismissToast: (id: string) => void;
  toasts: Toast[];
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((
    type: ToastType,
    title: string,
    description?: string,
    duration?: number
  ) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newToast: Toast = {
      id,
      type,
      title,
      description,
      duration: duration ?? 5000,
    };

    setToasts((prev) => [...prev, newToast]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const contextValue: ToastContextValue = {
    showToast,
    dismissToast,
    toasts,
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
}

// Convenience functions for common toast types
export function useToastHelpers() {
  const { showToast } = useToast();

  return {
    success: (title: string, description?: string, duration?: number) =>
      showToast("success", title, description, duration),
    error: (title: string, description?: string, duration?: number) =>
      showToast("error", title, description, duration),
    info: (title: string, description?: string, duration?: number) =>
      showToast("info", title, description, duration),
    warning: (title: string, description?: string, duration?: number) =>
      showToast("warning", title, description, duration),
  };
}