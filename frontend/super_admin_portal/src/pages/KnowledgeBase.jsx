import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { BookOpen, Search, Upload, Trash2, Globe, Layers, ChevronLeft, ChevronRight, Loader2, Info, CheckCircle, FileText } from "lucide-react";
import api, { apiEvents } from "../services/api";
import ConfirmDialog from "../components/ConfirmDialog";

const CATEGORIES = [
  { value: "CLINICAL_STANDARDS", label: "Clinical Standards" },
  { value: "PATIENT_GUIDANCE", label: "Patient Guidance" },
  { value: "HOSPITAL_OPERATIONS", label: "Hospital Operations" },
  { value: "GOVERNMENT_SCHEMES", label: "Government Schemes" },
  { value: "OTHER", label: "Other" }
];

export default function KnowledgeBase() {
  const [documents, setDocuments] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Query state
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [scopeFilter, setScopeFilter] = useState("all");
  const [hospitalFilter, setHospitalFilter] = useState("");

  // Upload modal state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    title: "",
    category: "CLINICAL_STANDARDS",
    version: "1.0",
    scope: "global", // "global" | "hospital"
    hospital_id: "",
    file: null
  });
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  // Deletion modal state
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [actionDocId, setActionDocId] = useState(null);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/knowledge-base", {
        params: {
          page,
          limit: 10,
          search: search || undefined,
          category: categoryFilter,
          scope: scopeFilter,
          hospital_id: hospitalFilter || undefined
        }
      });
      setDocuments(res.data.items);
      setTotal(res.data.total);
      setTotalPages(res.data.total_pages);
    } catch (err) {
      setError("Failed to retrieve knowledge base documents.");
    } finally {
      setLoading(false);
    }
  }, [page, search, categoryFilter, scopeFilter, hospitalFilter]);

  const loadHospitalsList = async () => {
    try {
      const res = await api.get("/hospitals", { params: { limit: 100 } });
      setHospitals(res.data.items);
    } catch (err) {
      console.error("Failed to load hospitals list", err);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  useEffect(() => {
    loadHospitalsList();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchDocuments();
  };

  // Upload form submission
  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!uploadForm.file) {
      setUploadError("Please select a document file to upload.");
      return;
    }

    setUploadLoading(true);
    setUploadError("");

    const formData = new FormData();
    formData.append("title", uploadForm.title);
    formData.append("category", uploadForm.category);
    formData.append("version", uploadForm.version);
    formData.append("file", uploadForm.file);
    
    if (uploadForm.scope === "hospital" && uploadForm.hospital_id) {
      formData.append("hospital_id", uploadForm.hospital_id);
    }

    try {
      await api.post("/knowledge-base/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 180000
      });
      setIsUploadOpen(false);
      setUploadForm({
        title: "",
        category: "CLINICAL_STANDARDS",
        version: "1.0",
        scope: "global",
        hospital_id: "",
        file: null
      });
      apiEvents.emit("toast", { type: "success", message: "Document uploaded and ingested successfully." });
      fetchDocuments();
    } catch (err) {
      setUploadError(err.response?.data?.detail || "Ingestion pipeline failure. Check server logs.");
    } finally {
      setUploadLoading(false);
    }
  };

  const triggerDelete = (id) => {
    setActionDocId(id);
    setConfirmDeleteOpen(true);
  };

  const executeDelete = async () => {
    try {
      await api.delete(`/knowledge-base/${actionDocId}`);
      apiEvents.emit("toast", { type: "success", message: "Document deleted successfully." });
      fetchDocuments();
    } catch (err) {
      // Handled globally
    }
  };

  return (
    <div className="p-8 space-y-8 fade-in flex-1">
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-xl font-bold text-white font-display">RAG Knowledge Base</h3>
          <p className="text-sm text-muted-foreground">Manage files chunked and embedded in vector storage for AI assistance.</p>
        </div>
        <button
          onClick={() => setIsUploadOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold rounded-lg shadow-lg shadow-primary/10 transition-all duration-200 hover:scale-[1.01]"
        >
          <Upload className="w-4 h-4" />
          Upload Document
        </button>
      </div>

      {/* Filter and search bar */}
      <div className="flex flex-col gap-4 p-4 rounded-xl bg-card border border-border">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Scope Filters */}
          <div className="flex gap-2">
            {[
              { val: "all", label: "All Scopes" },
              { val: "global", label: "Global Scope" },
              { val: "hospital", label: "Hospital Scope" }
            ].map((s) => (
              <button
                key={s.val}
                onClick={() => {
                  setScopeFilter(s.val);
                  setPage(1);
                }}
                className={`px-4 py-2 text-xs font-bold uppercase rounded-lg border transition-all duration-200 ${
                  scopeFilter === s.val
                    ? "bg-secondary text-white border-border"
                    : "text-muted-foreground hover:bg-secondary/40 border-transparent hover:text-foreground"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Search bar */}
          <form onSubmit={handleSearchSubmit} className="relative w-full lg:max-w-xs">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search document title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-input border border-border rounded-lg text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
            />
          </form>
        </div>

        {/* Extended drop filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-border pt-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-muted-foreground uppercase">Filter by Category</label>
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-input border border-border rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="all">All Categories</option>
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-muted-foreground uppercase">Filter by Hospital Node</label>
            <select
              value={hospitalFilter}
              onChange={(e) => {
                setHospitalFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-input border border-border rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">All Hospital Nodes</option>
              {hospitals.map((h) => (
                <option key={h.id} value={h.id}>{h.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Documents list */}
      {loading ? (
        <div className="flex items-center justify-center p-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : documents.length === 0 ? (
        <div className="p-12 text-center rounded-xl bg-card/30 border border-border border-dashed flex flex-col items-center justify-center gap-3">
          <BookOpen className="w-12 h-12 text-muted-foreground/45" />
          <h4 className="font-bold text-white font-display">No Documents Found</h4>
          <p className="text-sm text-muted-foreground">Upload guidelines or standards to populate vector database chunks.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-secondary/30 text-xs font-bold uppercase text-muted-foreground border-b border-border">
                <tr>
                  <th className="px-6 py-4">Title</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4 text-center">Version</th>
                  <th className="px-6 py-4 text-center">Scope</th>
                  <th className="px-6 py-4">Hospital Node</th>
                  <th className="px-6 py-4 text-center">Chunks Count</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-muted-foreground">
                {documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-secondary/10 transition-all duration-150">
                    <td className="px-6 py-4 font-semibold text-white flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 shrink-0">
                        <FileText className="w-4.5 h-4.5" />
                      </div>
                      {doc.title}
                    </td>
                    <td className="px-6 py-4 font-medium">
                      {CATEGORIES.find(c => c.value === doc.category)?.label || doc.category}
                    </td>
                    <td className="px-6 py-4 text-center font-bold text-xs">{doc.version}</td>
                    <td className="px-6 py-4 text-center">
                      {!doc.hospital_id ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-bold uppercase">
                          <Globe className="w-3 h-3" />
                          Global
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[10px] font-bold uppercase">
                          <Layers className="w-3 h-3" />
                          Hospital
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-medium">{doc.hospital_name || "Platform Global"}</td>
                    <td className="px-6 py-4 text-center font-bold text-white font-display">{doc.chunk_count}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end items-center gap-2">
                        <Link
                          to={`/knowledge-base/${doc.id}`}
                          className="p-2 bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-white rounded-lg border border-border transition-all duration-150"
                          title="View Ingested Chunks"
                        >
                          <Info className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => triggerDelete(doc.id)}
                          className="p-2 bg-destructive/10 border border-destructive/20 text-destructive hover:bg-destructive/20 rounded-lg transition-all duration-150"
                          title="Delete Document"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination controls */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-border flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Showing page <strong className="text-white">{page}</strong> of <strong className="text-white">{totalPages}</strong> ({total} total documents)
              </span>
              <div className="flex gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                  className="p-2 bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:hover:bg-secondary rounded-lg border border-border transition-all duration-150"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
                  className="p-2 bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:hover:bg-secondary rounded-lg border border-border transition-all duration-150"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Upload Document Modal */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setIsUploadOpen(false)} />
          <div className="relative w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-2xl animate-fade-in z-10">
            <h3 className="text-lg font-bold text-white font-display mb-4">Ingest Guidelines Document</h3>
            
            {uploadError && (
              <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive font-medium">
                {uploadError}
              </div>
            )}

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Document Title</label>
                  <input
                    type="text"
                    required
                    value={uploadForm.title}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g. Hypertension Guidelines"
                    className="w-full px-3.5 py-2.5 bg-input border border-border rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary transition-all duration-200"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Version</label>
                  <input
                    type="text"
                    required
                    value={uploadForm.version}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, version: e.target.value }))}
                    placeholder="1.0"
                    className="w-full px-3.5 py-2.5 bg-input border border-border rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary transition-all duration-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Category</label>
                  <select
                    value={uploadForm.category}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-input border border-border rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary transition-all duration-200"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Scope</label>
                  <select
                    value={uploadForm.scope}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, scope: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-input border border-border rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary transition-all duration-200"
                  >
                    <option value="global">Platform Global</option>
                    <option value="hospital">Hospital Specific</option>
                  </select>
                </div>
              </div>

              {uploadForm.scope === "hospital" && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Target Hospital Node</label>
                  <select
                    required
                    value={uploadForm.hospital_id}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, hospital_id: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-input border border-border rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary transition-all duration-200"
                  >
                    <option value="">-- Choose Hospital Node --</option>
                    {hospitals.map((h) => (
                      <option key={h.id} value={h.id}>{h.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground uppercase">Select File (PDF or TXT)</label>
                <input
                  type="file"
                  required
                  accept=".pdf,.txt"
                  onChange={(e) => setUploadForm(prev => ({ ...prev, file: e.target.files[0] }))}
                  className="w-full px-3 py-2 bg-input border border-border rounded-lg text-xs text-white focus:outline-none file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary/20 file:text-primary hover:file:bg-primary/30 file:cursor-pointer"
                />
                <span className="text-[10px] text-muted-foreground mt-0.5 block">Maximum size limit: 10MB</span>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsUploadOpen(false)}
                  className="px-4 py-2 text-sm font-semibold rounded-lg bg-secondary hover:bg-secondary/80 border border-border text-muted-foreground hover:text-white transition-all duration-150"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploadLoading}
                  className="px-4 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/95 transition-all duration-150 flex items-center gap-1.5 shadow-lg shadow-primary/10"
                >
                  {uploadLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {uploadLoading ? "Processing RAG..." : "Ingest Document"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm permanent delete document */}
      <ConfirmDialog
        isOpen={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
        onConfirm={executeDelete}
        title="Delete Guidelines Document?"
        message="Are you sure you want to permanently delete this guidelines document? This action deletes the document metadata, its local storage file, and automatically purges all generated vector embeddings from document_chunks."
        confirmText="Purge Document"
      />
    </div>
  );
}
