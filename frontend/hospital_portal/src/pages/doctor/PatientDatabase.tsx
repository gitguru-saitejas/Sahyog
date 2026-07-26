import React, { useState } from "react";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { Search, User, FileText } from "lucide-react";

export default function PatientDatabase() {
  const { showToast } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setLoading(true);
    try {
      const res = await api.get(`/patients/hospital/staff/search?query=${searchQuery}`);
      setPatients(res.data);
      if (res.data.length === 0) {
        showToast("info", "No patients found matching query.");
      }
    } catch (err) {
      showToast("error", "Error searching patient list.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      
      <div>
        <h1 className="text-xl font-bold tracking-tight">Patient Database</h1>
        <p className="text-xs text-slate-500">Query and inspect records of patients registered at the facility</p>
      </div>

      <section className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-850 p-5 rounded-2xl shadow-sm space-y-4">
        <h3 className="font-bold text-xs flex items-center gap-2 text-slate-800 dark:text-slate-100">
          <Search className="h-4.5 w-4.5 text-blue-600" />
          Lookup Patient File
        </h3>
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Patient ID, Name, Mobile, or Aadhaar..."
            className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-955 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition dark:text-slate-50"
          />
          <button
            type="submit"
            disabled={loading}
            className="py-2 px-5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm cursor-pointer active:scale-98 transition"
          >
            {loading ? "Searching..." : "Search"}
          </button>
        </form>

        {patients.length > 0 && (
          <div className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 text-xs font-semibold">
            {patients.map((pat, idx) => (
              <div key={idx} className="p-4 flex items-center justify-between gap-4 bg-slate-50/20 dark:bg-slate-900/50 hover:bg-slate-50 dark:hover:bg-slate-850">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400 flex items-center justify-center font-bold">
                    {pat.first_name[0]}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-855 dark:text-slate-50">{pat.first_name} {pat.last_name}</h4>
                    <p className="text-3xs text-slate-400 font-bold uppercase tracking-wider">Patient Code: {pat.patient_code} • Aadhaar Last 4: {pat.aadhaar_last4}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-3xs font-extrabold uppercase text-slate-400 block mb-0.5">Blood Group</span>
                  <span className="font-bold">{pat.blood_group || "—"}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

    </div>
  );
}
