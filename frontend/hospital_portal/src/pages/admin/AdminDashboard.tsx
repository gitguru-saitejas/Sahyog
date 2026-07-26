import React, { useEffect, useState } from "react";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { 
  Users, Stethoscope, Building, ClipboardList, 
  RefreshCcw, BarChart2, UserPlus
} from "lucide-react";

export default function AdminDashboard() {
  const { showToast } = useAuth();
  const [stats, setStats] = useState({ total_doctors: 0, total_staff: 0, total_departments: 0, total_encounters: 0 });
  const [doctors, setDoctors] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const statsRes = await api.get("/patients/hospital/admin/dashboard");
      setStats(statsRes.data);

      const docRes = await api.get("/patients/hospital/admin/doctors");
      setDoctors(docRes.data);

      const staffRes = await api.get("/patients/hospital/admin/staff");
      setStaff(staffRes.data);
    } catch (err) {
      console.error(err);
      showToast("error", "Failed to retrieve administrator metrics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-xs font-semibold text-slate-400">Loading metrics...</span>
      </div>
    );
  }

  const recentEmployees = [...doctors, ...staff].slice(0, 5);

  return (
    <div className="space-y-6">
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-850 dark:text-slate-50">Admin Summary Dashboard</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">Realtime hospital statistics, department analysis, and employee counts</p>
        </div>
        <button 
          onClick={fetchDashboardData}
          className="flex items-center gap-1.5 py-2 px-3.5 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 font-semibold text-xs rounded-xl cursor-pointer shadow-sm transition active:scale-98"
        >
          <RefreshCcw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-850 p-5 rounded-2xl flex items-center gap-4 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-slate-800/80 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Stethoscope className="h-5 w-5" />
          </div>
          <div>
            <span className="text-slate-400 font-semibold text-3xs uppercase tracking-wider block">Doctors</span>
            <strong className="text-lg font-extrabold text-slate-800 dark:text-slate-100">{stats.total_doctors}</strong>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-850 p-5 rounded-2xl flex items-center gap-4 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-slate-800/80 text-emerald-600 dark:text-emerald-450 flex items-center justify-center shrink-0">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <span className="text-slate-400 font-semibold text-3xs uppercase tracking-wider block">Support Staff</span>
            <strong className="text-lg font-extrabold text-slate-800 dark:text-slate-100">{stats.total_staff}</strong>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-850 p-5 rounded-2xl flex items-center gap-4 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-slate-800/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <Building className="h-5 w-5" />
          </div>
          <div>
            <span className="text-slate-400 font-semibold text-3xs uppercase tracking-wider block">Departments</span>
            <strong className="text-lg font-extrabold text-slate-800 dark:text-slate-100">{stats.total_departments}</strong>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-850 p-5 rounded-2xl flex items-center gap-4 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-slate-800/80 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <ClipboardList className="h-5 w-5" />
          </div>
          <div>
            <span className="text-slate-400 font-semibold text-3xs uppercase tracking-wider block">Encounters Logged</span>
            <strong className="text-lg font-extrabold text-slate-800 dark:text-slate-100">{stats.total_encounters}</strong>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-850 p-6 rounded-3xl shadow-sm space-y-4">
          <h3 className="font-bold text-xs text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <BarChart2 className="h-4.5 w-4.5 text-blue-600" />
            Patient Traffic & Hospital Volume
          </h3>
          <div className="h-56 bg-slate-50 dark:bg-slate-955 border border-slate-100 dark:border-slate-850 rounded-2xl flex items-center justify-center text-xs font-semibold text-slate-400 select-none">
            [ Patient trends chart placeholder — analytics updates automatically ]
          </div>
        </div>

        <div className="lg:col-span-1 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-850 p-6 rounded-3xl shadow-sm space-y-4">
          <h3 className="font-bold text-xs text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <UserPlus className="h-4.5 w-4.5 text-emerald-600" />
            Recent Hires / Employees
          </h3>
          <div className="space-y-3.5 text-xs font-semibold">
            {recentEmployees.length === 0 ? (
              <p className="text-slate-400 text-center py-6">No recent employee records found.</p>
            ) : (
              recentEmployees.map((emp, idx) => (
                <div key={idx} className="flex items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-850 pb-2.5 last:border-b-0 last:pb-0">
                  <div>
                    <h4 className="font-bold text-slate-855 dark:text-slate-50">{emp.first_name} {emp.last_name}</h4>
                    <span className="text-3xs font-extrabold uppercase tracking-wider text-slate-400">{emp.role} • ID: {emp.employee_id}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-3xs font-extrabold border ${
                    emp.status === "ACTIVE" 
                      ? "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-955/20 dark:text-emerald-450" 
                      : "bg-red-50 text-red-700 border-red-100 dark:bg-red-955/20 dark:text-red-450"
                  }`}>
                    {emp.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
