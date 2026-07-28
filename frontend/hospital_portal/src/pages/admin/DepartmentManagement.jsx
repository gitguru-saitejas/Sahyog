import React, { useEffect, useState } from "react";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useForm } from "react-hook-form";
import {
  Building, Plus, X, Users, Stethoscope, RefreshCcw
} from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";

// ─── Modal wrapper ─────────────────────────────────────────────────────────
function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 max-w-md w-full rounded-3xl p-6 border border-[#E5E7EB] dark:border-slate-800 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center pb-3 border-b border-[#E5E7EB] dark:border-slate-800">
          <h3 className="font-bold text-sm text-[#1E293B] dark:text-white">{title}</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#64748B] hover:bg-[#F1F5F9] dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

const inputCls =
  "w-full px-3.5 py-2.5 bg-[#F8FAFC] dark:bg-slate-950 border border-[#E5E7EB] dark:border-slate-800 text-xs font-semibold rounded-xl focus:ring-2 focus:ring-[#50ABE7]/20 focus:border-[#50ABE7] focus:outline-none transition dark:text-slate-50";

export default function DepartmentManagement() {
  const { showToast } = useAuth();
  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const addForm = useForm();

  const loadDepartmentsData = async () => {
    setLoading(true);
    try {
      const deptRes = await api.get("/patients/hospital/admin/departments");
      setDepartments(deptRes.data);
      const docRes = await api.get("/patients/hospital/admin/doctors");
      setDoctors(docRes.data);
      const staffRes = await api.get("/patients/hospital/admin/staff");
      setStaff(staffRes.data);
    } catch (err) {
      console.error(err);
      showToast("error", "Failed to retrieve department listings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadDepartmentsData(); }, []);

  const onAddSubmit = async (data) => {
    try {
      await api.post("/patients/hospital/admin/departments", data);
      showToast("success", `Department ${data.name} created successfully.`);
      setIsAddModalOpen(false);
      addForm.reset();
      loadDepartmentsData();
    } catch (err) {
      showToast("error", err.response?.data?.detail || "Failed to create department.");
    }
  };

  // ── Loading skeleton ────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-6 font-sans animate-pulse">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-7 w-64 bg-slate-200 dark:bg-slate-800 rounded-xl" />
            <div className="h-4 w-80 bg-slate-100 dark:bg-slate-800/60 rounded-lg" />
          </div>
          <div className="h-9 w-40 bg-slate-200 dark:bg-slate-800 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-36 bg-slate-100 dark:bg-slate-800/60 rounded-2xl border border-[#E5E7EB] dark:border-slate-800" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans">

      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1E293B] dark:text-slate-50 flex items-center gap-2">
            <Building className="h-5 w-5 text-[#50ABE7]" />
            Department Management
          </h1>
          <p className="text-xs text-[#64748B] dark:text-slate-400 mt-0.5">
            Configure clinic divisions, departments, and employee mappings
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={loadDepartmentsData}
            className="flex items-center gap-1.5 py-2 px-3.5 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-[#E5E7EB] dark:border-slate-800 font-semibold text-xs rounded-xl cursor-pointer shadow-sm transition active:scale-98 text-[#64748B]"
          >
            <RefreshCcw className="h-3.5 w-3.5" />
            Refresh
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 py-2 px-4 bg-[#50ABE7] hover:bg-[#3ea0df] text-white font-bold text-xs rounded-xl shadow-md shadow-[#50ABE7]/20 transition active:scale-98 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Add Department
          </button>
        </div>
      </div>

      {/* Summary stat row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Total Departments",  value: departments.length, icon: Building,    color: "text-[#50ABE7] bg-[#EDF7FF]" },
          { label: "Total Physicians",   value: doctors.length,     icon: Stethoscope, color: "text-[#10B981] bg-[#ECFDF5]" },
          { label: "Support Staff",      value: staff.length,       icon: Users,        color: "text-[#F59E0B] bg-[#FFFBEB]" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="p-5 flex items-center gap-4">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-[#64748B] font-semibold">{label}</p>
              <p className="text-2xl font-bold text-[#1E293B] dark:text-white mt-0.5">{value}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Departments grid / table */}
      {departments.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16 gap-3 text-center p-6">
          <div className="w-14 h-14 rounded-2xl bg-[#EDF7FF] dark:bg-slate-800 text-[#50ABE7] flex items-center justify-center">
            <Building className="h-7 w-7" />
          </div>
          <p className="font-bold text-sm text-[#1E293B] dark:text-slate-200">No departments found</p>
          <p className="text-xs text-[#64748B] max-w-xs">
            Create your first department to start assigning doctors and support staff.
          </p>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="mt-2 flex items-center gap-1.5 py-2 px-4 bg-[#50ABE7] hover:bg-[#3ea0df] text-white font-bold text-xs rounded-xl shadow-md shadow-[#50ABE7]/20 transition cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Add First Department
          </button>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#F1F5F9] dark:bg-slate-800 text-[#64748B] dark:text-slate-400 font-bold border-b border-[#E5E7EB] dark:border-slate-800 uppercase tracking-wider">
                  <th className="px-5 py-3.5">Department</th>
                  <th className="px-5 py-3.5">Description</th>
                  <th className="px-5 py-3.5">Head Doctor</th>
                  <th className="px-5 py-3.5 text-center">Physicians</th>
                  <th className="px-5 py-3.5 text-center">Staff</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB] dark:divide-slate-800">
                {departments.map((dept, idx) => {
                  const deptDocs  = doctors.filter(d => d.department_id === dept.id);
                  const deptStaff = staff.filter(s => s.department_id === dept.id);
                  const headDoctor = deptDocs[0]
                    ? `Dr. ${deptDocs[0].first_name} ${deptDocs[0].last_name}`
                    : "—";

                  return (
                    <tr key={idx} className="hover:bg-[#F8FAFC] dark:hover:bg-slate-850 transition">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-[#EDF7FF] dark:bg-slate-800 text-[#50ABE7] flex items-center justify-center shrink-0">
                            <Building className="h-4 w-4" />
                          </div>
                          <p className="font-bold text-[#1E293B] dark:text-slate-100">{dept.name}</p>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-[#64748B] dark:text-slate-400 max-w-xs">
                        {dept.description || <span className="italic text-[#94A3B8]">No description provided.</span>}
                      </td>
                      <td className="px-5 py-4 text-[#64748B] dark:text-slate-400 font-semibold">
                        {headDoctor}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <Badge color="blue">{deptDocs.length} physicians</Badge>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <Badge color="green">{deptStaff.length} staff</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ── Add Department Modal ─────────────────────────────────────────────── */}
      {isAddModalOpen && (
        <Modal title="Add New Department" onClose={() => setIsAddModalOpen(false)}>
          <form onSubmit={addForm.handleSubmit(onAddSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] dark:text-slate-400 block">
                Department Name
              </label>
              <input
                required
                type="text"
                placeholder="e.g. Cardiology"
                className={inputCls}
                {...addForm.register("name")}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] dark:text-slate-400 block">
                Description
              </label>
              <textarea
                rows={3}
                placeholder="Enter a brief overview of this department..."
                className={inputCls + " resize-none"}
                {...addForm.register("description")}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-[#E5E7EB] dark:border-slate-800">
              <button type="button" onClick={() => setIsAddModalOpen(false)}
                className="py-2 px-4 bg-[#F1F5F9] dark:bg-slate-800 text-[#64748B] font-bold text-xs rounded-xl hover:bg-[#E2E8F0] transition cursor-pointer">
                Cancel
              </button>
              <button type="submit"
                className="py-2 px-4 bg-[#50ABE7] hover:bg-[#3ea0df] text-white font-bold text-xs rounded-xl shadow-sm shadow-[#50ABE7]/20 transition cursor-pointer">
                Create Department
              </button>
            </div>
          </form>
        </Modal>
      )}

    </div>
  );
}
