import React, { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { MobileInput } from "./MobileInput";
import { PasswordInput } from "./PasswordInput";
import { OTPInput } from "./OTPInput";
import api from "../../services/api";
import { Lock, Smartphone, ShieldCheck, ArrowRight, Loader2 } from "lucide-react";

// Zod validation schemas
const passwordLoginSchema = z.object({
  phone_number: z.string().length(10, "Mobile number must be exactly 10 digits"),
  password: z.string().min(8, "Password must be at least 8 characters")
});

const otpLoginSchema = z.object({
  phone_number: z.string().length(10, "Mobile number must be exactly 10 digits"),
  otp: z.string().length(6, "OTP must be exactly 6 digits")
});

export const LoginForm = () => {
  const [activeTab, setActiveTab] = useState("password"); // "password" | "otp"
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const { loginWithPassword, loginWithOtp, selectPatient, showToast } = useAuth();
  const navigate = useNavigate();

  // Password Form Hook
  const {
    register: registerPass,
    handleSubmit: handleSubmitPass,
    formState: { errors: errorsPass, isSubmitting: isSubmittingPass }
  } = useForm({
    resolver: zodResolver(passwordLoginSchema),
    defaultValues: { phone_number: "", password: "" }
  });

  // OTP Form Hook
  const {
    control: controlOtp,
    handleSubmit: handleSubmitOtp,
    getValues: getValuesOtp,
    formState: { errors: errorsOtp, isSubmitting: isSubmittingOtp }
  } = useForm({
    resolver: zodResolver(otpLoginSchema),
    defaultValues: { phone_number: "", otp: "" }
  });

  // Handle Password Submit
  const onPasswordSubmit = async (data) => {
    try {
      const familyProfiles = await loginWithPassword(data.phone_number, data.password);
      handleRedirect(familyProfiles);
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.detail || "Login failed. Please check your credentials.";
      showToast("error", msg);
    }
  };

  // Handle OTP Send
  const handleSendOtp = async () => {
    const phoneNumber = getValuesOtp("phone_number");
    if (!phoneNumber || phoneNumber.length !== 10) {
      showToast("error", "Please enter a valid 10-digit mobile number first.");
      return;
    }
    setSendingOtp(true);
    try {
      const res = await api.post("/auth/otp/send", { phone_number: phoneNumber });
      setOtpSent(true);
      showToast("success", res.data.message || "OTP Sent successfully!");
    } catch (err) {
      console.error(err);
    } finally {
      setSendingOtp(false);
    }
  };

  // Handle OTP Verify Submit
  const onOtpSubmit = async (data) => {
    try {
      const familyProfiles = await loginWithOtp(data.phone_number, data.otp);
      handleRedirect(familyProfiles);
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.detail || "OTP verification failed. Please try again.";
      showToast("error", msg);
    }
  };

  // Handle redirect checks
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

      {/* Tabs Selector */}
      <div className="flex bg-slate-100 dark:bg-slate-950 p-1.5 rounded-2xl mb-6">
        <button
          type="button"
          onClick={() => {
            setActiveTab("password");
            setOtpSent(false);
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-xl transition duration-200 ${
            activeTab === "password"
              ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <Lock className="h-4 w-4" />
          Password
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("otp")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-xl transition duration-200 ${
            activeTab === "otp"
              ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <Smartphone className="h-4 w-4" />
          OTP Code
        </button>
      </div>

      {/* Option 1: Mobile & Password Form */}
      {activeTab === "password" && (
        <form onSubmit={handleSubmitPass(onPasswordSubmit)} className="space-y-5">
          <div>
            <MobileInput
              label="Mobile Number"
              error={errorsPass.phone_number}
              {...registerPass("phone_number")}
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Password
              </label>
              <Link
                to="/forgot-password"
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
              >
                Forgot Password?
              </Link>
            </div>
            <PasswordInput error={errorsPass.password} {...registerPass("password")} />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="remember_me"
              className="h-4 w-4 text-blue-600 focus:ring-blue-500/20 border-slate-300 rounded-md bg-white dark:bg-slate-950 dark:border-slate-800"
            />
            <label
              htmlFor="remember_me"
              className="ml-2 block text-xs font-medium text-slate-600 dark:text-slate-400 select-none cursor-pointer"
            >
              Remember this device
            </label>
          </div>

          <button
            type="submit"
            disabled={isSubmittingPass}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-xl shadow-md hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-blue-500/20 transition duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmittingPass ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                Sign In with Password
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>
      )}

      {/* Option 2: Mobile & OTP Form */}
      {activeTab === "otp" && (
        <form onSubmit={handleSubmitOtp(onOtpSubmit)} className="space-y-5">
          <div>
            <Controller
              name="phone_number"
              control={controlOtp}
              render={({ field }) => (
                <MobileInput
                  label="Mobile Number"
                  disabled={otpSent}
                  error={errorsOtp.phone_number}
                  {...field}
                />
              )}
            />
          </div>

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
                <>
                  Send OTP Code
                  <Smartphone className="h-4 w-4" />
                </>
              )}
            </button>
          ) : (
            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/50 rounded-2xl p-3.5 flex items-start gap-3">
                <ShieldCheck className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div className="text-xs text-slate-600 dark:text-slate-400">
                  We sent a 6-digit OTP code to <strong className="font-semibold text-slate-800 dark:text-slate-200">+91 {getValuesOtp("phone_number")}</strong>.
                  <button
                    type="button"
                    onClick={() => setOtpSent(false)}
                    className="ml-1.5 font-bold text-blue-600 dark:text-blue-400 hover:underline focus:outline-none"
                  >
                    Change Number
                  </button>
                </div>
              </div>

              <div>
                <Controller
                  name="otp"
                  control={controlOtp}
                  render={({ field }) => (
                    <OTPInput label="Verification Code" error={errorsOtp.otp} {...field} />
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
                disabled={isSubmittingOtp}
                className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-4 rounded-xl shadow-md hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-emerald-500/20 transition duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmittingOtp ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    Verify & Authenticate
                    <ShieldCheck className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          )}
        </form>
      )}

      {/* Footer Links */}
      <div className="mt-8 pt-5 border-t border-slate-100 dark:border-slate-800/80 text-center">
        <p className="text-slate-500 dark:text-slate-400 text-sm">
          New to Sahyog?{" "}
          <Link
            to="/register"
            className="font-bold text-blue-600 dark:text-blue-400 hover:underline"
          >
            Register Now
          </Link>
        </p>
      </div>
    </div>
  );
};
