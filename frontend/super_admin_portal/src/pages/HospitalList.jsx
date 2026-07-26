import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Building2, Search, Plus, Trash2, RotateCcw, ChevronLeft, ChevronRight, Loader2, Info, Pencil, CheckCircle, XCircle } from "lucide-react";
import api from "../services/api";
import ConfirmDialog from "../components/ConfirmDialog";

export default function HospitalList() {
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Query parameters
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");

  // Create Modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    email: "",
    contact_number: "",
    address: "",
    logo_url: ""
  });
  const [createError, setCreateError] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState(null);

  // Edit Modal state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedHospital, setSelectedHospital] = useState(null);
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    contact_number: "",
    address: "",
    logo_url: ""
  });
  const [editError, setEditError] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  // Confirm Actions modal state
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [confirmRestoreOpen, setConfirmRestoreOpen] = useState(false);
  const [actionHospitalId, setActionHospitalId] = useState(null);

  const fetchHospitals = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/hospitals", {
        params: {
          page,
          limit: 10,
          search: search || undefined,
          status_filter: statusFilter
        }
      });
      setHospitals(res.data.items);
      setTotal(res.data.total);
      setTotalPages(res.data.total_pages);
    } catch (err) {
      setError("Failed to fetch hospitals. Please refresh the page.");
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => {
    fetchHospitals();
  }, [fetchHospitals]);

  // Handle Search submit
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchHospitals();
  };

  // Add Hospital submit
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setCreateLoading(true);
    setCreateError("");
    try {
      const res = await api.post("/hospitals", createForm);
      setIsCreateOpen(false);
      setCreateForm({ name: "", email: "", contact_number: "", address: "", logo_url: "" });
      fetchHospitals();
      setCreatedCredentials({
        name: res.data.name,
        employee_id: res.data.admin_employee_id,
        password: res.data.admin_temp_password
      });
    } catch (err) {
      setCreateError(err.response?.data?.detail || "Failed to create hospital. Please check entries.");
    } finally {
      setCreateLoading(false);
    }
  };

  // Edit Hospital submit
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditLoading(true);
    setEditError("");
    try {
      await api.patch(`/hospitals/${selectedHospital.id}`, editForm);
      setIsEditOpen(false);
      fetchHospitals();
    } catch (err) {
      setEditError(err.response?.data?.detail || "Failed to update hospital.");
    } finally {
      setEditLoading(false);
    }
  };

  // Delete action trigger
  const triggerDelete = (id) => {
    setActionHospitalId(id);
    setConfirmDeleteOpen(true);
  };

  // Execute Soft Delete
  const executeDelete = async () => {
    try {
      await api.delete(`/hospitals/${actionHospitalId}`);
      fetchHospitals();
    } catch (err) {
      // Axios interceptor will display toast
    }
  };

  // Restore action trigger
  const triggerRestore = (id) => {
    setActionHospitalId(id);
    setConfirmRestoreOpen(true);
  };

  // Execute Restore
  const executeRestore = async () => {
    try {
      await api.patch(`/hospitals/${actionHospitalId}/restore`);
      fetchHospitals();
    } catch (err) {
      // Interceptor handles error
    }
  };

  const openEdit = (h) => {
    setSelectedHospital(h);
    setEditForm({
      name: h.name,
      email: h.email,
      contact_number: h.contact_number,
      address: h.address,
      logo_url: h.logo_url || ""
    });
    setIsEditOpen(true);
  };

  return (
    <div className="p-8 space-y-8 fade-in flex-1">
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-xl font-bold text-white font-display">Hospital Directory</h3>
          <p className="text-sm text-muted-foreground">Add and configure government health institutions and clinic nodes.</p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold rounded-lg shadow-lg shadow-primary/10 transition-all duration-200 hover:scale-[1.01]"
        >
          <Plus className="w-4 h-4" />
          Add Hospital
        </button>
      </div>

      {/* Filter and search bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl bg-card border border-border">
        {/* Status filters */}
        <div className="flex gap-2">
          {["active", "deleted", "all"].map((status) => (
            <button
              key={status}
              onClick={() => {
                setStatusFilter(status);
                setPage(1);
              }}
              className={`px-4 py-2 text-xs font-bold uppercase rounded-lg border transition-all duration-200 ${
                statusFilter === status
                  ? "bg-secondary text-white border-border shadow-sm"
                  : "text-muted-foreground hover:bg-secondary/40 border-transparent hover:text-foreground"
              }`}
            >
              {status} Node
            </button>
          ))}
        </div>

        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative w-full md:max-w-xs">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search name, email, contact..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-input border border-border rounded-lg text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
          />
        </form>
      </div>

      {/* Hospital List Table */}
      {loading ? (
        <div className="flex items-center justify-center p-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="p-8 text-center text-destructive text-sm font-semibold">{error}</div>
      ) : hospitals.length === 0 ? (
        <div className="p-12 text-center rounded-xl bg-card/30 border border-border border-dashed flex flex-col items-center justify-center gap-3">
          <Building2 className="w-12 h-12 text-muted-foreground/45" />
          <h4 className="font-bold text-white font-display">No Hospitals Found</h4>
          <p className="text-sm text-muted-foreground">Try adjusting your filters or search constraints.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-secondary/30 text-xs font-bold uppercase text-muted-foreground border-b border-border">
                <tr>
                  <th className="px-6 py-4">Hospital Name</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Contact Number</th>
                  <th className="px-6 py-4">Address</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-muted-foreground">
                {hospitals.map((h) => (
                  <tr key={h.id} className="hover:bg-secondary/10 transition-all duration-150">
                    <td className="px-6 py-4 font-semibold text-white flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                        {h.logo_url ? (
                          <img src={h.logo_url} alt="" className="w-full h-full object-cover rounded-lg" onError={(e)=>{e.target.style.display='none'}} />
                        ) : (
                          <Building2 className="w-4.5 h-4.5" />
                        )}
                      </div>
                      {h.name}
                    </td>
                    <td className="px-6 py-4">{h.email}</td>
                    <td className="px-6 py-4">{h.contact_number}</td>
                    <td className="px-6 py-4 truncate max-w-[200px]">{h.address}</td>
                    <td className="px-6 py-4 text-center">
                      {h.is_active ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle className="w-3.5 h-3.5" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-destructive/10 text-destructive border border-destructive/20">
                          <XCircle className="w-3.5 h-3.5" />
                          Deleted
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end items-center gap-2">
                        <Link
                          to={`/hospitals/${h.id}`}
                          className="p-2 bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-white rounded-lg border border-border transition-all duration-150"
                          title="View Details"
                        >
                          <Info className="w-4 h-4" />
                        </Link>
                        {h.is_active ? (
                          <>
                            <button
                              onClick={() => openEdit(h)}
                              className="p-2 bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-white rounded-lg border border-border transition-all duration-150"
                              title="Edit Hospital"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => triggerDelete(h.id)}
                              className="p-2 bg-destructive/10 border border-destructive/20 text-destructive hover:bg-destructive/20 rounded-lg transition-all duration-150"
                              title="Soft Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => triggerRestore(h.id)}
                            className="p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 rounded-lg transition-all duration-150"
                            title="Restore Hospital"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination controls */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-border flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Showing page <strong className="text-white">{page}</strong> of <strong className="text-white">{totalPages}</strong> ({total} total hospitals)
              </span>
              <div className="flex gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                  className="p-2 bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:hover:bg-secondary rounded-lg border border-border transition-all duration-150"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
                  className="p-2 bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:hover:bg-secondary rounded-lg border border-border transition-all duration-150"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add Hospital Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setIsCreateOpen(false)} />
          <div className="relative w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-2xl animate-fade-in z-10">
            <h3 className="text-lg font-bold text-white font-display mb-4">Add New Hospital Node</h3>
            
            {createError && (
              <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive font-medium">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Hospital Name</label>
                  <input
                    type="text"
                    required
                    value={createForm.name}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. City General Hospital"
                    className="w-full px-3.5 py-2.5 bg-input border border-border rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary transition-all duration-200"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Email Address</label>
                  <input
                    type="email"
                    required
                    value={createForm.email}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="contact@citygeneral.org"
                    className="w-full px-3.5 py-2.5 bg-input border border-border rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary transition-all duration-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Contact Number</label>
                  <input
                    type="text"
                    required
                    value={createForm.contact_number}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, contact_number: e.target.value }))}
                    placeholder="+911123456789"
                    className="w-full px-3.5 py-2.5 bg-input border border-border rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary transition-all duration-200"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Logo URL (Optional)</label>
                  <input
                    type="text"
                    value={createForm.logo_url}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, logo_url: e.target.value }))}
                    placeholder="https://example.com/logo.png"
                    className="w-full px-3.5 py-2.5 bg-input border border-border rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary transition-all duration-200"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground uppercase">Address</label>
                <textarea
                  required
                  rows={3}
                  value={createForm.address}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Street name, City, State, Pincode"
                  className="w-full px-3.5 py-2.5 bg-input border border-border rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary transition-all duration-200 resize-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 text-sm font-semibold rounded-lg bg-secondary hover:bg-secondary/80 border border-border text-muted-foreground hover:text-white transition-all duration-150"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="px-4 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/95 transition-all duration-150 flex items-center gap-1.5 shadow-lg shadow-primary/10"
                >
                  {createLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Create Node
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Hospital Modal */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setIsEditOpen(false)} />
          <div className="relative w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-2xl animate-fade-in z-10">
            <h3 className="text-lg font-bold text-white font-display mb-4">Edit Hospital Metadata</h3>
            
            {editError && (
              <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive font-medium">
                {editError}
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Hospital Name</label>
                  <input
                    type="text"
                    required
                    value={editForm.name}
                    onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-input border border-border rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary transition-all duration-200"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Email Address</label>
                  <input
                    type="email"
                    required
                    value={editForm.email}
                    onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-input border border-border rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary transition-all duration-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Contact Number</label>
                  <input
                    type="text"
                    required
                    value={editForm.contact_number}
                    onChange={(e) => setEditForm(prev => ({ ...prev, contact_number: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-input border border-border rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary transition-all duration-200"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Logo URL</label>
                  <input
                    type="text"
                    value={editForm.logo_url}
                    onChange={(e) => setEditForm(prev => ({ ...prev, logo_url: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-input border border-border rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary transition-all duration-200"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground uppercase">Address</label>
                <textarea
                  required
                  rows={3}
                  value={editForm.address}
                  onChange={(e) => setEditForm(prev => ({ ...prev, address: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-input border border-border rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary transition-all duration-200 resize-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="px-4 py-2 text-sm font-semibold rounded-lg bg-secondary hover:bg-secondary/80 border border-border text-muted-foreground hover:text-white transition-all duration-150"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="px-4 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/95 transition-all duration-150 flex items-center gap-1.5 shadow-lg shadow-primary/10"
                >
                  {editLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Soft Delete */}
      <ConfirmDialog
        isOpen={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
        onConfirm={executeDelete}
        title="Soft Delete Hospital?"
        message="Are you sure you want to deactivate and soft-delete this hospital? Medical services and staffing linked to this node will remain intact, but the portal access will be flagged inactive."
        confirmText="Soft Delete"
      />

      {/* Confirm Restore */}
      <ConfirmDialog
        isOpen={confirmRestoreOpen}
        onClose={() => setConfirmRestoreOpen(false)}
        onConfirm={executeRestore}
        title="Restore Hospital Node?"
        message="Are you sure you want to restore and activate this soft-deleted hospital node? It will become fully operational on the platform."
        confirmText="Restore"
        isDestructive={false}
      />

      {/* Hospital Admin Credentials Success Modal */}
      {createdCredentials && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setCreatedCredentials(null)} />
          <div className="relative w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl animate-fade-in z-10 text-white space-y-6">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto">
                <CheckCircle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold font-display">Hospital Created Successfully</h3>
              <p className="text-xs text-muted-foreground">Default Hospital Administrator account has been provisioned.</p>
            </div>

            <div className="p-4 bg-secondary/50 border border-border rounded-lg space-y-3.5 text-xs font-semibold">
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Hospital Node</span>
                <strong className="text-sm font-bold">{createdCredentials.name}</strong>
              </div>
              
              <div className="border-t border-border/50 pt-3">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Employee ID (Username)</span>
                <code className="text-sm font-mono font-bold bg-input px-2 py-0.5 rounded border border-border/50 select-all block mt-1 w-fit">{createdCredentials.employee_id}</code>
              </div>

              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Temporary Password</span>
                <code className="text-sm font-mono font-bold bg-input px-2 py-0.5 rounded border border-border/50 select-all block mt-1 w-fit">{createdCredentials.password}</code>
              </div>
            </div>

            <div className="p-3 bg-blue-500/10 border border-blue-500/20 text-xs text-blue-400 rounded-lg flex items-start gap-2.5">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <p className="leading-normal">Please copy and share these credentials securely with the hospital admin. The temporary password will only be shown once.</p>
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button
                onClick={() => {
                  const text = `Hospital: ${createdCredentials.name}\nEmployee ID: ${createdCredentials.employee_id}\nTemporary Password: ${createdCredentials.password}`;
                  navigator.clipboard.writeText(text);
                  alert("Credentials copied to clipboard!");
                }}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-secondary hover:bg-secondary/80 border border-border text-muted-foreground hover:text-white transition-all duration-150"
              >
                Copy Credentials
              </button>
              <button
                onClick={() => {
                  window.open("http://localhost:5174/employee-login", "_blank");
                  setCreatedCredentials(null);
                }}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/95 transition-all duration-150 shadow-lg shadow-primary/10"
              >
                Proceed to Hospital Login
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
