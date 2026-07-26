import React, { useState, useEffect } from "react";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useForm, useFieldArray } from "react-hook-form";
import { 
  ClipboardList, Activity, ArrowRight, RefreshCcw, Stethoscope,
  CheckCircle, Plus, Trash2 
} from "lucide-react";

export default function DoctorDashboard() {
  const { showToast } = useAuth();
  const [stats, setStats] = useState({ total_today: 0, pending_count: 0, completed_count: 0 });
  const [encounters, setEncounters] = useState([]);
  const [selectedEncounter, setSelectedEncounter] = useState(null);
  const [loading, setLoading] = useState(true);

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
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-xs font-semibold text-slate-400">Loading Doctor Dashboard...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Physician Workstation</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">View triaged patient queue, log diagnosis, and compile prescriptions</p>
        </div>
        <button 
          onClick={fetchDoctorDashboard}
          className="flex items-center gap-1.5 py-2 px-3.5 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 font-semibold text-xs rounded-xl cursor-pointer shadow-sm transition active:scale-98"
        >
          <RefreshCcw className="h-3.5 w-3.5" />
          Refresh Queue
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-850 p-5 rounded-2xl flex items-center gap-4 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-slate-800/80 text-blue-600 dark:text-blue-450 flex items-center justify-center shrink-0">
            <ClipboardList className="h-5 w-5" />
          </div>
          <div>
            <span className="text-slate-400 font-semibold text-3xs uppercase tracking-wider block">Today's Patients</span>
            <strong className="text-lg font-extrabold">{stats.total_today}</strong>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-855 p-5 rounded-2xl flex items-center gap-4 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-slate-800/80 text-amber-600 dark:text-amber-450 flex items-center justify-center shrink-0">
            <Activity className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <span className="text-slate-400 font-semibold text-3xs uppercase tracking-wider block">Waiting Queue</span>
            <strong className="text-lg font-extrabold text-amber-600 dark:text-amber-450">{stats.pending_count}</strong>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-855 p-5 rounded-2xl flex items-center gap-4 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-slate-800/80 text-emerald-600 dark:text-emerald-450 flex items-center justify-center shrink-0">
            <CheckCircle className="h-5 w-5" />
          </div>
          <div>
            <span className="text-slate-400 font-semibold text-3xs uppercase tracking-wider block">Completed</span>
            <strong className="text-lg font-extrabold text-emerald-600 dark:text-emerald-450">{stats.completed_count}</strong>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        
        <div className="md:col-span-1 space-y-4">
          <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">Active Triage Queue</h3>
          <div className="space-y-3">
            {encounters.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-850 p-6 rounded-2xl text-center text-slate-400 text-xs font-bold leading-relaxed">
                No patient triages assigned to your queue today.
              </div>
            ) : (
              encounters.map((enc, idx) => {
                const isSelected = selectedEncounter?.id === enc.id;
                return (
                  <div 
                    key={idx} 
                    onClick={() => setSelectedEncounter(enc)}
                    className={`p-4 border rounded-2xl cursor-pointer transition select-none flex flex-col gap-3 shadow-sm hover:shadow hover:-translate-y-0.5 ${
                      isSelected 
                        ? "bg-blue-50/20 border-blue-500 dark:bg-slate-800/40" 
                        : "bg-white dark:bg-slate-900 border-slate-150 dark:border-slate-850 hover:border-blue-200"
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                          P
                        </div>
                        <div className="text-xs font-semibold">
                          <h4 className="font-bold text-slate-855 dark:text-slate-50">Patient Visit</h4>
                          <p className="text-3xs text-slate-400 font-bold uppercase">Status: {enc.status}</p>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-slate-400 shrink-0" />
                    </div>
                    
                    {enc.chief_complaint && (
                      <div className="bg-slate-50 dark:bg-slate-955 p-2.5 rounded-xl text-3xs font-semibold text-slate-550 leading-relaxed">
                        Complaint: {enc.chief_complaint}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="md:col-span-2">
          {selectedEncounter ? (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              
              <section className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-850 p-6 rounded-3xl shadow-sm space-y-4">
                <h3 className="font-bold text-xs text-slate-800 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500 inline-block"></span>
                  Pre-Consultation Data (Entered by Support Staff)
                </h3>

                {/* Vitals Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  {[
                    { label: "Blood Pressure", value: selectedEncounter.blood_pressure, unit: "" },
                    { label: "Pulse Rate", value: selectedEncounter.pulse_rate, unit: "bpm" },
                    { label: "Temperature", value: selectedEncounter.temperature, unit: "°C" },
                    { label: "SpO₂", value: selectedEncounter.spo2, unit: "%" },
                    { label: "Height", value: selectedEncounter.height, unit: "cm" },
                    { label: "Weight", value: selectedEncounter.weight, unit: "kg" },
                    { label: "BMI", value: selectedEncounter.bmi, unit: "" },
                    { label: "Resp Rate", value: selectedEncounter.respiratory_rate, unit: "rpm" },
                  ].map(({ label, value, unit }) => (
                    <div key={label} className="bg-slate-50 dark:bg-slate-955 p-2.5 rounded-xl">
                      <span className="block text-slate-400 font-semibold text-3xs mb-0.5">{label}</span>
                      <strong className="font-bold text-slate-800 dark:text-slate-100">
                        {value != null && value !== "" ? `${value}${unit ? " " + unit : ""}` : "—"}
                      </strong>
                    </div>
                  ))}
                </div>

                {/* Complaints & Symptoms */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {selectedEncounter.chief_complaint && (
                    <div className="p-3.5 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-xl">
                      <span className="font-bold text-amber-600 dark:text-amber-400 block mb-1 text-3xs uppercase tracking-wider">Chief Complaint</span>
                      <p className="font-medium text-slate-700 dark:text-slate-300 leading-relaxed">{selectedEncounter.chief_complaint}</p>
                    </div>
                  )}
                  {selectedEncounter.symptoms && (
                    <div className="p-3.5 bg-slate-50 dark:bg-slate-955 border border-slate-100 dark:border-slate-800 rounded-xl">
                      <span className="font-bold text-slate-500 dark:text-slate-400 block mb-1 text-3xs uppercase tracking-wider">Symptoms</span>
                      <p className="font-medium text-slate-700 dark:text-slate-300 leading-relaxed">{selectedEncounter.symptoms}</p>
                    </div>
                  )}
                </div>

                {/* Lab Results */}
                {(selectedEncounter.blood_group || selectedEncounter.blood_sugar || selectedEncounter.cbc || selectedEncounter.urine_test || selectedEncounter.ecg || selectedEncounter.other_labs) && (
                  <div className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden">
                    <div className="bg-slate-50 dark:bg-slate-955 px-3 py-2 text-3xs font-extrabold text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">Lab Results</div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-px bg-slate-100 dark:bg-slate-800">
                      {[
                        { label: "Blood Group", value: selectedEncounter.blood_group },
                        { label: "Blood Sugar", value: selectedEncounter.blood_sugar },
                        { label: "CBC", value: selectedEncounter.cbc },
                        { label: "Urine Test", value: selectedEncounter.urine_test },
                        { label: "ECG", value: selectedEncounter.ecg },
                        { label: "Other Labs", value: selectedEncounter.other_labs },
                      ].filter(r => r.value).map(({ label, value }) => (
                        <div key={label} className="bg-white dark:bg-slate-900 p-2.5 text-xs">
                          <span className="text-slate-400 font-semibold text-3xs block">{label}</span>
                          <strong className="text-slate-700 dark:text-slate-200 font-medium">{value}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Clinical notes from staff */}
                {selectedEncounter.clinical_notes && (
                  <div className="p-3.5 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-xl text-xs">
                    <span className="font-bold text-blue-600 dark:text-blue-400 block mb-1 text-3xs uppercase tracking-wider">Staff Clinical Notes</span>
                    <p className="font-medium text-slate-700 dark:text-slate-300 leading-relaxed">{selectedEncounter.clinical_notes}</p>
                  </div>
                )}
              </section>


              <section className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-850 p-6 rounded-3xl shadow-sm space-y-4">
                <h3 className="font-bold text-xs text-slate-800 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-2">
                  Diagnosis & Clinical Findings
                </h3>
                <div className="space-y-4 text-xs font-semibold">
                  <div className="space-y-1">
                    <label>Diagnosis / Chief Impression</label>
                    <input required type="text" placeholder="e.g. Acute Bronchitis" className="w-full border p-2.5 bg-slate-50 dark:bg-slate-955 dark:border-slate-800 rounded-lg dark:text-slate-50" {...register("diagnosis")} />
                  </div>
                  <div className="space-y-1">
                    <label>Physician Clinical Notes</label>
                    <textarea rows={3} placeholder="Describe symptoms, patient history, and recommendations..." className="w-full border p-2.5 bg-slate-50 dark:bg-slate-955 dark:border-slate-800 rounded-lg dark:text-slate-50" {...register("notes")} />
                  </div>
                </div>
              </section>

              <section className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-850 p-6 rounded-3xl shadow-sm space-y-4">
                <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2">
                  <h3 className="font-bold text-xs text-slate-800 dark:text-slate-100">
                    Prescribed Medications
                  </h3>
                  <button 
                    type="button" 
                    onClick={() => append({ medicine_name: "", strength: "", frequency: "", duration: "", instructions: "" })}
                    className="flex items-center gap-1 py-1.5 px-3 bg-blue-50 hover:bg-blue-100 dark:bg-slate-800 dark:hover:bg-slate-750 text-blue-650 dark:text-blue-400 font-bold text-2xs rounded-lg transition cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Row
                  </button>
                </div>

                <div className="space-y-3">
                  {fields.map((item, index) => (
                    <div key={item.id} className="grid grid-cols-5 gap-3 items-end text-xs font-semibold">
                      <div className="col-span-2 space-y-1">
                        <label className="text-3xs block text-slate-400 uppercase">Medicine Name</label>
                        <input required placeholder="e.g. Paracetamol" className="w-full border p-2 bg-slate-50 dark:bg-slate-955 dark:border-slate-800 rounded-lg dark:text-slate-50" {...register(`medicines.${index}.medicine_name`)} />
                      </div>
                      <div className="col-span-1 space-y-1">
                        <label className="text-3xs block text-slate-400 uppercase">Strength</label>
                        <input placeholder="e.g. 500mg" className="w-full border p-2 bg-slate-50 dark:bg-slate-955 dark:border-slate-800 rounded-lg dark:text-slate-50" {...register(`medicines.${index}.strength`)} />
                      </div>
                      <div className="col-span-1 space-y-1">
                        <label className="text-3xs block text-slate-400 uppercase">Frequency</label>
                        <input placeholder="e.g. 1-0-1" className="w-full border p-2 bg-slate-50 dark:bg-slate-955 dark:border-slate-800 rounded-lg dark:text-slate-50" {...register(`medicines.${index}.frequency`)} />
                      </div>
                      <div className="col-span-1 flex items-center gap-2">
                        <div className="flex-1 space-y-1">
                          <label className="text-3xs block text-slate-400 uppercase">Duration</label>
                          <input placeholder="e.g. 5 days" className="w-full border p-2 bg-slate-50 dark:bg-slate-955 dark:border-slate-800 rounded-lg dark:text-slate-50" {...register(`medicines.${index}.duration`)} />
                        </div>
                        {fields.length > 1 && (
                          <button 
                            type="button" 
                            onClick={() => remove(index)}
                            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-855 text-red-500 rounded-lg shrink-0 cursor-pointer self-end mb-0.5"
                          >
                            <Trash2 className="h-4.5 w-4.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <div className="flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setSelectedEncounter(null)}
                  className="py-2.5 px-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-550 font-bold text-xs rounded-xl hover:bg-slate-50 transition cursor-pointer shadow-sm"
                >
                  Back to Queue
                </button>
                <button 
                  type="submit" 
                  className="py-2.5 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-500/10 cursor-pointer active:scale-98 transition"
                >
                  Complete & Sign Consultation
                </button>
              </div>

            </form>
          ) : (
            <div className="bg-slate-100/50 dark:bg-slate-955 border border-dashed border-slate-200 dark:border-slate-800 p-12 rounded-3xl text-center space-y-3.5 select-none min-h-[40vh] flex flex-col justify-center items-center">
              <Stethoscope className="h-10 w-10 text-slate-350" />
              <div className="text-xs font-semibold text-slate-455">
                Select a patient from the queue to start diagnosing
              </div>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
