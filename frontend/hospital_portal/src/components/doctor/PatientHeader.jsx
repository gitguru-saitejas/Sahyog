import React from "react";
import { User, Activity, AlertTriangle, Phone, Droplet, Calendar, Hash } from "lucide-react";

export default function PatientHeader({ header, loading }) {
  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl animate-pulse space-y-3">
        <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-1/3"></div>
        <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-2/3"></div>
      </div>
    );
  }

  if (!header) return null;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm space-y-4">
      {/* Top Banner: Name, Code, Demographics */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800/80 pb-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white font-extrabold text-lg flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
            {header.first_name?.[0]}{header.last_name?.[0]}
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-lg font-black text-slate-900 dark:text-slate-50 tracking-tight">
                {header.full_name}
              </h2>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 text-xs font-bold border border-blue-200 dark:border-blue-800/60">
                <Hash className="h-3 w-3" />
                {header.patient_code}
              </span>
            </div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-3">
              <span>{header.age ? `${header.age} Yrs` : "Age N/A"} • {header.gender || "Gender N/A"}</span>
              {header.phone_number && (
                <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
                  <Phone className="h-3 w-3 text-slate-400" />
                  {header.phone_number}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Quick Vitals Badges */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="px-3 py-1.5 bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl text-center">
            <span className="text-3xs font-extrabold text-slate-400 uppercase tracking-wider block">Blood Group</span>
            <strong className="text-xs font-black text-red-600 dark:text-red-400 flex items-center gap-1 justify-center">
              <Droplet className="h-3 w-3 fill-red-600 dark:fill-red-400" />
              {header.blood_group || "Unknown"}
            </strong>
          </div>
          {header.emergency_contact && (
            <div className="px-3 py-1.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 rounded-xl">
              <span className="text-3xs font-extrabold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">Emergency Contact</span>
              <strong className="text-xs font-bold text-slate-800 dark:text-slate-200 block truncate max-w-[140px]">
                {header.emergency_contact.name} ({header.emergency_contact.relationship})
              </strong>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Bar: Allergies & Chronic Conditions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        {/* Allergies */}
        <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-red-50/50 dark:bg-red-950/20 border border-red-150 dark:border-red-900/30">
          <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-extrabold text-red-700 dark:text-red-400 uppercase tracking-wider text-3xs block">
              Known Drug Allergies
            </span>
            {header.allergies && header.allergies.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {header.allergies.map((a, i) => (
                  <span key={i} className="px-2 py-0.5 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 font-bold text-3xs rounded-md">
                    {a.allergen} ({a.severity})
                  </span>
                ))}
              </div>
            ) : (
              <span className="font-semibold text-slate-500 dark:text-slate-400">No known drug allergies reported</span>
            )}
          </div>
        </div>

        {/* Chronic Conditions */}
        <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-150 dark:border-blue-900/30">
          <Activity className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-extrabold text-blue-700 dark:text-blue-400 uppercase tracking-wider text-3xs block">
              Active Chronic Conditions
            </span>
            {header.conditions && header.conditions.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {header.conditions.map((c, i) => (
                  <span key={i} className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-bold text-3xs rounded-md">
                    {c.condition_name} ({c.status})
                  </span>
                ))}
              </div>
            ) : (
              <span className="font-semibold text-slate-500 dark:text-slate-400">No active chronic conditions logged</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
