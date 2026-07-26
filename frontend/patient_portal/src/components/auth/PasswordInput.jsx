import React, { useState } from "react";
import { Eye, EyeOff, Lock } from "lucide-react";

export const PasswordInput = React.forwardRef(({ error, label, ...props }, ref) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
          {label}
        </label>
      )}
      <div className="relative rounded-xl shadow-sm">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
          <Lock className="h-5 w-5" />
        </div>
        <input
          ref={ref}
          type={showPassword ? "text" : "password"}
          className={`block w-full pl-10 pr-10 py-3 bg-white dark:bg-slate-900 border ${
            error
              ? "border-red-500 focus:ring-red-500 focus:border-red-500"
              : "border-slate-200 dark:border-slate-800 focus:ring-blue-500/20 focus:border-blue-500"
          } rounded-xl text-slate-900 dark:text-slate-50 placeholder-slate-400 focus:outline-none focus:ring-4 transition duration-200 text-sm`}
          {...props}
        />
        <button
          type="button"
          onClick={() => setShowPassword((prev) => !prev)}
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition focus:outline-none"
        >
          {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
        </button>
      </div>
      {error && <p className="mt-1 text-xs text-red-500 font-medium">{error.message}</p>}
    </div>
  );
});

PasswordInput.displayName = "PasswordInput";
