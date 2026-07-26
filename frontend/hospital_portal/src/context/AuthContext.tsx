import React, { createContext, useContext, useState, useEffect } from "react";
import api from "../services/api";

interface ToastMessage {
  type: "success" | "error" | "info" | "warning";
  message: string;
}

interface AuthContextType {
  employee: any;
  employeeToken: string | null;
  globalLoading: boolean;
  toastMessage: ToastMessage | null;
  theme: string;
  loginAsEmployee: (employeeId: string, password: string) => Promise<any>;
  employeeLogout: () => void;
  toggleTheme: () => void;
  showToast: (type: "success" | "error" | "info" | "warning", message: string) => void;
  clearToast: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [employee, setEmployee] = useState<any>(() => {
    const val = localStorage.getItem("employee");
    return val ? JSON.parse(val) : null;
  });
  const [employeeToken, setEmployeeToken] = useState<string | null>(() => localStorage.getItem("employeeToken"));
  const [globalLoading, setGlobalLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<ToastMessage | null>(null);
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

  const showToast = (type: "success" | "error" | "info" | "warning", message: string) => {
    setToastMessage({ type, message });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const clearToast = () => setToastMessage(null);

  const loginAsEmployee = async (employeeId: string, password: string) => {
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
    } catch (err: any) {
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
