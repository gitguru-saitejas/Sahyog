import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api, { apiEvents } from "../services/api";
import {
  Activity,
  ArrowLeft,
  Users,
  Sun,
  Moon,
  LogOut,
  Send,
  Loader2,
  AlertCircle,
  BookOpen,
  Mic,
  Square,
  Volume2
} from "lucide-react";

const TOPICS = [
  {
    id: "PREGNANCY",
    title: "Pregnancy",
    description: "Guidance for pregnancy health, maternal nutrition, and prenatal wellbeing.",
    icon: "🤰",
    bgClass: "from-pink-500/10 to-rose-500/10 border-pink-100 dark:border-pink-900/20"
  },
  {
    id: "DIABETES",
    title: "Diabetes",
    description: "Resources for blood glucose management, diabetic diet, and healthy lifestyle choices.",
    icon: "🩸",
    bgClass: "from-blue-500/10 to-indigo-500/10 border-blue-100 dark:border-blue-900/20"
  },
  {
    id: "HYPERTENSION",
    title: "Hypertension",
    description: "Information on blood pressure monitoring, sodium limits, and cardiovascular fitness.",
    icon: "❤️",
    bgClass: "from-rose-500/10 to-red-500/10 border-rose-100 dark:border-rose-900/20"
  },
  {
    id: "NUTRITION",
    title: "Nutrition",
    description: "General dietary guidelines, balanced meal planning, and nutrition support.",
    icon: "🥗",
    bgClass: "from-emerald-500/10 to-teal-500/10 border-emerald-100 dark:border-emerald-900/20"
  },
  {
    id: "CHILD_HEALTH",
    title: "Child Health",
    description: "Pediatric care essentials, childhood immunizations, and developmental milestones.",
    icon: "👶",
    bgClass: "from-amber-500/10 to-orange-500/10 border-amber-100 dark:border-amber-900/20"
  }
];

