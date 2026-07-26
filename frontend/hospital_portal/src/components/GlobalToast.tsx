import React from "react";
import { useAuth } from "../context/AuthContext";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";

export default function GlobalToast() {
  const { toastMessage, clearToast } = useAuth();

  if (!toastMessage) return null;

  const styles = {
    success: "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30",
    error: "bg-red-50 text-red-800 border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/30",
    info: "bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/30",
    warning: "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30",
  };

  const icons = {
    success: <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />,
    error: <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />,
    info: <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />,
    warning: <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />,
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 animate-in slide-in-from-bottom-5 duration-300 max-w-sm w-full">
      <div className={`flex items-start gap-3 p-4 border rounded-2xl shadow-lg ${styles[toastMessage.type]}`}>
        <div className="shrink-0">{icons[toastMessage.type]}</div>
        <div className="flex-1 text-xs font-bold leading-normal">{toastMessage.message}</div>
        <button
          onClick={clearToast}
          className="shrink-0 p-0.5 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 rounded-lg transition text-slate-450 hover:text-slate-700"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
