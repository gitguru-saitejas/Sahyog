import React, { createContext, useContext, useState, useEffect } from "react";
import api, { apiEvents } from "../services/api";

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};

export const AuthProvider = ({ children }) => {
  const [familyAccountId, setFamilyAccountId] = useState(() => localStorage.getItem("familyAccountId") || null);
  const [patients, setPatients] = useState([]);
  const [patientsLoaded, setPatientsLoaded] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(() => {
    const val = localStorage.getItem("selectedPatient");
    return val ? JSON.parse(val) : null;
  });
  const [globalLoading, setGlobalLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "light");

  // Subscribe to Axios interceptor loading and toast notifications
  useEffect(() => {
    const unsubLoading = apiEvents.subscribe("loading", (isLoading) => setGlobalLoading(isLoading));
    const unsubToast = apiEvents.subscribe("toast", (msg) => {
      setToastMessage(msg);
      setTimeout(() => setToastMessage(null), 4000); // Auto-clear toast
    });

    return () => {
      unsubLoading();
      unsubToast();
    };
  }, []);

  // Theme Toggler
  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === "light" ? "dark" : "light");

  // Load family members on mount or when familyAccountId changes
  useEffect(() => {
    if (familyAccountId) {
      refreshPatients();
    } else {
      setPatients([]);
    }
  }, [familyAccountId]);

  const showToast = (type, message) => {
    setToastMessage({ type, message });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const refreshPatients = async () => {
    try {
      const res = await api.get("/patients");
      setPatients(res.data);
    } catch (err) {
      console.error("Failed to load family members:", err);
    } finally {
      setPatientsLoaded(true);
    }
  };

  // If no family account, mark patients as loaded immediately
  useEffect(() => {
    if (!familyAccountId) setPatientsLoaded(true);
  }, [familyAccountId]);

  // Auth Methods
  const handleLoginResponse = (data) => {
    localStorage.setItem("accessToken", data.accessToken);
    localStorage.setItem("familyAccountId", data.family_account_id);
    setFamilyAccountId(data.family_account_id);
    setPatients(data.patients || []);
    
    showToast("success", "Login successful!");
    
    // Redirect logic: handled in pages, but we return values to support it
    return data.patients || [];
  };

  const loginWithPassword = async (phoneNumber, password) => {
    const res = await api.post("/auth/login", {
      phone_number: phoneNumber,
      password,
      login_type: "password"
    });
    return handleLoginResponse(res.data);
  };

  const loginWithOtp = async (phoneNumber, code) => {
    const res = await api.post("/auth/otp/verify", {
      phone_number: phoneNumber,
      code
    });
    return handleLoginResponse(res.data);
  };

  const registerPatient = async (registrationData) => {
    const res = await api.post("/auth/register", registrationData);
    showToast("success", "Account credentials saved! Verify OTP to finalize.");
    return res.data; // contains phone_number to redirect to OTP screen
  };

  const logout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("familyAccountId");
    localStorage.removeItem("selectedPatient");
    localStorage.removeItem("selectedPatientId");
    
    setFamilyAccountId(null);
    setPatients([]);
    setSelectedPatient(null);
    showToast("info", "Logged out successfully.");
  };

  const selectPatient = (patient) => {
    if (patient) {
      localStorage.setItem("selectedPatient", JSON.stringify(patient));
      localStorage.setItem("selectedPatientId", patient.id);
      setSelectedPatient(patient);
      showToast("success", `Switched profile to ${patient.first_name}`);
    } else {
      localStorage.removeItem("selectedPatient");
      localStorage.removeItem("selectedPatientId");
      setSelectedPatient(null);
    }
  };

  const registerNewFamilyMember = async (patientData) => {
    const res = await api.post("/patients", {
      patientData,
      family_account_id: familyAccountId
    });
    showToast("success", `${patientData.first_name} added to family!`);
    await refreshPatients();
    return res.data;
  };

  const linkExistingFamilyMember = async (phone, otpCode, aadhaar) => {
    const res = await api.post("/patients/link", {
      family_account_id: familyAccountId,
      phone_number: phone,
      otp_code: otpCode,
      patient_aadhaar: aadhaar
    });
    showToast("success", "Profile linked successfully!");
    await refreshPatients();
    return res.data;
  };

  const clearToast = () => setToastMessage(null);

  const value = {
    familyAccountId,
    patients,
    patientsLoaded,
    selectedPatient,
    globalLoading,
    toastMessage,
    theme,
    toggleTheme,
    loginWithPassword,
    loginWithOtp,
    registerPatient,
    logout,
    selectPatient,
    registerNewFamilyMember,
    linkExistingFamilyMember,
    refreshPatients,
    showToast,
    clearToast
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

