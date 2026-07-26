import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { OTPInput } from "../components/auth/OTPInput";
import api from "../services/api";
import { Smartphone, ShieldCheck, ArrowRight, Loader2, Timer, RotateCcw } from "lucide-react";

export const OTPVerification = () => {
  const [searchParams] = useSearchParams();
  const phone = searchParams.get("phone") || localStorage.getItem("tempPhone") || "9876543210";
  const [otp, setOtp] = useState("");
  const [timer, setTimer] = useState(180); // 3 minutes countdown
  const [verifying, setVerifying] = useState(false);
  const [otpError, setOtpError] = useState(null);
  const [success, setSuccess] = useState(false);
  const { loginWithOtp, selectPatient, showToast } = useAuth();
  const navigate = useNavigate();

  // Timer countdown hook
  useEffect(() => {
    if (timer === 0 || success) return;
    const interval = setInterval(() => {
      setTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timer, success]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) {
      setOtpError({ message: "OTP must be exactly 6 digits" });
      return;
    }

    setVerifying(true);
    setOtpError(null);
    try {
      // Simulate backend verify
      const profiles = await loginWithOtp(phone, otp);
      setSuccess(true);
      showToast("success", "Verification completed successfully!");
      
      // Delay redirection for success animation
      setTimeout(() => {
        if (profiles.length === 1) {
          selectPatient(profiles[0]);
          navigate("/dashboard");
        } else if (profiles.length > 1) {
          navigate("/family-selection");
        } else {
          navigate("/dashboard");
        }
      }, 1500);
    } catch (err) {
      setOtpError({ message: err.response?.data?.message || "Invalid OTP code." });
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    try {
      await api.post("/auth/otp/send", { phone_number: phone });
      setTimer(180);
      setOtp("");
      setOtpError(null);
      showToast("success", "A new OTP code has been sent!");
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 transition duration-300 relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-400/10 dark:bg-blue-600/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-500/10 dark:bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

      <header className="px-6 py-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-850 shrink-0 bg-white/40 dark:bg-slate-950/40 backdrop-blur-md">
        <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-blue-600 to-indigo-500 bg-clip-text text-transparent">
          Sahyog
        </span>
      </header>

      <main className="flex-1 flex items-center justify-center p-6 z-10">
        <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-xl rounded-3xl p-6 sm:p-8 text-center transition duration-300">
          
          {!success ? (
            <form onSubmit={handleVerify} className="space-y-6">
              <div className="w-14 h-14 bg-blue-50 dark:bg-slate-950 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-100/50 dark:border-slate-850">
                <Smartphone className="h-7 w-7" />
              </div>
              
              <div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Verification Required</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5">
                  Confirm OTP code sent to +91 {phone}
                </p>
              </div>

              <div>
                <OTPInput
                  value={otp}
                  onChange={(val) => {
                    setOtp(val);
                    if (otpError) setOtpError(null);
                  }}
                  error={otpError}
                />
              </div>

              {/* Timer & Resend */}
              <div className="flex items-center justify-between text-sm px-1.5">
                <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-455 font-medium">
                  <Timer className="h-4 w-4" />
                  <span>{formatTime(timer)}</span>
                </div>

                <button
                  type="button"
                  disabled={timer > 0}
                  onClick={handleResend}
                  className="flex items-center gap-1.5 font-bold text-blue-600 dark:text-blue-400 disabled:opacity-40 disabled:cursor-not-allowed hover:underline focus:outline-none"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Resend OTP
                </button>
              </div>

              <button
                type="submit"
                disabled={verifying || otp.length !== 6}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-xl shadow-md hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-blue-500/20 transition duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {verifying ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    Verify & Proceed
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <div className="py-8 space-y-5 animate-in zoom-in-95 duration-300">
              <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 border border-emerald-100 dark:border-emerald-900/50 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                <ShieldCheck className="h-9 w-9" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-850 dark:text-slate-100">Verification Successful</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Syncing clinical profiles and patient dashboard...
                </p>
              </div>
            </div>
          )}

        </div>
      </main>

      <footer className="py-4 border-t border-slate-100 dark:border-slate-850 text-center text-xs text-slate-400 dark:text-slate-600 shrink-0 bg-white/20">
        &copy; {new Date().getFullYear()} Sahyog. All rights reserved.
      </footer>
    </div>
  );
};

export default OTPVerification;
