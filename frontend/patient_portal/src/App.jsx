import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import OTPVerification from "./pages/OTPVerification";
import FamilySelection from "./pages/FamilySelection";
import Dashboard from "./pages/Dashboard";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";


// Route Guards
const ProtectedRoute = ({ children }) => {
  const { familyAccountId } = useAuth();
  if (!familyAccountId) return <Navigate to="/login" replace />;
  return children;
};

const GuestRoute = ({ children }) => {
  const { familyAccountId, patients, patientsLoaded } = useAuth();
  if (familyAccountId) {
    // Wait for the patient list to finish loading before deciding where to go
    if (!patientsLoaded) return null;
    if (patients.length > 1) {
      return <Navigate to="/family-selection" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }
  return children;
};

// Global Notification Toast Overlay
const GlobalToast = () => {
  const { toastMessage, clearToast } = useAuth();

  if (!toastMessage) return null;

  const getStyles = () => {
    switch (toastMessage.type) {
      case "success":
        return "bg-emerald-500 border-emerald-600 text-white shadow-emerald-500/10";
      case "error":
        return "bg-red-500 border-red-600 text-white shadow-red-500/10";
      default:
        return "bg-blue-500 border-blue-600 text-white shadow-blue-500/10";
    }
  };

  const getIcon = () => {
    switch (toastMessage.type) {
      case "success":
        return <CheckCircle2 className="h-5 w-5 shrink-0" />;
      case "error":
        return <AlertCircle className="h-5 w-5 shrink-0" />;
      default:
        return <Info className="h-5 w-5 shrink-0" />;
    }
  };

  return (
    <div className="fixed top-5 right-5 z-55 max-w-sm w-full p-4 border rounded-2xl flex items-start gap-3 shadow-lg animate-in slide-in-from-top-5 duration-300 backdrop-blur-md opacity-98 select-none border-transparent text-white bg-slate-900/90 dark:bg-slate-950/95">
      <div className="text-blue-400 dark:text-blue-400">
        {getIcon()}
      </div>
      <div className="flex-1 text-xs font-semibold leading-relaxed pr-2">
        {toastMessage.message}
      </div>
      <button onClick={clearToast} className="text-slate-400 hover:text-white transition focus:outline-none">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};

export const App = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Guest Auth Paths */}
          <Route
            path="/login"
            element={
              <GuestRoute>
                <Login />
              </GuestRoute>
            }
          />
          <Route
            path="/register"
            element={
              <GuestRoute>
                <Register />
              </GuestRoute>
            }
          />
          <Route
            path="/forgot-password"
            element={
              <GuestRoute>
                <ForgotPassword />
              </GuestRoute>
            }
          />

          {/* Verification standalone */}
          <Route path="/verify-otp" element={<OTPVerification />} />

          {/* Secure Protected Paths */}
          <Route
            path="/family-selection"
            element={
              <ProtectedRoute>
                <FamilySelection />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />


          {/* Root redirect */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
        <GlobalToast />
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
