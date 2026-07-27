import React from "react";
import { Sparkles, RefreshCw, ShieldCheck, CheckCircle2, FileText, Zap } from "lucide-react";

export default function AISummaryPanel({
  overallSummary,
  eventSummary,
  selectedEncounter,
  onRefreshSummary,
  loadingOverall,
  loadingEvent
}) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm space-y-5">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-extrabold text-xs text-slate-900 dark:text-slate-50 uppercase tracking-wider">
              AI Medical Assistant
            </h3>
            <span className="text-3xs font-semibold text-slate-400 block">
              Grounded Read-Only Summarizer
            </span>
          </div>
        </div>

        <button
          onClick={onRefreshSummary}
          disabled={loadingOverall}
          title="Regenerate & refresh patient summary"
          className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-600 dark:text-slate-300 transition cursor-pointer active:scale-95 disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loadingOverall ? "animate-spin text-blue-600" : ""}`} />
        </button>
      </div>

      {/* 1. Overall Patient Summary (Cached & Delta-Focused) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-3xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
            <Zap className="h-3 w-3 text-amber-500" />
            Overall Patient Journey (Cached)
          </h4>
          {overallSummary?.is_cached && (
            <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 font-bold text-3xs border border-emerald-200 dark:border-emerald-800">
              ⚡ Cached
            </span>
          )}
        </div>

        {loadingOverall ? (
          <div className="p-4 bg-slate-50 dark:bg-slate-955 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 animate-pulse">
            <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-3/4"></div>
            <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/2"></div>
            <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-5/6"></div>
          </div>
        ) : overallSummary ? (
          <div className="p-3.5 bg-slate-50/80 dark:bg-slate-955/80 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
              {overallSummary.overall_summary}
            </div>

            {overallSummary.key_deltas && overallSummary.key_deltas.length > 0 && (
              <div className="border-t border-slate-200 dark:border-slate-800/80 pt-2.5 space-y-1">
                <span className="text-3xs font-extrabold uppercase tracking-wider text-slate-400 block">
                  Key Clinical Deltas & Progress
                </span>
                <ul className="space-y-1 text-3xs font-bold text-slate-600 dark:text-slate-300">
                  {overallSummary.key_deltas.map((delta, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <CheckCircle2 className="h-3 w-3 text-blue-600 shrink-0 mt-0.5" />
                      <span>{delta}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div className="p-3 text-xs text-slate-400 font-semibold text-center">
            No summary available.
          </div>
        )}
      </div>

      {/* 2. Focused Single-Event Summary */}
      {selectedEncounter && (
        <div className="space-y-2 border-t border-slate-100 dark:border-slate-800/80 pt-4">
          <h4 className="text-3xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
            <FileText className="h-3 w-3 text-blue-500" />
            Selected Encounter AI Breakdown
          </h4>

          {loadingEvent ? (
            <div className="p-3 bg-slate-50 dark:bg-slate-955 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 animate-pulse">
              <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-2/3"></div>
              <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/2"></div>
            </div>
          ) : eventSummary ? (
            <div className="p-3.5 bg-blue-50/50 dark:bg-blue-950/20 rounded-xl border border-blue-150 dark:border-blue-900/30 text-xs font-semibold text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
              {eventSummary.overall_summary}
            </div>
          ) : null}
        </div>
      )}

      {/* Grounding Compliance Banner */}
      <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-850/60 border border-slate-200 dark:border-slate-800 flex items-center gap-2 text-3xs font-bold text-slate-500 dark:text-slate-400">
        <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
        <span>Grounded strictly in verified patient medical records. AI never invents clinical facts.</span>
      </div>

    </div>
  );
}
