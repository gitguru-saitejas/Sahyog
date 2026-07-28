import React, { useState, useEffect } from "react";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useForm, useFieldArray } from "react-hook-form";
import { 
  ClipboardList, Activity, ArrowRight, RefreshCcw, Stethoscope,
  CheckCircle, Plus, Trash2, ArrowLeft, Search, Mic, FileText, Brain, ChevronRight, Clock, HeartPulse
} from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Avatar } from "../../components/ui/Avatar";
import { PatientCard } from "../../components/ui/PatientCard";

const calculateAge = (dobString) => {
  if (!dobString) return 0;
  const dob = new Date(dobString);
  const diffMs = Date.now() - dob.getTime();
  const ageDate = new Date(diffMs);
  return Math.abs(ageDate.getUTCFullYear() - 1970);
};

export default function DoctorDashboard() {
  const { employee, showToast, employeeLogout, theme } = useAuth();
  const [stats, setStats] = useState({ total_today: 0, pending_count: 0, completed_count: 0 });
  const [encounters, setEncounters] = useState([]);
  const [selectedEncounter, setSelectedEncounter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const { register, control, handleSubmit, reset } = useForm({
    defaultValues: {
      diagnosis: "",
      notes: "",
      medicines: [
        { medicine_name: "", strength: "", frequency: "", duration: "", instructions: "" }
      ]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "medicines"
  });

  const fetchDoctorDashboard = async () => {
    try {
      const res = await api.get("/patients/hospital/doctor/dashboard");
      setStats({
        total_today: res.data.total_today,
        pending_count: res.data.pending_count,
        completed_count: res.data.completed_count
      });
      setEncounters(res.data.encounters || []);
    } catch (err) {
      console.error(err);
      showToast("error", "Failed to retrieve doctor dashboard stats.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctorDashboard();
  }, []);

  const onSubmit = async (data) => {
    if (!selectedEncounter) return;
    try {
      const payload = {
        encounter_id: selectedEncounter.id,
        patient_id: selectedEncounter.patient_id,
        diagnosis: data.diagnosis,
        notes: data.notes,
        medicines: data.medicines.filter((m) => m.medicine_name.trim() !== "")
      };

      await api.post(`/patients/hospital/doctor/encounters/${selectedEncounter.id}/complete`, payload);
      showToast("success", "Consultation completed and prescription saved successfully!");
      setSelectedEncounter(null);
      reset({
        diagnosis: "",
        notes: "",
        medicines: [{ medicine_name: "", strength: "", frequency: "", duration: "", instructions: "" }]
      });
      fetchDoctorDashboard();
    } catch (err) {
      showToast("error", "Error saving consultation details.");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
        <div className="w-8 h-8 border-4 border-[#50ABE7] border-t-transparent rounded-full animate-spin"></div>
        <span className="text-xs font-semibold text-slate-400">Loading Doctor Dashboard...</span>
      </div>
    );
  }

  const doctorName = employee ? `Dr. ${employee.first_name} ${employee.last_name}` : "Doctor Workstation";
  const doctorSpecialization = employee?.specialization || "General Medicine";

  // Filter encounters by search query
  const filteredEncounters = encounters.filter(enc => {
    const query = search.toLowerCase();
    if (!query) return true;
    const name = enc.patient ? `${enc.patient.first_name} ${enc.patient.last_name}`.toLowerCase() : "";
    const code = enc.patient?.patient_code?.toLowerCase() || "";
    return name.includes(query) || code.includes(query);
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans -m-6">
      
      {/* Top Header */}
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-[#E5E7EB] dark:border-slate-800 px-6 py-4 flex items-center gap-4 sticky top-0 z-20">
        <div>
          <h1 className="font-bold text-lg text-[#1E293B] dark:text-white">{doctorName}</h1>
          <p className="text-xs text-[#64748B] dark:text-slate-400">
            {doctorSpecialization} · Today: {stats.total_today} patients ({stats.pending_count} pending)
          </p>
        </div>
        
        <div className="ml-auto flex items-center gap-3">
          <button 
            onClick={fetchDoctorDashboard}
            className="flex items-center gap-1.5 py-2 px-3 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-[#E5E7EB] dark:border-slate-700 font-semibold text-xs rounded-xl cursor-pointer shadow-sm transition active:scale-98 text-[#64748B] dark:text-slate-400"
            title="Refresh Triage Queue"
          >
            <RefreshCcw className="h-3.5 w-3.5" />
            Refresh Queue
          </button>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search patient..."
              className="pl-9 pr-4 py-2 rounded-xl border border-[#E5E7EB] dark:border-slate-700 text-sm outline-none w-48 focus:border-[#50ABE7] bg-white dark:bg-slate-800 text-[#1E293B] dark:text-white"
            />
          </div>
          <Avatar name={doctorName} size="md" />
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        
        {/* Left column: Triage Patient list */}
        <div className="w-72 bg-white dark:bg-slate-900 border-r border-[#E5E7EB] dark:border-slate-800 overflow-y-auto flex-shrink-0">
          <div className="p-4 border-b border-[#F1F5F9] dark:border-slate-800 flex items-center justify-between">
            <p className="text-xs font-bold text-[#64748B] uppercase tracking-wide">Queue Today</p>
            <Badge color="blue">{filteredEncounters.length} patients</Badge>
          </div>
          <div className="divide-y divide-[#F8FAFC] dark:divide-slate-800/50">
            {filteredEncounters.length === 0 ? (
              <p className="text-slate-400 text-center py-8 text-xs font-semibold">No patients in queue.</p>
            ) : (
              filteredEncounters.map((enc, i) => {
                const pat = enc.patient;
                const token = pat?.patient_code || enc.id.substring(0, 5).toUpperCase();
                const name = pat ? `${pat.first_name} ${pat.last_name}` : "Patient Visit";
                const age = pat ? calculateAge(pat.date_of_birth) : undefined;
                const gender = pat?.gender?.[0] || undefined;
                const time = new Date(enc.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                
                return (
                  <PatientCard
                    key={i}
                    token={token}
                    name={name}
                    age={age}
                    gender={gender}
                    time={time}
                    status={enc.status === "PENDING" ? "waiting" : "completed"}
                    issue={enc.chief_complaint}
                    active={selectedEncounter?.id === enc.id}
                    onClick={() => setSelectedEncounter(enc)}
                  />
                );
              })
            )}
          </div>
        </div>

        {/* Right column: Patient detail Workstation */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {selectedEncounter ? (
            <div className="space-y-6">
              
              {/* Patient header info */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <Avatar name={selectedEncounter.patient ? `${selectedEncounter.patient.first_name} ${selectedEncounter.patient.last_name}` : "Patient"} size="lg" />
                  <div>
                    <h2 className="text-xl font-bold text-[#1E293B] dark:text-white">
                      {selectedEncounter.patient ? `${selectedEncounter.patient.first_name} ${selectedEncounter.patient.last_name}` : "Patient"}
                    </h2>
                    <p className="text-sm text-[#64748B] dark:text-slate-400">
                      {selectedEncounter.patient ? `${calculateAge(selectedEncounter.patient.date_of_birth)}${selectedEncounter.patient.gender?.[0]}` : ""} · {selectedEncounter.patient?.patient_code || selectedEncounter.id.substring(0, 8)}
                    </p>
                    {selectedEncounter.chief_complaint && (
                      <p className="text-sm text-[#1E293B] dark:text-slate-350 mt-1 font-semibold">Complaint: {selectedEncounter.chief_complaint}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Patient vitals */}
              <Card className="p-5">
                <p className="font-bold text-[#1E293B] dark:text-slate-200 mb-4">Current Vitals</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: "Blood Pressure", value: selectedEncounter.blood_pressure, color: "#EF4444", status: selectedEncounter.blood_pressure ? "Logged" : "—" },
                    { label: "Pulse Rate", value: selectedEncounter.pulse_rate ? `${selectedEncounter.pulse_rate} bpm` : undefined, color: "#10B981", status: selectedEncounter.pulse_rate ? "Normal" : "—" },
                    { label: "Temperature", value: selectedEncounter.temperature ? `${selectedEncounter.temperature} °C` : undefined, color: "#F59E0B", status: selectedEncounter.temperature ? "Normal" : "—" },
                    { label: "SpO₂", value: selectedEncounter.spo2 ? `${selectedEncounter.spo2}%` : undefined, color: "#50ABE7", status: selectedEncounter.spo2 ? "Normal" : "—" },
                    { label: "Height", value: selectedEncounter.height ? `${selectedEncounter.height} cm` : undefined, color: "#64748B", status: selectedEncounter.height ? "Normal" : "—" },
                    { label: "Weight", value: selectedEncounter.weight ? `${selectedEncounter.weight} kg` : undefined, color: "#64748B", status: selectedEncounter.weight ? "Normal" : "—" },
                    { label: "BMI", value: selectedEncounter.bmi, color: "#7C3AED", status: selectedEncounter.bmi ? "Logged" : "—" },
                    { label: "Resp Rate", value: selectedEncounter.respiratory_rate ? `${selectedEncounter.respiratory_rate} rpm` : undefined, color: "#64748B", status: selectedEncounter.respiratory_rate ? "Normal" : "—" },
                  ].map(v => (
                    <div key={v.label} className="text-center p-3 bg-[#F8FAFC] dark:bg-slate-900/60 rounded-xl border border-[#E5E7EB] dark:border-slate-800">
                      <p className="text-lg font-bold" style={{ color: v.value ? v.color : '#94A3B8' }}>
                        {v.value || "—"}
                      </p>
                      <p className="text-xs text-[#64748B] dark:text-slate-400 mt-1">{v.label}</p>
                      {v.value && (
                        <Badge color={v.status === 'Normal' ? 'green' : v.status === '—' ? 'gray' : 'blue'} className="mt-1">
                          {v.status}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </Card>

              {/* Lab Results */}
              {(selectedEncounter.blood_group || selectedEncounter.blood_sugar || selectedEncounter.cbc || selectedEncounter.urine_test || selectedEncounter.ecg || selectedEncounter.other_labs) && (
                <Card className="p-5">
                  <p className="font-bold text-[#1E293B] dark:text-slate-200 mb-3">Lab Results</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {[
                      { label: "Blood Group", value: selectedEncounter.blood_group },
                      { label: "Blood Sugar", value: selectedEncounter.blood_sugar },
                      { label: "CBC", value: selectedEncounter.cbc },
                      { label: "Urine Test", value: selectedEncounter.urine_test },
                      { label: "ECG", value: selectedEncounter.ecg },
                      { label: "Other Labs", value: selectedEncounter.other_labs },
                    ].filter(r => r.value).map(r => (
                      <div key={r.label} className="p-3 bg-[#F8FAFC] dark:bg-slate-900/60 border border-[#E5E7EB] dark:border-slate-800 rounded-xl">
                        <span className="text-[10px] font-bold text-[#64748B] uppercase block">{r.label}</span>
                        <strong className="text-sm font-semibold text-[#1E293B] dark:text-slate-200">{r.value}</strong>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* AI suggestions */}
              <Card className="p-5 bg-[#EDF7FF] dark:bg-slate-900/40 border-[#50ABE7]/20">
                <div className="flex items-center gap-2 mb-3">
                  <Brain className="w-5 h-5 text-[#50ABE7]" />
                  <p className="font-bold text-[#1E293B] dark:text-slate-200">AI Clinical Insights</p>
                  <Badge color="blue">2 insights</Badge>
                </div>
                <div className="space-y-2">
                  <div className="flex items-start gap-2 bg-white dark:bg-slate-900 rounded-xl p-3 border border-[#EDF7FF] dark:border-slate-800">
                    <div className="w-1.5 h-1.5 rounded-full mt-1.5 bg-[#EF4444] flex-shrink-0 animate-pulse" />
                    <p className="text-sm text-[#1E293B] dark:text-slate-300">
                      Chief complaint relates to respiratory issues — check pulse oximeter readings and verify with stethoscope.
                    </p>
                  </div>
                  <div className="flex items-start gap-2 bg-white dark:bg-slate-900 rounded-xl p-3 border border-[#EDF7FF] dark:border-slate-800">
                    <div className="w-1.5 h-1.5 rounded-full mt-1.5 bg-[#F59E0B] flex-shrink-0" />
                    <p className="text-sm text-[#1E293B] dark:text-slate-300">
                      Confirm prescription dosage duration matches patient's historical tolerance checks.
                    </p>
                  </div>
                </div>
              </Card>

              {/* Form prescription section */}
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                
                {/* Findings Card */}
                <Card className="p-5 space-y-4">
                  <p className="font-bold text-[#1E293B] dark:text-slate-200 border-b border-[#E5E7EB] dark:border-slate-800 pb-2">
                    Diagnosis & Findings
                  </p>
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-[#64748B] uppercase">Diagnosis / Impression</label>
                      <input 
                        required 
                        type="text" 
                        placeholder="e.g. Viral Fever" 
                        className="w-full rounded-xl border border-[#E5E7EB] dark:border-slate-800 bg-[#F8FAFC] dark:bg-slate-900 px-4 py-3 text-sm text-[#1E293B] dark:text-white outline-none focus:border-[#50ABE7]"
                        {...register("diagnosis")} 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-[#64748B] uppercase">Clinical Notes</label>
                      <textarea 
                        rows={3} 
                        placeholder="Describe observations, patient history, and recommendations..." 
                        className="w-full rounded-xl border border-[#E5E7EB] dark:border-slate-800 bg-[#F8FAFC] dark:bg-slate-900 px-4 py-3 text-sm text-[#1E293B] dark:text-white outline-none focus:border-[#50ABE7] resize-none"
                        {...register("notes")} 
                      />
                    </div>
                  </div>
                </Card>

                {/* Prescribed Medications Card */}
                <Card className="p-5 space-y-4">
                  <div className="flex justify-between items-center border-b border-[#E5E7EB] dark:border-slate-800 pb-2">
                    <p className="font-bold text-[#1E293B] dark:text-slate-200">Prescribed Medications</p>
                    <button
                      type="button"
                      onClick={() => append({ medicine_name: "", strength: "", frequency: "", duration: "", instructions: "" })}
                      className="flex items-center gap-1 py-1.5 px-3 bg-[#EDF7FF] hover:bg-[#D8EFFE] text-[#50ABE7] font-bold text-xs rounded-xl transition cursor-pointer border-0"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add Medicine
                    </button>
                  </div>

                  <div className="space-y-3">
                    {fields.map((item, index) => (
                      <div key={item.id} className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-end p-3 bg-[#F8FAFC] dark:bg-slate-900/60 border border-[#E5E7EB] dark:border-slate-800 rounded-xl">
                        <div className="sm:col-span-2 space-y-1">
                          <label className="text-[10px] font-bold text-[#64748B] uppercase block">Medicine Name</label>
                          <input 
                            required 
                            placeholder="e.g. Paracetamol" 
                            className="w-full border border-[#E5E7EB] dark:border-slate-800 bg-white dark:bg-slate-900 rounded-lg p-2 text-xs text-[#1E293B] dark:text-white outline-none focus:border-[#50ABE7]" 
                            {...register(`medicines.${index}.medicine_name`)} 
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-[#64748B] uppercase block">Strength</label>
                          <input 
                            placeholder="e.g. 500mg" 
                            className="w-full border border-[#E5E7EB] dark:border-slate-800 bg-white dark:bg-slate-900 rounded-lg p-2 text-xs text-[#1E293B] dark:text-white outline-none focus:border-[#50ABE7]" 
                            {...register(`medicines.${index}.strength`)} 
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-[#64748B] uppercase block">Frequency</label>
                          <input 
                            placeholder="e.g. 1-0-1" 
                            className="w-full border border-[#E5E7EB] dark:border-slate-800 bg-white dark:bg-slate-900 rounded-lg p-2 text-xs text-[#1E293B] dark:text-white outline-none focus:border-[#50ABE7]" 
                            {...register(`medicines.${index}.frequency`)} 
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 space-y-1">
                            <label className="text-[10px] font-bold text-[#64748B] uppercase block">Duration</label>
                            <input 
                              placeholder="e.g. 5 days" 
                              className="w-full border border-[#E5E7EB] dark:border-slate-800 bg-white dark:bg-slate-900 rounded-lg p-2 text-xs text-[#1E293B] dark:text-white outline-none focus:border-[#50ABE7]" 
                              {...register(`medicines.${index}.duration`)} 
                            />
                          </div>
                          {fields.length > 1 && (
                            <button
                              type="button"
                              onClick={() => remove(index)}
                              className="p-2 bg-white hover:bg-red-50 text-red-500 rounded-lg border border-[#E5E7EB] dark:border-slate-800 hover:border-red-200 transition cursor-pointer self-end mb-0.5"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Submissions buttons */}
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedEncounter(null)}
                    className="py-2.5 px-5 bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-700 text-[#64748B] font-bold text-xs rounded-xl hover:bg-slate-50 transition cursor-pointer shadow-sm"
                  >
                    Back to Queue
                  </button>
                  <button
                    type="submit"
                    className="py-2.5 px-6 bg-[#10B981] hover:bg-[#059669] text-white font-bold text-xs rounded-xl shadow-md shadow-[#10B981]/10 cursor-pointer active:scale-98 transition"
                  >
                    Complete & Sign Consultation
                  </button>
                </div>

              </form>

            </div>
          ) : (
            <div className="bg-slate-100/50 dark:bg-slate-950/20 border-2 border-dashed border-[#E5E7EB] dark:border-slate-800 p-12 rounded-3xl text-center space-y-4 select-none min-h-[50vh] flex flex-col justify-center items-center">
              <div className="w-16 h-16 rounded-full bg-[#EDF7FF] flex items-center justify-center text-[#50ABE7]">
                <Stethoscope className="h-8 w-8" />
              </div>
              <div className="text-sm font-semibold text-[#64748B]">
                Select a patient from the queue to start diagnosing
              </div>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
