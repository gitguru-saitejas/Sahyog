import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Building2, ArrowLeft, Users, FolderKanban, ShieldCheck, UserPlus, Loader2, CheckCircle } from "lucide-react";
import api, { apiEvents } from "../services/api";

export default function HospitalDetail() {
  const { hospitalId } = useParams();
  const [hospital, setHospital] = useState(null);
  const [availableAdmins, setAvailableAdmins] = useState([]);
  const [selectedAdminId, setSelectedAdminId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [assignLoading, setAssignLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      // Fetch hospital details
      const hRes = await api.get(`/hospitals/${hospitalId}`);
      setHospital(hRes.data);

      // Fetch unassigned available admins
      const aRes = await api.get("/hospitals/admins/available");
      setAvailableAdmins(aRes.data);
    } catch (err) {
      setError("Failed to retrieve hospital details. It may not exist.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [hospitalId]);

  const handleAssignAdmin = async (e) => {
    e.preventDefault();
    if (!selectedAdminId) return;

    setAssignLoading(true);
    try {
      const res = await api.post(`/hospitals/${hospitalId}/admins`, {
        user_id: selectedAdminId
      });
      setHospital(res.data);
      setSelectedAdminId("");
      apiEvents.emit("toast", { type: "success", message: "Hospital Admin assigned successfully." });
      
      // Reload available list
      const aRes = await api.get("/hospitals/admins/available");
      setAvailableAdmins(aRes.data);
    } catch (err) {
      // Axios interceptor will show toast
    } finally {
      setAssignLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <p className="text-destructive text-sm font-semibold">{error}</p>
        <Link 
          to="/hospitals"
          className="mt-4 flex items-center gap-2 px-4 py-2 bg-secondary text-foreground text-sm font-semibold rounded-lg border border-border hover:bg-secondary/80 transition-all duration-200"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to list
        </Link>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 fade-in flex-1">
      {/* Back button */}
      <div>
        <Link to="/hospitals" className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-white uppercase transition-all duration-150">
          <ArrowLeft className="w-4 h-4" />
          Back to Directory
        </Link>
      </div>

      {/* Hospital Hero Card */}
      <div className="p-6 rounded-2xl bg-card border border-border flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
            {hospital.logo_url ? (
              <img src={hospital.logo_url} alt="" className="w-full h-full object-cover rounded-2xl" onError={(e)=>{e.target.style.display='none'}} />
            ) : (
              <Building2 className="w-7 h-7" />
            )}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h3 className="text-2xl font-bold text-white font-display leading-tight">{hospital.name}</h3>
              <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                hospital.is_active 
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                  : "bg-destructive/10 text-destructive border-destructive/20"
              }`}>
                {hospital.is_active ? "Active Node" : "Deactivated"}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{hospital.address}</p>
          </div>
        </div>

        {/* Quick info row */}
        <div className="flex gap-6 border-t lg:border-t-0 lg:border-l border-border pt-4 lg:pt-0 lg:pl-8 w-full lg:w-auto">
          <div>
            <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Email Contact</span>
            <p className="text-sm text-white font-medium mt-0.5">{hospital.email}</p>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Phone</span>
            <p className="text-sm text-white font-medium mt-0.5">{hospital.contact_number}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Departments and Staff stats */}
        <div className="lg:col-span-2 space-y-8">
          {/* Departments */}
          <div className="p-6 rounded-2xl border border-border bg-card space-y-6">
            <div className="flex items-center gap-2 border-b border-border pb-4">
              <FolderKanban className="w-5 h-5 text-primary" />
              <h4 className="font-bold text-white font-display">Departments ({hospital.departments.length})</h4>
            </div>

            {hospital.departments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No departments registered for this hospital node.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {hospital.departments.map((dept) => (
                  <div key={dept.id} className="p-4 rounded-xl bg-secondary/20 border border-border space-y-1">
                    <h5 className="font-semibold text-white text-sm">{dept.name}</h5>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {dept.description || "No description provided."}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Clinicians & Doctors Stats */}
          <div className="p-6 rounded-2xl border border-border bg-card space-y-6">
            <div className="flex items-center gap-2 border-b border-border pb-4">
              <Users className="w-5 h-5 text-primary" />
              <h4 className="font-bold text-white font-display">Staffing Statistics</h4>
            </div>
            
            <div className="p-4 rounded-xl bg-secondary/20 border border-border flex items-center justify-between">
              <div>
                <h5 className="font-semibold text-white text-sm">Active Doctors</h5>
                <p className="text-xs text-muted-foreground mt-0.5">Licensed practitioners assigned to this hospital</p>
              </div>
              <span className="text-3xl font-extrabold text-white font-display pr-2">{hospital.doctor_count}</span>
            </div>
          </div>
        </div>

        {/* Right Column - Admin Assignment */}
        <div className="space-y-8">
          {/* Assigned Administrators */}
          <div className="p-6 rounded-2xl border border-border bg-card space-y-6">
            <div className="flex items-center gap-2 border-b border-border pb-4">
              <ShieldCheck className="w-5 h-5 text-primary" />
              <h4 className="font-bold text-white font-display">Assigned Admins</h4>
            </div>

            {hospital.assigned_admins.length === 0 ? (
              <p className="text-sm text-muted-foreground">No administrator currently assigned to manage this node.</p>
            ) : (
              <div className="space-y-4">
                {hospital.assigned_admins.map((admin) => (
                  <div key={admin.id} className="p-4 rounded-xl bg-secondary/35 border border-border space-y-1 relative">
                    <h5 className="font-semibold text-white text-sm">{admin.first_name} {admin.last_name}</h5>
                    <p className="text-xs text-muted-foreground">{admin.email}</p>
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-0.5 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-bold uppercase">
                      Active
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Admin Assignment Controller Form */}
          {hospital.is_active && (
            <div className="p-6 rounded-2xl border border-border bg-card space-y-6">
              <div className="flex items-center gap-2 border-b border-border pb-4">
                <UserPlus className="w-5 h-5 text-primary" />
                <h4 className="font-bold text-white font-display">Assign Portal Admin</h4>
              </div>

              <form onSubmit={handleAssignAdmin} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Available Admins</label>
                  {availableAdmins.length === 0 ? (
                    <div className="p-3 text-xs text-muted-foreground border border-border rounded-lg bg-secondary/10">
                      No active unassigned admin users found on the platform.
                    </div>
                  ) : (
                    <select
                      required
                      value={selectedAdminId}
                      onChange={(e) => setSelectedAdminId(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-input border border-border rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary transition-all duration-200"
                    >
                      <option value="">-- Choose Administrator --</option>
                      {availableAdmins.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.first_name} {u.last_name} ({u.email})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={assignLoading || !selectedAdminId}
                  className="w-full py-2.5 bg-primary text-primary-foreground font-semibold rounded-lg text-sm hover:bg-primary/95 disabled:opacity-40 transition-all duration-150 flex items-center justify-center gap-1.5 shadow-lg shadow-primary/10"
                >
                  {assignLoading && <Loader2 className="w-4.5 h-4.5 animate-spin" />}
                  Assign Administrator
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
