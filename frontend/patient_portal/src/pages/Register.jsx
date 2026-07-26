import React from "react";
import { RegisterForm } from "../components/auth/RegisterForm";
import { Activity, Sun, Moon } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export const Register = () => {
  const { theme, toggleTheme } = useAuth();

  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 transition duration-300 relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-400/10 dark:bg-blue-600/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-500/10 dark:bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

      <header className="px-6 py-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-850 shrink-0 z-10 bg-white/40 dark:bg-slate-950/40 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-md shadow-blue-500/20">
            <Activity className="h-5 w-5" />
          </div>
          <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-blue-600 to-indigo-500 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">
            Sahyog
          </span>
        </div>

        <button
          onClick={toggleTheme}
          className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/80 hover:-translate-y-0.5 transition active:scale-95 duration-250 cursor-pointer shadow-sm text-slate-600 dark:text-slate-350"
        >
          {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </button>
      </header>

      <main className="flex-1 flex items-center justify-center p-6 z-10">
        <div className="w-full flex justify-center animate-in fade-in zoom-in-95 duration-500">
          <RegisterForm />
        </div>
      </main>

      <footer className="py-4 border-t border-slate-100 dark:border-slate-850 text-center text-xs text-slate-400 dark:text-slate-600 shrink-0 z-10 bg-white/20">
        &copy; {new Date().getFullYear()} Sahyog Healthcare Platform. All rights reserved.
      </footer>
    </div>
  );
};

export default Register;
