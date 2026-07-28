import React, { useState, useEffect } from "react";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useForm } from "react-hook-form";
import {
  Search, User, ClipboardList, X, Stethoscope, Thermometer,
  Heart, Wind, Activity, Droplet, CheckCircle
} from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Avatar } from "../../components/ui/Avatar";
import { Badge } from "../../components/ui/Badge";

// ─── Shared input class ────────────────────────────────────────────────────
const inputCls =
  "w-full px-3.5 py-2.5 bg-[#F8FAFC] dark:bg-slate-950 border border-[#E5E7EB] dark:border-slate-800 text-xs font-semibold rounded-xl focus:ring-2 focus:ring-[#50ABE7]/20 focus:border-[#50ABE7] focus:outline-none transition dark:text-slate-50 placeholder:text-[#94A3B8]";

// ─── Section card with title ───────────────────────────────────────────────
function SectionCard({ icon: Icon, title, children, className = "" }) {
  return (
    <Card className={`p-5 space-y-4 ${className}`}>
      <div className="flex items-center gap-2 border-b border-[#E5E7EB] dark:border-slate-800 pb-3">
        <Icon className="h-4 w-4 text-[#50ABE7]" />
        <h3 className="font-bold text-xs text-[#1E293B] dark:text-slate-100 uppercase tracking-wide">
          {title}
        </h3>
      </div>
      {children}
    </Card>
  );
}

// ─── Vital input field ────────────────────────────────────────────────────
function VitalField({ label, placeholder, register: reg, name, type = "text", step }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] dark:text-slate-400 block">
        {label}
      </label>
      <input
        type={type}
        step={step}
        placeholder={placeholder}
        className={inputCls}
        {...reg(name)}
      />
    </div>
  );
}

