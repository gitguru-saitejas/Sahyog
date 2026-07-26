import React, { useRef, useState, useEffect } from "react";

export const OTPInput = ({ value = "", onChange, error, label }) => {
  const [digits, setDigits] = useState(Array(6).fill(""));
  const inputRefs = useRef([]);

  // Sync state with incoming value
  useEffect(() => {
    const valString = value ? value.toString() : "";
    const newDigits = Array(6).fill("");
    for (let i = 0; i < Math.min(6, valString.length); i++) {
      newDigits[i] = valString[i];
    }
    setDigits(newDigits);
  }, [value]);

  const handleChange = (index, val) => {
    // Only accept numeric entries
    const numVal = val.replace(/[^0-9]/g, "");
    if (!numVal) {
      const newDigits = [...digits];
      newDigits[index] = "";
      setDigits(newDigits);
      onChange?.(newDigits.join(""));
      return;
    }

    const newDigits = [...digits];
    // If user enters multiple characters (e.g. paste or autocomplete)
    if (numVal.length > 1) {
      const chunk = numVal.split("").slice(0, 6 - index);
      chunk.forEach((char, offset) => {
        newDigits[index + offset] = char;
      });
      setDigits(newDigits);
      const combined = newDigits.join("");
      onChange?.(combined);
      
      const targetIndex = Math.min(5, index + chunk.length);
      inputRefs.current[targetIndex]?.focus();
      return;
    }

    newDigits[index] = numVal;
    setDigits(newDigits);
    onChange?.(newDigits.join(""));

    // Auto-focus next input
    if (index < 5 && numVal) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace") {
      if (!digits[index] && index > 0) {
        // Clear previous input and focus it
        const newDigits = [...digits];
        newDigits[index - 1] = "";
        setDigits(newDigits);
        onChange?.(newDigits.join(""));
        inputRefs.current[index - 1]?.focus();
      } else {
        // Clear current input
        const newDigits = [...digits];
        newDigits[index] = "";
        setDigits(newDigits);
        onChange?.(newDigits.join(""));
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData("text").replace(/[^0-9]/g, "").slice(0, 6);
    if (pasteData) {
      const newDigits = [...digits];
      pasteData.split("").forEach((char, idx) => {
        newDigits[idx] = char;
      });
      setDigits(newDigits);
      onChange?.(newDigits.join(""));
      // Focus last populated input or first empty
      const targetIndex = Math.min(5, pasteData.length - 1);
      inputRefs.current[targetIndex]?.focus();
    }
  };

  return (
    <div className="w-full">
      {label && (
        <label className="block text-center text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          {label}
        </label>
      )}
      <div className="flex justify-center gap-2.5 sm:gap-3.5" onPaste={handlePaste}>
        {digits.map((digit, idx) => (
          <input
            key={idx}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            ref={(el) => (inputRefs.current[idx] = el)}
            onChange={(e) => handleChange(idx, e.target.value)}
            onKeyDown={(e) => handleKeyDown(idx, e)}
            className={`w-11 h-13 sm:w-13 sm:h-15 text-center text-xl font-bold bg-white dark:bg-slate-900 border ${
              error
                ? "border-red-500 focus:ring-red-500/20"
                : "border-slate-200 dark:border-slate-800 focus:ring-blue-500/20 focus:border-blue-500"
            } rounded-xl text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-4 transition duration-200`}
          />
        ))}
      </div>
      {error && (
        <p className="mt-2 text-center text-xs text-red-500 font-medium">
          {error.message || "OTP must be 6 digits"}
        </p>
      )}
    </div>
  );
};
