import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useAuth } from "../../context/AuthContext";
import { Activity, ShieldAlert, Eye, EyeOff, Sun, Moon } from "lucide-react";

export default function Login() {
  const { loginAsEmployee, globalLoading, theme, toggleTheme } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm({
    defaultValues: {
      employee_id: "",
      password: "",
      rememberMe: false
    }
  });

  const onSubmit = async (data) => {
    setErrorMessage("");
    try {
      const user = await loginAsEmployee(data.employee_id, data.password);
      if (user.is_first_login) {
        navigate("/change-password");
        return;
      }
      if (user.role === "HOSPITAL_ADMIN") {
        navigate("/hospital/admin/dashboard");
      } else if (user.role === "DOCTOR") {
        navigate("/doctor/dashboard");
      } else if (user.role === "SUPPORT_STAFF") {
        navigate("/support/dashboard");
      }
    } catch (err) {
      console.error(err);
      setErrorMessage(err.response?.data?.detail || "Login failed. Please check your credentials.");
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 transition duration-300 relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-[#50ABE7]/10 dark:bg-[#50ABE7]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-500/10 dark:bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 shrink-0 z-10 bg-white/40 dark:bg-slate-950/40 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-[#50ABE7] text-white rounded-xl flex items-center justify-center shadow-md shadow-[#50ABE7]/20">
            <Activity className="h-5 w-5" />
          </div>
          <span className="font-extrabold text-lg tracking-tight text-[#1E293B] dark:text-white">
            Sahyog <span className="text-[#50ABE7]">HIS</span>
          </span>
        </div>
        <button
          onClick={toggleTheme}
          className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 hover:-translate-y-0.5 transition active:scale-95 duration-200 cursor-pointer shadow-sm text-slate-600 dark:text-slate-400"
          aria-label="Toggle Theme"
        >
          {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </button>
      </header>

      {/* Main card */}
      <main className="flex-1 flex items-center justify-center p-6 z-10">
        <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-500">
          <div className="bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 shadow-xl rounded-3xl p-8 space-y-6">

            {/* Brand header */}
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-[#EDF7FF] dark:bg-slate-800 text-[#50ABE7] rounded-2xl flex items-center justify-center shadow-sm mx-auto">
                <Activity className="h-6 w-6" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-[#1E293B] dark:text-white">
                Staff Portal Login
              </h1>
              <p className="text-xs text-[#64748B] dark:text-slate-400">
                Enter your employee ID and credentials to access the portal
              </p>
            </div>

            {/* Error banner */}
            {errorMessage && (
              <div className="p-3.5 bg-[#FEF2F2] dark:bg-red-950/20 border border-[#FCA5A5] dark:border-red-900/30 text-[#EF4444] text-xs rounded-2xl flex items-start gap-2.5">
                <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                <span className="font-semibold leading-relaxed">{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Employee ID */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#64748B] dark:text-slate-400 block uppercase tracking-wide">
                  Employee ID
                </label>
                <input
                  type="text"
                  placeholder="e.g. EMP102"
                  className={`w-full px-4 py-2.5 bg-[#F8FAFC] dark:bg-slate-950 border text-sm rounded-xl focus:ring-2 focus:ring-[#50ABE7]/20 focus:border-[#50ABE7] focus:outline-none transition dark:text-slate-50 ${
                    errors.employee_id ? "border-[#EF4444]" : "border-[#E5E7EB] dark:border-slate-800"
                  }`}
                  {...register("employee_id", {
                    required: "Employee ID is required",
                    minLength: { value: 3, message: "Employee ID must be at least 3 characters" }
                  })}
                />
                {errors.employee_id && (
                  <span className="text-xs text-[#EF4444] font-semibold block">
                    {errors.employee_id.message}
                  </span>
                )}
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#64748B] dark:text-slate-400 block uppercase tracking-wide">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className={`w-full pl-4 pr-11 py-2.5 bg-[#F8FAFC] dark:bg-slate-950 border text-sm rounded-xl focus:ring-2 focus:ring-[#50ABE7]/20 focus:border-[#50ABE7] focus:outline-none transition dark:text-slate-50 ${
                      errors.password ? "border-[#EF4444]" : "border-[#E5E7EB] dark:border-slate-800"
                    }`}
                    {...register("password", {
                      required: "Password is required",
                      minLength: { value: 6, message: "Password must be at least 6 characters" }
                    })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3 text-[#94A3B8] hover:text-[#64748B] transition focus:outline-none cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && (
                  <span className="text-xs text-[#EF4444] font-semibold block">
                    {errors.password.message}
                  </span>
                )}
              </div>

              {/* Remember Me */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="rememberMe"
                  className="rounded border-slate-200 dark:border-slate-800 text-[#50ABE7] focus:ring-0 focus:ring-offset-0 cursor-pointer"
                  {...register("rememberMe")}
                />
                <label htmlFor="rememberMe" className="text-xs font-semibold text-[#64748B] dark:text-slate-400 cursor-pointer select-none">
                  Remember Me
                </label>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={globalLoading}
                className="w-full py-3 px-4 bg-[#50ABE7] hover:bg-[#3ea0df] text-white font-bold text-sm rounded-xl shadow-md shadow-[#50ABE7]/20 active:scale-[0.98] transition duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {globalLoading ? "Authenticating..." : "Sign In to Portal"}
              </button>
            </form>

            <div className="text-center text-[10px] text-[#94A3B8] font-semibold border-t border-[#E5E7EB] dark:border-slate-800 pt-4">
              Sahyog EMR Hospital System v1.0 · Authorized Access Only
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 border-t border-slate-100 dark:border-slate-800 text-center text-xs text-[#94A3B8] shrink-0 z-10 bg-white/20 dark:bg-slate-950/20">
        &copy; {new Date().getFullYear()} Sahyog Healthcare Platform. All rights reserved.
      </footer>
    </div>
  );
}
