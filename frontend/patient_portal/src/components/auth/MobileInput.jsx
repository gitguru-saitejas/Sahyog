import React from "react";
import { Phone } from "lucide-react";

export const MobileInput = React.forwardRef(({ error, label, ...props }, ref) => {
  // Enforce numeric characters and maximum of 10 digits
  const handleKeyPress = (e) => {
    if (!/[0-9]/.test(e.key)) {
      e.preventDefault();
    }
  };

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
          {label}
        </label>
      )}
      <div className="relative rounded-xl shadow-sm">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
          <Phone className="h-5 w-5" />
        </div>
        <div className="absolute inset-y-0 left-10 flex items-center pointer-events-none text-slate-400 dark:text-slate-500 font-medium text-sm select-none border-r border-slate-200 dark:border-slate-800 pr-2">
          +91
        </div>
        <input
          ref={ref}
          type="tel"
          maxLength={10}
          onKeyPress={handleKeyPress}
          placeholder="Enter 10-digit mobile"
          className={`block w-full pl-22 py-3 bg-white dark:bg-slate-900 border ${
            error
              ? "border-red-500 focus:ring-red-500 focus:border-red-500"
              : "border-slate-200 dark:border-slate-800 focus:ring-blue-500/20 focus:border-blue-500"
          } rounded-xl text-slate-900 dark:text-slate-50 placeholder-slate-400 focus:outline-none focus:ring-4 transition duration-200 text-sm`}
          style={{ paddingLeft: "5.5rem" }}
          {...props}
        />
      </div>
      {error && <p className="mt-1 text-xs text-red-500 font-medium">{error.message}</p>}
    </div>
  );
});

MobileInput.displayName = "MobileInput";
