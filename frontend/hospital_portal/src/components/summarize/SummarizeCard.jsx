import React from "react";

export default function SummarizeCard({ title, icon: Icon, colorClass = "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-slate-800", children }) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-850 p-3 rounded-xl flex flex-col gap-1.5 shadow-2xs">
      <div className="flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-1">
        <div className={`p-1 rounded shrink-0 ${colorClass}`}>
          <Icon className="h-3.5 w-3.5" />
        </div>
        <h4 className="font-extrabold text-3xs text-slate-700 dark:text-slate-300 tracking-wider uppercase">
          {title}
        </h4>
      </div>
      <div className="text-3xs leading-relaxed font-semibold text-slate-650 dark:text-slate-350 space-y-1">
        {children}
      </div>
    </div>
  );
}
