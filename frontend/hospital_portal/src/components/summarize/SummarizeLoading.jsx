import React, { useState, useEffect } from "react";
import { Sparkles } from "lucide-react";

export default function SummarizeLoading() {
  const [step, setStep] = useState(0);
  const steps = [
    "Generating AI Medical History Summary...",
    "Reading timeline...",
    "Analyzing encounters...",
    "Preparing summary..."
  ];

  useEffect(() => {
    const intervals = [1200, 2400, 3600];
    const timers = intervals.map((time, idx) => 
      setTimeout(() => setStep(idx + 1), time)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="space-y-3.5 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4.5 w-4.5 text-blue-500 animate-pulse shrink-0" />
        <span className="text-3xs font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-widest transition-all duration-300">
          {steps[step]}
        </span>
      </div>
      <div className="space-y-2 animate-pulse pt-1">
        <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-md w-full"></div>
        <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-md w-11/12"></div>
        <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-md w-5/6"></div>
        <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-md w-4/5"></div>
      </div>
    </div>
  );
}
