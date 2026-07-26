import React, { createContext, useContext, useState, useEffect } from "react";
import api from "../services/api";

const AuthContext = createContext(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};

export const AuthProvider = ({ children }) => {
  const [employee, setEmployee] = useState(() => {
    const val = localStorage.getItem("employee");
    return val ? JSON.parse(val) : null;
  });
  const [employeeToken, setEmployeeToken] = useState(() => localStorage.getItem("employeeToken"));
  const [globalLoading, setGlobalLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "light");

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => (prev === "light" ? "dark" : "light"));

  const showToast = (type, message) => {
    setToastMessage({ type, message });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const clearToast = () => setToastMessage(null);

  const loginAsEmployee = async (employeeId, password) => {
    setGlobalLoading(true);
    try {
      const res = await api.post("/auth/employee/login", {
        employee_id: employeeId,
        password: password
      });
      const data = res.data;
      localStorage.setItem("employeeToken", data.accessToken);
      localStorage.setItem("employee", JSON.stringify(data));
      setEmployeeToken(data.accessToken);
      setEmployee(data);
      showToast("success", `Welcome back, ${data.first_name}!`);
      return data;
    } catch (err) {
      const errorMsg = err.response?.data?.detail || "Authentication failed.";
      showToast("error", errorMsg);
      throw err;
    } finally {
      setGlobalLoading(false);
    }
  };

  const employeeLogout = () => {
    localStorage.removeItem("employeeToken");
    localStorage.removeItem("employee");
    setEmployeeToken(null);
    setEmployee(null);
    showToast("info", "Logged out successfully.");
  };

  return (
    <AuthContext.Provider
      value={{
        employee,
        employeeToken,
        globalLoading,
        toastMessage,
        theme,
        loginAsEmployee,
        employeeLogout,
        toggleTheme,
        showToast,
        clearToast
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
