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
import {
  User,
  ShieldCheck,
  Home,
  HeartPulse,
  Heart,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Lock,
  Smartphone,
  CheckCircle2
} from "lucide-react";

// Individual validation schemas
const step1Schema = z.object({
  phone_number: z.string().length(10, "Mobile number must be exactly 10 digits"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirm_password: z.string().min(8, "Confirm Password must be at least 8 characters")
}).refine(data => data.password === data.confirm_password, {
  message: "Passwords do not match",
  path: ["confirm_password"]
});

const step2Schema = z.object({
  otp_code: z.string().length(6, "OTP must be exactly 6 digits")
});

const step3Schema = z.object({
  first_name: z.string().min(1, "First Name is required"),
  last_name: z.string().min(1, "Last Name is required"),
  aadhaar: z.string().length(12, "Aadhaar must be exactly 12 digits").regex(/^[0-9]+$/, "Aadhaar must be numeric")
});

export const RegisterForm = () => {
  const [step, setStep] = useState(1); // 1: Credentials, 2: OTP, 3: Profile Detail, 4: Success
  const [credentials, setCredentials] = useState(null);
  const [otpSending, setOtpSending] = useState(false);
  const { registerPatient, selectPatient, showToast } = useAuth();
  const navigate = useNavigate();

  // Step 1 Form
  const {
    register: regS1,
    handleSubmit: handleS1Submit,
    formState: { errors: errorsS1, isSubmitting: isSubmittingS1 }
  } = useForm({
    resolver: zodResolver(step1Schema),
    defaultValues: { phone_number: "", password: "", confirm_password: "" }
  });

  // Step 2 Form
  const {
    control: controlS2,
    handleSubmit: handleS2Submit,
    formState: { errors: errorsS2, isSubmitting: isSubmittingS2 }
  } = useForm({
    resolver: zodResolver(step2Schema),
    defaultValues: { otp_code: "" }
  });

  // Step 3 Form
  const {
    register: regS3,
    handleSubmit: handleS3Submit,
    formState: { errors: errorsS3, isSubmitting: isSubmittingS3 }
  } = useForm({
    resolver: zodResolver(step3Schema),
    defaultValues: {
      first_name: "",
      last_name: "",
      aadhaar: ""
    }
  });

  // SUBMIT STEP 1: Save details & trigger OTP send
  const onStep1Submit = async (data) => {
    setOtpSending(true);
    try {
      // Send OTP to phone
      await api.post("/auth/otp/send", { phone_number: data.phone_number });
      setCredentials(data);
      setStep(2);
      showToast("success", "OTP sent. Check your mobile code.");
    } catch (err) {
      console.error(err);
    } finally {
      setOtpSending(false);
    }
  };

  // SUBMIT STEP 2: Verify OTP
  const onStep2Submit = async (data) => {
    try {
      // Verify OTP Code
      await api.post("/auth/otp/verify", {
        phone_number: credentials.phone_number,
        code: data.otp_code
      });
      showToast("success", "Mobile number verified! Please create your profile.");
      setStep(3);
    } catch (err) {
      console.error(err);
    }
  };

  // SUBMIT STEP 3: Complete Register
  const onStep3Submit = async (profileData) => {
    try {
      const payload = {
        credentials,
        personal: {
          first_name: profileData.first_name,
          last_name: profileData.last_name,
          aadhaar: profileData.aadhaar,
          dob: "",
          gender: null,
          blood_group: "",
          email: ""
        },
        address: {
          address_line1: "",
          address_line2: "",
          city: "",
          district: "",
          state: "",
          pincode: ""
        },
        emergency: {
          name: "",
          relationship: "",
          phone_number: ""
        },
        medical: {
          diseases: "",
          allergies: "",
          medications: ""
        },
        consent: {
          agreeTerms: true,
          consentStorage: true
        }
      };

      // Call server register
      await registerPatient(payload);
      showToast("success", "Registration successful! Please log in.");
      navigate("/login");
    } catch (err) {
      console.error(err);
      const errorMsg = err.response?.data?.detail || "Registration failed. Please try again.";
      showToast("error", errorMsg);
    }
  };

  const handleResendOtp = async () => {
    if (!credentials?.phone_number) return;
    try {
      await api.post("/auth/otp/send", { phone_number: credentials.phone_number });
      showToast("success", "OTP code resent successfully.");
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-xl rounded-3xl p-6 sm:p-8 transition duration-300">
      
      {/* Stepper Header */}
      {step < 4 && (
        <div className="mb-8">
          <div className="flex items-center justify-center gap-2 text-center text-xs font-semibold text-slate-400 dark:text-slate-500 mb-6">
            <span className={step >= 1 ? "text-blue-600 dark:text-blue-400 font-bold" : ""}>Account</span>
            <ChevronRight className="h-3 w-3" />
            <span className={step >= 2 ? "text-blue-600 dark:text-blue-400 font-bold" : ""}>Verify</span>
            <ChevronRight className="h-3 w-3" />
            <span className={step >= 3 ? "text-blue-600 dark:text-blue-400 font-bold" : ""}>Health Profile</span>
          </div>
          
          <div className="w-full bg-slate-100 dark:bg-slate-850 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-blue-600 h-full transition-all duration-300"
              style={{ width: `${step === 1 ? 33 : step === 2 ? 66 : 100}%` }}
            />
          </div>
        </div>
      )}

      {/* STEP 1: Account Credentials setup */}
      {step === 1 && (
        <form onSubmit={handleS1Submit(onStep1Submit)} className="space-y-6">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Create Patient Account</h2>
            <p className="text-sm text-slate-500 mt-1 dark:text-slate-400">Step 1: Set up your secure credentials</p>
          </div>

          <div>
            <MobileInput
              label="Mobile Number"
              error={errorsS1.phone_number}
              {...regS1("phone_number")}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <PasswordInput
              label="Password"
              error={errorsS1.password}
              {...regS1("password")}
            />
            <PasswordInput
              label="Confirm Password"
              error={errorsS1.confirm_password}
              {...regS1("confirm_password")}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmittingS1 || otpSending}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-xl shadow-md hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-blue-500/20 transition duration-200 cursor-pointer disabled:opacity-50"
          >
            {isSubmittingS1 || otpSending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                Next: Verify Mobile
                <ChevronRight className="h-4 w-4" />
              </>
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

      {/* STEP 2: OTP Verification */}
      {step === 2 && (
        <form onSubmit={handleS2Submit(onStep2Submit)} className="space-y-6">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Verify Your Mobile</h2>
            <p className="text-sm text-slate-500 mt-1 dark:text-slate-400">
              We sent a validation code to +91 {credentials?.phone_number}
            </p>
          </div>

          <div>
            <Controller
              name="otp_code"
              control={controlS2}
              render={({ field }) => (
                <OTPInput label="Verification Code" error={errorsS2.otp_code} {...field} />
              )}
            />
          </div>

          <div className="flex justify-between items-center text-xs">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex items-center gap-1 font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 focus:outline-none"
            >
              <ChevronLeft className="h-4 w-4" /> Back to Account
            </button>
            <button
              type="button"
              onClick={handleResendOtp}
              className="font-bold text-blue-600 dark:text-blue-400 hover:underline focus:outline-none"
            >
              Resend OTP Code
            </button>
          </div>

          <button
            type="submit"
            disabled={isSubmittingS2}
            className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-4 rounded-xl shadow-md hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-emerald-500/20 transition duration-200 cursor-pointer disabled:opacity-50"
          >
            {isSubmittingS2 ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                Verify Code & Continue
                <ChevronRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>
      )}

      {/* STEP 3: Complete Health Profile */}
      {step === 3 && (
        <form onSubmit={handleS3Submit(onStep3Submit)} className="space-y-6 animate-in fade-in duration-300">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Setup Patient Profile</h2>
            <p className="text-sm text-slate-500 mt-1 dark:text-slate-400">Step 3: Enter your name and Aadhaar number to finalize</p>
          </div>

          <div className="bg-slate-50/50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">First Name</label>
                <input
                  type="text"
                  placeholder="Enter first name"
                  className="block w-full py-2.5 px-3.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:text-slate-50 text-sm"
                  {...regS3("first_name")}
                />
                {errorsS3.first_name && <p className="text-3xs text-red-500 mt-1 font-semibold">{errorsS3.first_name.message}</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Last Name</label>
                <input
                  type="text"
                  placeholder="Enter last name"
                  className="block w-full py-2.5 px-3.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:text-slate-50 text-sm"
                  {...regS3("last_name")}
                />
                {errorsS3.last_name && <p className="text-3xs text-red-500 mt-1 font-semibold">{errorsS3.last_name.message}</p>}
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
              {errorsS3.aadhaar && <p className="text-3xs text-red-500 mt-1 font-semibold">{errorsS3.aadhaar.message}</p>}
            </div>
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex items-center gap-1.5 py-2.5 px-5 border border-slate-200 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-450 transition cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
              Credentials Setup
            </button>
            <button
              type="submit"
              disabled={isSubmittingS3}
              className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl shadow-md hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-blue-500/20 transition cursor-pointer disabled:opacity-50"
            >
              {isSubmittingS3 ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  Complete Registration
                  <CheckCircle2 className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
