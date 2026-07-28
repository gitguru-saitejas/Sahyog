import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { 
  Activity, Users, LayoutDashboard, Building, LogOut, Sun, Moon, 
  Menu, X, ClipboardList, Stethoscope
} from "lucide-react";

export default function HospitalLayout({ children }) {
  const { employee, employeeLogout, theme, toggleTheme } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!employee) {
    return null;
  }

  const handleLogout = () => {
    employeeLogout();
    navigate("/employee-login");
  };

  const getMenuItems = () => {
    switch (employee.role) {
      case "HOSPITAL_ADMIN":
        return [
          { label: "Dashboard", path: "/hospital/admin/dashboard", icon: <LayoutDashboard className="h-5 w-5" /> },
          { label: "Doctors", path: "/hospital/admin/doctors", icon: <Stethoscope className="h-5 w-5" /> },
          { label: "Support Staff", path: "/hospital/admin/staff", icon: <Users className="h-5 w-5" /> },
          { label: "Departments", path: "/hospital/admin/departments", icon: <Building className="h-5 w-5" /> }
        ];
      case "DOCTOR":
        return [
          { label: "Dashboard", path: "/doctor/dashboard", icon: <LayoutDashboard className="h-5 w-5" /> },
          { label: "Patient Timeline", path: "/doctor/timeline", icon: <Activity className="h-5 w-5" /> }
        ];
      case "SUPPORT_STAFF":
        return [
          { label: "Dashboard", path: "/support/dashboard", icon: <LayoutDashboard className="h-5 w-5" /> },
          { label: "Pre-Consultation", path: "/support/encounter", icon: <ClipboardList className="h-5 w-5" /> }
        ];
      default:
        return [];
    }
  };

  const menuItems = getMenuItems();

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors duration-300">
      
      {/* Desktop Sidebar */}
      <aside className={`hidden md:flex flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-350 shrink-0 select-none ${
        collapsed ? "w-20" : "w-64"
      }`}>
        <div className="p-4 border-b border-slate-100 dark:border-slate-850 flex items-center justify-between gap-2.5 h-16">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-9 h-9 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
              <Activity className="h-5 w-5" />
            </div>
            {!collapsed && (
              <span className="font-extrabold text-base tracking-tight bg-gradient-to-r from-blue-600 to-indigo-500 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent truncate">
                Sahyog HIS
              </span>
            )}
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
          {menuItems.map((item, idx) => {
            const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + "/");
            return (
              <Link
                key={idx}
                to={item.path}
                className={`flex items-center gap-3 px-3.5 py-2.5 font-bold text-xs rounded-xl transition duration-250 cursor-pointer ${
                  isActive
                    ? "bg-blue-50 dark:bg-slate-800/80 text-blue-600 dark:text-blue-450 border border-blue-100/50 dark:border-slate-800"
                    : "text-slate-550 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850 hover:text-slate-855 dark:hover:text-slate-200"
                }`}
              >
                {item.icon}
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-slate-100 dark:border-slate-850">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex w-full items-center justify-center p-2.5 bg-slate-50 dark:bg-slate-850/50 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer text-slate-500 dark:text-slate-400 border border-transparent dark:hover:border-slate-750 transition"
          >
            <Menu className="h-4 w-4" />
          </button>
        </div>
      </aside>

      {/* Main Column Wrapper */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Top Navbar */}
        <header className="px-6 py-4 flex items-center justify-between border-b border-slate-150 dark:border-slate-850 shrink-0 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md sticky top-0 z-20 h-16">
          <button
            onClick={() => setMobileOpen(true)}
            className="md:hidden p-2 text-slate-555 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-xl transition cursor-pointer"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="hidden md:flex items-center gap-2">
            <span className="text-2xs font-bold bg-blue-50 dark:bg-slate-800 border border-blue-100 dark:border-slate-750 text-blue-655 dark:text-blue-400 rounded-md py-0.5 px-2 tracking-wider uppercase">
              {employee.role.replace("_", " ")}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="font-bold text-xs text-slate-800 dark:text-slate-50 leading-tight">
                {employee.first_name} {employee.last_name}
              </div>
              <div className="text-3xs text-slate-400 font-bold tracking-wider uppercase">
                ID: {employee.employee_id}
              </div>
            </div>

            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center uppercase shrink-0">
              {employee.first_name?.[0]}{employee.last_name?.[0]}
            </div>

            <button
              onClick={toggleTheme}
              className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-750 transition active:scale-95 duration-250 cursor-pointer text-slate-655 dark:text-slate-350"
            >
              {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </button>

            <button
              onClick={handleLogout}
              className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-red-655 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-y-auto min-w-0">
          {children}
        </main>
      </div>

      {/* Mobile Sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div 
            onClick={() => setMobileOpen(false)} 
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-300"
          />
          <aside className="relative flex flex-col w-64 max-w-xs bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 h-full p-4 space-y-4 animate-in slide-in-from-left duration-300">
            <button 
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 p-1.5 hover:bg-slate-50 dark:hover:bg-slate-855 rounded-xl transition text-slate-500"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2 pb-4 border-b border-slate-100 dark:border-slate-850">
              <Activity className="h-5 w-5 text-blue-600" />
              <span className="font-extrabold text-base text-slate-855 dark:text-slate-50">Sahyog Portal</span>
            </div>
            <nav className="flex-1 space-y-2">
              {menuItems.map((item, idx) => {
                const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + "/");
                return (
                  <Link
                    key={idx}
                    to={item.path}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 font-bold text-xs rounded-xl transition ${
                      isActive
                        ? "bg-blue-50 dark:bg-slate-850 text-blue-600 dark:text-blue-450 border border-blue-100 dark:border-slate-800"
                        : "text-slate-555 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850"
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </aside>
        </div>
      )}
    </div>
  );
}
