import React, { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { MobileInput } from "./MobileInput";
import { OTPInput } from "./OTPInput";
import api from "../../services/api";
import { Smartphone, ShieldCheck, ArrowRight, Loader2 } from "lucide-react";

// ── Schema ─────────────────────────────────────────────────
const otpLoginSchema = z.object({
  phone_number: z.string().length(10, "Mobile number must be exactly 10 digits"),
  otp:          z.string().length(6,  "OTP must be exactly 6 digits")
});

// ── Component ──────────────────────────────────────────────
export const LoginForm = () => {
  const [otpSent, setOtpSent]       = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const { loginWithOtp, selectPatient, showToast } = useAuth();
  const navigate = useNavigate();

  const {
    control,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: zodResolver(otpLoginSchema),
    defaultValues: { phone_number: "", otp: "" }
  });

  // Send OTP
  const handleSendOtp = async () => {
    const phoneNumber = getValues("phone_number");
    if (!phoneNumber || phoneNumber.length !== 10) {
      showToast("error", "Please enter a valid 10-digit mobile number first.");
      return;
    }
    setSendingOtp(true);
    try {
      const res = await api.post("/auth/otp/send", { phone_number: phoneNumber });
      setOtpSent(true);
      showToast("success", res.data.message || "OTP sent successfully!");
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.detail || "Failed to send OTP.";
      showToast("error", msg);
    } finally {
      setSendingOtp(false);
    }
  };

  // Verify OTP and log in
  const onSubmit = async (data) => {
    try {
      const familyProfiles = await loginWithOtp(data.phone_number, data.otp);
      handleRedirect(familyProfiles);
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.detail || "OTP verification failed. Please try again.";
      showToast("error", msg);
    }
  };

  // Post-login routing
  const handleRedirect = (profiles) => {
    if (profiles.length === 1) {
      selectPatient(profiles[0]);
      navigate("/dashboard");
    } else if (profiles.length > 1) {
      navigate("/family-selection");
    } else {
      // Authenticated but no patient profile linked yet
      navigate("/register", { state: { step: 2 } });
    }
  };

  return (
    <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-xl rounded-3xl p-6 sm:p-8 transition duration-300">

      {/* Title */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Welcome to Sahyog</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5">
          Access your digital health account safely
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Mobile Number */}
        <div>
          <Controller
            name="phone_number"
            control={control}
            render={({ field }) => (
              <MobileInput
                label="Mobile Number"
                disabled={otpSent}
                error={errors.phone_number}
                {...field}
              />
            )}
          />
        </div>

        {/* Before OTP is sent: show Send OTP button */}
        {!otpSent ? (
          <button
            type="button"
            onClick={handleSendOtp}
            disabled={sendingOtp}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-xl shadow-md hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-blue-500/20 transition duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sendingOtp ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <><span>Send OTP Code</span><Smartphone className="h-4 w-4" /></>
            )}
          </button>
        ) : (
          /* After OTP is sent: show OTP field + verify button */
          <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/50 rounded-2xl p-3.5 flex items-start gap-3">
              <ShieldCheck className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <div className="text-xs text-slate-600 dark:text-slate-400">
                We sent a 6-digit OTP to{" "}
                <strong className="font-semibold text-slate-800 dark:text-slate-200">
                  +91 {getValues("phone_number")}
                </strong>.{" "}
                <button
                  type="button"
                  onClick={() => setOtpSent(false)}
                  className="ml-0.5 font-bold text-blue-600 dark:text-blue-400 hover:underline focus:outline-none"
                >
                  Change Number
                </button>
              </div>
            </div>

            <div>
              <Controller
                name="otp"
                control={control}
                render={({ field }) => (
                  <OTPInput label="Verification Code" error={errors.otp} {...field} />
                )}
              />
            </div>

            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 dark:text-slate-400">Didn't receive code?</span>
              <button
                type="button"
                onClick={handleSendOtp}
                className="font-bold text-blue-600 dark:text-blue-400 hover:underline focus:outline-none"
              >
                Resend OTP
              </button>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-4 rounded-xl shadow-md hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-emerald-500/20 transition duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <><span>Verify & Sign In</span><ArrowRight className="h-4 w-4" /></>
              )}
            </button>
          </div>
        )}
      </form>

      {/* Footer */}
      <div className="mt-8 pt-5 border-t border-slate-100 dark:border-slate-800/80 text-center">
        <p className="text-slate-500 dark:text-slate-400 text-sm">
          New to Sahyog?{" "}
          <Link to="/register" className="font-bold text-blue-600 dark:text-blue-400 hover:underline">
            Register Now
          </Link>
        </p>
      </div>
    </div>
  );
};
