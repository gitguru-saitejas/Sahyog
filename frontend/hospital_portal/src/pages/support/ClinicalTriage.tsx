import React, { useState, useEffect } from "react";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useForm } from "react-hook-form";
import { Search, User, ClipboardList } from "lucide-react";

export default function ClinicalTriage() {
  const { showToast } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, setValue, watch, reset } = useForm({
    defaultValues: {
      height: "",
      weight: "",
      bmi: "",
      temperature: "",
      blood_pressure: "",
      pulse_rate: "",
      respiratory_rate: "",
      spo2: "",
      chief_complaint: "",
      symptoms: "",
      symptoms_duration: "",
      clinical_notes: "",
      blood_group: "",
      blood_sugar: "",
      cbc: "",
      urine_test: "",
      ecg: "",
      other_labs: "",
      uploaded_files: "",
      doctor_id: ""
    }
  });

  const heightVal = watch("height");
  const weightVal = watch("weight");

  useEffect(() => {
    if (heightVal && weightVal) {
      const hMeters = parseFloat(heightVal) / 100;
      const wKg = parseFloat(weightVal);
      if (hMeters > 0 && wKg > 0) {
        const bmi = (wKg / (hMeters * hMeters)).toFixed(1);
        setValue("bmi", bmi);
      }
    }
  }, [heightVal, weightVal, setValue]);

  const loadDoctors = async () => {
    try {
      const docRes = await api.get("/patients/hospital/admin/doctors");
      setDoctors(docRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadDoctors();
  }, []);

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

  const onEncounterSubmit = async (data: any) => {
    if (!selectedPatient) return;
    try {
      const payload = {
        patient_id: selectedPatient.id,
        doctor_id: data.doctor_id || null,
        height: data.height ? parseFloat(data.height) : null,
        weight: data.weight ? parseFloat(data.weight) : null,
        bmi: data.bmi ? parseFloat(data.bmi) : null,
        temperature: data.temperature ? parseFloat(data.temperature) : null,
        blood_pressure: data.blood_pressure || null,
        pulse_rate: data.pulse_rate ? parseInt(data.pulse_rate) : null,
        respiratory_rate: data.respiratory_rate ? parseInt(data.respiratory_rate) : null,
        spo2: data.spo2 ? parseInt(data.spo2) : null,
        chief_complaint: data.chief_complaint || null,
        symptoms: data.symptoms || null,
        symptoms_duration: data.symptoms_duration || null,
        clinical_notes: data.clinical_notes || null,
        blood_group: data.blood_group || null,
        blood_sugar: data.blood_sugar || null,
        cbc: data.cbc || null,
        urine_test: data.urine_test || null,
        ecg: data.ecg || null,
        other_labs: data.other_labs || null,
        uploaded_files: data.uploaded_files || null
      };

      await api.post("/patients/hospital/staff/encounters", payload);
      showToast("success", "Clinical triage recorded successfully!");
      setSelectedPatient(null);
      reset();
    } catch (err) {
      showToast("error", "Failed to save encounter.");
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      
      <div>
        <h1 className="text-xl font-bold tracking-tight">Pre-Consultation Clinical Entry</h1>
        <p className="text-xs text-slate-500">Search patient, log vital statistics, and prepare clinical triage details</p>
      </div>

      <section className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-850 p-5 rounded-2xl shadow-sm space-y-4">
        <h3 className="font-bold text-xs flex items-center gap-2 text-slate-800 dark:text-slate-100">
          <Search className="h-4.5 w-4.5 text-blue-600" />
          Find Patient Record
        </h3>
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Patient ID, Name, Mobile, or Aadhaar..."
            className="flex-1 px-4 py-2 bg-slate-50 dark:bg-slate-955 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition dark:text-slate-550"
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
              <div key={idx} className="p-3.5 flex items-center justify-between gap-4 bg-slate-50/20 dark:bg-slate-900/50 hover:bg-slate-50 dark:hover:bg-slate-850">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-955 dark:text-blue-400 flex items-center justify-center font-bold">
                    {pat.first_name[0]}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-855 dark:text-slate-50">{pat.first_name} {pat.last_name}</h4>
                    <p className="text-3xs text-slate-400 font-bold uppercase tracking-wider">Patient Code: {pat.patient_code} • Aadhaar Last 4: {pat.aadhaar_last4}</p>
                  </div>
                </div>
                <button
                  onClick={() => { setSelectedPatient(pat); setPatients([]); }}
                  className="py-1 px-3 bg-blue-50 hover:bg-blue-100 dark:bg-slate-800 dark:hover:bg-slate-750 text-blue-600 dark:text-blue-450 font-bold text-2xs rounded-lg transition cursor-pointer"
                >
                  Select
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {selectedPatient && (
        <form onSubmit={handleSubmit(onEncounterSubmit)} className="space-y-6">
          
          <div className="p-4 bg-blue-50/30 dark:bg-slate-900 border border-blue-150/40 dark:border-slate-800 rounded-2xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-blue-600 shrink-0" />
              <div className="text-xs">
                <h4 className="font-bold text-slate-855 dark:text-slate-50">Triage Profile: {selectedPatient.first_name} {selectedPatient.last_name}</h4>
                <p className="text-3xs text-slate-400 font-semibold">Blood Group: {selectedPatient.blood_group || "—"} • Gender: {selectedPatient.gender || "—"}</p>
              </div>
            </div>
            <button 
              type="button" 
              onClick={() => setSelectedPatient(null)}
              className="text-slate-455 hover:text-red-500 font-bold text-xs"
            >
              Clear
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-850 p-6 rounded-3xl shadow-sm space-y-4">
            <h3 className="font-bold text-xs text-slate-800 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-2">
              Patient Vital Signs (All Fields Optional)
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-semibold">
              <div className="space-y-1">
                <label>Height (cm)</label>
                <input type="number" step="0.1" placeholder="e.g. 175" className="w-full border p-2 bg-slate-50 dark:bg-slate-955 dark:border-slate-800 rounded-lg dark:text-slate-50" {...register("height")} />
              </div>
              <div className="space-y-1">
                <label>Weight (kg)</label>
                <input type="number" step="0.1" placeholder="e.g. 70" className="w-full border p-2 bg-slate-50 dark:bg-slate-955 dark:border-slate-800 rounded-lg dark:text-slate-50" {...register("weight")} />
              </div>
              <div className="space-y-1">
                <label>BMI (Auto)</label>
                <input disabled type="text" placeholder="—" className="w-full border p-2 bg-slate-100 dark:bg-slate-900 dark:border-slate-800 rounded-lg dark:text-slate-50" {...register("bmi")} />
              </div>
              <div className="space-y-1">
                <label>Temperature (°C)</label>
                <input type="number" step="0.1" placeholder="e.g. 36.8" className="w-full border p-2 bg-slate-50 dark:bg-slate-955 dark:border-slate-800 rounded-lg dark:text-slate-50" {...register("temperature")} />
              </div>
              <div className="space-y-1">
                <label>Blood Pressure (BP)</label>
                <input type="text" placeholder="e.g. 120/80" className="w-full border p-2 bg-slate-50 dark:bg-slate-955 dark:border-slate-800 rounded-lg dark:text-slate-50" {...register("blood_pressure")} />
              </div>
              <div className="space-y-1">
                <label>Pulse Rate (bpm)</label>
                <input type="number" placeholder="e.g. 72" className="w-full border p-2 bg-slate-50 dark:bg-slate-955 dark:border-slate-800 rounded-lg dark:text-slate-50" {...register("pulse_rate")} />
              </div>
              <div className="space-y-1">
                <label>Resp Rate (rpm)</label>
                <input type="number" placeholder="e.g. 16" className="w-full border p-2 bg-slate-50 dark:bg-slate-955 dark:border-slate-800 rounded-lg dark:text-slate-50" {...register("respiratory_rate")} />
              </div>
              <div className="space-y-1">
                <label>Oxygen Saturation (SpO₂)</label>
                <input type="number" placeholder="e.g. 98" className="w-full border p-2 bg-slate-50 dark:bg-slate-955 dark:border-slate-800 rounded-lg dark:text-slate-50" {...register("spo2")} />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-850 p-6 rounded-3xl shadow-sm space-y-4">
            <h3 className="font-bold text-xs text-slate-800 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-2">
              Clinical Details & Diagnostics
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold">
              <div className="space-y-3">
                <div className="space-y-1">
                  <label>Chief Complaint</label>
                  <textarea rows={2} placeholder="Primary reason for patient visit..." className="w-full border p-2 bg-slate-50 dark:bg-slate-955 dark:border-slate-800 rounded-lg dark:text-slate-50" {...register("chief_complaint")} />
                </div>
                <div className="space-y-1">
                  <label>Symptoms & Duration</label>
                  <input type="text" placeholder="e.g. Cough for 3 days" className="w-full border p-2 bg-slate-50 dark:bg-slate-955 dark:border-slate-800 rounded-lg dark:text-slate-50" {...register("symptoms")} />
                </div>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label>Assign to Doctor</label>
                  <select className="w-full border p-2.5 bg-slate-50 dark:bg-slate-955 dark:border-slate-800 rounded-lg dark:text-slate-50 font-bold" {...register("doctor_id")}>
                    <option value="">Select Target Doctor</option>
                    {doctors.map((d, idx) => (
                      <option key={idx} value={d.id}>Dr. {d.first_name} {d.last_name} ({d.specialization})</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label>Lab Investigations (Optional summaries)</label>
                  <input type="text" placeholder="e.g. Glucose: 110 mg/dL" className="w-full border p-2 bg-slate-50 dark:bg-slate-955 dark:border-slate-800 rounded-lg dark:text-slate-50" {...register("blood_sugar")} />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3.5">
            <button 
              type="button" 
              onClick={() => { setSelectedPatient(null); reset(); }}
              className="py-2.5 px-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 font-bold text-xs rounded-xl hover:bg-slate-50 transition cursor-pointer"
            >
              Reset Form
            </button>
            <button 
              type="submit" 
              className="py-2.5 px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer active:scale-98 transition"
            >
              Save Triage Data
            </button>
          </div>

        </form>
      )}

    </div>
  );
}
