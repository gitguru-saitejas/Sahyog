import React from "react";
import { AlertTriangle, X } from "lucide-react";

export default function ConfirmDialog({ isOpen, onClose, onConfirm, title, message, confirmText = "Confirm", isDestructive = true }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-background/80 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl animate-fade-in z-10">
        <button 
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-muted-foreground hover:bg-secondary hover:text-foreground transition-all duration-200"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex gap-4">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
            isDestructive ? "bg-destructive/10 text-destructive border border-destructive/20" : "bg-primary/10 text-primary border border-primary/20"
          }`}>
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white font-display leading-tight">{title}</h3>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{message}</p>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-all duration-200 border border-border"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`px-4 py-2 text-sm font-semibold rounded-lg text-white shadow-lg transition-all duration-200 ${
              isDestructive 
                ? "bg-destructive hover:bg-destructive/90 shadow-destructive/10" 
                : "bg-primary hover:bg-primary/90 shadow-primary/10"
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