export default function ClinicalTriage() {
  const { showToast } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, setValue, watch, reset } = useForm({
    defaultValues: {
      height: "", weight: "", bmi: "", temperature: "",
      blood_pressure: "", pulse_rate: "", respiratory_rate: "", spo2: "",
      chief_complaint: "", symptoms: "", symptoms_duration: "",
      clinical_notes: "", blood_group: "", blood_sugar: "",
      cbc: "", urine_test: "", ecg: "", other_labs: "",
      uploaded_files: "", doctor_id: ""
    }
  });

  const heightVal = watch("height");
  const weightVal = watch("weight");

  useEffect(() => {
    if (heightVal && weightVal) {
      const hMeters = parseFloat(heightVal) / 100;
      const wKg = parseFloat(weightVal);
      if (hMeters > 0 && wKg > 0) {
        setValue("bmi", (wKg / (hMeters * hMeters)).toFixed(1));
      }
    }
  }, [heightVal, weightVal, setValue]);

  const loadDoctors = async () => {
    try {
      const docRes = await api.get("/patients/hospital/staff/doctors");
      setDoctors(docRes.data);
    } catch (err) {
      console.error("Failed to load doctors:", err);
    }
  };

  useEffect(() => { loadDoctors(); }, []);

  const handleSearch = async (e) => {
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

  const onEncounterSubmit = async (data) => {
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
    <div className="space-y-6 max-w-5xl mx-auto font-sans">

      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#1E293B] dark:text-slate-50 flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-[#50ABE7]" />
          Pre-Consultation Clinical Entry
        </h1>
        <p className="text-xs text-[#64748B] dark:text-slate-400 mt-0.5">
          Search patient record, log vital statistics, and prepare triage details
        </p>
      </div>

      {/* ── Patient search ─────────────────────────────────────────────────── */}
      <SectionCard icon={Search} title="Find Patient Record">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-2.5 h-3.5 w-3.5 text-[#94A3B8]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Patient ID, Name, Mobile, or Aadhaar..."
              className="w-full pl-9 pr-4 py-2.5 bg-[#F8FAFC] dark:bg-slate-950 border border-[#E5E7EB] dark:border-slate-800 text-xs font-semibold rounded-xl focus:ring-2 focus:ring-[#50ABE7]/20 focus:border-[#50ABE7] focus:outline-none transition dark:text-slate-50 placeholder:text-[#94A3B8]"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="py-2.5 px-5 bg-[#50ABE7] hover:bg-[#3ea0df] text-white font-bold text-xs rounded-xl shadow-md shadow-[#50ABE7]/20 cursor-pointer active:scale-98 transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "Searching..." : "Search"}
          </button>
        </form>

        {/* Search results */}
        {patients.length > 0 && (
          <div className="border border-[#E5E7EB] dark:border-slate-800 rounded-2xl overflow-hidden divide-y divide-[#E5E7EB] dark:divide-slate-800">
            {patients.map((pat, idx) => (
              <div key={idx} className="p-3.5 flex items-center justify-between gap-4 hover:bg-[#F8FAFC] dark:hover:bg-slate-900 transition">
                <div className="flex items-center gap-3">
                  <Avatar name={`${pat.first_name} ${pat.last_name}`} size="sm" />
                  <div>
                    <p className="font-bold text-xs text-[#1E293B] dark:text-slate-100">
                      {pat.first_name} {pat.last_name}
                    </p>
                    <p className="text-[10px] text-[#94A3B8] font-semibold mt-0.5 uppercase tracking-wide">
                      Code: {pat.patient_code} · Aadhaar Last 4: {pat.aadhaar_last4}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => { setSelectedPatient(pat); setPatients([]); }}
                  className="py-1.5 px-4 bg-[#EDF7FF] hover:bg-[#D0EEFF] dark:bg-slate-800 dark:hover:bg-slate-700 text-[#50ABE7] font-bold text-xs rounded-lg transition cursor-pointer"
                >
                  Select
                </button>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* ── Triage form (shown when a patient is selected) ─────────────────── */}
      {selectedPatient && (
        <form onSubmit={handleSubmit(onEncounterSubmit)} className="space-y-6">

          {/* Selected patient banner */}
          <Card className="p-4 border-l-4 border-l-[#50ABE7]">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Avatar name={`${selectedPatient.first_name} ${selectedPatient.last_name}`} size="md" />
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-sm text-[#1E293B] dark:text-slate-100">
                      {selectedPatient.first_name} {selectedPatient.last_name}
                    </p>
                    <Badge color="blue">Triage Active</Badge>
                  </div>
                  <p className="text-[10px] text-[#94A3B8] font-semibold mt-0.5">
                    Blood Group: {selectedPatient.blood_group || "—"} · Gender: {selectedPatient.gender || "—"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPatient(null)}
                className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#EF4444] hover:bg-[#FEF2F2] transition cursor-pointer"
                title="Clear selection"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </Card>

          {/* Vital Signs section */}
          <SectionCard icon={Activity} title="Patient Vital Signs (All Fields Optional)">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <VitalField label="Height (cm)"         name="height"           placeholder="175"      type="number" step="0.1"  register={register} />
              <VitalField label="Weight (kg)"         name="weight"           placeholder="70"       type="number" step="0.1"  register={register} />
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] dark:text-slate-400 block">
                  BMI (Auto)
                </label>
                <input
                  disabled
                  type="text"
                  placeholder="—"
                  className="w-full px-3.5 py-2.5 bg-[#F1F5F9] dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 text-xs font-bold rounded-xl text-[#64748B] dark:text-slate-400 cursor-not-allowed"
                  {...register("bmi")}
                />
              </div>
              <VitalField label="Temperature (°C)"   name="temperature"      placeholder="36.8"     type="number" step="0.1"  register={register} />
              <VitalField label="Blood Pressure"      name="blood_pressure"   placeholder="120/80"                             register={register} />
              <VitalField label="Pulse Rate (bpm)"    name="pulse_rate"       placeholder="72"       type="number"             register={register} />
              <VitalField label="Resp Rate (rpm)"     name="respiratory_rate" placeholder="16"       type="number"             register={register} />
              <VitalField label="SpO₂ Saturation"     name="spo2"             placeholder="98"       type="number"             register={register} />
            </div>
          </SectionCard>

          {/* Clinical Details section */}
          <SectionCard icon={Stethoscope} title="Clinical Details & Assignment">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Left column */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] dark:text-slate-400 block">
                    Chief Complaint
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Primary reason for patient visit..."
                    className={inputCls + " resize-none"}
                    {...register("chief_complaint")}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] dark:text-slate-400 block">
                    Symptoms Description
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Cough for 3 days, mild fever"
                    className={inputCls}
                    {...register("symptoms")}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] dark:text-slate-400 block">
                    Clinical Notes
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Additional clinical observations..."
                    className={inputCls + " resize-none"}
                    {...register("clinical_notes")}
                  />
                </div>
              </div>

              {/* Right column */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] dark:text-slate-400 block">
                    Assign to Doctor
                  </label>
                  <select className={inputCls} {...register("doctor_id")}>
                    <option value="">Select Target Doctor</option>
                    {doctors.map((d, idx) => (
                      <option key={idx} value={d.id}>
                        Dr. {d.first_name} {d.last_name} ({d.specialization})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] dark:text-slate-400 block">
                    Lab Investigations (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Glucose: 110 mg/dL, CBC: normal"
                    className={inputCls}
                    {...register("blood_sugar")}
                  />
                </div>
              </div>
            </div>
          </SectionCard>

          {/* Action buttons */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => { setSelectedPatient(null); reset(); }}
              className="py-2.5 px-5 bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 text-[#64748B] font-bold text-xs rounded-xl hover:bg-[#F1F5F9] transition cursor-pointer"
            >
              Reset Form
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 py-2.5 px-6 bg-[#50ABE7] hover:bg-[#3ea0df] text-white font-bold text-xs rounded-xl shadow-md shadow-[#50ABE7]/20 cursor-pointer active:scale-98 transition"
            >
              <CheckCircle className="h-4 w-4" />
              Save Triage Data
            </button>
          </div>

        </form>
      )}

    </div>
  );
}
