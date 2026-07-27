import React, { useState, useEffect } from "react";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { ClipboardList, Activity, RefreshCcw, CheckCircle } from "lucide-react";

export default function StaffDashboard() {
  const { showToast } = useAuth();
  const [stats, setStats] = useState({ pending_triage: 0, total_logged: 0 });
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchStaffDashboard = async () => {
    setLoading(true);
    try {
      // Fetch clinic lists or doctor queues for triage summaries from the correct staff dashboard API
      const encRes = await api.get("/patients/hospital/staff/dashboard"); 
      const encounters = encRes.data.encounters || [];
      setQueue(encounters);
      setStats({
        pending_triage: encounters.filter((e) => e.status === "PENDING").length,
        total_logged: encounters.length
      });
    } catch (err) {
      console.error(err);
      showToast("error", "Error loading triage stats.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaffDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-xs font-semibold text-slate-400">Loading Support dashboard...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Support Staff Triage Desk</h1>
          <p className="text-xs text-slate-500">Monitor active patient check-ins and triage assignments</p>
        </div>
        <button 
          onClick={fetchStaffDashboard}
          className="flex items-center gap-1.5 py-2 px-3.5 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 font-semibold text-xs rounded-xl cursor-pointer shadow-sm transition"
        >
          <RefreshCcw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-855 p-5 rounded-2xl flex items-center gap-4 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-slate-800/80 text-amber-600 dark:text-amber-455 flex items-center justify-center shrink-0">
            <Activity className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <span className="text-slate-400 font-semibold text-3xs uppercase tracking-wider block">Awaiting Triage</span>
            <strong className="text-lg font-extrabold">{stats.pending_triage}</strong>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-855 p-5 rounded-2xl flex items-center gap-4 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-slate-800/80 text-emerald-600 dark:text-emerald-450 flex items-center justify-center shrink-0">
            <ClipboardList className="h-5 w-5" />
          </div>
          <div>
            <span className="text-slate-400 font-semibold text-3xs uppercase tracking-wider block">Total Encounters Today</span>
            <strong className="text-lg font-extrabold">{stats.total_logged}</strong>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-850 p-6 rounded-3xl shadow-sm space-y-4">
        <h3 className="font-bold text-xs text-slate-855 dark:text-slate-50">Active Clinic Queue</h3>
        <div className="space-y-2.5">
          {queue.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">No active patient visits currently logged.</p>
          ) : (
            queue.map((q, idx) => (
              <div key={idx} className="flex justify-between items-center gap-3 p-3.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-850">
                <div className="text-xs">
                  <h4 className="font-bold text-slate-800 dark:text-slate-150">
                    {q.patient ? `${q.patient.first_name} ${q.patient.last_name}` : "Patient Visit"}
                  </h4>
                  <p className="text-3xs text-slate-400 font-semibold">
                    UHID: {q.patient?.patient_code || "N/A"} • Assigned: {q.doctor ? `Dr. ${q.doctor.first_name} ${q.doctor.last_name}` : "Not Assigned"}
                  </p>
                </div>
                <span className={`px-2 py-0.5 rounded text-3xs font-extrabold uppercase border ${
                  q.status === "PENDING"
                    ? "bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-955/20 dark:text-amber-450"
                    : "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-955/20 dark:text-emerald-450"
                }`}>
                  {q.status}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}
