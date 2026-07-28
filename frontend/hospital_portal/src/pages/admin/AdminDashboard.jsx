import React, { useEffect, useState } from "react";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { 
  Users, Stethoscope, Building, ClipboardList, 
  RefreshCcw, UserPlus, Activity
} from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Avatar } from "../../components/ui/Avatar";
import { StatCard } from "../../components/ui/StatCard";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const patientFlow = [
  { time: '6AM', patients: 4 }, { time: '8AM', patients: 18 }, { time: '10AM', patients: 35 },
  { time: '12PM', patients: 42 }, { time: '2PM', patients: 38 }, { time: '4PM', patients: 29 },
  { time: '6PM', patients: 22 }, { time: '8PM', patients: 12 },
];

export default function AdminDashboard() {
  const { showToast } = useAuth();
  const [stats, setStats] = useState({ total_doctors: 0, total_staff: 0, total_departments: 0, total_encounters: 0 });
  const [doctors, setDoctors] = useState([]);
  const [staff, setStaff] = useState([]);
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
        <div className="w-8 h-8 border-4 border-[#50ABE7] border-t-transparent rounded-full animate-spin"></div>
        <span className="text-xs font-semibold text-slate-400">Loading metrics...</span>
      </div>
    );
  }

  const recentEmployees = [...doctors, ...staff].slice(0, 5);

  return (
    <div className="space-y-6 font-sans">
      
      {/* Header section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1E293B] dark:text-slate-50">Admin Summary Dashboard</h1>
          <p className="text-xs text-[#64748B] dark:text-slate-400">Realtime hospital statistics, department analysis, and employee counts</p>
        </div>
        <button 
          onClick={fetchDashboardData}
          className="flex items-center gap-1.5 py-2 px-3.5 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-[#E5E7EB] dark:border-slate-800 font-semibold text-xs rounded-xl cursor-pointer shadow-sm transition active:scale-98 text-[#64748B] dark:text-slate-400"
        >
          <RefreshCcw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </div>

      {/* Metrics Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          label="Doctors" 
          value={String(stats.total_doctors)} 
          icon={<Stethoscope className="w-5 h-5" />} 
          color="blue" 
        />
        <StatCard 
          label="Support Staff" 
          value={String(stats.total_staff)} 
          icon={<Users className="w-5 h-5" />} 
          color="green" 
        />
        <StatCard 
          label="Departments" 
          value={String(stats.total_departments)} 
          icon={<Building className="w-5 h-5" />} 
          color="yellow" 
        />
        <StatCard 
          label="Encounters Logged" 
          value={String(stats.total_encounters)} 
          icon={<ClipboardList className="w-5 h-5" />} 
          color="red" 
        />
      </div>

      {/* Charts & Employees Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Patient trends chart */}
        <Card className="lg:col-span-2 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="h-5 w-5 text-[#50ABE7]" />
            <p className="font-bold text-[#1E293B] dark:text-slate-100">Patient Traffic & Hospital Volume</p>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={patientFlow}>
              <defs>
                <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#50ABE7" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#50ABE7" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" className="dark:stroke-slate-800" />
              <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #E5E7EB', fontSize: 12 }} />
              <Area type="monotone" dataKey="patients" stroke="#50ABE7" strokeWidth={2} fill="url(#blueGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Recent Employees */}
        <Card className="lg:col-span-1 p-5">
          <div className="flex items-center gap-2 mb-4 border-b border-[#E5E7EB] dark:border-slate-800 pb-3">
            <UserPlus className="h-5 w-5 text-[#10B981]" />
            <p className="font-bold text-[#1E293B] dark:text-slate-100">Recent Hires</p>
          </div>
          <div className="space-y-3.5">
            {recentEmployees.length === 0 ? (
              <p className="text-slate-400 text-center py-8 text-xs font-semibold">No recent employee records found.</p>
            ) : (
              recentEmployees.map((emp, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <Avatar name={`${emp.first_name} ${emp.last_name}`} size="md" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-[#1E293B] dark:text-slate-200 truncate">
                      {emp.first_name} {emp.last_name}
                    </p>
                    <p className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider truncate">
                      {emp.role.replace("_", " ")} · ID: {emp.employee_id}
                    </p>
                  </div>
                  <Badge color={emp.status === "ACTIVE" ? "green" : "red"}>
                    {emp.status}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

    </div>
  );
}
