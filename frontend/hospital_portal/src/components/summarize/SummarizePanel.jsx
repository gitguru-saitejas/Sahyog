import React, { useState, useEffect } from "react";
import { Stethoscope, RefreshCw, AlertTriangle, Play, BrainCircuit } from "lucide-react";
import { checkPatientSummaryStatus, refreshPatientSummary } from "../../services/summarizeApi";
import SummarizeLoading from "./SummarizeLoading";
import SummarizeError from "./SummarizeError";

export default function SummarizePanel({ patientId }) {
  const [summary, setSummary] = useState(null);
  const [generatedAt, setGeneratedAt] = useState(null);
  const [isOutdated, setIsOutdated] = useState(false);
  const [hasCache, setHasCache] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);

  // Checks cache status on mount or patient change (no LLM generation)
  const checkStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const status = await checkPatientSummaryStatus(patientId);
      setHasCache(status.has_cache);
      setIsOutdated(status.is_outdated);
      if (status.has_cache) {
        setSummary(status.summary);
        setGeneratedAt(status.generated_at);
      } else {
        setSummary(null);
        setGeneratedAt(null);
      }
    } catch (err) {
      console.error("[SUMMARIZE PANEL] Error checking cache status:", err);
      // Fail silently to local state to allow manual generation
      setHasCache(false);
      setIsOutdated(true);
    } finally {
      setLoading(false);
    }
  };

  // Triggers actual Gemini summary generation
  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await refreshPatientSummary(patientId);
      setSummary(res.summary);
      setGeneratedAt(res.generated_at);
      setHasCache(true);
      setIsOutdated(false);
    } catch (err) {
      console.error("[SUMMARIZE PANEL] Error generating summary:", err);
      setError(
        err.response?.data?.detail || 
        "Unable to generate AI medical history summary. Please try again."
      );
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    if (patientId) {
      checkStatus();
    }
  }, [patientId]);

  if (loading) {
    return <SummarizeLoading />;
  }

  if (generating) {
    return <SummarizeLoading />;
  }

  if (error) {
    return (
      <SummarizeError 
        message={error} 
        onRetry={handleGenerate} 
      />
    );
  }

  return (
    <div className="bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm text-xs font-semibold select-none space-y-4">
      
      {/* Title Header */}
      <div className="flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-2">
        <BrainCircuit className="h-4.5 w-4.5 text-blue-600 dark:text-blue-400" />
        <h3 className="font-extrabold text-xs text-slate-850 dark:text-slate-100 tracking-tight uppercase">
          Medical History Summary
        </h3>
      </div>

      {/* Case 1: No Summary Generated Yet */}
      {!hasCache ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-850 p-4.5 rounded-xl text-center space-y-3.5">
          <p className="text-slate-400 dark:text-slate-500 font-bold text-3xs">
            No AI summary has been generated yet.
          </p>
          <p className="text-4xs text-slate-500 dark:text-slate-400 font-semibold leading-relaxed max-w-xs mx-auto">
            Generate a concise overview of this patient's recorded medical history to quickly understand previous diagnoses, encounters, and treatments.
          </p>
          <button
            type="button"
            onClick={handleGenerate}
            className="inline-flex items-center justify-center gap-1.5 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-3xs rounded-lg transition shadow-2xs cursor-pointer w-full"
          >
            <Play className="h-3 w-3 fill-current" />
            Generate Summary
          </button>
        </div>
      ) : (
        /* Case 2: Summary exists (with optional Outdated warning) */
        <div className="space-y-4">
          
          {/* Outdated Warning Indicator */}
          {isOutdated && (
            <div className="flex gap-2 p-2.5 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/30 text-amber-700 dark:text-amber-400 rounded-lg text-4xs leading-relaxed font-bold">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                Summary may be outdated. A new consultation or prescription has been added.
              </div>
            </div>
          )}

          {/* Factual Narrative Paragraph */}
          <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-850 p-4 rounded-xl text-3xs font-semibold text-slate-700 dark:text-slate-350 leading-relaxed">
            {summary}
          </div>

          {/* Footer Metadata & Regenerate Button */}
          <div className="border-t border-slate-200/60 dark:border-slate-800/80 pt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <span className="text-4xs font-bold text-slate-400 dark:text-slate-500">
              Generated: {generatedAt}
            </span>
            <button
              type="button"
              onClick={handleGenerate}
              className="inline-flex items-center justify-center gap-1 py-1 px-2.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-3xs rounded-lg transition cursor-pointer"
            >
              <RefreshCw className="h-2.5 w-2.5" />
              Regenerate Summary
            </button>
          </div>

        </div>
      )}

    </div>
  );
}
