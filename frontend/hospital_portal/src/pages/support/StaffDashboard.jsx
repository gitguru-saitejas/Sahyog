import React, { useState, useEffect } from "react";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { ClipboardList, Activity, RefreshCcw, CheckCircle, Clock } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { StatCard } from "../../components/ui/StatCard";
import { Badge } from "../../components/ui/Badge";

export default function StaffDashboard() {
  const { showToast } = useAuth();
  const [stats, setStats] = useState({ pending_triage: 0, total_logged: 0 });
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchStaffDashboard = async () => {
    setLoading(true);
    try {
      // Fetch clinic lists or doctor queues for triage summaries
      const encRes = await api.get("/patients/hospital/doctor/dashboard");
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

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-6 font-sans animate-pulse">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-7 w-64 bg-slate-200 dark:bg-slate-800 rounded-xl" />
            <div className="h-4 w-80 bg-slate-100 dark:bg-slate-800/60 rounded-lg" />
          </div>
          <div className="h-9 w-24 bg-slate-200 dark:bg-slate-800 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="h-24 bg-slate-100 dark:bg-slate-800/60 rounded-2xl border border-[#E5E7EB] dark:border-slate-800" />
          <div className="h-24 bg-slate-100 dark:bg-slate-800/60 rounded-2xl border border-[#E5E7EB] dark:border-slate-800" />
        </div>
        <div className="h-64 bg-slate-100 dark:bg-slate-800/60 rounded-2xl border border-[#E5E7EB] dark:border-slate-800" />
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans">

      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1E293B] dark:text-slate-50 flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-[#50ABE7]" />
            Support Staff Triage Desk
          </h1>
          <p className="text-xs text-[#64748B] dark:text-slate-400 mt-0.5">
            Monitor active patient check-ins and triage assignments
          </p>
        </div>
        <button
          onClick={fetchStaffDashboard}
          className="flex items-center gap-1.5 py-2 px-3.5 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-[#E5E7EB] dark:border-slate-800 font-semibold text-xs rounded-xl cursor-pointer shadow-sm transition active:scale-98 text-[#64748B] dark:text-slate-400 self-start sm:self-auto"
        >
          <RefreshCcw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard
          label="Awaiting Triage"
          value={String(stats.pending_triage)}
          icon={<Activity className="w-5 h-5" />}
          color="yellow"
        />
        <StatCard
          label="Total Encounters Today"
          value={String(stats.total_logged)}
          icon={<ClipboardList className="w-5 h-5" />}
          color="green"
        />
      </div>

      {/* Active clinic queue */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2 border-b border-[#E5E7EB] dark:border-slate-800 pb-3">
          <Activity className="h-4.5 w-4.5 text-[#50ABE7]" />
          <h2 className="font-bold text-sm text-[#1E293B] dark:text-slate-100">Active Clinic Queue</h2>
          <span className="ml-auto">
            <Badge color="blue">{queue.length} entries</Badge>
          </span>
        </div>

        {queue.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
            <div className="w-12 h-12 rounded-2xl bg-[#ECFDF5] dark:bg-slate-800 text-[#10B981] flex items-center justify-center">
              <CheckCircle className="h-6 w-6" />
            </div>
            <p className="font-bold text-sm text-[#1E293B] dark:text-slate-200">Queue is clear</p>
            <p className="text-xs text-[#64748B]">
              No active patient visits currently logged. Check back after triage entries are submitted.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {queue.map((q, idx) => (
              <div
                key={idx}
                className="flex justify-between items-center gap-4 p-3.5 bg-[#F8FAFC] dark:bg-slate-950 rounded-xl border border-[#E5E7EB] dark:border-slate-800 hover:border-[#50ABE7]/40 transition"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    q.status === "PENDING"
                      ? "bg-[#FFFBEB] text-[#F59E0B]"
                      : "bg-[#ECFDF5] text-[#10B981]"
                  }`}>
                    {q.status === "PENDING"
                      ? <Clock className="h-4 w-4" />
                      : <CheckCircle className="h-4 w-4" />}
                  </div>
                  <div>
                    <p className="font-bold text-xs text-[#1E293B] dark:text-slate-100">Patient Visit</p>
                    <p className="text-[10px] text-[#94A3B8] font-semibold mt-0.5">
                      Triage status: {q.status}
                    </p>
                  </div>
                </div>
                <Badge color={q.status === "PENDING" ? "yellow" : "green"} dot>
                  {q.status}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </Card>

    </div>
  );
}
