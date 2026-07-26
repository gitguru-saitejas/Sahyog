import React, { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "../../context/AuthContext";
import { FamilyMemberCard } from "./FamilyMemberCard";
import { MobileInput } from "./MobileInput";
import { OTPInput } from "./OTPInput";
import api from "../../services/api";
import {
  UserPlus,
  Link2,
  X,
  Plus,
  Loader2,
  User,
  HeartPulse,
  Home,
  ShieldCheck,
  CheckCircle2
} from "lucide-react";

// Add Member Schema
const addMemberSchema = z.object({
  first_name: z.string().min(1, "First Name is required"),
  last_name: z.string().min(1, "Last Name is required"),
  aadhaar: z.string().length(12, "Aadhaar must be exactly 12 digits").regex(/^[0-9]+$/, "Aadhaar must be numeric"),
  dob: z.string().min(1, "Date of Birth is required"),
  gender: z.enum(["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"]),
  blood_group: z.enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]),
  relation: z.enum(["SPOUSE", "SON", "DAUGHTER", "FATHER", "MOTHER", "BROTHER", "SISTER", "OTHER"]),
  
  address_line1: z.string().min(1, "Address Line 1 is required"),
  address_line2: z.string().optional(),
  city: z.string().min(1, "City is required"),
  district: z.string().min(1, "District is required"),
  state: z.string().min(1, "State is required"),
  pincode: z.string().length(6, "Pincode must be exactly 6 digits").regex(/^[0-9]+$/, "Pincode must be numeric"),
  
  emergency_name: z.string().min(1, "Emergency contact name is required"),
  emergency_relationship: z.string().min(1, "Relationship is required"),
  emergency_phone: z.string().length(10, "Emergency mobile must be 10 digits")
});

// Link Member Schema
const linkMemberSchema = z.object({
  phone_number: z.string().length(10, "Mobile number must be exactly 10 digits"),
  otp_code: z.string().length(6, "OTP must be exactly 6 digits"),
  aadhaar: z.string().length(12, "Aadhaar must be exactly 12 digits").regex(/^[0-9]+$/, "Aadhaar must be numeric")
});

