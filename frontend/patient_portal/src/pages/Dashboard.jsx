import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  Activity,
  User,
  LogOut,
  Users,
  Sun,
  Moon,
  Home,
  ShieldCheck,
  HeartPulse,
  Heart,
  Plus
} from "lucide-react";

const calculateAge = (dobString) => {
  if (!dobString) return 0;
  const dob = new Date(dobString);
  const diffMs = Date.now() - dob.getTime();
  const ageDate = new Date(diffMs);
  return Math.abs(ageDate.getUTCFullYear() - 1970);
};

export const Dashboard = () => {
  const { selectedPatient, logout, selectPatient, theme, toggleTheme } = useAuth();
  const navigate = useNavigate();

  // Guard: Redirect to Selection if no patient context exists
  useEffect(() => {
    if (!selectedPatient) {
      navigate("/family-selection");
    }
  }, [selectedPatient, navigate]);

  if (!selectedPatient) return null;

  const age = calculateAge(selectedPatient.date_of_birth);

  const handleSwitchProfile = () => {
    selectPatient(null);
    navigate("/family-selection");
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 transition duration-300">
      
      {/* Top Navbar */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-850 shrink-0 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-md shadow-blue-500/20">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <span className="font-extrabold text-base tracking-tight bg-gradient-to-r from-blue-600 to-indigo-500 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">
              Sahyog
            </span>
            <span className="text-2xs block font-bold text-slate-400 -mt-0.5 tracking-wider uppercase">
              Patient Portal
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* AI Guidance */}
          <button
            onClick={() => navigate("/guidance")}
            className="flex items-center gap-1.5 py-2 px-3 bg-emerald-50 hover:bg-emerald-100 dark:bg-slate-800 dark:hover:bg-slate-750 text-emerald-600 dark:text-emerald-400 font-semibold text-xs rounded-xl transition duration-200 cursor-pointer shadow-sm"
          >
            <Activity className="h-4 w-4" />
            <span className="hidden sm:inline">AI Guidance</span>
          </button>

          {/* Switch Profile */}
          <button
            onClick={handleSwitchProfile}
            className="flex items-center gap-1.5 py-2 px-3 bg-blue-50 hover:bg-blue-100 dark:bg-slate-800 dark:hover:bg-slate-750 text-blue-600 dark:text-blue-400 font-semibold text-xs rounded-xl transition duration-200 cursor-pointer shadow-sm"
          >
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Switch Profile</span>
          </button>

          {/* Theme Switcher */}
          <button
            onClick={toggleTheme}
            className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-750 transition active:scale-95 duration-250 cursor-pointer text-slate-650 dark:text-slate-350"
          >
            {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </button>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-red-650 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition cursor-pointer"
            title="Sign Out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Main Grid Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-6 grid grid-cols-1 md:grid-cols-3 gap-6 items-start z-10 animate-in fade-in duration-400">
        
        {/* Profile Card Summary */}
        <section className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-lg rounded-3xl p-6 text-center space-y-4 md:col-span-1">
          <div className="w-20 h-20 bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400 rounded-2xl flex items-center justify-center font-extrabold text-2xl mx-auto shadow-inner">
            {selectedPatient.first_name?.[0]}
            {selectedPatient.last_name?.[0]}
          </div>

          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
              {selectedPatient.first_name} {selectedPatient.last_name}
            </h2>
            <span className="inline-block px-2.5 py-0.5 mt-1.5 text-2xs font-bold bg-blue-50 dark:bg-slate-800 border border-blue-100 dark:border-slate-750 text-blue-650 dark:text-blue-400 rounded-md tracking-wider uppercase">
              Relation: {selectedPatient.relation}
            </span>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800/80 pt-4 grid grid-cols-3 gap-2 text-center text-xs">
            <div>
              <span className="block text-slate-400 dark:text-slate-500 font-semibold mb-0.5">Age</span>
              <strong className="font-bold text-slate-800 dark:text-slate-100 text-base">{age} yrs</strong>
            </div>
            <div>
              <span className="block text-slate-400 dark:text-slate-500 font-semibold mb-0.5">Gender</span>
              <strong className="font-bold text-slate-800 dark:text-slate-100 text-base capitalize">
                {selectedPatient.gender?.toLowerCase()}
              </strong>
            </div>
            <div>
              <span className="block text-slate-400 dark:text-slate-500 font-semibold mb-0.5">Blood</span>
              <strong className="font-bold text-rose-500 text-base">{selectedPatient.blood_group || "N/A"}</strong>
            </div>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800/80 pt-4 flex flex-col gap-2 text-left text-xs text-slate-600 dark:text-slate-400">
            <div className="flex justify-between">
              <span className="font-medium text-slate-400">Aadhaar (Masked):</span>
              <span className="font-mono font-semibold">XXXXXXXX{selectedPatient.aadhaar_last4}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-medium text-slate-400">Patient ID:</span>
              <span className="font-mono font-bold text-base text-blue-600 dark:text-blue-400 tracking-widest">
                {selectedPatient.patient_code || "—"}
              </span>
            </div>
          </div>
        </section>

        {/* Detailed Info Column */}
        <div className="md:col-span-2 space-y-6">
          
          {/* Address & Emergency Info */}
          <section className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-md rounded-3xl p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Address */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 border-b border-slate-100 dark:border-slate-850 pb-2">
                <Home className="h-4 w-4 text-blue-600" />
                Residential Address
              </h3>
              <div className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                <p className="font-bold text-slate-800 dark:text-slate-200">{selectedPatient.address_line1}</p>
                {selectedPatient.address_line2 && <p>{selectedPatient.address_line2}</p>}
                <p>{selectedPatient.city}, {selectedPatient.district}</p>
                <p>{selectedPatient.state} - {selectedPatient.pincode}</p>
              </div>
            </div>

            {/* Emergency Contacts */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 border-b border-slate-100 dark:border-slate-850 pb-2">
                <ShieldCheck className="h-4 w-4 text-rose-500" />
                Emergency Contact
              </h3>
              <div className="bg-rose-50/20 dark:bg-rose-950/10 border border-rose-100/50 dark:border-rose-900/20 rounded-2xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-450">Name:</span>
                  <strong className="font-bold text-slate-800 dark:text-slate-100">Karan Verma</strong>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-450">Relation:</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-350">Father</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-450">Phone:</span>
                  <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">+91 9876543223</span>
                </div>
              </div>
            </div>
          </section>

          {/* Medical Records Overview */}
          <section className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-md rounded-3xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 border-b border-slate-100 dark:border-slate-850 pb-2">
              <HeartPulse className="h-4 w-4 text-emerald-600" />
              Clinical Health Profile
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              
              {/* Diseases */}
              <div className="border border-slate-100 dark:border-slate-800/80 p-4 rounded-2xl space-y-2">
                <span className="text-2xs font-bold uppercase tracking-wider text-slate-400 block">Conditions</span>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-850 dark:text-slate-200">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  Hypertension
                </div>
                <span className="text-3xs text-slate-400 block font-medium">Diagnosed: 2020-01-10</span>
              </div>

              {/* Allergies */}
              <div className="border border-slate-100 dark:border-slate-800/80 p-4 rounded-2xl space-y-2">
                <span className="text-2xs font-bold uppercase tracking-wider text-slate-400 block">Allergies</span>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-850 dark:text-slate-200">
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  Peanuts Allergy
                </div>
                <span className="text-3xs text-slate-400 block font-medium">Severity: HIGH</span>
              </div>

              {/* Medications */}
              <div className="border border-slate-100 dark:border-slate-800/80 p-4 rounded-2xl space-y-2">
                <span className="text-2xs font-bold uppercase tracking-wider text-slate-400 block">Medications</span>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-850 dark:text-slate-200">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  Amlodipine (5mg)
                </div>
                <span className="text-3xs text-slate-400 block font-medium">Freq: Once daily</span>
              </div>

            </div>
          </section>

          {/* AI Health Guidance Assistant Card */}
          <section className="bg-emerald-50/10 dark:bg-emerald-950/5 border border-emerald-100/40 dark:border-emerald-900/20 rounded-3xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Activity className="h-5 w-5" />
              </div>
              <div>
                <span className="block text-sm font-bold text-slate-800 dark:text-slate-200">AI Health Guidance Assistant</span>
                <span className="text-xs text-slate-500 dark:text-slate-400 block leading-relaxed mt-0.5">
                  Get grounded answers to wellness questions based on available Sahyog guidelines.
                </span>
              </div>
            </div>
            <button
              onClick={() => navigate("/guidance")}
              className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-sm cursor-pointer transition text-center shrink-0"
            >
              Ask Assistant
            </button>
          </section>

          {/* Consents & Logs */}
          <section className="bg-blue-50/20 dark:bg-blue-950/10 border border-blue-100/50 dark:border-blue-900/20 rounded-3xl p-5 flex items-center justify-between text-xs font-medium">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="h-5 w-5 text-emerald-500" />
              <div>
                <span className="block text-slate-800 dark:text-slate-200">NDHM Data Lock Consent</span>
                <span className="text-3xs text-slate-400 block">Authorized secure storage (v1.0)</span>
              </div>
            </div>
            <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50 rounded-md text-2xs font-bold">
              VERIFIED
            </span>
          </section>

        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 border-t border-slate-100 dark:border-slate-850 text-center text-xs text-slate-400 dark:text-slate-650 shrink-0 z-10 bg-white/20">
        &copy; {new Date().getFullYear()} Sahyog Healthcare Platform. All rights reserved.
      </footer>
    </div>
  );
};

export default Dashboard;
