import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────

export type ToastVariant = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  toast: {
    success: (msg: string) => void;
    error: (msg: string) => void;
    info: (msg: string) => void;
    warning: (msg: string) => void;
  };
}

// ── Context ────────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx.toast;
}

// ── Toast Item ─────────────────────────────────────────────────────────────────

const variantConfig: Record<ToastVariant, {
  icon: React.ReactNode;
  borderClass: string;
  iconClass: string;
  bgClass: string;
}> = {
  success: {
    icon: <CheckCircle2 className="w-4 h-4 shrink-0" />,
    borderClass: 'border-emerald-500/30',
    iconClass: 'text-emerald-400',
    bgClass: 'bg-[#0d1f16]',
  },
  error: {
    icon: <XCircle className="w-4 h-4 shrink-0" />,
    borderClass: 'border-red-500/30',
    iconClass: 'text-red-400',
    bgClass: 'bg-[#1f0d0d]',
  },
  info: {
    icon: <Info className="w-4 h-4 shrink-0" />,
    borderClass: 'border-blue-500/30',
    iconClass: 'text-blue-400',
    bgClass: 'bg-[#0d1220]',
  },
  warning: {
    icon: <AlertTriangle className="w-4 h-4 shrink-0" />,
    borderClass: 'border-amber-500/30',
    iconClass: 'text-amber-400',
    bgClass: 'bg-[#1e1608]',
  },
};

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const cfg = variantConfig[toast.variant];
  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 rounded-xl border shadow-2xl backdrop-blur-sm max-w-sm w-full
        ${cfg.bgClass} ${cfg.borderClass} text-white
        animate-in slide-in-from-right-4 fade-in duration-300`}
      role="alert"
    >
      <span className={`mt-0.5 ${cfg.iconClass}`}>{cfg.icon}</span>
      <p className="flex-1 text-[13px] font-medium leading-snug font-sans">{toast.message}</p>
      <button
        onClick={() => onDismiss(toast.id)}
        className="text-gray-500 hover:text-white transition shrink-0 mt-0.5 cursor-pointer"
        aria-label="Dismiss"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ── Provider & Container ───────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counterRef = useRef(0);

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const add = useCallback((message: string, variant: ToastVariant) => {
    const id = `toast-${++counterRef.current}`;
    setToasts(prev => [...prev, { id, message, variant }]);
    setTimeout(() => dismiss(id), 4500);
  }, [dismiss]);

  const toast = {
    success: (msg: string) => add(msg, 'success'),
    error: (msg: string) => add(msg, 'error'),
    info: (msg: string) => add(msg, 'info'),
    warning: (msg: string) => add(msg, 'warning'),
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Toast container — fixed top-right, above everything */}
      <div
        aria-live="polite"
        className="fixed top-4 right-4 z-[9999] flex flex-col gap-2.5 pointer-events-none"
      >
        {toasts.map(t => (
          <div key={t.id} className="pointer-events-auto">
            <ToastItem toast={t} onDismiss={dismiss} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// ── Confirm Dialog ─────────────────────────────────────────────────────────────
// Drop-in replacement for window.confirm() — renders inline, returns a Promise

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  const confirmColors = {
    danger: 'bg-red-500/90 hover:bg-red-500 text-white border-red-500/50',
    warning: 'bg-amber-500/90 hover:bg-amber-500 text-black border-amber-500/50',
    info: 'bg-blue-500/90 hover:bg-blue-500 text-white border-blue-500/50',
  };

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center p-4"
      onClick={onCancel}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Dialog */}
      <div
        className="relative bg-[#13151E] border border-[#252A3A] rounded-2xl shadow-2xl p-6 max-w-sm w-full space-y-4 animate-in zoom-in-95 fade-in duration-200"
        onClick={e => e.stopPropagation()}
      >
        <div className="space-y-1.5">
          <h3 className="text-base font-bold text-white font-sans">{title}</h3>
          <p className="text-sm text-gray-400 leading-relaxed">{message}</p>
        </div>

        <div className="flex gap-3 pt-1">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold bg-[#1C1F2B] hover:bg-[#242838] border border-[#2A3040] text-gray-300 transition cursor-pointer"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-bold border transition cursor-pointer ${confirmColors[variant]}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
