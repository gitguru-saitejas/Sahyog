import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, Mail, Lock, Loader2 } from "lucide-react";
import api, { apiEvents } from "../services/api";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // If already logged in, redirect to dashboard
    if (localStorage.getItem("superAdminToken")) {
      navigate("/dashboard");
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await api.post("/auth/login", { email, password });
      const { accessToken, user } = res.data;
      
      localStorage.setItem("superAdminToken", accessToken);
      localStorage.setItem("superAdminEmail", user.email);
      localStorage.setItem("superAdminName", `${user.first_name} ${user.last_name}`);
      localStorage.setItem("superAdminRole", user.role);
      
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.detail || "Invalid login credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative background grid and gradient blur */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl -z-10" />

      {/* Login Card */}
      <div className="w-full max-w-md rounded-2xl glass-card border border-border p-8 shadow-2xl relative">
        {/* Branding header */}
        <div className="text-center space-y-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary mx-auto">
            <Activity className="w-7 h-7 animate-pulse-subtle" />
          </div>
          <div>
            <h1 className="text-2xl font-black font-display text-white tracking-tight leading-none">Sahyog 1.0</h1>
            <span className="text-xs text-muted-foreground font-semibold mt-1 inline-block uppercase tracking-wider">Super Admin Portal</span>
          </div>
        </div>

        {/* Error Feedback */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-sm text-destructive font-medium">
            {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Email address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter email address"
                className="w-full pl-11 pr-4 py-3 bg-input border border-border rounded-xl text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-11 pr-4 py-3 bg-input border border-border rounded-xl text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3.5 bg-primary text-primary-foreground font-semibold rounded-xl text-sm hover:bg-primary/95 transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:scale-[1.01]"
          >
            {loading ? (
              <>
                <Loader2 className="w-4.5 h-4.5 animate-spin" />
                Authenticating...
              </>
            ) : (
              "Sign in to Dashboard"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