export const PatientGuidanceAssistant = () => {
  const { selectedPatient, logout, selectPatient, theme, toggleTheme } = useAuth();
  const navigate = useNavigate();
  
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [messages, setMessages] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [inputText, setInputText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const chatEndRef = useRef(null);

  const [recordingState, setRecordingState] = useState("IDLE"); // IDLE, RECORDING, TRANSCRIBING
  const mediaStreamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const [generatingTtsIndex, setGeneratingTtsIndex] = useState(null);
  const [playingTtsIndex, setPlayingTtsIndex] = useState(null);
  const activeAudioRef = useRef(null);
  const activeAudioUrlRef = useRef(null);

  // Clean up recording streams and audio playback on unmount
  useEffect(() => {
    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
      }
      if (activeAudioUrlRef.current) {
        URL.revokeObjectURL(activeAudioUrlRef.current);
      }
    };
  }, []);

  // Guard: Redirect to Selection if no patient context exists
  useEffect(() => {
    if (!selectedPatient) {
      navigate("/family-selection");
    }
  }, [selectedPatient, navigate]);

  // Strict isolation: Reset state when active patient ID changes
  useEffect(() => {
    setMessages([]);
    setSessionId(null);
    setInputText("");
    setSelectedTopic(null);
  }, [selectedPatient?.id]);

  // Auto-scroll chat to the bottom when messages update
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, submitting]);

  if (!selectedPatient) return null;

  const handleSwitchProfile = () => {
    selectPatient(null);
    navigate("/family-selection");
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const startRecording = async () => {
    audioChunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const options = {};
      if (MediaRecorder.isTypeSupported("audio/webm")) {
        options.mimeType = "audio/webm";
      } else if (MediaRecorder.isTypeSupported("audio/ogg")) {
        options.mimeType = "audio/ogg";
      } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
        options.mimeType = "audio/mp4";
      }

      const recorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const mimeType = recorder.mimeType || "audio/webm";
        const extension = mimeType.includes("ogg") ? "ogg" : mimeType.includes("mp4") ? "mp4" : "webm";
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });

        setRecordingState("TRANSCRIBING");

        try {
          const formData = new FormData();
          formData.append("file", audioBlob, `recording.${extension}`);

          const response = await api.post("/speech/transcribe?language=kn&decoder=ctc", formData, {
            headers: {
              "Content-Type": "multipart/form-data"
            }
          });

          if (response.data && response.data.text) {
            setInputText(response.data.text);
          }
        } catch (err) {
          console.error("[STT ERROR]:", err);
          setMessages((prev) => [
            ...prev,
            {
              sender: "ERROR",
              text: "Speech-to-Text translation failed. Please try again or type your question."
            }
          ]);
        } finally {
          setRecordingState("IDLE");
          if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => track.stop());
            mediaStreamRef.current = null;
          }
        }
      };

      recorder.start();
      setRecordingState("RECORDING");
    } catch (err) {
      console.error("[MIC PERMISSION ERROR]:", err);
      setMessages((prev) => [
        ...prev,
        {
          sender: "ERROR",
          text: "Failed to access microphone. Please check your browser permissions."
        }
      ]);
      setRecordingState("IDLE");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  };

  const handleMicClick = (e) => {
    if (e) e.preventDefault();
    if (recordingState === "IDLE") {
      startRecording();
    } else if (recordingState === "RECORDING") {
      stopRecording();
    }
  };

  const stopTtsPlayback = () => {
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current = null;
    }
    if (activeAudioUrlRef.current) {
      URL.revokeObjectURL(activeAudioUrlRef.current);
      activeAudioUrlRef.current = null;
    }
    setPlayingTtsIndex(null);
    setGeneratingTtsIndex(null);
  };

  const handleTtsPlayClick = async (text, index) => {
    if (playingTtsIndex === index || generatingTtsIndex === index) {
      stopTtsPlayback();
      return;
    }

    stopTtsPlayback();
    setGeneratingTtsIndex(index);

    try {
      const isHindi = /[\u0900-\u097F]/.test(text);
      const audioLang = isHindi ? "hi" : "kn";
      const response = await api.post(
        "/speech/synthesize",
        {
          text: text,
          language: audioLang,
          speaker: "Anu"
        },
        {
          responseType: "blob"
        }
      );

      const audioBlob = response.data;
      const audioUrl = URL.createObjectURL(audioBlob);
      activeAudioUrlRef.current = audioUrl;

      const audio = new Audio(audioUrl);
      activeAudioRef.current = audio;
      setPlayingTtsIndex(index);
      setGeneratingTtsIndex(null);

      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        if (activeAudioUrlRef.current === audioUrl) {
          activeAudioUrlRef.current = null;
        }
        if (activeAudioRef.current === audio) {
          activeAudioRef.current = null;
        }
        setPlayingTtsIndex(null);
      };

      await audio.play();
    } catch (err) {
      console.error("[TTS FRONTEND ERROR]:", err);
      setGeneratingTtsIndex(null);
      apiEvents.emit("toast", {
        type: "error",
        message: "Unable to generate speech. Please try again."
      });
    }
  };

  const handleSend = async (e) => {
    if (e) e.preventDefault();
    
    const trimmedInput = inputText.trim();
    if (!trimmedInput || submitting || trimmedInput.length > 1000) return;

    // 1. Add patient query to page message state
    const userMessage = { sender: "PATIENT", text: trimmedInput };
    setMessages((prev) => [...prev, userMessage]);
    
    const queryText = trimmedInput;
    setInputText(""); // Clear input area
    setSubmitting(true);

    const isKannada = /[\u0C80-\u0CFF]/.test(queryText);
    const isHindi = /[\u0900-\u097F]/.test(queryText);
    const reqLang = isKannada ? "kn" : isHindi ? "hi" : "en";

    // 2. Query RAG backend ask API
    try {
      const response = await api.post("/patient-guidance/ask", {
        question: queryText,
        patient_id: selectedPatient.id,
        session_id: sessionId,
        guidance_topic: selectedTopic,
        language: reqLang
      });

      const { answer, sources, session_id } = response.data;
      
      // Update session ID to continue discussion context on follow-up calls
      setSessionId(session_id);

      // Append AI response with its document source attributions
      setMessages((prev) => [
        ...prev,
        {
          sender: "AI",
          text: answer,
          sources: sources || []
        }
      ]);
    } catch (error) {
      console.error("[GUIDANCE ENDPOINT ERROR]:", error);
      
      // Controlled error state
      setMessages((prev) => [
        ...prev,
        {
          sender: "ERROR",
          text: "The health guidance service is temporarily unavailable. Please try again later."
        }
      ]);
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleBack = () => {
    if (selectedTopic) {
      setSelectedTopic(null);
      setMessages([]);
      setSessionId(null);
      setInputText("");
    } else {
      navigate("/dashboard");
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 transition duration-300">
      
      {/* Top Header Panel */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-850 shrink-0 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <button
            onClick={handleBack}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition duration-200 cursor-pointer"
            title={selectedTopic ? "Back to Topics" : "Back to Dashboard"}
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-emerald-600 text-white rounded-xl flex items-center justify-center shadow-md shadow-emerald-500/20">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <span className="font-extrabold text-base tracking-tight bg-gradient-to-r from-emerald-600 to-teal-500 dark:from-emerald-400 dark:to-teal-400 bg-clip-text text-transparent capitalize">
                {selectedTopic ? `${selectedTopic.toLowerCase().replace("_", " ")} Guidance` : "Guidance Assistant"}
              </span>
              <span className="text-2xs block font-bold text-slate-400 -mt-0.5 uppercase tracking-wider">
                Patient: {selectedPatient.first_name} {selectedPatient.last_name}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Switch Profile */}
          <button
            onClick={handleSwitchProfile}
            className="flex items-center gap-1.5 py-2 px-3 bg-blue-50 hover:bg-blue-100 dark:bg-slate-800 dark:hover:bg-slate-750 text-blue-600 dark:text-blue-400 font-semibold text-xs rounded-xl transition duration-200 cursor-pointer shadow-sm"
          >
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Switch Profile</span>
          </button>

          {/* Theme Switcher */}
          <button
            onClick={toggleTheme}
            className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-750 transition active:scale-95 duration-250 cursor-pointer text-slate-650 dark:text-slate-350"
          >
            {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </button>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-red-650 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition cursor-pointer"
            title="Sign Out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Main UI Layout */}
      {!selectedTopic ? (
        // TOPIC SELECTION UI
        <main className="flex-1 max-w-4xl w-full mx-auto p-6 md:py-12 flex flex-col items-center justify-center space-y-8 overflow-hidden">
          <div className="text-center space-y-2 animate-in fade-in slide-in-from-top-4 duration-300">
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-600 to-teal-500 dark:from-emerald-400 dark:to-teal-400 bg-clip-text text-transparent">
              AI Health Guidance
            </h1>
            <p className="text-xs text-slate-450 dark:text-slate-400 max-w-md font-semibold leading-relaxed">
              Select a specialized health topic below. All queries will be securely answered using official clinical guidelines.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-3xl animate-in fade-in slide-in-from-bottom-4 duration-300">
            {TOPICS.map((topic) => (
              <button
                key={topic.id}
                onClick={() => {
                  setSelectedTopic(topic.id);
                  setMessages([]);
                  setSessionId(null);
                }}
                className={`flex flex-col items-start p-5 bg-gradient-to-br ${topic.bgClass} border border-slate-100 dark:border-slate-800 text-left rounded-3xl hover:scale-[1.02] active:scale-[0.99] transition-all duration-300 cursor-pointer shadow-sm hover:shadow-md w-full`}
              >
                <div className="text-2xl mb-3">{topic.icon}</div>
                <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100 mb-1">{topic.title}</h3>
                <p className="text-2xs text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">{topic.description}</p>
              </button>
            ))}
          </div>
        </main>
      ) : (
        // ACTIVE CHAT ASSISTANT UI
        <main className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-6 flex flex-col justify-between overflow-hidden">
          
          {/* Chat Log Viewport */}
          <div className="flex-1 overflow-y-auto px-1 py-4 space-y-4 max-h-[calc(100vh-250px)]">
            {messages.length === 0 ? (
              // Welcome Card Screen
              <div className="flex flex-col items-center justify-center text-center py-12 px-6 space-y-6 max-w-lg mx-auto bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded-3xl shadow-sm animate-in fade-in duration-200">
                <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center font-bold">
                  💡
                </div>
                <div className="space-y-2">
                  <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 capitalize">
                    {selectedTopic.toLowerCase().replace("_", " ")} Guidance
                  </h2>
                  <p className="text-xs text-slate-450 dark:text-slate-400 leading-relaxed font-semibold">
                    Answers are based on available Sahyog health-guidance resources and are not a medical diagnosis.
                  </p>
                </div>
                
                <div className="border-t border-slate-100 dark:border-slate-800 pt-4 w-full text-left space-y-2.5">
                  <span className="text-2xs font-bold text-slate-400 block uppercase tracking-wider">Suggested Queries:</span>
                  {selectedTopic === "HYPERTENSION" && (
                    <>
                      <button
                        onClick={() => setInputText("What lifestyle changes can help manage hypertension?")}
                        className="w-full text-left p-3 text-xs bg-slate-50 dark:bg-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-150 dark:border-slate-800 rounded-2xl transition duration-200 text-slate-750 dark:text-slate-350 cursor-pointer block"
                      >
                        What lifestyle changes can help manage hypertension?
                      </button>
                      <button
                        onClick={() => setInputText("Should someone with high blood pressure reduce salt intake?")}
                        className="w-full text-left p-3 text-xs bg-slate-50 dark:bg-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-150 dark:border-slate-800 rounded-2xl transition duration-200 text-slate-750 dark:text-slate-350 cursor-pointer block"
                      >
                        Should someone with high blood pressure reduce salt intake?
                      </button>
                    </>
                  )}
                  {selectedTopic === "DIABETES" && (
                    <>
                      <button
                        onClick={() => setInputText("What lifestyle changes can help manage diabetes?")}
                        className="w-full text-left p-3 text-xs bg-slate-50 dark:bg-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-150 dark:border-slate-800 rounded-2xl transition duration-200 text-slate-750 dark:text-slate-350 cursor-pointer block"
                      >
                        What lifestyle changes can help manage diabetes?
                      </button>
                      <button
                        onClick={() => setInputText("Should someone with diabetes reduce sugar intake?")}
                        className="w-full text-left p-3 text-xs bg-slate-50 dark:bg-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-150 dark:border-slate-800 rounded-2xl transition duration-200 text-slate-750 dark:text-slate-350 cursor-pointer block"
                      >
                        Should someone with diabetes reduce sugar intake?
                      </button>
                    </>
                  )}
                  {selectedTopic !== "HYPERTENSION" && selectedTopic !== "DIABETES" && (
                    <button
                      onClick={() => setInputText(`What general guidelines apply to ${selectedTopic.toLowerCase().replace("_", " ")}?`)}
                      className="w-full text-left p-3 text-xs bg-slate-50 dark:bg-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-150 dark:border-slate-800 rounded-2xl transition duration-200 text-slate-750 dark:text-slate-350 cursor-pointer block"
                    >
                      What general guidelines apply to {selectedTopic.toLowerCase().replace("_", " ")}?
                    </button>
                  )}
                </div>
              </div>
            ) : (
              messages.map((msg, index) => {
                const isPatient = msg.sender === "PATIENT";
                const isError = msg.sender === "ERROR";
                const hasKannadaOrHindi = /[\u0C80-\u0CFF]/.test(msg.text) || /[\u0900-\u097F]/.test(msg.text);
                
                return (
                  <div
                    key={index}
                    className={`flex ${isPatient ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2 duration-200`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs shadow-sm space-y-2.5 leading-relaxed font-semibold ${
                        isPatient
                          ? "bg-blue-600 text-white rounded-br-none"
                          : isError
                          ? "bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 text-red-750 dark:text-red-400 rounded-bl-none flex items-start gap-2"
                          : "bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-850 text-slate-800 dark:text-slate-100 rounded-bl-none"
                      }`}
                    >
                      {isError && <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />}
                      
                      <div className="whitespace-pre-line leading-relaxed">
                        {msg.text}
                      </div>

                      {!isPatient && !isError && (
                        <div className="flex items-end justify-between gap-4 border-t border-slate-100 dark:border-slate-800/85 pt-2.5 mt-2">
                          {/* Sources on the left (if any) */}
                          <div className="flex-1 min-w-0">
                            {msg.sources && msg.sources.length > 0 && (
                              <div className="space-y-1.5">
                                <span className="flex items-center gap-1 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                                  <BookOpen className="h-3 w-3 text-emerald-500" />
                                  Sources:
                                </span>
                                <div className="flex flex-wrap gap-2">
                                  {msg.sources.map((src, srcIdx) => (
                                    <div
                                      key={srcIdx}
                                      className="text-[10px] py-1 px-2.5 bg-slate-50 dark:bg-slate-850 border border-slate-150 dark:border-slate-800 text-slate-600 dark:text-slate-350 rounded-lg flex items-center gap-1 font-semibold"
                                    >
                                      <span className="truncate max-w-[120px]">{src.document_title}</span>
                                      {src.similarity_score !== undefined && (
                                        <span className="text-slate-400 dark:text-slate-500 font-bold border-l border-slate-200 dark:border-slate-800 pl-1">
                                          {Math.round(src.similarity_score * 100)}% Match
                                        </span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* TTS Speaker Play/Stop Button on the right */}
                          {hasKannadaOrHindi && (
                            <button
                              type="button"
                              onClick={() => handleTtsPlayClick(msg.text, index)}
                              disabled={generatingTtsIndex !== null && generatingTtsIndex !== index}
                              className={`p-1.5 rounded-lg border transition shadow-sm hover:scale-[1.03] cursor-pointer flex items-center justify-center shrink-0 ${
                                playingTtsIndex === index
                                  ? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/30 text-red-650 dark:text-red-400"
                                  : generatingTtsIndex === index
                                  ? "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/30 text-amber-650 dark:text-amber-400 disabled:cursor-not-allowed"
                                  : "bg-slate-50 dark:bg-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-850 text-slate-550 dark:text-slate-350"
                              }`}
                              title={
                                playingTtsIndex === index
                                  ? "Stop Speech"
                                  : generatingTtsIndex === index
                                  ? "Generating Audio..."
                                  : "Listen to Answer (Kannada)"
                              }
                              aria-label={
                                playingTtsIndex === index
                                  ? "Stop Speech"
                                  : generatingTtsIndex === index
                                  ? "Generating Audio"
                                  : "Listen to Answer in Kannada"
                              }
                            >
                              {generatingTtsIndex === index ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : playingTtsIndex === index ? (
                                <Square className="h-3.5 w-3.5 fill-current" />
                              ) : (
                                <Volume2 className="h-3.5 w-3.5" />
                              )}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}

            {/* Inline Loading / Generation indicator */}
            {submitting && (
              <div className="flex justify-start animate-in fade-in duration-200">
                <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-850 rounded-2xl rounded-bl-none px-4 py-3 flex items-center gap-2 shadow-sm text-xs font-semibold text-slate-400">
                  <Loader2 className="h-4 w-4 animate-spin text-emerald-500" />
                  <span>Consulting Sahyog guidelines...</span>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Input Bar Area */}
          <form
            onSubmit={handleSend}
            className="mt-4 shrink-0 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-850 rounded-3xl p-3 shadow-md focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-500 transition duration-200"
          >
            <div className="flex gap-2.5 items-end">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  recordingState === "RECORDING"
                    ? "Recording audio..."
                    : recordingState === "TRANSCRIBING"
                    ? "Converting speech to text..."
                    : `Ask a question about ${selectedTopic.toLowerCase().replace("_", " ")}...`
                }
                rows="1"
                disabled={submitting || recordingState === "RECORDING" || recordingState === "TRANSCRIBING"}
                className="flex-1 max-h-32 min-h-[36px] py-2 px-1 text-xs bg-transparent border-0 focus:outline-none focus:ring-0 resize-none font-semibold text-slate-850 dark:text-slate-100 placeholder-slate-400 leading-relaxed overflow-y-auto"
              />
              
              <div className="flex items-center gap-3 shrink-0 pb-1">
                {/* Character Limit Indicators */}
                <span
                  className={`text-[10px] font-bold tracking-wider ${
                    inputText.length > 1000
                      ? "text-red-500"
                      : inputText.length > 800
                      ? "text-amber-500"
                      : "text-slate-400"
                  }`}
                >
                  {inputText.length}/1000
                </span>

                {/* Speech to Text Microphone */}
                <button
                  type="button"
                  onClick={handleMicClick}
                  disabled={submitting || recordingState === "TRANSCRIBING"}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center transition shadow-md cursor-pointer ${
                    recordingState === "RECORDING"
                      ? "bg-red-500 hover:bg-red-600 text-white animate-pulse"
                      : recordingState === "TRANSCRIBING"
                      ? "bg-amber-500 text-white disabled:cursor-not-allowed"
                      : "bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-350"
                  }`}
                  title={
                    recordingState === "RECORDING"
                      ? "Stop Recording"
                      : recordingState === "TRANSCRIBING"
                      ? "Transcribing..."
                      : "Record Audio (STT)"
                  }
                >
                  {recordingState === "TRANSCRIBING" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : recordingState === "RECORDING" ? (
                    <Square className="h-4 w-4 fill-white" />
                  ) : (
                    <Mic className="h-4 w-4" />
                  )}
                </button>

                <button
                  type="submit"
                  disabled={submitting || !inputText.trim() || inputText.length > 1000 || recordingState === "RECORDING" || recordingState === "TRANSCRIBING"}
                  className="w-9 h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-650 text-white flex items-center justify-center transition shadow-md shadow-emerald-500/10 cursor-pointer disabled:cursor-not-allowed"
                  title="Send Message"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </form>
          
        </main>
      )}

      {/* Footer disclaimer */}
      <footer className="py-3 border-t border-slate-100 dark:border-slate-850 text-center text-[10px] font-bold text-slate-400 dark:text-slate-650 shrink-0 z-10 bg-white/20">
        &copy; {new Date().getFullYear()} Sahyog Healthcare Platform. Guideline Assistant Integration Module.
      </footer>
      
    </div>
  );
};

export default PatientGuidanceAssistant;
