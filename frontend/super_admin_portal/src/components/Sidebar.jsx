import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, Building2, BookOpen, LogOut, Activity } from "lucide-react";

export default function Sidebar() {
  const navigate = useNavigate();
  const email = localStorage.getItem("superAdminEmail") || "";
  const name = localStorage.getItem("superAdminName") || "Super Admin";

  const handleLogout = () => {
    localStorage.removeItem("superAdminToken");
    localStorage.removeItem("superAdminRole");
    localStorage.removeItem("superAdminEmail");
    localStorage.removeItem("superAdminName");
    navigate("/login");
  };

  return (
    <aside className="w-64 bg-card border-r border-border flex flex-col justify-between h-screen sticky top-0">
      <div>
        {/* Branding */}
        <div className="p-6 border-b border-border flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center text-primary border border-primary/30">
            <Activity className="w-6 h-6 animate-pulse-subtle" />
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight font-display text-white">Sahyog 1.0</h1>
            <span className="text-xs text-muted-foreground font-medium">SUPER ADMIN</span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="p-4 space-y-1">
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/10"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`
            }
          >
            <LayoutDashboard className="w-5 h-5" />
            Dashboard
          </NavLink>

          <NavLink
            to="/hospitals"
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/10"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`
            }
          >
            <Building2 className="w-5 h-5" />
            Hospitals
          </NavLink>

          <NavLink
            to="/knowledge-base"
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/10"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`
            }
          >
            <BookOpen className="w-5 h-5" />
            Knowledge Base
          </NavLink>
        </nav>
      </div>

      {/* Profile and Logout */}
      <div className="p-4 border-t border-border space-y-3">
        <div className="flex items-center gap-3 px-2">
          <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center font-bold text-sm text-primary-foreground uppercase shadow-md">
            {name.substring(0, 2)}
          </div>
          <div className="truncate max-w-[150px]">
            <p className="text-sm font-semibold text-foreground leading-none">{name}</p>
            <span className="text-[10px] text-muted-foreground">{email}</span>
          </div>
        </div>
        
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-all duration-200"
        >
          <LogOut className="w-5 h-5" />
          Log out
        </button>
      </div>
    </aside>
  );
}