export const FamilySelector = ({ onSelect }) => {
  const { patients, selectedPatient, registerNewFamilyMember, linkExistingFamilyMember, showToast } = useAuth();
  const [modalOpen, setModalOpen] = useState(null); // null | "add" | "link"
  const [linkOtpSent, setLinkOtpSent] = useState(false);
  const [sendingLinkOtp, setSendingLinkOtp] = useState(false);

  // Add Member Form Hook
  const {
    register: regAdd,
    handleSubmit: handleAddSubmit,
    reset: resetAdd,
    formState: { errors: errorsAdd, isSubmitting: isSubmittingAdd }
  } = useForm({
    resolver: zodResolver(addMemberSchema),
    defaultValues: {
      first_name: "", last_name: "", aadhaar: "", dob: "",
      gender: "FEMALE", blood_group: "O+", relation: "SPOUSE",
      address_line1: "", address_line2: "", city: "", district: "", state: "", pincode: "",
      emergency_name: "", emergency_relationship: "", emergency_phone: ""
    }
  });

  // Link Member Form Hook
  const {
    register: regLink,
    control: controlLink,
    getValues: getValuesLink,
    handleSubmit: handleLinkSubmit,
    reset: resetLink,
    formState: { errors: errorsLink, isSubmitting: isSubmittingLink }
  } = useForm({
    resolver: zodResolver(linkMemberSchema),
    defaultValues: { phone_number: "", otp_code: "", aadhaar: "" }
  });

  // Send OTP for Link account
  const handleSendLinkOtp = async () => {
    const phone = getValuesLink("phone_number");
    if (!phone || phone.length !== 10) {
      showToast("error", "Please enter a valid 10-digit mobile number linked to the profile.");
      return;
    }
    setSendingLinkOtp(true);
    try {
      const res = await api.post("/auth/otp/send", { phone_number: phone });
      setLinkOtpSent(true);
      showToast("success", res.data.message || "OTP code sent successfully!");
    } catch (err) {
      console.error(err);
    } finally {
      setSendingLinkOtp(false);
    }
  };

  // Submit Add New Member
  const onAddSubmit = async (data) => {
    try {
      await registerNewFamilyMember(data);
      setModalOpen(null);
      resetAdd();
    } catch (err) {
      console.error(err);
    }
  };

  // Submit Link Existing Member
  const onLinkSubmit = async (data) => {
    try {
      await linkExistingFamilyMember(data.phone_number, data.otp_code, data.aadhaar);
      setModalOpen(null);
      setLinkOtpSent(false);
      resetLink();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4">
      {/* Title */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Select Patient Profile</h2>
        <p className="text-sm text-slate-500 mt-1 dark:text-slate-400">
          Choose a profile to manage medical appointments and history
        </p>
      </div>

      {/* Grid of profiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
        {patients.map((member) => (
          <FamilyMemberCard
            key={member.id}
            member={member}
            isSelected={selectedPatient?.id === member.id}
            onClick={() => onSelect(member)}
          />
        ))}

        {/* Register New Card */}
        <div
          onClick={() => setModalOpen("add")}
          className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl cursor-pointer hover:border-blue-500 dark:hover:border-blue-400 hover:bg-slate-50/50 dark:hover:bg-slate-900/40 transition duration-300 text-center select-none group h-40"
        >
          <div className="w-10 h-10 bg-blue-50 dark:bg-slate-950 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center mb-3 group-hover:scale-105 transition duration-300 border border-blue-100/50 dark:border-slate-850">
            <Plus className="h-5 w-5" />
          </div>
          <span className="font-semibold text-slate-700 dark:text-slate-350 text-sm">
            Add New Member
          </span>
          <span className="text-xs text-slate-400 dark:text-slate-500 mt-1">
            Create new profile under this account
          </span>
        </div>

        {/* Link Existing Card */}
        <div
          onClick={() => setModalOpen("link")}
          className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl cursor-pointer hover:border-blue-500 dark:hover:border-blue-400 hover:bg-slate-50/50 dark:hover:bg-slate-900/40 transition duration-300 text-center select-none group h-40"
        >
          <div className="w-10 h-10 bg-emerald-50 dark:bg-slate-950 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center mb-3 group-hover:scale-105 transition duration-300 border border-emerald-100/50 dark:border-slate-850">
            <Link2 className="h-5 w-5" />
          </div>
          <span className="font-semibold text-slate-700 dark:text-slate-350 text-sm">
            Link Existing Profile
          </span>
          <span className="text-xs text-slate-400 dark:text-slate-500 mt-1">
            Bridge an independent account here
          </span>
        </div>
      </div>

      {/* ================= MODAL: ADD FAMILY MEMBER ================= */}
      {modalOpen === "add" && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-2xl rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center px-6 py-4.5 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <h3 className="text-lg font-bold text-slate-850 dark:text-slate-50">Register Family Member</h3>
              <button
                onClick={() => {
                  setModalOpen(null);
                  resetAdd();
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition focus:outline-none"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit(onAddSubmit)} className="flex-1 overflow-y-auto p-6 space-y-6 pr-4">
              
              {/* Profile Details */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-blue-600 flex items-center gap-1.5 pb-1.5 border-b border-slate-100 dark:border-slate-850">
                  <User className="h-4 w-4" /> Personal Information
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-2xs font-semibold text-slate-500 mb-1">First Name</label>
                    <input
                      type="text"
                      className="block w-full py-2 px-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm"
                      {...regAdd("first_name")}
                    />
                    {errorsAdd.first_name && <p className="text-3xs text-red-500 mt-1 font-semibold">{errorsAdd.first_name.message}</p>}
                  </div>
                  <div>
                    <label className="block text-2xs font-semibold text-slate-500 mb-1">Last Name</label>
                    <input
                      type="text"
                      className="block w-full py-2 px-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm"
                      {...regAdd("last_name")}
                    />
                    {errorsAdd.last_name && <p className="text-3xs text-red-500 mt-1 font-semibold">{errorsAdd.last_name.message}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-2xs font-semibold text-slate-500 mb-1">Relationship</label>
                    <select
                      className="block w-full py-2 px-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm"
                      {...regAdd("relation")}
                    >
                      <option value="SPOUSE">Spouse</option>
                      <option value="SON">Son</option>
                      <option value="DAUGHTER">Daughter</option>
                      <option value="FATHER">Father</option>
                      <option value="MOTHER">Mother</option>
                      <option value="BROTHER">Brother</option>
                      <option value="SISTER">Sister</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-2xs font-semibold text-slate-500 mb-1">Aadhaar (12 digits)</label>
                    <input
                      type="text"
                      maxLength={12}
                      className="block w-full py-2 px-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm font-mono"
                      {...regAdd("aadhaar")}
                    />
                    {errorsAdd.aadhaar && <p className="text-3xs text-red-500 mt-1 font-semibold">{errorsAdd.aadhaar.message}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <label className="block text-2xs font-semibold text-slate-500 mb-1">Date of Birth</label>
                    <input
                      type="date"
                      className="block w-full py-2 px-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm"
                      {...regAdd("dob")}
                    />
                    {errorsAdd.dob && <p className="text-3xs text-red-500 mt-1 font-semibold">{errorsAdd.dob.message}</p>}
                  </div>
                  <div>
                    <label className="block text-2xs font-semibold text-slate-500 mb-1">Gender</label>
                    <select
                      className="block w-full py-2 px-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm"
                      {...regAdd("gender")}
                    >
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                      <option value="OTHER">Other</option>
                      <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-2xs font-semibold text-slate-500 mb-1">Blood Group</label>
                    <select
                      className="block w-full py-2 px-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm"
                      {...regAdd("blood_group")}
                    >
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Address */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-blue-600 flex items-center gap-1.5 pb-1.5 border-b border-slate-100 dark:border-slate-850">
                  <Home className="h-4 w-4" /> Residential Address
                </h4>
                <div>
                  <label className="block text-2xs font-semibold text-slate-500 mb-1">Address Line 1</label>
                  <input
                    type="text"
                    className="block w-full py-2 px-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm"
                    {...regAdd("address_line1")}
                  />
                  {errorsAdd.address_line1 && <p className="text-3xs text-red-500 mt-1 font-semibold">{errorsAdd.address_line1.message}</p>}
                </div>
                <div>
                  <label className="block text-2xs font-semibold text-slate-500 mb-1">Address Line 2 (Optional)</label>
                  <input
                    type="text"
                    className="block w-full py-2 px-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm"
                    {...regAdd("address_line2")}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-2xs font-semibold text-slate-500 mb-1">City</label>
                    <input
                      type="text"
                      className="block w-full py-2 px-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm"
                      {...regAdd("city")}
                    />
                    {errorsAdd.city && <p className="text-3xs text-red-500 mt-1 font-semibold">{errorsAdd.city.message}</p>}
                  </div>
                  <div>
                    <label className="block text-2xs font-semibold text-slate-500 mb-1">District</label>
                    <input
                      type="text"
                      className="block w-full py-2 px-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm"
                      {...regAdd("district")}
                    />
                    {errorsAdd.district && <p className="text-3xs text-red-500 mt-1 font-semibold">{errorsAdd.district.message}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-2xs font-semibold text-slate-500 mb-1">State</label>
                    <input
                      type="text"
                      className="block w-full py-2 px-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm"
                      {...regAdd("state")}
                    />
                    {errorsAdd.state && <p className="text-3xs text-red-500 mt-1 font-semibold">{errorsAdd.state.message}</p>}
                  </div>
                  <div>
                    <label className="block text-2xs font-semibold text-slate-500 mb-1">Pincode</label>
                    <input
                      type="text"
                      maxLength={6}
                      className="block w-full py-2 px-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm font-mono"
                      {...regAdd("pincode")}
                    />
                    {errorsAdd.pincode && <p className="text-3xs text-red-500 mt-1 font-semibold">{errorsAdd.pincode.message}</p>}
                  </div>
                </div>
              </div>

              {/* Emergency Contacts */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-blue-600 flex items-center gap-1.5 pb-1.5 border-b border-slate-100 dark:border-slate-850">
                  <ShieldCheck className="h-4 w-4 text-rose-500" /> Emergency Contact
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-2xs font-semibold text-slate-500 mb-1">Contact Name</label>
                    <input
                      type="text"
                      className="block w-full py-2 px-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm"
                      {...regAdd("emergency_name")}
                    />
                    {errorsAdd.emergency_name && <p className="text-3xs text-red-500 mt-1 font-semibold">{errorsAdd.emergency_name.message}</p>}
                  </div>
                  <div>
                    <label className="block text-2xs font-semibold text-slate-500 mb-1">Relationship</label>
                    <input
                      type="text"
                      className="block w-full py-2 px-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm"
                      {...regAdd("emergency_relationship")}
                    />
                    {errorsAdd.emergency_relationship && <p className="text-3xs text-red-500 mt-1 font-semibold">{errorsAdd.emergency_relationship.message}</p>}
                  </div>
                </div>
                <div>
                  <label className="block text-2xs font-semibold text-slate-500 mb-1">Emergency Mobile</label>
                  <input
                    type="text"
                    maxLength={10}
                    className="block w-full py-2 px-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm font-mono"
                    {...regAdd("emergency_phone")}
                  />
                  {errorsAdd.emergency_phone && <p className="text-3xs text-red-500 mt-1 font-semibold">{errorsAdd.emergency_phone.message}</p>}
                </div>
              </div>

              {/* Submit footer */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setModalOpen(null);
                    resetAdd();
                  }}
                  className="py-2.5 px-5 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold text-slate-500 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAdd}
                  className="flex items-center gap-1.5 py-2.5 px-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-md transition cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingAdd ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      Save Profile
                      <UserPlus className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: LINK EXISTING MEMBER ================= */}
      {modalOpen === "link" && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-2xl rounded-3xl w-full max-w-md animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center px-6 py-4.5 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-850 dark:text-slate-50">Link Existing Profile</h3>
              <button
                onClick={() => {
                  setModalOpen(null);
                  setLinkOtpSent(false);
                  resetLink();
                }}
                className="text-slate-400 hover:text-slate-600 transition focus:outline-none"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleLinkSubmit(onLinkSubmit)} className="p-6 space-y-5">
              
              <div className="space-y-4">
                <div>
                  <Controller
                    name="phone_number"
                    control={controlLink}
                    render={({ field }) => (
                      <MobileInput
                        label="Registered Mobile Number"
                        disabled={linkOtpSent}
                        error={errorsLink.phone_number}
                        {...field}
                      />
                    )}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-350 mb-1.5">
                    Target Patient Aadhaar (12 digits)
                  </label>
                  <input
                    type="text"
                    maxLength={12}
                    disabled={linkOtpSent}
                    placeholder="Provide full Aadhaar code"
                    className="block w-full py-3 px-3.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm font-mono"
                    {...regLink("aadhaar")}
                  />
                  {errorsLink.aadhaar && <p className="text-3xs text-red-500 mt-1 font-semibold">{errorsLink.aadhaar.message}</p>}
                </div>

                {!linkOtpSent ? (
                  <button
                    type="button"
                    onClick={handleSendLinkOtp}
                    disabled={sendingLinkOtp}
                    className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-xl shadow-md hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-blue-500/20 transition duration-200 cursor-pointer disabled:opacity-50"
                  >
                    {sendingLinkOtp ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        Verify Ownership (Send OTP)
                        <Link2 className="h-4 w-4" />
                      </>
                    )}
                  </button>
                ) : (
                  <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/50 rounded-xl p-3 flex items-start gap-2.5">
                      <ShieldCheck className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                      <span className="text-2xs text-slate-650">
                        We sent a code to the mobile to verify profile custody. (Try: 123456)
                      </span>
                    </div>

                    <div>
                      <Controller
                        name="otp_code"
                        control={controlLink}
                        render={({ field }) => (
                          <OTPInput label="Ownership OTP Code" error={errorsLink.otp_code} {...field} />
                        )}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmittingLink}
                      className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-4 rounded-xl shadow-md hover:shadow-lg focus:outline-none transition duration-200 cursor-pointer disabled:opacity-50"
                    >
                      {isSubmittingLink ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <>
                          Confirm & Link Profile
                          <CheckCircle2 className="h-4 w-4" />
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
