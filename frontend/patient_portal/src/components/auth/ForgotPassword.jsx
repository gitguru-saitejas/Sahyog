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
import { ShieldCheck, Smartphone, KeyRound, ChevronRight, ChevronLeft, Loader2 } from "lucide-react";

const requestSchema = z.object({
  phone_number: z.string().length(10, "Mobile number must be exactly 10 digits")
});

const resetSchema = z.object({
  otp_code: z.string().length(6, "OTP must be exactly 6 digits"),
  new_password: z.string().min(8, "Password must be at least 8 characters"),
  confirm_new_password: z.string().min(8, "Confirm Password must be at least 8 characters")
}).refine(data => data.new_password === data.confirm_new_password, {
  message: "Passwords do not match",
  path: ["confirm_new_password"]
});

export const ForgotPassword = () => {
  const [step, setStep] = useState(1); // 1: request OTP, 2: verify OTP & input new password
  const [phone, setPhone] = useState("");
  const { showToast } = useAuth();
  const navigate = useNavigate();

  // Step 1 Hook
  const {
    register: regS1,
    handleSubmit: handleS1Submit,
    formState: { errors: errorsS1, isSubmitting: isSubmittingS1 }
  } = useForm({
    resolver: zodResolver(requestSchema),
    defaultValues: { phone_number: "" }
  });

  // Step 2 Hook
  const {
    register: regS2,
    control: controlS2,
    handleSubmit: handleS2Submit,
    formState: { errors: errorsS2, isSubmitting: isSubmittingS2 }
  } = useForm({
    resolver: zodResolver(resetSchema),
    defaultValues: { otp_code: "", new_password: "", confirm_new_password: "" }
  });

  const onRequestOtp = async (data) => {
    try {
      const res = await api.post("/auth/forgot-password/request", { phone_number: data.phone_number });
      setPhone(data.phone_number);
      setStep(2);
      showToast("success", res.data.message || "OTP code sent successfully!");
    } catch (err) {
      console.error(err);
    }
  };

  const onResetPassword = async (data) => {
    try {
      const res = await api.post("/auth/forgot-password/reset", {
        phone_number: phone,
        otp_code: data.otp_code,
        new_password: data.new_password
      });
      showToast("success", "Password reset successful! Sign in with your new password.");
      navigate("/login");
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-xl rounded-3xl p-6 sm:p-8 transition duration-300">
      
      {step === 1 && (
        <form onSubmit={handleS1Submit(onRequestOtp)} className="space-y-6 animate-in fade-in duration-300">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Reset Password</h2>
            <p className="text-sm text-slate-500 mt-1.5 dark:text-slate-400">
              Enter your mobile to get a verification OTP code
            </p>
          </div>

          <div>
            <MobileInput
              label="Mobile Number"
              error={errorsS1.phone_number}
              {...regS1("phone_number")}
            />
          </div>

          <div className="flex items-center justify-between">
            <Link
              to="/login"
              className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition"
            >
              <ChevronLeft className="h-4 w-4" /> Back to Login
            </Link>
          </div>

          <button
            type="submit"
            disabled={isSubmittingS1}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-xl shadow-md hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-blue-500/20 transition duration-200 cursor-pointer disabled:opacity-50"
          >
            {isSubmittingS1 ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                Send Reset OTP
                <ChevronRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={handleS2Submit(onResetPassword)} className="space-y-6 animate-in slide-in-from-right-3 duration-300">
          <div className="text-center mb-4">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Set New Password</h2>
            <p className="text-sm text-slate-500 mt-1 dark:text-slate-450">
              Verification code sent to +91 {phone}
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

          <div className="space-y-4">
            <PasswordInput
              label="New Password"
              error={errorsS2.new_password}
              {...regS2("new_password")}
            />
            <PasswordInput
              label="Confirm New Password"
              error={errorsS2.confirm_new_password}
              {...regS2("confirm_new_password")}
            />
          </div>

          <div className="flex justify-between items-center text-xs">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex items-center gap-1 font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-350 focus:outline-none"
            >
              <ChevronLeft className="h-4 w-4" /> Change Mobile
            </button>
            <button
              type="button"
              onClick={() => api.post("/auth/forgot-password/request", { phone_number: phone })}
              className="font-bold text-blue-600 dark:text-blue-400 hover:underline focus:outline-none"
            >
              Resend Code
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
                Update Password & Login
                <KeyRound className="h-4 w-4" />
              </>
            )}
          </button>
        </form>
      )}

    </div>
  );
};
