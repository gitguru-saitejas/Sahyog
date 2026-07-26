import React, { useEffect, useState } from "react";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useForm } from "react-hook-form";
import { 
  Building, Plus, X 
} from "lucide-react";

export default function DepartmentManagement() {
  const { showToast } = useAuth();
  const [departments, setDepartments] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
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

  useEffect(() => {
    loadDepartmentsData();
  }, []);

  const onAddSubmit = async (data: any) => {
    try {
      await api.post("/patients/hospital/admin/departments", data);
      showToast("success", `Department ${data.name} created successfully.`);
      setIsAddModalOpen(false);
      addForm.reset();
      loadDepartmentsData();
    } catch (err: any) {
      showToast("error", err.response?.data?.detail || "Failed to create department.");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-xs font-semibold text-slate-400">Loading Departments list...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-855 dark:text-slate-50 flex items-center gap-2">
            <Building className="h-5.5 w-5.5 text-blue-600" />
            Department Management
          </h1>
          <p className="text-xs text-slate-500">Configure clinic divisions, departments, and employee mappings</p>
        </div>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center justify-center gap-1.5 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition active:scale-98 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          Add Department
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-850 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-855 text-slate-400 font-bold border-b border-slate-100 dark:border-slate-800">
                <th className="p-4">Department Name</th>
                <th className="p-4">Description</th>
                <th className="p-4">Head Doctor</th>
                <th className="p-4">Doctors Count</th>
                <th className="p-4">Total Staff</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {departments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400 font-semibold">No departments found.</td>
                </tr>
              ) : (
                departments.map((dept, idx) => {
                  const deptDocs = doctors.filter(d => d.department_id === dept.id);
                  const deptStaff = staff.filter(s => s.department_id === dept.id);
                  const headDoctor = deptDocs[0] ? `Dr. ${deptDocs[0].first_name} ${deptDocs[0].last_name}` : "—";
                  
                  return (
                    <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-855/50 font-medium">
                      <td className="p-4 font-bold text-blue-650 dark:text-blue-400">{dept.name}</td>
                      <td className="p-4 text-slate-550">{dept.description || "No description provided."}</td>
                      <td className="p-4 text-slate-600 dark:text-slate-400 font-semibold">{headDoctor}</td>
                      <td className="p-4 font-semibold">{deptDocs.length} physicians</td>
                      <td className="p-4 font-semibold">{deptStaff.length} employees</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 max-w-md w-full rounded-3xl p-6 border border-slate-150 dark:border-slate-855 shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-sm">Add New Department</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-655 transition">
                <X className="h-4.5 w-4.5" />
              </button>
            </div>
            <form onSubmit={addForm.handleSubmit(onAddSubmit)} className="space-y-3.5 text-xs font-semibold">
              <div className="space-y-1">
                <label>Department Name</label>
                <input required type="text" placeholder="e.g. Cardiology" className="w-full border p-2 rounded-lg bg-slate-50 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-50" {...addForm.register("name")} />
              </div>
              <div className="space-y-1">
                <label>Description</label>
                <textarea rows={3} placeholder="Enter brief overview..." className="w-full border p-2 rounded-lg bg-slate-50 dark:bg-slate-955 dark:border-slate-800 dark:text-slate-50" {...addForm.register("description")} />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="py-2 px-3.5 bg-slate-100 dark:bg-slate-800 rounded-xl">Cancel</button>
                <button type="submit" className="py-2 px-4 bg-blue-600 text-white rounded-xl">Create Department</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
