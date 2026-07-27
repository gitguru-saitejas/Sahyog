import React, { useEffect, useState } from "react";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useForm } from "react-hook-form";
import { 
  Users, Plus, Trash2, Key, RefreshCcw, X, Eye 
} from "lucide-react";

export default function StaffManagement() {
  const { showToast } = useAuth();
  const [staff, setStaff] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  const addForm = useForm();
  const passForm = useForm();
  const [createdCredentials, setCreatedCredentials] = useState(null);

  const loadStaffData = async () => {
    setLoading(true);
    try {
      const staffRes = await api.get("/patients/hospital/admin/staff");
      setStaff(staffRes.data);

      const deptRes = await api.get("/patients/hospital/admin/departments");
      setDepartments(deptRes.data);
    } catch (err) {
      console.error(err);
      showToast("error", "Failed to retrieve support staff listings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStaffData();
  }, []);

  const onAddSubmit = async (data) => {
    try {
      const res = await api.post("/patients/hospital/admin/staff", data);
      showToast("success", `Support Staff ${data.first_name} created successfully.`);
      setIsAddModalOpen(false);
      addForm.reset();
      loadStaffData();
      setCreatedCredentials({
        name: `${res.data.first_name} ${res.data.last_name}`,
        employee_id: res.data.employee_id,
        password: res.data.temporary_password,
        role: "SUPPORT_STAFF"
      });
    } catch (err) {
      showToast("error", err.response?.data?.detail || "Failed to create support staff profile.");
    }
  };

  const toggleStaffStatus = async (s) => {
    try {
      const newStatus = s.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
      await api.put(`/patients/hospital/admin/staff/${s.id}`, { status: newStatus });
      showToast("success", `Staff status toggled to ${newStatus}.`);
      loadStaffData();
    } catch (err) {
      showToast("error", "Failed to update status.");
    }
  };

  const deleteStaff = async (id) => {
    if (!confirm("Delete Support Staff?\nThis action cannot be undone.")) return;
    try {
      await api.delete(`/patients/hospital/admin/staff/${id}`);
      showToast("success", "Support staff member permanently deleted successfully.");
      loadStaffData();
    } catch (err) {
      showToast("error", "Unable to delete record. Please try again.");
    }
  };

  const onResetPasswordSubmit = async (data) => {
    try {
      await api.post(`/patients/hospital/admin/reset-password?employee_id=${selectedUser.employee_id}&new_password=${data.new_password}`);
      showToast("success", `Password reset for ${selectedUser.employee_id} successful.`);
      setIsPasswordModalOpen(false);
      passForm.reset();
    } catch (err) {
      showToast("error", "Failed to reset password.");
    }
  };

  const filteredStaff = staff.filter(s => {
    const fullName = `${s.first_name} ${s.last_name}`.toLowerCase();
    const query = searchQuery.toLowerCase();
    return (
      s.employee_id.toLowerCase().includes(query) ||
      fullName.includes(query) ||
      (s.designation && s.designation.toLowerCase().includes(query))
    );
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-xs font-semibold text-slate-400">Loading Support Staff directory...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-855 dark:text-slate-50 flex items-center gap-2">
            <Users className="h-5.5 w-5.5 text-blue-600" />
            Support Staff Management
          </h1>
          <p className="text-xs text-slate-500">Configure administrative staff, triages, and frontdesk user accounts</p>
        </div>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center justify-center gap-1.5 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition active:scale-98 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          Add Staff
        </button>
      </div>

      <div className="flex gap-4">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by Employee ID, Name, or Designation..."
          className="max-w-md w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition dark:text-slate-50"
        />
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-855 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-855 text-slate-400 font-bold border-b border-slate-100 dark:border-slate-800">
                <th className="p-4">Employee ID</th>
                <th className="p-4">Name</th>
                <th className="p-4">Department</th>
                <th className="p-4">Designation</th>
                <th className="p-4">Phone</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 font-semibold">No support staff found matching search.</td>
                </tr>
              ) : (
                filteredStaff.map((s, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-855/50 font-medium">
                    <td className="p-4 font-mono font-bold text-slate-550">{s.employee_id}</td>
                    <td className="p-4">{s.first_name} {s.last_name}</td>
                    <td className="p-4">
                      {departments.find(d => d.id === s.department_id)?.name || "—"}
                    </td>
                    <td className="p-4">{s.designation}</td>
                    <td className="p-4 font-mono">{s.phone || "—"}</td>
                    <td className="p-4">
                      <button
                        onClick={() => toggleStaffStatus(s)}
                        className={`px-2 py-0.5 rounded-md text-3xs font-extrabold uppercase border cursor-pointer transition ${
                          s.status === "ACTIVE"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-250 dark:bg-emerald-955/20 dark:text-emerald-450"
                            : "bg-red-50 text-red-700 border-red-250 dark:bg-red-955/20 dark:text-red-450"
                        }`}
                      >
                        {s.status}
                      </button>
                    </td>
                    <td className="p-4 flex justify-center items-center gap-2">
                      <button 
                        onClick={() => { setSelectedUser(s); setIsViewModalOpen(true); }}
                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-blue-600 rounded-lg cursor-pointer transition"
                        title="View Profile"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => { setSelectedUser(s); setIsPasswordModalOpen(true); }}
                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-blue-600 rounded-lg cursor-pointer transition"
                        title="Reset Password"
                      >
                        <Key className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => deleteStaff(s.id)}
                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-red-600 rounded-lg cursor-pointer transition"
                        title="Delete Staff"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 max-w-md w-full rounded-3xl p-6 border border-slate-150 dark:border-slate-850 shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-sm">Add Support Staff Profile</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-655 transition">
                <X className="h-4.5 w-4.5" />
              </button>
            </div>
             <form onSubmit={addForm.handleSubmit(onAddSubmit)} className="space-y-3.5 text-xs font-semibold">
              <div className="grid grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label>First Name</label>
                  <input required type="text" className="w-full border p-2 rounded-lg bg-slate-50 dark:bg-slate-955 dark:border-slate-800 dark:text-slate-50" {...addForm.register("first_name")} />
                </div>
                <div className="space-y-1">
                  <label>Last Name</label>
                  <input required type="text" className="w-full border p-2 rounded-lg bg-slate-50 dark:bg-slate-955 dark:border-slate-800 dark:text-slate-50" {...addForm.register("last_name")} />
                </div>
              </div>
              <div className="space-y-1">
                <label>Department</label>
                <select className="w-full border p-2.5 rounded-lg bg-slate-50 dark:bg-slate-955 dark:border-slate-800 dark:text-slate-50" {...addForm.register("department_id")}>
                  <option value="">Select Dept</option>
                  {departments.map((d, idx) => <option key={idx} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label>Designation</label>
                <input required type="text" placeholder="e.g. Triage Nurse, Frontdesk" className="w-full border p-2 rounded-lg bg-slate-50 dark:bg-slate-955 dark:border-slate-800 dark:text-slate-50" {...addForm.register("designation")} />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="py-2 px-3.5 bg-slate-100 dark:bg-slate-800 rounded-xl">Cancel</button>
                <button type="submit" className="py-2 px-4 bg-blue-600 text-white rounded-xl">Create Staff</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 max-w-sm w-full rounded-3xl p-6 border border-slate-150 dark:border-slate-855 shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-sm">Reset Password</h3>
              <button onClick={() => setIsPasswordModalOpen(false)} className="text-slate-400 hover:text-slate-655 transition">
                <X className="h-4.5 w-4.5" />
              </button>
            </div>
            <p className="text-3xs text-slate-500 font-semibold">
              Resetting credentials for support staff <strong className="font-mono text-slate-700 dark:text-slate-350">{selectedUser?.employee_id}</strong>.
            </p>
            <form onSubmit={passForm.handleSubmit(onResetPasswordSubmit)} className="space-y-3.5 text-xs font-semibold">
              <div className="space-y-1">
                <label>New Password</label>
                <input required type="password" placeholder="At least 6 characters" className="w-full border p-2 rounded-lg bg-slate-50 dark:bg-slate-955 dark:border-slate-800 dark:text-slate-50" {...passForm.register("new_password", { minLength: 6 })} />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button type="button" onClick={() => setIsPasswordModalOpen(false)} className="py-2 px-3.5 bg-slate-100 dark:bg-slate-800 rounded-xl">Cancel</button>
                <button type="submit" className="py-2 px-4 bg-blue-600 text-white rounded-xl">Update Password</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isViewModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 max-w-md w-full rounded-3xl p-6 border border-slate-150 dark:border-slate-855 shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-sm">Staff Profile</h3>
              <button onClick={() => setIsViewModalOpen(false)} className="text-slate-400 hover:text-slate-655 transition">
                <X className="h-4.5 w-4.5" />
              </button>
            </div>
            <div className="space-y-3 text-xs leading-relaxed">
              <div className="flex justify-between">
                <span className="text-slate-400 font-semibold">Full Name:</span>
                <span className="font-bold">{selectedUser.first_name} {selectedUser.last_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-semibold">Employee ID:</span>
                <span className="font-mono font-bold text-blue-650">{selectedUser.employee_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-semibold">Designation:</span>
                <span className="font-semibold">{selectedUser.designation}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-semibold">Department:</span>
                <span className="font-semibold">
                  {departments.find(d => d.id === selectedUser.department_id)?.name || "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-semibold">Phone:</span>
                <span className="font-mono">{selectedUser.phone || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-semibold">Email:</span>
                <span>{selectedUser.email || "—"}</span>
              </div>
            </div>
            <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
              <button onClick={() => setIsViewModalOpen(false)} className="py-2 px-4 bg-slate-100 dark:bg-slate-800 font-bold rounded-xl">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Created Staff Credentials Modal */}
      {createdCredentials && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 max-w-md w-full rounded-3xl p-6 border border-slate-150 dark:border-slate-855 shadow-2xl space-y-4 dark:text-slate-50">
            <h3 className="font-bold text-sm text-center">Support Staff Created Successfully</h3>
            <p className="text-xs text-slate-500 text-center">Please copy and save the credentials below. The temporary password is only visible once.</p>
            
            <div className="p-4 bg-slate-50 dark:bg-slate-955 border rounded-2xl space-y-3 text-xs font-semibold">
              <div>
                <span className="text-slate-400 font-bold uppercase tracking-wider block text-[10px]">Name</span>
                <span className="text-sm font-bold">{createdCredentials.name}</span>
              </div>
              <div className="border-t border-slate-150 dark:border-slate-800 pt-2">
                <span className="text-slate-400 font-bold uppercase tracking-wider block text-[10px]">Employee ID</span>
                <code className="text-sm font-mono font-bold bg-white dark:bg-slate-900 px-2 py-0.5 rounded border block mt-1 w-fit select-all">{createdCredentials.employee_id}</code>
              </div>
              <div>
                <span className="text-slate-400 font-bold uppercase tracking-wider block text-[10px]">Temporary Password</span>
                <code className="text-sm font-mono font-bold bg-white dark:bg-slate-900 px-2 py-0.5 rounded border block mt-1 w-fit select-all">{createdCredentials.password}</code>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => {
                  const text = `Staff Member: ${createdCredentials.name}\nEmployee ID: ${createdCredentials.employee_id}\nTemporary Password: ${createdCredentials.password}`;
                  navigator.clipboard.writeText(text);
                  alert("Support staff credentials copied to clipboard!");
                }}
                className="py-2 px-3.5 bg-slate-150 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 font-bold rounded-xl transition cursor-pointer text-xs"
              >
                Copy Credentials
              </button>
              <button
                onClick={() => setCreatedCredentials(null)}
                className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition cursor-pointer text-xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
