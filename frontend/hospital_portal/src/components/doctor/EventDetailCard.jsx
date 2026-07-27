import React from "react";
import { 
  Stethoscope, Activity, Pill, FileText, Calendar, User, 
  Building2, AlertTriangle, Paperclip, CheckCircle2, HeartPulse 
} from "lucide-react";

export default function EventDetailCard({ encounter, loading }) {
  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl animate-pulse space-y-4">
        <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-1/2"></div>
        <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/4"></div>
        <div className="h-32 bg-slate-100 dark:bg-slate-850 rounded-xl"></div>
      </div>
    );
  }

  if (!encounter) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-10 rounded-2xl text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
          <Stethoscope className="h-6 w-6" />
        </div>
        <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">No Encounter Selected</h3>
        <p className="text-xs text-slate-400 max-w-xs mx-auto">
          Select an encounter from the left timeline to view complete clinical notes, vitals, prescriptions, and lab attachments.
        </p>
      </div>
    );
  }

  const dateStr = new Date(encounter.encounter_date).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm space-y-6">
      
      {/* Header Info */}
      <div className="border-b border-slate-100 dark:border-slate-800/80 pb-5 space-y-2">
        <div className="flex items-center justify-between gap-4">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 text-xs font-black border border-blue-200 dark:border-blue-800">
            <Stethoscope className="h-3.5 w-3.5" />
            {encounter.category || "Consultation"}
          </span>
          <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            {dateStr}
          </span>
        </div>

        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-slate-50 tracking-tight">
            {encounter.primary_diagnosis || "General Consultation"}
          </h2>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-1">
            <span className="flex items-center gap-1">
              <User className="h-3.5 w-3.5 text-blue-600" />
              {encounter.doctor_name} ({encounter.doctor_specialization || "Specialist"})
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Building2 className="h-3.5 w-3.5 text-slate-400" />
              {encounter.hospital_name}
            </span>
          </p>
        </div>
      </div>

      {/* Vitals Summary Grid */}
      {encounter.vitals_summary && Object.keys(encounter.vitals_summary).length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <HeartPulse className="h-4 w-4 text-red-500" />
            Recorded Patient Vitals
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {encounter.vitals_summary.bp && (
              <div className="bg-slate-50 dark:bg-slate-955 p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
                <span className="text-3xs font-extrabold text-slate-400 uppercase tracking-wider block">Blood Pressure</span>
                <strong className="text-sm font-black text-slate-800 dark:text-slate-100">{encounter.vitals_summary.bp}</strong>
              </div>
            )}
            {encounter.vitals_summary.temp && (
              <div className="bg-slate-50 dark:bg-slate-955 p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
                <span className="text-3xs font-extrabold text-slate-400 uppercase tracking-wider block">Temperature</span>
                <strong className="text-sm font-black text-amber-600 dark:text-amber-400">{encounter.vitals_summary.temp}</strong>
              </div>
            )}
            {encounter.vitals_summary.pulse && (
              <div className="bg-slate-50 dark:bg-slate-955 p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
                <span className="text-3xs font-extrabold text-slate-400 uppercase tracking-wider block">Pulse Rate</span>
                <strong className="text-sm font-black text-rose-600 dark:text-rose-400">{encounter.vitals_summary.pulse}</strong>
              </div>
            )}
            {encounter.vitals_summary.spo2 && (
              <div className="bg-slate-50 dark:bg-slate-955 p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
                <span className="text-3xs font-extrabold text-slate-400 uppercase tracking-wider block">SpO2 Oxygen</span>
                <strong className="text-sm font-black text-blue-600 dark:text-blue-400">{encounter.vitals_summary.spo2}</strong>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Chief Complaint & Notes */}
      {encounter.chief_complaint && (
        <div className="space-y-2">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
            Chief Complaint & Presentation
          </h3>
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 leading-relaxed">
            {encounter.chief_complaint}
          </div>
        </div>
      )}

      {/* Diagnosis & Clinical Findings */}
      {(encounter.primary_diagnosis || encounter.clinical_notes) && (
        <div className="space-y-2">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-blue-500" />
            Diagnosis & Clinical Findings
          </h3>
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 text-xs leading-relaxed space-y-2.5">
            {encounter.primary_diagnosis && (
              <div>
                <span className="block text-3xs font-extrabold text-slate-400 uppercase tracking-wider mb-0.5">Primary Diagnosis</span>
                <strong className="text-slate-800 dark:text-slate-100 font-bold">{encounter.primary_diagnosis}</strong>
              </div>
            )}
            {encounter.clinical_notes && (
              <div className="border-t border-slate-200/50 dark:border-slate-850 pt-2">
                <span className="block text-3xs font-extrabold text-slate-400 uppercase tracking-wider mb-0.5">Clinical Notes</span>
                <p className="text-slate-700 dark:text-slate-300 font-medium">{encounter.clinical_notes}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Prescriptions Table */}
      {encounter.prescriptions && encounter.prescriptions.length > 0 && (
        <div className="space-y-2.5">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Pill className="h-4 w-4 text-emerald-500" />
            Prescribed Medicines ({encounter.prescriptions.length})
          </h3>
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden text-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-extrabold text-3xs uppercase tracking-wider">
                  <th className="p-2.5">Medicine</th>
                  <th className="p-2.5">Strength</th>
                  <th className="p-2.5">Frequency</th>
                  <th className="p-2.5">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-semibold text-slate-800 dark:text-slate-200">
                {encounter.prescriptions.map((m, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-850">
                    <td className="p-2.5 font-bold text-blue-600 dark:text-blue-400">{m.medicine_name}</td>
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

      {/* Attachments & Lab Files */}
      {encounter.attachments && encounter.attachments.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Paperclip className="h-4 w-4 text-blue-500" />
            Attached Medical Reports & Files
          </h3>
          <div className="flex flex-wrap gap-2">
            {encounter.attachments.map((att, idx) => (
              <a
                key={idx}
                href={att.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/60 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 transition"
              >
                <FileText className="h-4 w-4 text-blue-600" />
                <span>{att.name}</span>
              </a>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
