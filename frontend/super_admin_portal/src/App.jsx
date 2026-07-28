import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";

import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import HospitalList from "./pages/HospitalList";
import HospitalDetail from "./pages/HospitalDetail";
import KnowledgeBase from "./pages/KnowledgeBase";
import DocumentDetail from "./pages/DocumentDetail";
import { apiEvents } from "./services/api";

// Protected Route wrapper component
function ProtectedRoute({ children }) {
  const token = localStorage.getItem("superAdminToken");
  const role = localStorage.getItem("superAdminRole");
  if (!token || role !== "SUPER_ADMIN") {
    // Clear storage fields
    localStorage.removeItem("superAdminToken");
    localStorage.removeItem("superAdminRole");
    localStorage.removeItem("superAdminEmail");
    localStorage.removeItem("superAdminName");
    return <Navigate to="/login" replace />;
  }
  return children;
}

export default function App() {
  const location = useLocation();
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);

  // Subscribe to API events for loading/toasts
  useEffect(() => {
    // Force dark mode class on html root to load proper HSL CSS variable themes
    document.documentElement.classList.add("dark");

    const unsubLoading = apiEvents.subscribe("loading", (state) => setLoading(state));
    const unsubToast = apiEvents.subscribe("toast", (t) => {
      setToast(t);
      setTimeout(() => setToast(null), 5000);
    });

    return () => {
      unsubLoading();
      unsubToast();
    };
  }, []);

  // Determine section title based on route
  const getSectionTitle = () => {
    const path = location.pathname;
    if (path.startsWith("/dashboard")) return "Dashboard Overview";
    if (path.startsWith("/hospitals")) return "Hospitals Node Manager";
    if (path.startsWith("/knowledge-base")) return "RAG Knowledge Corpus";
    return "Sahyog 1.0 Admin";
  };

  const isLoginPage = location.pathname === "/login";

  return (
    <div className="min-h-screen bg-background flex text-foreground font-sans selection:bg-primary/30 selection:text-white">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-5 py-3.5 rounded-xl border shadow-2xl animate-fade-in flex items-center gap-3 text-sm font-semibold max-w-sm ${
          toast.type === "error" 
            ? "bg-destructive/15 border-destructive/20 text-destructive" 
            : "bg-emerald-500/15 border-emerald-500/20 text-emerald-400"
        }`}>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-background/50 backdrop-blur-[1px] z-50 flex items-center justify-center pointer-events-none">
          <div className="bg-card border border-border px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <span className="text-xs font-semibold text-muted-foreground">Communicating...</span>
          </div>
        </div>
      )}

      {isLoginPage ? (
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      ) : (
        <ProtectedRoute>
          <div className="flex w-full">
            <Sidebar />
            <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
              <Header title={getSectionTitle()} />
              <main className="flex-1 flex flex-col overflow-y-auto">
                <Routes>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/hospitals" element={<HospitalList />} />
                  <Route path="/hospitals/:hospitalId" element={<HospitalDetail />} />
                  <Route path="/knowledge-base" element={<KnowledgeBase />} />
                  <Route path="/knowledge-base/:documentId" element={<DocumentDetail />} />
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </main>
            </div>
          </div>
        </ProtectedRoute>
      )}
    </div>
  );
}
