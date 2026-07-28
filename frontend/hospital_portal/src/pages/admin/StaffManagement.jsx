import React, { useEffect, useState } from "react";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useForm } from "react-hook-form";
import {
  Users, Plus, Trash2, Key, X, Eye, Search, RefreshCcw
} from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Avatar } from "../../components/ui/Avatar";

// ─── Reusable styled form label + input wrapper ───────────────────────────────
function FormInput({ label, children }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] dark:text-slate-400 block">
        {label}
      </label>
      {children}
    </div>
  );
}

const inputCls =
  "w-full px-3.5 py-2.5 bg-[#F8FAFC] dark:bg-slate-950 border border-[#E5E7EB] dark:border-slate-800 text-xs font-semibold rounded-xl focus:ring-2 focus:ring-[#50ABE7]/20 focus:border-[#50ABE7] focus:outline-none transition dark:text-slate-50";

// ─── Shared modal wrapper ─────────────────────────────────────────────────────
function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 max-w-lg w-full rounded-3xl p-6 border border-[#E5E7EB] dark:border-slate-800 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
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

  useEffect(() => { loadStaffData(); }, []);

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

  // ── Loading skeleton ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-6 font-sans animate-pulse">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-7 w-60 bg-slate-200 dark:bg-slate-800 rounded-xl" />
            <div className="h-4 w-80 bg-slate-100 dark:bg-slate-800/60 rounded-lg" />
          </div>
          <div className="h-9 w-32 bg-slate-200 dark:bg-slate-800 rounded-xl" />
        </div>
        <Card className="p-0 overflow-hidden">
          <div className="h-12 bg-[#F1F5F9] dark:bg-slate-800 border-b border-[#E5E7EB] dark:border-slate-800" />
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="flex items-center gap-4 p-4 border-b border-[#E5E7EB] dark:border-slate-800 last:border-0">
              <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-800 shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 w-40 bg-slate-200 dark:bg-slate-800 rounded" />
                <div className="h-3 w-56 bg-slate-100 dark:bg-slate-800/60 rounded" />
              </div>
              <div className="h-6 w-16 bg-slate-100 dark:bg-slate-800/60 rounded-full" />
            </div>
          ))}
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans">

      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1E293B] dark:text-slate-50 flex items-center gap-2">
            <Users className="h-5 w-5 text-[#50ABE7]" />
            Support Staff Management
          </h1>
          <p className="text-xs text-[#64748B] dark:text-slate-400 mt-0.5">
            Configure administrative staff, triage, and frontdesk user accounts
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={loadStaffData}
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
            Add Staff
          </button>
        </div>
      </div>

      {/* Search bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-2.5 h-3.5 w-3.5 text-[#94A3B8]" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by Employee ID, Name, or Designation..."
          className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 rounded-xl text-xs font-semibold text-[#1E293B] dark:text-slate-50 focus:ring-2 focus:ring-[#50ABE7]/20 focus:border-[#50ABE7] focus:outline-none transition"
        />
      </div>

      {/* Staff table */}
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#F1F5F9] dark:bg-slate-800 text-[#64748B] dark:text-slate-400 font-bold border-b border-[#E5E7EB] dark:border-slate-800 uppercase tracking-wider">
                <th className="px-5 py-3.5">Employee</th>
                <th className="px-5 py-3.5">Department</th>
                <th className="px-5 py-3.5">Designation</th>
                <th className="px-5 py-3.5">Phone</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB] dark:divide-slate-800">
              {filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className="flex flex-col items-center justify-center py-14 gap-3 text-center">
                      <div className="w-12 h-12 rounded-2xl bg-[#EDF7FF] dark:bg-slate-800 text-[#50ABE7] flex items-center justify-center">
                        <Users className="h-6 w-6" />
                      </div>
                      <p className="font-bold text-sm text-[#1E293B] dark:text-slate-200">No staff members found</p>
                      <p className="text-xs text-[#64748B]">
                        {searchQuery ? "Try adjusting your search query." : "Add a staff member to get started."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredStaff.map((s, idx) => (
                  <tr key={idx} className="hover:bg-[#F8FAFC] dark:hover:bg-slate-850 transition">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <Avatar name={`${s.first_name} ${s.last_name}`} size="sm" />
                        <div>
                          <p className="font-bold text-[#1E293B] dark:text-slate-100">{s.first_name} {s.last_name}</p>
                          <p className="text-[10px] font-mono text-[#94A3B8] mt-0.5">{s.employee_id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-[#64748B] dark:text-slate-400 font-semibold">
                      {departments.find(d => d.id === s.department_id)?.name || "—"}
                    </td>
                    <td className="px-5 py-3.5 text-[#64748B] dark:text-slate-400 font-semibold">
                      {s.designation}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-[#64748B] dark:text-slate-400">
                      {s.phone || "—"}
                    </td>
                    <td className="px-5 py-3.5">
                      <button onClick={() => toggleStaffStatus(s)} className="cursor-pointer transition" title="Click to toggle status">
                        <Badge color={s.status === "ACTIVE" ? "green" : "red"} dot>
                          {s.status}
                        </Badge>
                      </button>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex justify-center items-center gap-1.5">
                        <button
                          onClick={() => { setSelectedUser(s); setIsViewModalOpen(true); }}
                          className="p-1.5 hover:bg-[#EDF7FF] dark:hover:bg-slate-800 text-[#94A3B8] hover:text-[#50ABE7] rounded-lg cursor-pointer transition"
                          title="View Profile"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => { setSelectedUser(s); setIsPasswordModalOpen(true); }}
                          className="p-1.5 hover:bg-[#EDF7FF] dark:hover:bg-slate-800 text-[#94A3B8] hover:text-[#50ABE7] rounded-lg cursor-pointer transition"
                          title="Reset Password"
                        >
                          <Key className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => deleteStaff(s.id)}
                          className="p-1.5 hover:bg-[#FEF2F2] dark:hover:bg-red-950/20 text-[#94A3B8] hover:text-[#EF4444] rounded-lg cursor-pointer transition"
                          title="Delete Staff"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ── Add Staff Modal ──────────────────────────────────────────────────── */}
      {isAddModalOpen && (
        <Modal title="Add Support Staff Profile" onClose={() => setIsAddModalOpen(false)}>
          <form onSubmit={addForm.handleSubmit(onAddSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormInput label="First Name">
                <input required type="text" className={inputCls} {...addForm.register("first_name")} />
              </FormInput>
              <FormInput label="Last Name">
                <input required type="text" className={inputCls} {...addForm.register("last_name")} />
              </FormInput>
            </div>
            <FormInput label="Department">
              <select className={inputCls} {...addForm.register("department_id")}>
                <option value="">Select Department</option>
                {departments.map((d, idx) => <option key={idx} value={d.id}>{d.name}</option>)}
              </select>
            </FormInput>
            <FormInput label="Designation">
              <input required type="text" placeholder="e.g. Triage Nurse, Frontdesk" className={inputCls} {...addForm.register("designation")} />
            </FormInput>
            <div className="flex justify-end gap-2 pt-2 border-t border-[#E5E7EB] dark:border-slate-800">
              <button type="button" onClick={() => setIsAddModalOpen(false)}
                className="py-2 px-4 bg-[#F1F5F9] dark:bg-slate-800 text-[#64748B] font-bold text-xs rounded-xl hover:bg-[#E2E8F0] transition cursor-pointer">
                Cancel
              </button>
              <button type="submit"
                className="py-2 px-4 bg-[#50ABE7] hover:bg-[#3ea0df] text-white font-bold text-xs rounded-xl shadow-sm shadow-[#50ABE7]/20 transition cursor-pointer">
                Create Staff
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Reset Password Modal ─────────────────────────────────────────────── */}
      {isPasswordModalOpen && (
        <Modal title="Reset Password" onClose={() => setIsPasswordModalOpen(false)}>
          <p className="text-xs text-[#64748B] font-semibold">
            Resetting credentials for staff <span className="font-mono font-bold text-[#1E293B] dark:text-slate-200">{selectedUser?.employee_id}</span>.
          </p>
          <form onSubmit={passForm.handleSubmit(onResetPasswordSubmit)} className="space-y-4">
            <FormInput label="New Password">
              <input required type="password" placeholder="At least 6 characters" className={inputCls}
                {...passForm.register("new_password", { minLength: 6 })} />
            </FormInput>
            <div className="flex justify-end gap-2 pt-2 border-t border-[#E5E7EB] dark:border-slate-800">
              <button type="button" onClick={() => setIsPasswordModalOpen(false)}
                className="py-2 px-4 bg-[#F1F5F9] dark:bg-slate-800 text-[#64748B] font-bold text-xs rounded-xl hover:bg-[#E2E8F0] transition cursor-pointer">
                Cancel
              </button>
              <button type="submit"
                className="py-2 px-4 bg-[#50ABE7] hover:bg-[#3ea0df] text-white font-bold text-xs rounded-xl shadow-sm transition cursor-pointer">
                Update Password
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── View Profile Modal ───────────────────────────────────────────────── */}
      {isViewModalOpen && selectedUser && (
        <Modal title="Staff Profile" onClose={() => setIsViewModalOpen(false)}>
          <div className="flex items-center gap-4 pb-4 border-b border-[#E5E7EB] dark:border-slate-800">
            <Avatar name={`${selectedUser.first_name} ${selectedUser.last_name}`} size="lg" />
            <div>
              <p className="font-bold text-base text-[#1E293B] dark:text-white">
                {selectedUser.first_name} {selectedUser.last_name}
              </p>
              <p className="font-mono text-xs text-[#50ABE7] mt-0.5">{selectedUser.employee_id}</p>
              <Badge color={selectedUser.status === "ACTIVE" ? "green" : "red"} dot className="mt-1.5">
                {selectedUser.status}
              </Badge>
            </div>
          </div>
          <div className="space-y-3 text-xs">
            {[
              { label: "Designation",  value: selectedUser.designation },
              { label: "Department",   value: departments.find(d => d.id === selectedUser.department_id)?.name || "—" },
              { label: "Phone",        value: selectedUser.phone || "—", mono: true },
              { label: "Email",        value: selectedUser.email || "—" },
            ].map(({ label, value, mono }) => (
              <div key={label} className="flex items-center justify-between gap-4 py-2 border-b border-[#F1F5F9] dark:border-slate-800 last:border-0">
                <span className="text-[#94A3B8] font-semibold">{label}</span>
                <span className={`font-bold text-[#1E293B] dark:text-slate-200 ${mono ? "font-mono" : ""}`}>{value}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-end pt-2">
            <button onClick={() => setIsViewModalOpen(false)}
              className="py-2 px-4 bg-[#F1F5F9] dark:bg-slate-800 text-[#64748B] font-bold text-xs rounded-xl hover:bg-[#E2E8F0] transition cursor-pointer">
              Close
            </button>
          </div>
        </Modal>
      )}

      {/* ── Created Credentials Modal ────────────────────────────────────────── */}
      {createdCredentials && (
        <Modal title="Staff Member Created Successfully" onClose={() => setCreatedCredentials(null)}>
          <p className="text-xs text-[#64748B] text-center -mt-2">
            Copy and save the credentials below. The temporary password is only visible once.
          </p>
          <div className="p-4 bg-[#F8FAFC] dark:bg-slate-950 border border-[#E5E7EB] dark:border-slate-800 rounded-2xl space-y-3 text-xs font-semibold">
            {[
              { label: "Name",              value: createdCredentials.name },
              { label: "Employee ID",        value: createdCredentials.employee_id, mono: true },
              { label: "Temporary Password", value: createdCredentials.password, mono: true },
            ].map(({ label, value, mono }) => (
              <div key={label} className="space-y-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8] block">{label}</span>
                <span className={`block text-sm font-bold text-[#1E293B] dark:text-white ${mono ? "font-mono bg-white dark:bg-slate-900 px-2 py-0.5 rounded-lg border border-[#E5E7EB] dark:border-slate-800 w-fit select-all" : ""}`}>
                  {value}
                </span>
              </div>
            ))}
          </div>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => {
                const text = `Staff: ${createdCredentials.name}\nEmployee ID: ${createdCredentials.employee_id}\nTemporary Password: ${createdCredentials.password}`;
                navigator.clipboard.writeText(text);
                showToast("success", "Credentials copied to clipboard!");
              }}
              className="py-2 px-4 bg-[#F1F5F9] dark:bg-slate-800 text-[#64748B] font-bold text-xs rounded-xl hover:bg-[#E2E8F0] transition cursor-pointer"
            >
              Copy Credentials
            </button>
            <button
              onClick={() => setCreatedCredentials(null)}
              className="py-2 px-4 bg-[#50ABE7] hover:bg-[#3ea0df] text-white font-bold text-xs rounded-xl shadow-sm transition cursor-pointer"
            >
              Done
            </button>
          </div>
        </Modal>
      )}

    </div>
  );
}
