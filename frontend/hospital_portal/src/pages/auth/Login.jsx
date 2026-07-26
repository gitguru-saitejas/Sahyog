import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useAuth } from "../../context/AuthContext";
import { Activity, ShieldAlert, Eye, EyeOff } from "lucide-react";

export default function Login() {
  const { loginAsEmployee, globalLoading } = useAuth();
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
      // If this is a first login (temp password), force a password change
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-955 flex flex-col justify-center items-center p-4 transition-colors duration-300">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl rounded-3xl p-8 space-y-6">
        
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20 mx-auto">
            <Activity className="h-6 w-6" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-855 dark:text-slate-50">
            Sahyog HIS Login
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Enter your employee ID and credentials to access the portal
          </p>
        </div>

        {errorMessage && (
          <div className="p-3.5 bg-red-50 dark:bg-red-955/20 border border-red-200/50 dark:border-red-900/30 text-red-655 dark:text-red-400 text-xs rounded-2xl flex items-start gap-2.5">
            <ShieldAlert className="h-4.5 w-4.5 shrink-0" />
            <span className="font-semibold leading-relaxed">{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-655 dark:text-slate-350 block">
              Employee ID
            </label>
            <input
              type="text"
              placeholder="e.g. EMP102"
              className={`w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-955 border text-sm rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition dark:text-slate-50 ${
                errors.employee_id ? "border-red-500" : "border-slate-200 dark:border-slate-800"
              }`}
              {...register("employee_id", {
                required: "Employee ID is required",
                minLength: { value: 3, message: "Employee ID must be at least 3 characters" }
              })}
            />
            {errors.employee_id && (
              <span className="text-3xs text-red-500 font-bold block">
                {errors.employee_id.message}
              </span>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-655 dark:text-slate-350 block">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                className={`w-full pl-4 pr-11 py-2.5 bg-slate-50 dark:bg-slate-955 border text-sm rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition dark:text-slate-50 ${
                  errors.password ? "border-red-500" : "border-slate-200 dark:border-slate-800"
                }`}
                {...register("password", {
                  required: "Password is required",
                  minLength: { value: 6, message: "Password must be at least 6 characters" }
                })}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3 text-slate-455 hover:text-slate-655 transition focus:outline-none"
              >
                {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
              </button>
            </div>
            {errors.password && (
              <span className="text-3xs text-red-500 font-bold block">
                {errors.password.message}
              </span>
            )}
          </div>

          <div className="flex items-center justify-between text-xs pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-slate-600 dark:text-slate-400 select-none">
              <input
                type="checkbox"
                className="rounded text-blue-600 border-slate-200 dark:border-slate-800 focus:ring-0 focus:ring-offset-0"
                {...register("rememberMe")}
              />
              <span className="font-semibold">Remember Me</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={globalLoading}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-500/10 active:scale-98 transition duration-200 cursor-pointer disabled:opacity-50"
          >
            {globalLoading ? "Authenticating..." : "Sign In"}
          </button>
        </form>

        <div className="text-center text-3xs text-slate-400 font-semibold border-t border-slate-100 dark:border-slate-850 pt-4">
          Sahyog EMR Hospital System v1.0. Authorized Access Only.
        </div>
      </div>
    </div>
  );
}
