import React, { useState, useEffect } from "react";
import { Building2, BookOpen, Globe, Layers, ArrowRight, Loader2, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import api from "../services/api";

export default function Dashboard() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchMetrics = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/dashboard/summary");
      setMetrics(res.data);
    } catch (err) {
      setError("Failed to load dashboard metrics. Please reload.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <p className="text-destructive text-sm font-semibold">{error}</p>
        <button 
          onClick={fetchMetrics}
          className="mt-4 flex items-center gap-2 px-4 py-2 bg-secondary text-foreground text-sm font-semibold rounded-lg border border-border hover:bg-secondary/80 transition-all duration-200"
        >
          <RefreshCw className="w-4 h-4" />
          Retry
        </button>
      </div>
    );
  }

  const statCards = [
    {
      title: "Active Hospitals",
      value: metrics?.active_hospitals || 0,
      description: "Registered hospitals serving patients",
      icon: Building2,
      link: "/hospitals",
      color: "from-blue-500/10 to-indigo-500/10 text-blue-400 border-blue-500/20"
    },
    {
      title: "Knowledge Documents",
      value: metrics?.total_documents || 0,
      description: "Verified medical RAG corpus documents",
      icon: BookOpen,
      link: "/knowledge-base",
      color: "from-teal-500/10 to-emerald-500/10 text-teal-400 border-teal-500/20"
    },
    {
      title: "Global Guidelines",
      value: metrics?.global_documents || 0,
      description: "Accessible by all tenant hospitals",
      icon: Globe,
      link: "/knowledge-base?scope=global",
      color: "from-purple-500/10 to-pink-500/10 text-purple-400 border-purple-500/20"
    },
    {
      title: "Hospital-Specific Documents",
      value: metrics?.hospital_documents || 0,
      description: "Isolated to specific hospital index scopes",
      icon: Layers,
      link: "/knowledge-base?scope=hospital",
      color: "from-amber-500/10 to-orange-500/10 text-amber-400 border-amber-500/20"
    }
  ];

  return (
    <div className="p-8 space-y-8 fade-in">
      {/* Welcome Banner */}
      <div className="p-6 rounded-2xl glass border border-border relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-1.5 text-center md:text-left">
          <h3 className="text-xl font-bold text-white font-display">Welcome back, Super Admin</h3>
          <p className="text-sm text-muted-foreground">Monitor platform statistics and manage tenant hospital nodes and medical guidelines corpus.</p>
        </div>
        <button 
          onClick={fetchMetrics}
          className="flex items-center gap-2 px-4 py-2.5 bg-secondary hover:bg-secondary/80 text-foreground text-xs font-bold rounded-lg border border-border transition-all duration-200"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh Stats
        </button>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div 
              key={idx}
              className={`rounded-2xl border bg-card p-6 flex flex-col justify-between hover-scale bg-gradient-to-br ${card.color}`}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider opacity-90">{card.title}</span>
                  <div className="p-2 rounded-lg bg-card/60 border border-current/10">
                    <Icon className="w-5 h-5" />
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-4xl font-extrabold text-white leading-none font-display">{card.value}</span>
                  <p className="text-xs opacity-75">{card.description}</p>
                </div>
              </div>
              
              <Link 
                to={card.link}
                className="mt-6 flex items-center gap-1.5 text-xs font-bold text-white group"
              >
                Manage Module
                <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-1" />
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
