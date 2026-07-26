import React from "react";
import { useAuth } from "../../context/AuthContext";
import { FamilyMemberCard } from "./FamilyMemberCard";

export const FamilySelector = ({ onSelect }) => {
  const { patients, selectedPatient } = useAuth();

  return (
    <div className="w-full max-w-4xl mx-auto px-4">
      {/* Title */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Select Patient Profile</h2>
        <p className="text-sm text-slate-500 mt-1 dark:text-slate-400">
          Choose a profile to manage medical appointments and history
        </p>
      </div>

      {/* Grid of patient profiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
        {patients.map((member) => (
          <FamilyMemberCard
            key={member.id}
            member={member}
            isSelected={selectedPatient?.id === member.id}
            onClick={() => onSelect(member)}
          />
        ))}
      </div>
    </div>
  );
};
