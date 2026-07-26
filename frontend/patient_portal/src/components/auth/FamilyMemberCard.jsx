import React from "react";
import { User, ShieldAlert } from "lucide-react";
import { cn } from "../../lib/utils";

// Calculate age helper
const calculateAge = (dobString) => {
  if (!dobString) return 0;
  const dob = new Date(dobString);
  const diffMs = Date.now() - dob.getTime();
  const ageDate = new Date(diffMs);
  return Math.abs(ageDate.getUTCFullYear() - 1970);
};

// Relation Badge color mapping
const getRelationStyles = (relation) => {
  switch (relation?.toUpperCase()) {
    case "SELF":
      return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/50";
    case "SPOUSE":
      return "bg-sky-50 text-sky-700 dark:bg-sky-950/30 dark:text-sky-400 border-sky-100 dark:border-sky-900/50";
    case "SON":
    case "DAUGHTER":
      return "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/50";
    case "FATHER":
    case "MOTHER":
      return "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border-amber-100 dark:border-amber-900/50";
    default:
      return "bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-100 dark:border-slate-800";
  }
};

// Gender color mapping
const getGenderAvatarStyles = (gender) => {
  switch (gender?.toUpperCase()) {
    case "MALE":
      return "bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400";
    case "FEMALE":
      return "bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400";
    default:
      return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400";
  }
};

export const FamilyMemberCard = ({ member, isSelected, onClick }) => {
  const age = calculateAge(member.date_of_birth);
  const initials = `${member.first_name?.[0] || ""}${member.last_name?.[0] || ""}`.toUpperCase();

  return (
    <div
      onClick={onClick}
      className={cn(
        "relative flex flex-col p-5 bg-white dark:bg-slate-900 border rounded-2xl cursor-pointer select-none transition-all duration-300 shadow-sm hover:shadow-md hover:-translate-y-1 focus:outline-none group",
        isSelected
          ? "border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/10 dark:bg-blue-950/10"
          : "border-slate-100 dark:border-slate-800/80 hover:border-blue-200 dark:hover:border-slate-700"
      )}
    >
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div
          className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center font-bold text-sm tracking-wide shrink-0 transition-transform group-hover:scale-105 duration-300",
            getGenderAvatarStyles(member.gender)
          )}
        >
          {initials || <User className="h-5 w-5" />}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-base truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {member.first_name} {member.last_name}
            </h3>
            <span
              className={cn(
                "px-2 py-0.5 text-2xs font-semibold tracking-wider rounded-md border",
                getRelationStyles(member.relation)
              )}
            >
              {member.relation}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-slate-500 dark:text-slate-400 text-xs">
            <span>{age} years</span>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span>{member.gender?.toLowerCase()}</span>
            {member.blood_group && (
              <>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <span className="font-medium text-rose-500">{member.blood_group}</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-2xs text-slate-400 dark:text-slate-500 font-medium">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span>Aadhaar:</span>
            <span className="font-mono tracking-wider text-xs text-slate-600 dark:text-slate-400">
              XXXXXXXX{member.aadhaar_last4}
            </span>
          </div>
          {member.patient_code && (
            <div className="flex items-center gap-1.5">
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <span>ID:</span>
              <span className="font-mono font-bold text-xs text-blue-600 dark:text-blue-400 tracking-widest">
                {member.patient_code}
              </span>
            </div>
          )}
        </div>
        
        {/* Quick select indicator */}
        <div
          className={cn(
            "w-4 h-4 rounded-full border flex items-center justify-center transition-all duration-300",
            isSelected
              ? "border-blue-500 bg-blue-500 text-white"
              : "border-slate-200 dark:border-slate-700 group-hover:border-blue-400"
          )}
        >
          {isSelected && (
            <svg
              className="w-2.5 h-2.5 stroke-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
      </div>
    </div>
  );
};
