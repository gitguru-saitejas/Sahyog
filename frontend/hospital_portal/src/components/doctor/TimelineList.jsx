import React, { useState } from "react";
import { 
  Search, Calendar, ChevronDown, ChevronRight, Stethoscope, 
  Pill, FileText, Activity, AlertCircle, ShieldAlert, Sparkles, Filter 
} from "lucide-react";

const CATEGORIES = [
  { id: "ALL", label: "All Events", icon: Filter },
  { id: "CONSULTATION", label: "Consultations", icon: Stethoscope },
  { id: "PRESCRIPTION", label: "Prescriptions", icon: Pill },
  { id: "LAB_REPORT", label: "Lab Reports", icon: FileText },
  { id: "IMAGING", label: "Imaging", icon: Activity },
  { id: "ADMISSION", label: "Admissions", icon: AlertCircle }
];

export default function TimelineList({
  encounters = [],
  yearsAvailable = [],
  selectedEncounterId,
  onSelectEncounter,
  selectedCategory,
  onCategoryChange,
  searchQuery,
  onSearchChange,
  loading
}) {
  const [expandedEncounterIds, setExpandedEncounterIds] = useState({});

  const toggleExpand = (e, id) => {
    e.stopPropagation();
    setExpandedEncounterIds((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const getSeverityBadge = (severity) => {
    switch (severity) {
      case "CRITICAL":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-300 font-extrabold text-3xs border border-red-300 dark:border-red-800">
            <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-ping"></span>
            🔴 Critical
          </span>
        );
      case "MODERATE":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 font-extrabold text-3xs border border-amber-300 dark:border-amber-800">
            🟠 Moderate
          </span>
        );
      case "ADMIN":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold text-3xs border border-slate-300 dark:border-slate-700">
            🔵 Admin
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 font-extrabold text-3xs border border-emerald-300 dark:border-emerald-800">
            🟢 Routine
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl space-y-4 animate-pulse">
        <div className="h-9 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-slate-100 dark:bg-slate-850 rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm space-y-4">
      {/* Header & Filter Search */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-blue-600" />
            Medical Journey Timeline
          </h3>
          <span className="text-3xs font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500">
            {encounters.length} Encounters
          </span>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search timeline notes, diagnosis, doctor..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-955 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition dark:text-slate-100"
          />
        </div>

        {/* Category Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const active = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => onCategoryChange(cat.id)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-3xs font-bold shrink-0 transition cursor-pointer ${
                  active
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-750"
                }`}
              >
                <Icon className="h-3 w-3" />
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Vertical Timeline List */}
      <div className="relative pl-3 space-y-4 before:absolute before:left-5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
        {encounters.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs font-semibold bg-slate-50 dark:bg-slate-955 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
            No medical encounters match your search or filter settings.
          </div>
        ) : (
          encounters.map((enc) => {
            const isSelected = selectedEncounterId === enc.encounter_id;
            const isExpanded = !!expandedEncounterIds[enc.encounter_id];
            const dateStr = new Date(enc.encounter_date).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric"
            });

            return (
              <div
                key={enc.encounter_id}
                onClick={() => onSelectEncounter(enc)}
                className={`relative group rounded-2xl p-4 transition cursor-pointer border ${
                  isSelected
                    ? "bg-blue-50/60 dark:bg-blue-950/40 border-blue-500 shadow-md ring-2 ring-blue-500/20"
                    : "bg-slate-50/50 dark:bg-slate-955/60 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                }`}
              >
                {/* Timeline Connector Dot */}
                <div
                  className={`absolute -left-[19px] top-4 w-3.5 h-3.5 rounded-full border-2 transition ${
                    isSelected
                      ? "bg-blue-600 border-white dark:border-slate-900 ring-4 ring-blue-500/30 scale-110"
                      : "bg-slate-300 dark:bg-slate-700 border-white dark:border-slate-900 group-hover:bg-blue-500"
                  }`}
                />

                {/* Card Content Header */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-3xs font-extrabold uppercase text-slate-400 tracking-wider">
                      {dateStr}
                    </span>
                    {getSeverityBadge(enc.severity)}
                  </div>

                  <div>
                    <h4 className="text-xs font-black text-slate-900 dark:text-slate-50 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
                      {enc.primary_diagnosis || "General Consultation"}
                    </h4>
                    <p className="text-3xs font-bold text-slate-500 dark:text-slate-400 mt-0.5">
                      {enc.doctor_name} • {enc.doctor_specialization || "Physician"}
                    </p>
                  </div>

                  {enc.chief_complaint && (
                    <p className="text-3xs font-medium text-slate-600 dark:text-slate-300 line-clamp-2 bg-white/60 dark:bg-slate-900/60 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                      "{enc.chief_complaint}"
                    </p>
                  )}

                  {/* Sub-events Expandable Section */}
                  {enc.sub_events && enc.sub_events.length > 0 && (
                    <div className="pt-1">
                      <button
                        onClick={(e) => toggleExpand(e, enc.encounter_id)}
                        className="flex items-center gap-1 text-3xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                      >
                        {isExpanded ? (
                          <>
                            <ChevronDown className="h-3 w-3" /> Hide {enc.sub_events.length} Clinical Details
                          </>
                        ) : (
                          <>
                            <ChevronRight className="h-3 w-3" /> Show {enc.sub_events.length} Clinical Details
                          </>
                        )}
                      </button>

                      {isExpanded && (
                        <div className="mt-2 space-y-1.5 border-l-2 border-slate-200 dark:border-slate-800 pl-2.5 pt-1 text-3xs">
                          {enc.sub_events.map((sub) => (
                            <div key={sub.id} className="space-y-0.5">
                              <span className="font-extrabold text-slate-700 dark:text-slate-300 block">
                                • {sub.title}
                              </span>
                              <p className="text-slate-500 dark:text-slate-400 font-medium pl-2">
                                {sub.description}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
