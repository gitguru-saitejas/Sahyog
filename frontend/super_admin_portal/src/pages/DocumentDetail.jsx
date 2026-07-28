import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, BookOpen, Layers, Globe, Calendar, User, FileJson, Loader2 } from "lucide-react";
import api from "../services/api";

export default function DocumentDetail() {
  const { documentId } = useParams();
  const [doc, setDoc] = useState(null);
  const [chunks, setChunks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchDocDetail = async () => {
      setLoading(true);
      setError("");
      try {
        const dRes = await api.get(`/knowledge-base/${documentId}`);
        setDoc(dRes.data);

        const cRes = await api.get(`/knowledge-base/${documentId}/chunks`);
        setChunks(cRes.data);
      } catch (err) {
        setError("Failed to fetch guidelines document details.");
      } finally {
        setLoading(false);
      }
    };

    fetchDocDetail();
  }, [documentId]);

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
        <Link 
          to="/knowledge-base"
          className="mt-4 flex items-center gap-2 px-4 py-2 bg-secondary text-foreground text-sm font-semibold rounded-lg border border-border hover:bg-secondary/80 transition-all duration-200"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to list
        </Link>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 fade-in flex-1">
      {/* Back button */}
      <div>
        <Link to="/knowledge-base" className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-white uppercase transition-all duration-150">
          <ArrowLeft className="w-4 h-4" />
          Back to Guidelines
        </Link>
      </div>

      {/* Document info hero */}
      <div className="p-6 rounded-2xl bg-card border border-border flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 shrink-0">
            <BookOpen className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h3 className="text-xl font-bold text-white font-display leading-tight">{doc.title}</h3>
              <span className={`inline-flex px-2.5 py-0.5 rounded text-[10px] font-bold uppercase border ${
                !doc.hospital_id 
                  ? "bg-blue-500/10 text-blue-400 border-blue-500/20" 
                  : "bg-purple-500/10 text-purple-400 border-purple-500/20"
              }`}>
                {!doc.hospital_id ? "Global Scope" : "Hospital Specific"}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">Category: {doc.category} • Version: {doc.version}</p>
          </div>
        </div>

        {/* View source file button */}
        {doc.file_url && (
          <a
            href={`http://localhost:8000${doc.file_url}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2.5 bg-secondary hover:bg-secondary/80 border border-border text-xs font-bold rounded-lg text-white transition-all duration-150 shrink-0 w-full lg:w-auto text-center justify-center"
          >
            Download Source Document
          </a>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left column: Extracted Chunks List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-white font-display text-lg flex items-center gap-2">
              <FileJson className="w-5 h-5 text-primary" />
              Extracted Chunks ({chunks.length})
            </h4>
          </div>

          {chunks.length === 0 ? (
            <div className="p-8 text-center text-sm border border-border rounded-xl bg-card text-muted-foreground">
              No chunks generated. Ingestion might have encountered an extraction failure.
            </div>
          ) : (
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
              {chunks.map((chk) => (
                <div key={chk.id} className="p-5 rounded-2xl bg-card border border-border space-y-3 relative hover:border-muted-foreground/20 transition-all duration-150">
                  <div className="flex items-center justify-between text-xs font-bold text-muted-foreground">
                    <span className="uppercase text-primary/80">Chunk #{chk.chunk_index + 1}</span>
                    <span>Page {chk.metadata?.page || 1}</span>
                  </div>
                  <p className="text-sm text-foreground leading-relaxed text-white/90 bg-secondary/15 p-3 rounded-lg border border-border/40">
                    {chk.content}
                  </p>
                  {chk.metadata && (
                    <div className="text-[10px] text-muted-foreground bg-secondary/20 p-2 rounded border border-border/30 font-mono">
                      <strong>Metadata:</strong> {JSON.stringify(chk.metadata)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right column: Metadata Summary Details */}
        <div className="space-y-6">
          <div className="p-6 rounded-2xl border border-border bg-card space-y-6">
            <h4 className="font-bold text-white font-display border-b border-border pb-3">Ingestion Details</h4>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Calendar className="w-4.5 h-4.5 text-muted-foreground shrink-0" />
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase block">Ingested Date</span>
                  <p className="text-xs text-white font-medium">{new Date(doc.created_at).toLocaleString()}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <User className="w-4.5 h-4.5 text-muted-foreground shrink-0" />
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase block">Uploaded By</span>
                  <p className="text-xs text-white font-medium">{doc.uploader_name || "Super Admin"}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Layers className="w-4.5 h-4.5 text-muted-foreground shrink-0" />
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase block">Hospital Node Context</span>
                  <p className="text-xs text-white font-medium">{doc.hospital_name || "Platform Global Scope"}</p>
                </div>
              </div>

              {doc.guidance_topic && (
                <div className="flex items-center gap-3">
                  <Layers className="w-4.5 h-4.5 text-muted-foreground shrink-0" />
                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase block">Guidance Topic</span>
                    <p className="text-xs text-white font-medium">{doc.guidance_topic}</p>
                  </div>
                </div>
              )}

              <div className="pt-2 border-t border-border flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Embedding Dimensions:</span>
                <span className="text-xs font-bold text-white">1024 VECTOR</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Extraction Status:</span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Success
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
