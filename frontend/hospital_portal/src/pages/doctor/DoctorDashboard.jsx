import React, { useState, useEffect } from "react";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useForm, useFieldArray } from "react-hook-form";
import { 
  ClipboardList, Activity, ArrowRight, RefreshCcw, Stethoscope,
  CheckCircle, Plus, Trash2, UserCheck, Clock, CheckCircle2,
  Calendar, ShieldAlert, HeartPulse, User, Building2, Eye
} from "lucide-react";

// Import existing patient components to preserve exact UI, prompts and caching logic
import PatientHeader from "../../components/doctor/PatientHeader";
import TimelineList from "../../components/doctor/TimelineList";
import EventDetailCard from "../../components/doctor/EventDetailCard";
import SummarizePanel from "../../components/summarize/SummarizePanel";

export default function DoctorDashboard() {
  const { showToast } = useAuth();
  
  // Dashboard overall stats
  const [stats, setStats] = useState({ total_today: 0, pending_count: 0, completed_count: 0 });
  const [encounters, setEncounters] = useState([]);
  const [selectedEncounter, setSelectedEncounter] = useState(null);
  
  // Patient details state (eager loaded when clicked)
  const [header, setHeader] = useState(null);
  const [timelineData, setTimelineData] = useState(null);
  const [selectedTimelineEncounter, setSelectedTimelineEncounter] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  
  const [loading, setLoading] = useState(true);
  const [loadingPatient, setLoadingPatient] = useState(false);
  const [completing, setCompleting] = useState(false);

  // Active Workspace Tab (Consultation vs Timeline)
  const [activeTab, setActiveTab] = useState("consultation"); // "consultation" or "timeline"

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

  // Pull dashboard data
  const fetchDoctorDashboard = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await api.get("/patients/hospital/doctor/dashboard");
      setStats({
        total_today: res.data.total_today,
        pending_count: res.data.pending_count,
        completed_count: res.data.completed_count
      });
      
      const queueList = res.data.encounters || [];
      setEncounters(queueList);

      // Keep active selection in sync if it exists in updated queue list
      if (selectedEncounter) {
        const updated = queueList.find(e => e.id === selectedEncounter.id);
        if (updated) {
          setSelectedEncounter(updated);
        }
      }
    } catch (err) {
      console.error(err);
      if (!silent) showToast("error", "Failed to retrieve doctor dashboard queue.");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // Poll queue changes every 10 seconds dynamically
  useEffect(() => {
    fetchDoctorDashboard(false);
    const pollInterval = setInterval(() => {
      fetchDoctorDashboard(true);
    }, 10000);
    return () => clearInterval(pollInterval);
  }, []);

  // Reload selected patient timeline when timeline filters change
  useEffect(() => {
    if (selectedEncounter && selectedEncounter.patient) {
      const reloadTimeline = async () => {
        try {
          const timelineRes = await api.get(`/patients/timeline/${selectedEncounter.patient_id}`, {
            params: {
              category: selectedCategory,
              search_query: searchQuery
            }
          });
          setTimelineData(timelineRes.data);
          if (timelineRes.data.encounters && timelineRes.data.encounters.length > 0) {
            setSelectedTimelineEncounter(timelineRes.data.encounters[0]);
          }
        } catch (err) {
          console.error("[TIMELINE ERROR]", err);
        }
      };
      reloadTimeline();
    }
  }, [selectedCategory, searchQuery]);

  // Load detailed patient profile and timeline
  const handleSelectEncounter = async (enc) => {
    setSelectedEncounter(enc);
    setActiveTab("consultation");
    
    if (enc.patient) {
      setLoadingPatient(true);
      setHeader(null);
      setTimelineData(null);
      setSelectedTimelineEncounter(null);

      try {
        // 1. Fetch Header Details using patient_code
        const headerRes = await api.get(`/patients/timeline/code/${enc.patient.patient_code}/full-profile`);
        setHeader(headerRes.data);
        const patientId = headerRes.data.patient_id;

        // 2. Fetch Timeline Events
        const timelineRes = await api.get(`/patients/timeline/${patientId}`, {
          params: {
            category: selectedCategory,
            search_query: searchQuery
          }
        });
        setTimelineData(timelineRes.data);
        
        if (timelineRes.data.encounters && timelineRes.data.encounters.length > 0) {
          setSelectedTimelineEncounter(timelineRes.data.encounters[0]);
        }
      } catch (err) {
        console.error("Error loading patient timeline details:", err);
        showToast("error", "Error loading patient clinical history timeline.");
      } finally {
        setLoadingPatient(false);
      }
    }
  };

  // Submit consultation details
  const onSubmit = async (data) => {
    if (!selectedEncounter) return;
    setCompleting(true);
    try {
      const payload = {
        encounter_id: selectedEncounter.id,
        patient_id: selectedEncounter.patient_id,
        diagnosis: data.diagnosis,
        notes: data.notes,
        medicines: data.medicines.filter((m) => m.medicine_name.trim() !== "")
      };

      await api.post(`/patients/hospital/doctor/encounters/${selectedEncounter.id}/complete`, payload);
      showToast("success", "Consultation completed and prescription saved!");
      
      // Auto-identify next pending encounter in the queue to load it
      const remainingPending = encounters.filter(e => e.status === "PENDING" && e.id !== selectedEncounter.id);
      
      // Reset forms
      reset({
        diagnosis: "",
        notes: "",
        medicines: [{ medicine_name: "", strength: "", frequency: "", duration: "", instructions: "" }]
      });

      // Select next patient or clear workspace
      if (remainingPending.length > 0) {
        await handleSelectEncounter(remainingPending[0]);
      } else {
        setSelectedEncounter(null);
        setHeader(null);
        setTimelineData(null);
      }

      await fetchDoctorDashboard(true);
    } catch (err) {
      showToast("error", "Error completing patient consultation.");
    } finally {
      setCompleting(false);
    }
  };

  // Determine Queue Item priority color dynamically (routine or critical alerts)
  const getPriorityInfo = (enc) => {
    const temp = parseFloat(enc.temperature || 0);
    const bp = enc.blood_pressure || "";
    let isPriority = false;
    
    if (temp > 38.0) isPriority = true;
    if (bp) {
      const parts = bp.split("/");
      if (parts.length === 2) {
        const sys = parseInt(parts[0]);
        const dia = parseInt(parts[1]);
        if (sys > 140 || dia > 90) isPriority = true;
      }
    }
    
    return isPriority 
      ? { label: "Priority", badge: "text-amber-700 bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/50", dot: "bg-amber-500" }
      : { label: "Routine", badge: "text-emerald-700 bg-emerald-50 border-emerald-250 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/50", dot: "bg-emerald-500" };
  };

  const calculateAvgWaitingTime = (encs) => {
    const completedEncs = encs.filter(e => e.status === "COMPLETED");
    if (completedEncs.length === 0) return "—";
    
    let totalMins = 0;
    completedEncs.forEach(e => {
      const created = new Date(e.created_at);
      const updated = new Date(e.updated_at || e.created_at);
      const diffMs = updated - created;
      totalMins += Math.max(0, Math.floor(diffMs / 60000));
    });
    
    return `${Math.round(totalMins / completedEncs.length)} mins`;
  };

  const getWaitingTime = (enc) => {
    const created = new Date(enc.created_at);
    const now = new Date();
    const diffMs = now - created;
    const diffMins = Math.max(0, Math.floor(diffMs / 60000));
    return `Waiting - ${diffMins} mins`;
  };

  // Only display PENDING (Waiting) encounters in active list
  const activeQueue = encounters.filter(e => e.status === "PENDING");

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-xs font-semibold text-slate-400">Loading Physician Workstation...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      
      {/* Top Banner Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        
        <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-850 p-4 rounded-xl flex items-center gap-3.5 shadow-2xs">
          <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-slate-800/80 text-blue-600 dark:text-blue-450 flex items-center justify-center shrink-0">
            <ClipboardList className="h-4.5 w-4.5" />
          </div>
          <div>
            <span className="text-slate-400 font-extrabold text-4xs uppercase tracking-wider block">Patients Waiting</span>
            <strong className="text-sm font-black text-slate-850 dark:text-slate-100">{stats.pending_count}</strong>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-850 p-4 rounded-xl flex items-center gap-3.5 shadow-2xs">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-slate-800/80 text-emerald-600 dark:text-emerald-450 flex items-center justify-center shrink-0">
            <CheckCircle className="h-4.5 w-4.5" />
          </div>
          <div>
            <span className="text-slate-400 font-extrabold text-4xs uppercase tracking-wider block">Completed Today</span>
            <strong className="text-sm font-black text-slate-850 dark:text-slate-100">{stats.completed_count}</strong>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-850 p-4 rounded-xl flex items-center gap-3.5 shadow-2xs">
          <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-slate-800/80 text-indigo-600 dark:text-indigo-455 flex items-center justify-center shrink-0">
            <Stethoscope className="h-4.5 w-4.5" />
          </div>
          <div>
            <span className="text-slate-400 font-extrabold text-4xs uppercase tracking-wider block">Total Today</span>
            <strong className="text-sm font-black text-slate-850 dark:text-slate-100">{stats.total_today}</strong>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-850 p-4 rounded-xl flex items-center gap-3.5 shadow-2xs">
          <div className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-slate-800/80 text-amber-600 dark:text-amber-450 flex items-center justify-center shrink-0">
            <Clock className="h-4.5 w-4.5" />
          </div>
          <div>
            <span className="text-slate-400 font-extrabold text-4xs uppercase tracking-wider block">Avg Waiting Time</span>
            <strong className="text-sm font-black text-slate-850 dark:text-slate-100">{calculateAvgWaitingTime(encounters)}</strong>
          </div>
        </div>

      </div>

      {/* Main Dual Panel Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* LEFT PANEL: Patient Triage Waiting Queue (3 Cols) */}
        <div className="lg:col-span-3 space-y-3.5">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-850 pb-2">
            <h3 className="text-xs font-extrabold text-slate-455 dark:text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <Activity className="h-4 w-4 animate-pulse text-amber-500" /> Today's Waiting Queue
            </h3>
            <button 
              type="button"
              onClick={() => fetchDoctorDashboard(false)}
              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 cursor-pointer"
              title="Refresh Queue"
            >
              <RefreshCcw className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="space-y-2.5 overflow-y-auto max-h-[70vh] pr-1">
            {activeQueue.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-850 p-6 rounded-2xl text-center text-slate-400 text-3xs font-extrabold uppercase tracking-wide leading-relaxed">
                No waiting patient triages.
              </div>
            ) : (
              activeQueue.map((enc, idx) => {
                const isSelected = selectedEncounter?.id === enc.id;
                const patientName = enc.patient ? `${enc.patient.first_name} ${enc.patient.last_name}` : "Patient Visit";
                const uhid = enc.patient ? enc.patient.patient_code : "N/A";
                const priorityInfo = getPriorityInfo(enc);

                return (
                  <div 
                    key={enc.id} 
                    onClick={() => handleSelectEncounter(enc)}
                    className={`p-3.5 border rounded-xl cursor-pointer transition select-none flex flex-col gap-2.5 shadow-2xs ${
                      isSelected 
                        ? "bg-blue-50/20 border-blue-500 dark:bg-slate-800/40" 
                        : "bg-white dark:bg-slate-900 border-slate-150 dark:border-slate-850 hover:border-blue-200"
                    }`}
                  >
                    <div className="flex justify-between items-start gap-1.5">
                      <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${priorityInfo.dot}`}></div>
                        <div className="text-xs font-semibold">
                          <h4 className="font-extrabold text-slate-850 dark:text-slate-100">{patientName}</h4>
                          <span className="text-4xs text-slate-400 font-extrabold uppercase tracking-wide">UHID: {uhid}</span>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 border text-4xs font-bold rounded shrink-0 ${priorityInfo.badge}`}>
                        {priorityInfo.label}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center text-4xs font-bold text-slate-455">
                      <span>Token #{idx + 1}</span>
                      <span className="flex items-center gap-0.5">
                        <Clock className="h-2.5 w-2.5" />
                        {getWaitingTime(enc)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT PANEL: Workspace (9 Cols) */}
        <div className="lg:col-span-9">
          
          {!selectedEncounter ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-16 rounded-2xl text-center space-y-4 shadow-sm min-h-[50vh] flex flex-col justify-center items-center select-none">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-slate-800/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-2xs">
                <Stethoscope className="h-7 w-7 animate-pulse" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-xs uppercase tracking-wider">Clinical Workspace Empty</h3>
                <p className="text-3xs text-slate-400 dark:text-slate-500 font-semibold max-w-xs mx-auto mt-1 leading-relaxed">
                  Select a waiting patient from the queue to automatically load their consultation detail, longitudinal timeline files, and AI summary briefings.
                </p>
              </div>
            </div>
          ) : loadingPatient ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-16 rounded-2xl text-center space-y-3 shadow-sm animate-pulse min-h-[50vh] flex flex-col justify-center items-center">
              <div className="w-6 h-6 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-3xs font-extrabold text-slate-400 uppercase tracking-widest">Loading Patient EMR Workspace...</span>
            </div>
          ) : (
            <div className="space-y-4">
              
              {/* Patient Demographic EMR Header Card */}
              <PatientHeader header={header} loading={loadingPatient} />

              {/* Grid workspace splits clinical note writing / timeline analysis */}
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
                
                {/* 8 Cols: Consultation Details & Timeline */}
                <div className="xl:col-span-8 space-y-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4.5 rounded-2xl shadow-sm">
                  
                  {/* Tab Selector */}
                  <div className="flex border-b border-slate-200 dark:border-slate-800 pb-2 gap-3 text-3xs font-black uppercase tracking-wider">
                    <button
                      type="button"
                      onClick={() => setActiveTab("consultation")}
                      className={`py-1.5 px-3 rounded-lg cursor-pointer transition ${
                        activeTab === "consultation" 
                          ? "bg-blue-600 text-white shadow-2xs" 
                          : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-850"
                      }`}
                    >
                      Current Consultation
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("timeline")}
                      className={`py-1.5 px-3 rounded-lg cursor-pointer transition ${
                        activeTab === "timeline" 
                          ? "bg-blue-600 text-white shadow-2xs" 
                          : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-850"
                      }`}
                    >
                      Medical Timeline ({timelineData?.encounters?.length || 0})
                    </button>
                  </div>

                  {/* Tab 1: Current Consultation View */}
                  {activeTab === "consultation" && (
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                      
                      {/* Pre-Consultation Data */}
                      <div className="space-y-3 bg-slate-50/50 dark:bg-slate-955 p-4 rounded-xl border border-slate-200/50 dark:border-slate-850">
                        <h4 className="text-3xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                          <HeartPulse className="h-4 w-4 text-rose-500" />
                          Pre-Consultation Vitals & Complaints (Support Staff)
                        </h4>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-3xs font-bold text-slate-650">
                          {[
                            { label: "BP", value: selectedEncounter.blood_pressure },
                            { label: "Pulse", value: selectedEncounter.pulse_rate, unit: "bpm" },
                            { label: "Temp", value: selectedEncounter.temperature, unit: "°C" },
                            { label: "SpO₂", value: selectedEncounter.spo2, unit: "%" },
                            { label: "Height", value: selectedEncounter.height, unit: "cm" },
                            { label: "Weight", value: selectedEncounter.weight, unit: "kg" },
                            { label: "BMI", value: selectedEncounter.bmi },
                            { label: "Resp", value: selectedEncounter.respiratory_rate, unit: "rpm" },
                          ].map(({ label, value, unit }) => (
                            <div key={label} className="bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-150 dark:border-slate-850">
                              <span className="block text-slate-400 font-extrabold tracking-wide mb-0.5">{label}</span>
                              <strong className="text-slate-800 dark:text-slate-250 font-extrabold">
                                {value != null && value !== "" ? `${value}${unit ? " " + unit : ""}` : "—"}
                              </strong>
                            </div>
                          ))}
                        </div>

                        {/* Complaint / Symptoms */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {selectedEncounter.chief_complaint && (
                            <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-850 p-2.5 rounded-lg text-3xs">
                              <span className="font-extrabold text-blue-600 dark:text-blue-400 block mb-0.5 uppercase tracking-wide">Chief Complaint</span>
                              <p className="font-semibold text-slate-600 dark:text-slate-300 leading-relaxed">{selectedEncounter.chief_complaint}</p>
                            </div>
                          )}
                          {selectedEncounter.symptoms && (
                            <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-850 p-2.5 rounded-lg text-3xs">
                              <span className="font-extrabold text-slate-500 block mb-0.5 uppercase tracking-wide">Symptoms / Notes</span>
                              <p className="font-semibold text-slate-600 dark:text-slate-300 leading-relaxed">{selectedEncounter.symptoms}</p>
                            </div>
                          )}
                        </div>

                        {/* Lab Results summary (if present) */}
                        {(selectedEncounter.blood_group || selectedEncounter.blood_sugar || selectedEncounter.cbc || selectedEncounter.urine_test || selectedEncounter.ecg) && (
                          <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-850 p-3 rounded-lg space-y-1.5 text-3xs">
                            <span className="font-extrabold text-slate-400 uppercase tracking-wide block">Recorded Lab Indexes</span>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 font-bold">
                              {selectedEncounter.blood_group && <div>Blood Group: <span className="text-slate-700 dark:text-slate-300">{selectedEncounter.blood_group}</span></div>}
                              {selectedEncounter.blood_sugar && <div>Sugar Level: <span className="text-slate-700 dark:text-slate-300">{selectedEncounter.blood_sugar}</span></div>}
                              {selectedEncounter.cbc && <div>CBC: <span className="text-slate-700 dark:text-slate-300">{selectedEncounter.cbc}</span></div>}
                              {selectedEncounter.urine_test && <div>Urine: <span className="text-slate-700 dark:text-slate-300">{selectedEncounter.urine_test}</span></div>}
                              {selectedEncounter.ecg && <div>ECG: <span className="text-slate-700 dark:text-slate-300">{selectedEncounter.ecg}</span></div>}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Diagnosis Form */}
                      <div className="space-y-3">
                        <h4 className="text-3xs font-extrabold text-slate-550 dark:text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-850 pb-1 flex items-center gap-1.5">
                          <CheckCircle2 className="h-4 w-4 text-blue-500" /> Diagnosis & Findings
                        </h4>
                        <div className="grid grid-cols-1 gap-3.5 text-3xs font-bold text-slate-655">
                          <div className="space-y-1">
                            <label className="block text-slate-455 font-extrabold uppercase">Primary Diagnosis / Chief Impression *</label>
                            <input 
                              required 
                              type="text" 
                              placeholder="e.g. Acute Migraine" 
                              className="w-full border p-2 bg-slate-50 dark:bg-slate-950 dark:border-slate-850 rounded-lg text-xs font-semibold dark:text-slate-50 focus:ring-2 focus:ring-blue-500/20 focus:outline-none" 
                              {...register("diagnosis")} 
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="block text-slate-455 font-extrabold uppercase">Physician Consultation Notes</label>
                            <textarea 
                              rows={2.5} 
                              placeholder="Notes symptoms duration, clinical details, diagnoses, and medical advises..." 
                              className="w-full border p-2.5 bg-slate-50 dark:bg-slate-950 dark:border-slate-850 rounded-lg text-xs font-semibold dark:text-slate-50 focus:ring-2 focus:ring-blue-500/20 focus:outline-none" 
                              {...register("notes")} 
                            />
                          </div>
                        </div>
                      </div>

                      {/* Prescription Form */}
                      <div className="space-y-3">
                        <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-850 pb-1.5">
                          <h4 className="text-3xs font-extrabold text-slate-550 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                            <Plus className="h-4 w-4 text-emerald-500" /> Prescription Form
                          </h4>
                          <button 
                            type="button" 
                            onClick={() => append({ medicine_name: "", strength: "", frequency: "", duration: "", instructions: "" })}
                            className="flex items-center gap-1 py-1 px-2.5 bg-blue-50 hover:bg-blue-100 dark:bg-slate-800 dark:hover:bg-slate-750 text-blue-650 dark:text-blue-400 font-extrabold text-4xs uppercase rounded transition cursor-pointer"
                          >
                            <Plus className="h-3 w-3" /> Add Med
                          </button>
                        </div>

                        <div className="space-y-2.5">
                          {fields.map((item, index) => (
                            <div key={item.id} className="grid grid-cols-12 gap-2 items-end text-3xs font-extrabold">
                              <div className="col-span-5 space-y-1">
                                <label className="text-4xs block text-slate-400 uppercase tracking-wider">Medicine</label>
                                <input 
                                  required 
                                  placeholder="e.g. Sumatriptan" 
                                  className="w-full border p-2 bg-slate-50 dark:bg-slate-955 dark:border-slate-850 rounded-lg text-xs font-semibold dark:text-slate-50 focus:ring-2 focus:ring-blue-500/20 focus:outline-none" 
                                  {...register(`medicines.${index}.medicine_name`)} 
                                />
                              </div>
                              <div className="col-span-2 space-y-1">
                                <label className="text-4xs block text-slate-400 uppercase tracking-wider">Strength</label>
                                <input 
                                  placeholder="e.g. 50mg" 
                                  className="w-full border p-2 bg-slate-50 dark:bg-slate-955 dark:border-slate-855 rounded-lg text-xs font-semibold dark:text-slate-50 focus:ring-2 focus:ring-blue-500/20 focus:outline-none" 
                                  {...register(`medicines.${index}.strength`)} 
                                />
                              </div>
                              <div className="col-span-2 space-y-1">
                                <label className="text-4xs block text-slate-400 uppercase tracking-wider">Frequency</label>
                                <input 
                                  placeholder="e.g. 1-0-0" 
                                  className="w-full border p-2 bg-slate-50 dark:bg-slate-955 dark:border-slate-855 rounded-lg text-xs font-semibold dark:text-slate-50 focus:ring-2 focus:ring-blue-500/20 focus:outline-none" 
                                  {...register(`medicines.${index}.frequency`)} 
                                />
                              </div>
                              <div className="col-span-3 flex items-center gap-1.5">
                                <div className="flex-1 space-y-1">
                                  <label className="text-4xs block text-slate-400 uppercase tracking-wider">Duration</label>
                                  <input 
                                    placeholder="e.g. 5 Days" 
                                    className="w-full border p-2 bg-slate-50 dark:bg-slate-955 dark:border-slate-855 rounded-lg text-xs font-semibold dark:text-slate-50 focus:ring-2 focus:ring-blue-500/20 focus:outline-none" 
                                    {...register(`medicines.${index}.duration`)} 
                                  />
                                </div>
                                {fields.length > 1 && (
                                  <button 
                                    type="button" 
                                    onClick={() => remove(index)}
                                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-850 text-red-500 rounded-lg cursor-pointer self-end mb-0.5 shrink-0"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Sign Action Button */}
                      <div className="border-t border-slate-200 dark:border-slate-800 pt-4 flex justify-end">
                        <button 
                          type="submit" 
                          disabled={completing}
                          className="py-2.5 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md shadow-emerald-500/10 cursor-pointer active:scale-98 transition disabled:opacity-50"
                        >
                          {completing ? "Saving..." : "Complete & Sign Consultation"}
                        </button>
                      </div>

                    </form>
                  )}

                  {/* Tab 2: Patient Timeline View (Integrates TimelineList and EventDetailCard side-by-side) */}
                  {activeTab === "timeline" && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4.5 pt-1">
                      {/* Left: Vertical Timeline Navigation List */}
                      <div className="lg:col-span-5">
                        <TimelineList
                          encounters={timelineData?.encounters || []}
                          yearsAvailable={timelineData?.years_available || []}
                          selectedEncounterId={selectedTimelineEncounter?.encounter_id}
                          onSelectEncounter={setSelectedTimelineEncounter}
                          selectedCategory={selectedCategory}
                          onCategoryChange={setSelectedCategory}
                          searchQuery={searchQuery}
                          onSearchChange={setSearchQuery}
                          loading={loadingPatient}
                        />
                      </div>
                      
                      {/* Right: Selected Event Detail Sheet */}
                      <div className="lg:col-span-7">
                        <EventDetailCard
                          encounter={selectedTimelineEncounter}
                          loading={loadingPatient}
                        />
                      </div>
                    </div>
                  )}

                </div>

                {/* 4 Cols: Preserved AI Medical History Summary */}
                <div className="xl:col-span-4 space-y-4 shrink-0">
                  <SummarizePanel patientId={selectedEncounter.patient_id} />
                </div>

              </div>

            </div>
          )}

        </div>

      </div>

    </div>
  );
}
