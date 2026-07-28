import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { KeyRound, Eye, EyeOff, CheckCircle2, XCircle, ShieldAlert, Activity } from "lucide-react";
import api from "../../services/api";

// Password complexity rule definitions — preserved exactly
const RULES = [
  { id: "length",  label: "At least 8 characters",  test: (p) => p.length >= 8 },
  { id: "upper",   label: "One uppercase letter",    test: (p) => /[A-Z]/.test(p) },
  { id: "lower",   label: "One lowercase letter",    test: (p) => /[a-z]/.test(p) },
  { id: "digit",   label: "One number",              test: (p) => /\d/.test(p) },
  { id: "special", label: "One special character",   test: (p) => /[!@#$%^&*(),.?":{}|<>]/.test(p) },
];

export default function ChangePassword() {
  const { employee, employeeToken, showToast } = useAuth();
  const navigate = useNavigate();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword,     setNewPassword]     = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent,     setShowCurrent]     = useState(false);
  const [showNew,         setShowNew]         = useState(false);
  const [showConfirm,     setShowConfirm]     = useState(false);
  const [loading,         setLoading]         = useState(false);
  const [error,           setError]           = useState("");

  const ruleResults  = RULES.map((r) => ({ ...r, passed: r.test(newPassword) }));
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
    <div className="min-h-screen flex flex-col justify-between bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 transition duration-300 relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-[#50ABE7]/10 dark:bg-[#50ABE7]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-500/10 dark:bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <header className="px-6 py-4 flex items-center border-b border-slate-100 dark:border-slate-800 shrink-0 z-10 bg-white/40 dark:bg-slate-950/40 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-[#50ABE7] text-white rounded-xl flex items-center justify-center shadow-md shadow-[#50ABE7]/20">
            <Activity className="h-5 w-5" />
          </div>
          <span className="font-extrabold text-lg tracking-tight text-[#1E293B] dark:text-white">
            Sahyog <span className="text-[#50ABE7]">HIS</span>
          </span>
        </div>
      </header>

      {/* Main card */}
      <main className="flex-1 flex items-center justify-center p-6 z-10">
        <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-500">
          <div className="bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 shadow-xl rounded-3xl p-8 space-y-6">

            {/* Header */}
            <div className="text-center space-y-3">
              <div className="w-14 h-14 bg-[#EDF7FF] dark:bg-slate-800 text-[#50ABE7] rounded-2xl flex items-center justify-center shadow-sm mx-auto">
                <KeyRound className="h-7 w-7" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-[#1E293B] dark:text-white">
                  Set Your Password
                </h1>
                <p className="text-xs text-[#64748B] dark:text-slate-400 mt-1 leading-relaxed max-w-xs mx-auto">
                  You are logged in with a temporary password. Create a secure personal password to continue.
                </p>
              </div>
            </div>

            {/* Error banner */}
            {error && (
              <div className="p-3.5 bg-[#FEF2F2] dark:bg-red-950/20 border border-[#FCA5A5] dark:border-red-900/30 text-[#EF4444] text-xs rounded-2xl flex items-start gap-2.5">
                <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                <span className="font-semibold leading-relaxed">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Current Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#64748B] dark:text-slate-400 block uppercase tracking-wide">
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
                    className="w-full pl-4 pr-11 py-2.5 bg-[#F8FAFC] dark:bg-slate-950 border border-[#E5E7EB] dark:border-slate-800 text-sm rounded-xl focus:ring-2 focus:ring-[#50ABE7]/20 focus:border-[#50ABE7] focus:outline-none transition dark:text-slate-50"
                  />
                  <button type="button" onClick={() => setShowCurrent(!showCurrent)}
                    className="absolute right-3.5 top-3 text-[#94A3B8] hover:text-[#64748B] transition focus:outline-none cursor-pointer">
                    {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#64748B] dark:text-slate-400 block uppercase tracking-wide">
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
                    className="w-full pl-4 pr-11 py-2.5 bg-[#F8FAFC] dark:bg-slate-950 border border-[#E5E7EB] dark:border-slate-800 text-sm rounded-xl focus:ring-2 focus:ring-[#50ABE7]/20 focus:border-[#50ABE7] focus:outline-none transition dark:text-slate-50"
                  />
                  <button type="button" onClick={() => setShowNew(!showNew)}
                    className="absolute right-3.5 top-3 text-[#94A3B8] hover:text-[#64748B] transition focus:outline-none cursor-pointer">
                    {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                {/* Complexity Rules */}
                {newPassword.length > 0 && (
                  <ul className="mt-2 space-y-1 p-3 bg-[#F8FAFC] dark:bg-slate-950 rounded-xl border border-[#E5E7EB] dark:border-slate-800">
                    {ruleResults.map((r) => (
                      <li key={r.id} className="flex items-center gap-1.5 text-xs">
                        {r.passed
                          ? <CheckCircle2 className="h-3.5 w-3.5 text-[#10B981] shrink-0" />
                          : <XCircle className="h-3.5 w-3.5 text-[#EF4444] shrink-0" />}
                        <span className={r.passed ? "text-[#10B981] font-medium" : "text-[#64748B]"}>
                          {r.label}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#64748B] dark:text-slate-400 block uppercase tracking-wide">
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
                    className={`w-full pl-4 pr-11 py-2.5 bg-[#F8FAFC] dark:bg-slate-950 border text-sm rounded-xl focus:ring-2 focus:outline-none transition dark:text-slate-50 ${
                      confirmPassword.length > 0
                        ? passwordsMatch
                          ? "border-[#10B981] focus:ring-[#10B981]/20"
                          : "border-[#EF4444] focus:ring-[#EF4444]/20"
                        : "border-[#E5E7EB] dark:border-slate-800 focus:ring-[#50ABE7]/20 focus:border-[#50ABE7]"
                    }`}
                  />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3.5 top-3 text-[#94A3B8] hover:text-[#64748B] transition focus:outline-none cursor-pointer">
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {confirmPassword.length > 0 && !passwordsMatch && (
                  <p className="text-xs text-[#EF4444] font-semibold">Passwords do not match.</p>
                )}
              </div>

              {/* Submit */}
              <button
                id="change-password-submit"
                type="submit"
                disabled={loading || !allRulesPassed || !passwordsMatch}
                className="w-full py-3 px-4 bg-[#50ABE7] hover:bg-[#3ea0df] disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white font-bold text-sm rounded-xl shadow-md shadow-[#50ABE7]/20 active:scale-[0.98] transition duration-200 cursor-pointer disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? "Updating Password..." : "Set New Password & Continue"}
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
