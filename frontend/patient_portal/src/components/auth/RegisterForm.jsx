import React, { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { MobileInput } from "./MobileInput";
import { OTPInput } from "./OTPInput";
import api from "../../services/api";
import {
  User,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Smartphone,
  ShieldCheck,
  CheckCircle2
} from "lucide-react";

// ── Schemas ────────────────────────────────────────────────
const step1Schema = z.object({
  first_name: z.string().min(1, "First Name is required"),
  last_name:  z.string().min(1, "Last Name is required")
});

const step2Schema = z.object({
  phone_number: z.string().length(10, "Mobile number must be exactly 10 digits"),
  otp_code:     z.string().length(6, "OTP must be exactly 6 digits")
});

const step3Schema = z.object({
  aadhaar: z
    .string()
    .length(12, "Aadhaar must be exactly 12 digits")
    .regex(/^[0-9]+$/, "Aadhaar must contain digits only")
});

// ── Component ──────────────────────────────────────────────
export const RegisterForm = () => {
  const [step, setStep]               = useState(1); // 1 | 2 | 3
  const [identity, setIdentity]       = useState(null); // { first_name, last_name }
  const [phone, setPhone]             = useState("");   // verified phone number
  const [otpSent, setOtpSent]         = useState(false);
  const [otpSending, setOtpSending]   = useState(false);
  const { registerPatient, showToast } = useAuth();
  const navigate = useNavigate();

  // ── Step 1: Name ──────────────────────────────────────────
  const {
    register: regS1,
    handleSubmit: handleS1,
    formState: { errors: errS1, isSubmitting: subS1 }
  } = useForm({
    resolver: zodResolver(step1Schema),
    defaultValues: { first_name: "", last_name: "" }
  });

  // ── Step 2: Phone + OTP ───────────────────────────────────
  const {
    control: controlS2,
    register: regS2,
    getValues: getValS2,
    handleSubmit: handleS2,
    formState: { errors: errS2, isSubmitting: subS2 }
  } = useForm({
    resolver: zodResolver(step2Schema),
    defaultValues: { phone_number: "", otp_code: "" }
  });

  // ── Step 3: Aadhaar ───────────────────────────────────────
  const {
    register: regS3,
    handleSubmit: handleS3,
    formState: { errors: errS3, isSubmitting: subS3 }
  } = useForm({
    resolver: zodResolver(step3Schema),
    defaultValues: { aadhaar: "" }
  });

  // ── Handlers ───────────────────────────────────────────────
  const onStep1 = (data) => {
    setIdentity(data);
    setStep(2);
  };

  const handleSendOtp = async () => {
    const phoneNumber = getValS2("phone_number");
    if (!phoneNumber || phoneNumber.length !== 10) {
      showToast("error", "Please enter a valid 10-digit mobile number first.");
      return;
    }
    setOtpSending(true);
    try {
      await api.post("/auth/otp/send", { phone_number: phoneNumber });
      setOtpSent(true);
      showToast("success", "OTP sent. Check your mobile.");
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.detail || "Failed to send OTP.";
      showToast("error", msg);
    } finally {
      setOtpSending(false);
    }
  };

  const handleResendOtp = async () => {
    const phoneNumber = getValS2("phone_number");
    if (!phoneNumber) return;
    try {
      await api.post("/auth/otp/send", { phone_number: phoneNumber });
      showToast("success", "OTP resent successfully.");
    } catch (err) {
      console.error(err);
    }
  };

  const onStep2 = async (data) => {
    try {
      await api.post("/auth/otp/verify", {
        phone_number: data.phone_number,
        code: data.otp_code
      });
      setPhone(data.phone_number);
      showToast("success", "Mobile verified! Enter your Aadhaar to finish.");
      setStep(3);
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.detail || "OTP verification failed.";
      showToast("error", msg);
    }
  };

  const onStep3 = async (data) => {
    try {
      const payload = {
        credentials: {
          phone_number: phone
          // no password — backend generates one internally
        },
        personal: {
          first_name: identity.first_name,
          last_name:  identity.last_name,
          aadhaar:    data.aadhaar,
          relation:   "SELF"
        },
        address:   { address_line1: "", address_line2: "", city: "", district: "", state: "", pincode: "" },
        emergency: { name: "", relationship: "", phone_number: "" },
        medical:   { diseases: "", allergies: "", medications: "" },
        consent:   { agreeTerms: true, consentStorage: true }
      };

      await registerPatient(payload);
      showToast("success", "Registration successful! Please log in.");
      navigate("/login");
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.detail || "Registration failed. Please try again.";
      showToast("error", msg);
    }
  };

  // ── Stepper progress ──────────────────────────────────────
  const progressPct = step === 1 ? 33 : step === 2 ? 66 : 100;
  const stepLabels  = ["Identity", "Verify", "Aadhaar"];

  return (
    <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-xl rounded-3xl p-6 sm:p-8 transition duration-300">

      {/* ── Stepper ── */}
      <div className="mb-8">
        <div className="flex items-center justify-center gap-2 text-center text-xs font-semibold text-slate-400 dark:text-slate-500 mb-5">
          {stepLabels.map((label, i) => (
            <React.Fragment key={label}>
              <span className={step >= i + 1 ? "text-blue-600 dark:text-blue-400 font-bold" : ""}>
                {label}
              </span>
              {i < stepLabels.length - 1 && <ChevronRight className="h-3 w-3" />}
            </React.Fragment>
          ))}
        </div>
        <div className="w-full bg-slate-100 dark:bg-slate-850 h-1.5 rounded-full overflow-hidden">
          <div
            className="bg-blue-600 h-full transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* ── STEP 1: Name ── */}
      {step === 1 && (
        <form onSubmit={handleS1(onStep1)} className="space-y-6 animate-in fade-in duration-300">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Create Patient Account</h2>
            <p className="text-sm text-slate-500 mt-1 dark:text-slate-400">Step 1 of 3 — Enter your name</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">First Name</label>
              <input
                type="text"
                placeholder="e.g. Arjun"
                className="block w-full py-2.5 px-3.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:text-slate-50 text-sm"
                {...regS1("first_name")}
              />
              {errS1.first_name && <p className="text-3xs text-red-500 mt-1 font-semibold">{errS1.first_name.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Last Name</label>
              <input
                type="text"
                placeholder="e.g. Sharma"
                className="block w-full py-2.5 px-3.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:text-slate-50 text-sm"
                {...regS1("last_name")}
              />
              {errS1.last_name && <p className="text-3xs text-red-500 mt-1 font-semibold">{errS1.last_name.message}</p>}
            </div>
          </div>

          <button
            type="submit"
            disabled={subS1}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-xl shadow-md hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-blue-500/20 transition duration-200 cursor-pointer disabled:opacity-50"
          >
            {subS1 ? <Loader2 className="h-5 w-5 animate-spin" /> : (
              <><span>Next: Verify Mobile</span><ChevronRight className="h-4 w-4" /></>
            )}
          </button>

          <p className="text-slate-500 text-xs text-center">
            Already have an account?{" "}
            <Link to="/login" className="font-bold text-blue-600 dark:text-blue-400 hover:underline">
              Log In
            </Link>
          </p>
        </form>
      )}

      {/* ── STEP 2: Phone + OTP ── */}
      {step === 2 && (
        <form onSubmit={handleS2(onStep2)} className="space-y-5 animate-in fade-in duration-300">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Verify Your Mobile</h2>
            <p className="text-sm text-slate-500 mt-1 dark:text-slate-400">Step 2 of 3 — Enter your phone number and verify with OTP</p>
          </div>

          <div>
            <Controller
              name="phone_number"
              control={controlS2}
              render={({ field }) => (
                <MobileInput
                  label="Mobile Number"
                  disabled={otpSent}
                  error={errS2.phone_number}
                  {...field}
                />
              )}
            />
          </div>

          {!otpSent ? (
            <button
              type="button"
              onClick={handleSendOtp}
              disabled={otpSending}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-xl shadow-md hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-blue-500/20 transition duration-200 cursor-pointer disabled:opacity-50"
            >
              {otpSending ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                <><span>Send OTP</span><Smartphone className="h-4 w-4" /></>
              )}
            </button>
          ) : (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/50 rounded-2xl p-3.5 flex items-start gap-3">
                <ShieldCheck className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div className="text-xs text-slate-600 dark:text-slate-400">
                  We sent a 6-digit OTP to <strong className="font-semibold text-slate-800 dark:text-slate-200">+91 {getValS2("phone_number")}</strong>.{" "}
                  <button
                    type="button"
                    onClick={() => setOtpSent(false)}
                    className="font-bold text-blue-600 dark:text-blue-400 hover:underline focus:outline-none"
                  >
                    Change Number
                  </button>
                </div>
              </div>

              <div>
                <Controller
                  name="otp_code"
                  control={controlS2}
                  render={({ field }) => (
                    <OTPInput label="Verification Code" error={errS2.otp_code} {...field} />
                  )}
                />
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 dark:text-slate-400">Didn't receive code?</span>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  className="font-bold text-blue-600 dark:text-blue-400 hover:underline focus:outline-none"
                >
                  Resend OTP
                </button>
              </div>

              <button
                type="submit"
                disabled={subS2}
                className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-4 rounded-xl shadow-md hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-emerald-500/20 transition duration-200 cursor-pointer disabled:opacity-50"
              >
                {subS2 ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                  <><span>Verify & Continue</span><ChevronRight className="h-4 w-4" /></>
                )}
              </button>
            </div>
          )}

          <div className="flex justify-between items-center text-xs pt-2">
            <button
              type="button"
              onClick={() => { setStep(1); setOtpSent(false); }}
              className="flex items-center gap-1 font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 focus:outline-none"
            >
              <ChevronLeft className="h-4 w-4" /> Back
            </button>
          </div>
        </form>
      )}

      {/* ── STEP 3: Aadhaar ── */}
      {step === 3 && (
        <form onSubmit={handleS3(onStep3)} className="space-y-6 animate-in fade-in duration-300">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Complete Registration</h2>
            <p className="text-sm text-slate-500 mt-1 dark:text-slate-400">Step 3 of 3 — Enter your Aadhaar number</p>
          </div>

          {/* Summary of collected data */}
          <div className="bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 text-xs space-y-1.5">
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
              <User className="h-3.5 w-3.5 shrink-0" />
              <span>Name: <strong className="text-slate-800 dark:text-slate-200">{identity?.first_name} {identity?.last_name}</strong></span>
            </div>
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
              <span>Mobile: <strong className="text-slate-800 dark:text-slate-200">+91 {phone}</strong> <span className="text-emerald-600 font-bold">✓ Verified</span></span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Aadhaar Card Number (12 digits)</label>
            <input
              type="text"
              maxLength={12}
              placeholder="0000 0000 0000"
              className="block w-full py-2.5 px-3.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:text-slate-50 text-sm font-mono"
              {...regS3("aadhaar")}
            />
            {errS3.aadhaar && <p className="text-3xs text-red-500 mt-1 font-semibold">{errS3.aadhaar.message}</p>}
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="flex items-center gap-1.5 py-2.5 px-5 border border-slate-200 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-450 transition cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" /> Back
            </button>
            <button
              type="submit"
              disabled={subS3}
              className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl shadow-md hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-blue-500/20 transition cursor-pointer disabled:opacity-50"
            >
              {subS3 ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                <><span>Complete Registration</span><CheckCircle2 className="h-4 w-4" /></>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
