import React from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

export default function SummarizeError({ message, onRetry }) {
  return (
    <div className="p-6 bg-red-50/20 dark:bg-red-950/10 border border-red-100/50 dark:border-red-900/30 rounded-2xl flex flex-col items-center justify-center text-center space-y-3.5 select-none min-h-[30vh]">
      <AlertCircle className="h-8 w-8 text-red-500 shrink-0" />
      <div className="space-y-1">
        <h4 className="text-xs font-bold text-red-700 dark:text-red-400">
          Clinical Summary Unavailable
        </h4>
        <p className="text-3xs text-slate-500 max-w-sm font-semibold leading-relaxed">
          {message || "Unable to generate AI summary at this time. Please check backend environment configuration."}
        </p>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="flex items-center gap-1.5 py-2 px-4.5 bg-red-500 hover:bg-red-600 text-white font-bold text-3xs rounded-xl cursor-pointer shadow-sm shadow-red-500/10 transition active:scale-98"
        >
          <RefreshCw className="h-3 w-3" /> Retry Generation
        </button>
      )}
    </div>
  );
}
