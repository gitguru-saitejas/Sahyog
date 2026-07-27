import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import PatientHeader from "../../components/doctor/PatientHeader";
import TimelineList from "../../components/doctor/TimelineList";
import EventDetailCard from "../../components/doctor/EventDetailCard";
import AISummaryPanel from "../../components/doctor/AISummaryPanel";
import { Search, Stethoscope, ArrowLeft, RefreshCcw } from "lucide-react";

export default function PatientTimelinePage() {
  const { showToast } = useAuth();
  const [searchParams] = useSearchParams();
  const initialPatientCode = searchParams.get("patient_code") || "P-1001";

  const [patientSearchInput, setPatientSearchInput] = useState(initialPatientCode);
  const [activePatientCode, setActivePatientCode] = useState(initialPatientCode);

  const [header, setHeader] = useState(null);
  const [timelineData, setTimelineData] = useState(null);
  const [selectedEncounter, setSelectedEncounter] = useState(null);
  const [overallSummary, setOverallSummary] = useState(null);
  const [eventSummary, setEventSummary] = useState(null);

  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const [loadingHeader, setLoadingHeader] = useState(false);
  const [loadingTimeline, setLoadingTimeline] = useState(false);
  const [loadingOverallSummary, setLoadingOverallSummary] = useState(false);
  const [loadingEventSummary, setLoadingEventSummary] = useState(false);

  // Fetch Patient Header & Timeline
  const loadPatientData = async (code) => {
    if (!code.trim()) return;
    setLoadingHeader(true);
    setLoadingTimeline(true);
    setHeader(null);
    setTimelineData(null);
    setSelectedEncounter(null);
    setOverallSummary(null);

    try {
      // 1. Fetch Header
      const headerRes = await api.get(`/patients/timeline/code/${code}/full-profile`);
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
        setSelectedEncounter(timelineRes.data.encounters[0]);
      }

      // 3. Fetch Overall AI Summary
      fetchOverallSummary(patientId, false);
    } catch (err) {
      console.error(err);
      showToast("error", err.response?.data?.detail || "Failed to retrieve patient medical records.");
    } finally {
      setLoadingHeader(false);
      setLoadingTimeline(false);
    }
  };

  const fetchOverallSummary = async (patientId, forceRefresh = false) => {
    setLoadingOverallSummary(true);
    try {
      const res = await api.get(`/patients/timeline/${patientId}/ai-summary`, {
        params: { refresh: forceRefresh }
      });
      setOverallSummary(res.data);
    } catch (err) {
      console.error("AI Summary Error", err);
    } finally {
      setLoadingOverallSummary(false);
    }
  };

  const fetchEventSummary = async (patientId, encounterId) => {
    setLoadingEventSummary(true);
    try {
      const res = await api.post(`/patients/timeline/${patientId}/ai-summary/encounter/${encounterId}`);
      setEventSummary(res.data);
    } catch (err) {
      console.error("Event Summary Error", err);
    } finally {
      setLoadingEventSummary(false);
    }
  };

  useEffect(() => {
    if (activePatientCode) {
      loadPatientData(activePatientCode);
    }
  }, [activePatientCode, selectedCategory]);

  const handlePatientSearchSubmit = (e) => {
    e.preventDefault();
    if (patientSearchInput.trim()) {
      setActivePatientCode(patientSearchInput.trim());
    }
  };

  const handleSelectEncounter = (enc) => {
    setSelectedEncounter(enc);
    if (header?.patient_id && enc.encounter_id) {
      fetchEventSummary(header.patient_id, enc.encounter_id);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Search Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-blue-600" />
            Patient Timeline Module
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
            Longitudinal medical history navigation & AI-powered clinical assistant
          </p>
        </div>

        <form onSubmit={handlePatientSearchSubmit} className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={patientSearchInput}
              onChange={(e) => setPatientSearchInput(e.target.value)}
              placeholder="Enter Patient Code (e.g. P-1001)..."
              className="pl-9 pr-4 py-2 bg-white dark:bg-slate-900 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition dark:text-slate-100 w-64"
            />
          </div>
          <button
            type="submit"
            disabled={loadingHeader}
            className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm cursor-pointer active:scale-98 transition disabled:opacity-50"
          >
            {loadingHeader ? "Searching..." : "Lookup File"}
          </button>
        </form>
      </div>

      {/* Patient Demographic Header */}
      <PatientHeader header={header} loading={loadingHeader} />

      {/* 3-Panel Doctor Workstation Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Panel: Vertical Timeline List (4 Cols) */}
        <div className="lg:col-span-4 space-y-4">
          <TimelineList
            encounters={timelineData?.encounters || []}
            yearsAvailable={timelineData?.years_available || []}
            selectedEncounterId={selectedEncounter?.encounter_id}
            onSelectEncounter={handleSelectEncounter}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            loading={loadingTimeline}
          />
        </div>

        {/* Middle Panel: Selected Event Details (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <EventDetailCard
            encounter={selectedEncounter}
            loading={loadingTimeline}
          />
        </div>

        {/* Right Panel: AI Medical Assistant (3 Cols) */}
        <div className="lg:col-span-3 space-y-4">
          <AISummaryPanel
            overallSummary={overallSummary}
            eventSummary={eventSummary}
            selectedEncounter={selectedEncounter}
            onRefreshSummary={() => header && fetchOverallSummary(header.patient_id, true)}
            loadingOverall={loadingOverallSummary}
            loadingEvent={loadingEventSummary}
          />
        </div>

      </div>

    </div>
  );
}
