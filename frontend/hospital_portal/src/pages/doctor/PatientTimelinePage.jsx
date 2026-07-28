import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { 
  Search, Stethoscope, ArrowLeft, RefreshCcw, RefreshCw, Droplet, Calendar, Hash, AlertTriangle, 
  Activity, Phone, Pill, FileText, ChevronDown, ChevronRight, AlertCircle, Sparkles, 
  Filter, Building2, Paperclip, CheckCircle2, HeartPulse, ShieldCheck, Zap, User, UserCheck
} from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Avatar } from "../../components/ui/Avatar";

// Calculate age from date of birth
const calculateAge = (dobString) => {
  if (!dobString) return 0;
  const dob = new Date(dobString);
  const diffMs = Date.now() - dob.getTime();
  const ageDate = new Date(diffMs);
  return Math.abs(ageDate.getUTCFullYear() - 1970);
};

// -------------------------------------------------------------
// Local Patient Demographics Header Component
// -------------------------------------------------------------
function LocalPatientHeader({ header, loading }) {
  if (loading) {
    return (
      <Card className="p-4 animate-pulse space-y-3">
        <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-1/3"></div>
        <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-2/3"></div>
      </Card>
    );
  }

  if (!header) return null;

  return (
    <Card className="p-5 font-sans">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E5E7EB] dark:border-slate-800 pb-4 mb-4">
        <div className="flex items-center gap-3.5">
          <Avatar name={header.full_name || "Patient"} size="lg" />
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-lg font-bold text-[#1E293B] dark:text-white">
                {header.full_name}
              </h2>
              <Badge color="blue">
                ID: {header.patient_code}
              </Badge>
            </div>
            <p className="text-xs text-[#64748B] dark:text-slate-400 mt-0.5 flex items-center gap-3">
              <span>{header.date_of_birth ? `${calculateAge(header.date_of_birth)} Yrs` : "Age N/A"} · {header.gender || "Gender N/A"}</span>
              {header.phone_number && (
                <span className="flex items-center gap-1">
                  <Phone className="h-3 w-3 text-[#94A3B8]" />
                  {header.phone_number}
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 bg-[#FEF2F2] dark:bg-red-950/20 border border-[#FCA5A5] dark:border-red-900/30 rounded-xl text-center">
            <span className="text-[10px] font-bold text-[#EF4444] uppercase block">Blood Group</span>
            <strong className="text-xs font-bold text-[#EF4444] flex items-center gap-1 justify-center mt-0.5">
              <Droplet className="h-3 w-3 fill-[#EF4444]" />
              {header.blood_group || "Unknown"}
            </strong>
          </div>
          {header.emergency_contact && (
            <div className="px-3 py-1.5 bg-[#FFFBEB] dark:bg-amber-950/20 border border-[#FCD34D] dark:border-amber-900/30 rounded-xl">
              <span className="text-[10px] font-bold text-[#D97706] uppercase block">Emergency Contact</span>
              <strong className="text-xs font-bold text-[#1E293B] dark:text-slate-200 block truncate max-w-[140px] mt-0.5">
                {header.emergency_contact.name} ({header.emergency_contact.relationship})
              </strong>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Allergies */}
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-[#FEF2F2] dark:bg-red-950/10 border border-[#FEE2E2] dark:border-red-950/30">
          <AlertTriangle className="h-4.5 w-4.5 text-[#EF4444] shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-[#EF4444] uppercase text-[10px] block">
              Known Drug Allergies
            </span>
            {header.allergies && header.allergies.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 pt-1.5">
                {header.allergies.map((a, i) => (
                  <Badge key={i} color="red">
                    {a.allergen} ({a.severity})
                  </Badge>
                ))}
              </div>
            ) : (
              <span className="text-xs text-[#64748B] dark:text-slate-400 mt-1 block">No known drug allergies reported</span>
            )}
          </div>
        </div>

        {/* Chronic Conditions */}
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-[#EDF7FF] dark:bg-blue-950/10 border border-[#EDF7FF] dark:border-blue-950/30">
          <Activity className="h-4.5 w-4.5 text-[#50ABE7] shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-[#50ABE7] uppercase text-[10px] block">
              Active Chronic Conditions
            </span>
            {header.conditions && header.conditions.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 pt-1.5">
                {header.conditions.map((c, i) => (
                  <Badge key={i} color="blue">
                    {c.condition_name} ({c.status})
                  </Badge>
                ))}
              </div>
            ) : (
              <span className="text-xs text-[#64748B] dark:text-slate-400 mt-1 block">No active chronic conditions logged</span>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

// -------------------------------------------------------------
// Local Journey Timeline List Component
// -------------------------------------------------------------
const CATEGORIES = [
  { id: "ALL", label: "All Events", icon: Filter },
  { id: "CONSULTATION", label: "Consultations", icon: Stethoscope },
  { id: "PRESCRIPTION", label: "Prescriptions", icon: Pill },
  { id: "LAB_REPORT", label: "Lab Reports", icon: FileText },
  { id: "IMAGING", label: "Imaging", icon: Activity },
  { id: "ADMISSION", label: "Admissions", icon: AlertCircle }
];

function LocalTimelineList({
  encounters = [],
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

  const getSeverityColor = (severity) => {
    switch (severity) {
      case "CRITICAL": return "red";
      case "MODERATE": return "yellow";
      default: return "green";
    }
  };

  if (loading) {
    return (
      <Card className="p-5 space-y-4 animate-pulse">
        <div className="h-9 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-slate-100 dark:bg-slate-850 rounded-xl"></div>
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 space-y-4 font-sans">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="font-bold text-xs uppercase tracking-wider text-[#64748B] flex items-center gap-2">
            <Calendar className="h-4 w-4 text-[#50ABE7]" />
            Journey Timeline
          </p>
          <Badge color="blue">{encounters.length} Encounters</Badge>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#94A3B8]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search timeline notes, diagnoses, doctor..."
            className="w-full pl-9 pr-3 py-2 bg-[#F8FAFC] dark:bg-slate-900 text-xs rounded-xl border border-[#E5E7EB] dark:border-slate-800 outline-none focus:border-[#50ABE7] text-[#1E293B] dark:text-white"
          />
        </div>

        {/* Categories menu */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const active = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => onCategoryChange(cat.id)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold shrink-0 transition cursor-pointer border-0 ${
                  active
                    ? "bg-[#50ABE7] text-white shadow-sm"
                    : "bg-[#F1F5F9] dark:bg-slate-800 text-[#64748B] dark:text-slate-300 hover:bg-[#E2E8F0]"
                }`}
              >
                <Icon className="h-3 w-3" />
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Timeline entries */}
      <div className="relative pl-3 space-y-4 before:absolute before:left-5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#E5E7EB] dark:before:bg-slate-850">
        {encounters.length === 0 ? (
          <div className="p-8 text-center text-[#64748B] text-xs font-semibold bg-[#F8FAFC] dark:bg-slate-900 rounded-2xl border border-dashed border-[#E5E7EB] dark:border-slate-800">
            No medical encounters logged.
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
                className={`relative rounded-2xl p-4 transition cursor-pointer border ${
                  isSelected
                    ? "bg-[#EDF7FF] dark:bg-slate-900/40 border-[#50ABE7] shadow-sm"
                    : "bg-white dark:bg-slate-900 border-[#E5E7EB] dark:border-slate-800 hover:border-[#50ABE7]"
                }`}
              >
                {/* Connector Dot */}
                <div
                  className={`absolute -left-[19px] top-4.5 w-3 h-3 rounded-full border-2 transition ${
                    isSelected
                      ? "bg-[#50ABE7] border-white dark:border-slate-900 ring-4 ring-[#50ABE7]/20"
                      : "bg-[#94A3B8] border-white dark:border-slate-900"
                  }`}
                />

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[9px] font-bold uppercase text-[#94A3B8] tracking-wider">
                      {dateStr}
                    </span>
                    <Badge color={getSeverityColor(enc.severity)}>
                      {enc.severity || "ROUTINE"}
                    </Badge>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-[#1E293B] dark:text-slate-100">
                      {enc.primary_diagnosis || "General Consultation"}
                    </h4>
                    <p className="text-[10px] font-semibold text-[#64748B] dark:text-slate-400 mt-0.5">
                      Dr. {enc.doctor_name} · {enc.doctor_specialization || "Physician"}
                    </p>
                  </div>

                  {enc.chief_complaint && (
                    <p className="text-[10px] text-[#64748B] dark:text-slate-350 line-clamp-2 bg-[#F8FAFC] dark:bg-slate-900 p-2 rounded-lg border border-[#E5E7EB] dark:border-slate-800 italic">
                      "{enc.chief_complaint}"
                    </p>
                  )}

                  {enc.sub_events && enc.sub_events.length > 0 && (
                    <div className="pt-1">
                      <button
                        onClick={(e) => toggleExpand(e, enc.encounter_id)}
                        className="flex items-center gap-1 text-[10px] font-bold text-[#50ABE7] hover:underline cursor-pointer border-0 bg-transparent"
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
                        <div className="mt-2 space-y-1.5 border-l-2 border-[#E5E7EB] dark:border-slate-850 pl-2.5 pt-1 text-[10px]">
                          {enc.sub_events.map((sub, sIdx) => (
                            <div key={sIdx} className="space-y-0.5">
                              <span className="font-bold text-[#1E293B] dark:text-slate-300 block">
                                • {sub.title}
                              </span>
                              <p className="text-[#64748B] dark:text-slate-400 pl-2">
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
    </Card>
  );
}

// -------------------------------------------------------------
// Local Selected Event Detail Card Component
// -------------------------------------------------------------
function LocalEventDetailCard({ encounter, loading }) {
  if (loading) {
    return (
      <Card className="p-6 animate-pulse space-y-4">
        <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-1/2"></div>
        <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/4"></div>
        <div className="h-32 bg-slate-100 dark:bg-slate-850 rounded-xl"></div>
      </Card>
    );
  }

  if (!encounter) {
    return (
      <Card className="p-10 text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-[#EDF7FF] text-[#50ABE7] flex items-center justify-center mx-auto">
          <Stethoscope className="h-6 w-6" />
        </div>
        <h3 className="font-bold text-sm text-[#1E293B] dark:text-slate-200">No Encounter Selected</h3>
        <p className="text-xs text-[#64748B] dark:text-slate-400 max-w-xs mx-auto leading-relaxed">
          Select an encounter from the left timeline journey list to view complete clinical notes, vitals, prescriptions, and reports.
        </p>
      </Card>
    );
  }

  const dateStr = new Date(encounter.encounter_date).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });

  return (
    <Card className="p-6 space-y-6 font-sans">
      <div className="border-b border-[#E5E7EB] dark:border-slate-800 pb-5 space-y-2">
        <div className="flex items-center justify-between gap-4">
          <Badge color="blue">
            {encounter.category || "Consultation"}
          </Badge>
          <span className="text-xs text-[#64748B] flex items-center gap-1 font-semibold">
            <Calendar className="h-3.5 w-3.5" />
            {dateStr}
          </span>
        </div>

        <div>
          <h2 className="text-xl font-bold text-[#1E293B] dark:text-white tracking-tight">
            {encounter.primary_diagnosis || "General Consultation"}
          </h2>
          <p className="text-xs text-[#64748B] dark:text-slate-400 flex items-center gap-2 mt-1">
            <span className="flex items-center gap-1">
              <User className="h-3.5 w-3.5 text-[#50ABE7]" />
              Dr. {encounter.doctor_name} ({encounter.doctor_specialization || "Specialist"})
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Building2 className="h-3.5 w-3.5 text-[#94A3B8]" />
              {encounter.hospital_name}
            </span>
          </p>
        </div>
      </div>

      {/* Vitals Grid */}
      {encounter.vitals_summary && Object.keys(encounter.vitals_summary).length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-[#64748B] flex items-center gap-1.5">
            <HeartPulse className="h-4.5 w-4.5 text-[#EF4444]" />
            Recorded Patient Vitals
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {encounter.vitals_summary.bp && (
              <div className="bg-[#F8FAFC] dark:bg-slate-900 p-3 rounded-xl border border-[#E5E7EB] dark:border-slate-800 text-center">
                <span className="text-[10px] font-bold text-[#64748B] uppercase block">BP</span>
                <strong className="text-sm font-bold text-[#1E293B] dark:text-white block mt-0.5">{encounter.vitals_summary.bp}</strong>
              </div>
            )}
            {encounter.vitals_summary.temp && (
              <div className="bg-[#F8FAFC] dark:bg-slate-900 p-3 rounded-xl border border-[#E5E7EB] dark:border-slate-800 text-center">
                <span className="text-[10px] font-bold text-[#64748B] uppercase block">Temp</span>
                <strong className="text-sm font-bold text-[#D97706] block mt-0.5">{encounter.vitals_summary.temp}</strong>
              </div>
            )}
            {encounter.vitals_summary.pulse && (
              <div className="bg-[#F8FAFC] dark:bg-slate-900 p-3 rounded-xl border border-[#E5E7EB] dark:border-slate-800 text-center">
                <span className="text-[10px] font-bold text-[#64748B] uppercase block">Pulse</span>
                <strong className="text-sm font-bold text-[#EF4444] block mt-0.5">{encounter.vitals_summary.pulse} bpm</strong>
              </div>
            )}
            {encounter.vitals_summary.spo2 && (
              <div className="bg-[#F8FAFC] dark:bg-slate-900 p-3 rounded-xl border border-[#E5E7EB] dark:border-slate-800 text-center">
                <span className="text-[10px] font-bold text-[#64748B] uppercase block">SpO₂</span>
                <strong className="text-sm font-bold text-[#50ABE7] block mt-0.5">{encounter.vitals_summary.spo2}%</strong>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Chief Complaint */}
      {encounter.chief_complaint && (
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-[#64748B]">
            Chief Complaint & Notes
          </p>
          <div className="p-3.5 rounded-xl bg-[#F8FAFC] dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 text-sm text-[#1E293B] dark:text-slate-300 leading-relaxed">
            {encounter.chief_complaint}
          </div>
        </div>
      )}

      {/* Medications Table */}
      {encounter.prescriptions && encounter.prescriptions.length > 0 && (
        <div className="space-y-2.5">
          <p className="text-xs font-bold uppercase tracking-wider text-[#64748B] flex items-center gap-1.5">
            <Pill className="h-4.5 w-4.5 text-[#10B981]" />
            Prescribed Medications ({encounter.prescriptions.length})
          </p>
          <div className="border border-[#E5E7EB] dark:border-slate-800 rounded-xl overflow-hidden text-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F1F5F9] dark:bg-slate-800 text-[#64748B] dark:text-slate-400 font-bold text-[10px] uppercase">
                  <th className="p-2.5">Medicine</th>
                  <th className="p-2.5">Strength</th>
                  <th className="p-2.5">Frequency</th>
                  <th className="p-2.5">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB] dark:divide-slate-800 font-semibold text-[#1E293B] dark:text-slate-200">
                {encounter.prescriptions.map((m, idx) => (
                  <tr key={idx} className="hover:bg-[#F8FAFC] dark:hover:bg-slate-850">
                    <td className="p-2.5 font-bold text-[#50ABE7]">{m.medicine_name}</td>
                    <td className="p-2.5">{m.strength || "—"}</td>
                    <td className="p-2.5">{m.frequency || "1-0-1"}</td>
                    <td className="p-2.5">{m.duration || "5 days"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Report Attachments */}
      {encounter.attachments && encounter.attachments.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-[#64748B] flex items-center gap-1.5">
            <Paperclip className="h-4.5 w-4.5 text-[#50ABE7]" />
            Attachments & Lab Files
          </p>
          <div className="flex flex-wrap gap-2">
            {encounter.attachments.map((att, idx) => (
              <a
                key={idx}
                href={att.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#F1F5F9] dark:bg-slate-800 hover:bg-[#EDF7FF] border border-[#E5E7EB] dark:border-slate-700 text-xs font-bold text-[#1E293B] dark:text-slate-200 transition"
              >
                <FileText className="h-4 w-4 text-[#50ABE7]" />
                <span>{att.name}</span>
              </a>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

// -------------------------------------------------------------
// Local AI Medical Assistant Sidebar Component
// -------------------------------------------------------------
function LocalAISummaryPanel({
  overallSummary,
  eventSummary,
  selectedEncounter,
  onRefreshSummary,
  loadingOverall,
  loadingEvent
}) {
  return (
    <Card className="p-5 space-y-5 font-sans">
      <div className="flex items-center justify-between border-b border-[#E5E7EB] dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#50ABE7] to-[#7AD8FF] text-white flex items-center justify-center shadow-md">
            <Sparkles className="h-4.5 w-4.5 text-white" />
          </div>
          <div>
            <p className="font-bold text-xs text-[#1E293B] dark:text-white uppercase">
              AI Assistant
            </p>
            <span className="text-[10px] text-[#94A3B8] block">
              Grounded summarizer
            </span>
          </div>
        </div>

        <button
          onClick={onRefreshSummary}
          disabled={loadingOverall}
          title="Regenerate overall AI patient summary"
          className="p-1.5 rounded-lg bg-[#F1F5F9] dark:bg-slate-800 hover:bg-[#E2E8F0] transition cursor-pointer border-0"
        >
          <RefreshCw className={`h-3.5 w-3.5 text-[#64748B] ${loadingOverall ? "animate-spin text-[#50ABE7]" : ""}`} />
        </button>
      </div>

      {/* Overall Summary */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8] flex items-center gap-1">
            <Zap className="h-3.5 w-3.5 text-[#D97706]" />
            Journey Summary (Cached)
          </p>
          {overallSummary?.is_cached && (
            <Badge color="green">
              Cached
            </Badge>
          )}
        </div>

        {loadingOverall ? (
          <div className="p-4 bg-[#F8FAFC] dark:bg-slate-900 rounded-xl space-y-2 animate-pulse">
            <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-3/4"></div>
            <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/2"></div>
          </div>
        ) : overallSummary ? (
          <div className="p-3.5 bg-[#F8FAFC] dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 rounded-xl space-y-3">
            <div className="text-xs text-[#1E293B] dark:text-slate-350 leading-relaxed whitespace-pre-line">
              {overallSummary.overall_summary}
            </div>

            {overallSummary.key_deltas && overallSummary.key_deltas.length > 0 && (
              <div className="border-t border-[#E5E7EB] dark:border-slate-800 pt-2.5 space-y-1">
                <span className="text-[9px] font-bold uppercase tracking-wider text-[#94A3B8] block">
                  Key Clinical Deltas
                </span>
                <ul className="space-y-1 text-[10px] font-semibold text-[#64748B] dark:text-slate-300 list-none pl-0">
                  {overallSummary.key_deltas.map((delta, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-[#50ABE7] shrink-0 mt-0.5" />
                      <span>{delta}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div className="p-3 text-xs text-[#64748B] font-semibold text-center bg-[#F8FAFC] dark:bg-slate-900 rounded-xl border border-[#E5E7EB] dark:border-slate-800">
            No summary generated.
          </div>
        )}
      </div>

      {/* Selected event summary */}
      {selectedEncounter && (
        <div className="space-y-2 border-t border-[#E5E7EB] dark:border-slate-800 pt-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8] flex items-center gap-1">
            <FileText className="h-3.5 w-3.5 text-[#50ABE7]" />
            Encounter AI Breakdown
          </p>

          {loadingEvent ? (
            <div className="p-3 bg-[#F8FAFC] dark:bg-slate-900 rounded-xl space-y-2 animate-pulse">
              <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-2/3"></div>
            </div>
          ) : eventSummary ? (
            <div className="p-3.5 bg-[#EDF7FF] dark:bg-slate-900 border border-[#EDF7FF] dark:border-slate-800 rounded-xl text-xs text-[#1E293B] dark:text-slate-300 leading-relaxed whitespace-pre-line">
              {eventSummary.overall_summary}
            </div>
          ) : null}
        </div>
      )}

      {/* Compliance banner */}
      <div className="p-3 rounded-xl bg-[#F8FAFC] dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 flex items-center gap-2 text-[10px] font-semibold text-[#64748B] dark:text-slate-400">
        <ShieldCheck className="h-4 w-4 text-[#10B981] shrink-0" />
        <span>Grounded strictly in verified patient clinical records.</span>
      </div>
    </Card>
  );
}

// -------------------------------------------------------------
// Primary Page Component
// -------------------------------------------------------------
export default function PatientTimelinePage() {
  const { showToast } = useAuth();
  const [searchParams] = useSearchParams();
  const initialPatientCode = searchParams.get("patient_code") || "P-1001";

  const [patientSearchInput, setPatientSearchInput] = useState(initialPatientCode);
  const [activePatientCode, setActivePatientCode] = useState(initialPatientCode);

  const [header, setHeader] = useState(null);
  const [timelineData, setTimelineData] = useState(null);
  const [selectedEncounter, setSelectedEncounter] = useState(null);
  const [overallSummary, setOverallSummary] = useState(null);
  const [eventSummary, setEventSummary] = useState(null);

  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const [loadingHeader, setLoadingHeader] = useState(false);
  const [loadingTimeline, setLoadingTimeline] = useState(false);
  const [loadingOverallSummary, setLoadingOverallSummary] = useState(false);
  const [loadingEventSummary, setLoadingEventSummary] = useState(false);

  // Fetch Patient Header & Timeline
  const loadPatientData = async (code) => {
    if (!code.trim()) return;
    setLoadingHeader(true);
    setLoadingTimeline(true);
    setHeader(null);
    setTimelineData(null);
    setSelectedEncounter(null);
    setOverallSummary(null);

    try {
      // 1. Fetch Header
      const headerRes = await api.get(`/patients/timeline/code/${code}/full-profile`);
      setHeader(headerRes.data);
      const patientId = headerRes.data.patient_id;

      // 2. Fetch Timeline Events
      const timelineRes = await api.get(`/patients/timeline/${patientId}`, {
        params: {
          category: selectedCategory,
          search_query: searchQuery
        }
      });
      setTimelineData(timelineRes.data);
      
      if (timelineRes.data.encounters && timelineRes.data.encounters.length > 0) {
        setSelectedEncounter(timelineRes.data.encounters[0]);
      }

      // 3. Fetch Overall AI Summary
      fetchOverallSummary(patientId, false);
    } catch (err) {
      console.error(err);
      showToast("error", err.response?.data?.detail || "Failed to retrieve patient medical records.");
    } finally {
      setLoadingHeader(false);
      setLoadingTimeline(false);
    }
  };

  const fetchOverallSummary = async (patientId, forceRefresh = false) => {
    setLoadingOverallSummary(true);
    try {
      const res = await api.get(`/patients/timeline/${patientId}/ai-summary`, {
        params: { refresh: forceRefresh }
      });
      setOverallSummary(res.data);
    } catch (err) {
      console.error("AI Summary Error", err);
    } finally {
      setLoadingOverallSummary(false);
    }
  };

  const fetchEventSummary = async (patientId, encounterId) => {
    setLoadingEventSummary(true);
    try {
      const res = await api.post(`/patients/timeline/${patientId}/ai-summary/encounter/${encounterId}`);
      setEventSummary(res.data);
    } catch (err) {
      console.error("Event Summary Error", err);
    } finally {
      setLoadingEventSummary(false);
    }
  };

  useEffect(() => {
    if (activePatientCode) {
      loadPatientData(activePatientCode);
    }
  }, [activePatientCode, selectedCategory]);

  const handlePatientSearchSubmit = (e) => {
    e.preventDefault();
    if (patientSearchInput.trim()) {
      setActivePatientCode(patientSearchInput.trim());
    }
  };

  const handleSelectEncounter = (enc) => {
    setSelectedEncounter(enc);
    if (header?.patient_id && enc.encounter_id) {
      fetchEventSummary(header.patient_id, enc.encounter_id);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      
      {/* Search Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1E293B] dark:text-slate-50 flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-[#50ABE7]" />
            Patient Clinical Timeline
          </h1>
          <p className="text-xs text-[#64748B] dark:text-slate-400">
            Navigate historical health events, vital logs, prescriptions, and AI summaries
          </p>
        </div>

        <form onSubmit={handlePatientSearchSubmit} className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#94A3B8]" />
            <input
              type="text"
              value={patientSearchInput}
              onChange={(e) => setPatientSearchInput(e.target.value)}
              placeholder="Enter Patient Code (e.g. P-1001)..."
              className="pl-9 pr-4 py-2 rounded-xl border border-[#E5E7EB] dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-[#1E293B] dark:text-white outline-none focus:border-[#50ABE7] w-64 transition"
            />
          </div>
          <button
            type="submit"
            disabled={loadingHeader}
            className="py-2 px-4 bg-[#50ABE7] hover:bg-[#3ea0df] text-white font-bold text-sm rounded-xl shadow-md shadow-[#50ABE7]/10 cursor-pointer active:scale-98 transition disabled:opacity-50"
          >
            {loadingHeader ? "Searching..." : "Lookup File"}
          </button>
        </form>
      </div>

      {/* Patient Demographic Header */}
      <LocalPatientHeader header={header} loading={loadingHeader} />

      {/* Consultation Details Full-Width */}
      <LocalEventDetailCard
        encounter={selectedEncounter}
        loading={loadingTimeline}
      />

      {/* Two-column bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Panel: Vertical Timeline List (8 Cols) */}
        <div className="lg:col-span-8 space-y-4">
          <LocalTimelineList
            encounters={timelineData?.encounters || []}
            selectedEncounterId={selectedEncounter?.encounter_id}
            onSelectEncounter={handleSelectEncounter}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            loading={loadingTimeline}
          />
        </div>

        {/* Right Panel: AI Medical Assistant (4 Cols) */}
        <div className="lg:col-span-4 space-y-4">
          <LocalAISummaryPanel
            overallSummary={overallSummary}
            eventSummary={eventSummary}
            selectedEncounter={selectedEncounter}
            onRefreshSummary={() => header && fetchOverallSummary(header.patient_id, true)}
            loadingOverall={loadingOverallSummary}
            loadingEvent={loadingEventSummary}
          />
        </div>

      </div>

    </div>
  );
}
