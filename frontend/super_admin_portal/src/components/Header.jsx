import React from "react";
import { User, Bell, ChevronDown } from "lucide-react";

export default function Header({ title }) {
  const name = localStorage.getItem("superAdminName") || "Super Admin";

  return (
    <header className="h-16 border-b border-border bg-card/50 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between px-8">
      {/* Title */}
      <h2 className="text-xl font-bold tracking-tight text-white font-display uppercase">{title}</h2>

      {/* Utilities */}
      <div className="flex items-center gap-4">
        {/* System Notifications Alert */}
        <button className="w-9 h-9 rounded-lg bg-secondary hover:bg-secondary/80 flex items-center justify-center text-muted-foreground hover:text-foreground transition-all duration-200 border border-border">
          <Bell className="w-4 h-4" />
        </button>

        {/* Profile Info */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-secondary/30">
          <div className="w-6.5 h-6.5 rounded-full bg-primary/20 flex items-center justify-center text-primary">
            <User className="w-3.5 h-3.5" />
          </div>
          <span className="text-sm font-medium text-muted-foreground">{name}</span>
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
        </div>
      </div>
    </header>
  );
}
