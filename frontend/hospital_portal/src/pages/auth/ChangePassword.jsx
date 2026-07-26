import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { KeyRound, Eye, EyeOff, CheckCircle2, XCircle, ShieldAlert } from "lucide-react";
import api from "../../services/api";

// Password complexity rule definitions
const RULES = [
  { id: "length", label: "At least 8 characters", test: (p) => p.length >= 8 },
  { id: "upper",  label: "One uppercase letter",  test: (p) => /[A-Z]/.test(p) },
  { id: "lower",  label: "One lowercase letter",  test: (p) => /[a-z]/.test(p) },
  { id: "digit",  label: "One number",            test: (p) => /\d/.test(p) },
  { id: "special",label: "One special character", test: (p) => /[!@#$%^&*(),.?\":{}|<>]/.test(p) },
];

export default function ChangePassword() {
  const { employee, employeeToken, showToast } = useAuth();
  const navigate = useNavigate();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword]         = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent]         = useState(false);
  const [showNew, setShowNew]                 = useState(false);
  const [showConfirm, setShowConfirm]         = useState(false);
  const [loading, setLoading]                 = useState(false);
  const [error, setError]                     = useState("");

  const ruleResults = RULES.map((r) => ({ ...r, passed: r.test(newPassword) }));
  const allRulesPassed = ruleResults.every((r) => r.passed);
  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!allRulesPassed) {
      setError("New password does not meet the complexity requirements.");
      return;
    }
    if (!passwordsMatch) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await api.post(
        "/auth/employee/change-password",
        { current_password: currentPassword, new_password: newPassword },
        { headers: { Authorization: `Bearer ${employeeToken}` } }
      );
      showToast("success", "Password changed successfully! Redirecting to dashboard...");

      // Redirect based on role
      const role = employee?.role;
      if (role === "HOSPITAL_ADMIN")   navigate("/hospital/admin/dashboard");
      else if (role === "DOCTOR")      navigate("/doctor/dashboard");
      else if (role === "SUPPORT_STAFF") navigate("/support/dashboard");
      else navigate("/employee-login");
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (Array.isArray(detail)) {
        setError(detail.map((d) => d.msg).join(" "));
      } else {
        setError(detail || "Failed to change password. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-3xl p-8 space-y-6">

        {/* Header */}
        <div className="text-center space-y-3">
          <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/25 mx-auto">
            <KeyRound className="h-7 w-7" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-50">
              Set Your Password
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed max-w-xs mx-auto">
              You are logging in with a temporary password. Please create a secure personal password to continue.
            </p>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="p-3.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 text-xs rounded-2xl flex items-start gap-2.5">
            <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
            <span className="font-semibold leading-relaxed">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Current Password */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600 dark:text-slate-350 block">
              Current (Temporary) Password
            </label>
            <div className="relative">
              <input
                id="current-password"
                type={showCurrent ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter your temporary password"
                required
                className="w-full pl-4 pr-11 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition dark:text-slate-50"
              />
              <button type="button" onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 transition focus:outline-none">
                {showCurrent ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600 dark:text-slate-350 block">
              New Password
            </label>
            <div className="relative">
              <input
                id="new-password"
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Create a strong password"
                required
                className="w-full pl-4 pr-11 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition dark:text-slate-50"
              />
              <button type="button" onClick={() => setShowNew(!showNew)}
                className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 transition focus:outline-none">
                {showNew ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
              </button>
            </div>

            {/* Complexity Rules */}
            {newPassword.length > 0 && (
              <ul className="mt-2 space-y-1">
                {ruleResults.map((r) => (
                  <li key={r.id} className="flex items-center gap-1.5 text-xs">
                    {r.passed
                      ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      : <XCircle className="h-3.5 w-3.5 text-red-400 shrink-0" />}
                    <span className={r.passed ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-slate-500"}>
                      {r.label}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Confirm Password */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600 dark:text-slate-350 block">
              Confirm New Password
            </label>
            <div className="relative">
              <input
                id="confirm-password"
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                required
                className={`w-full pl-4 pr-11 py-2.5 bg-slate-50 dark:bg-slate-950 border text-sm rounded-xl focus:ring-2 focus:outline-none transition dark:text-slate-50 ${
                  confirmPassword.length > 0
                    ? passwordsMatch
                      ? "border-emerald-400 focus:ring-emerald-500/20"
                      : "border-red-400 focus:ring-red-500/20"
                    : "border-slate-200 dark:border-slate-800 focus:ring-blue-500/20"
                }`}
              />
              <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 transition focus:outline-none">
                {showConfirm ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
              </button>
            </div>
            {confirmPassword.length > 0 && !passwordsMatch && (
              <p className="text-3xs text-red-500 font-bold">Passwords do not match.</p>
            )}
          </div>

          <button
            id="change-password-submit"
            type="submit"
            disabled={loading || !allRulesPassed || !passwordsMatch}
            className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-slate-300 disabled:to-slate-400 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-500/20 active:scale-98 transition duration-200 cursor-pointer disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? "Updating Password..." : "Set New Password & Continue"}
          </button>
        </form>

        <div className="text-center text-3xs text-slate-400 font-semibold border-t border-slate-100 dark:border-slate-850 pt-4">
          Sahyog EMR Hospital System v1.0. Authorized Access Only.
        </div>
      </div>
    </div>
  );
}
