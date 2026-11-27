"use client";
import React, { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import {
  Clock, ChevronLeft, ChevronRight, Flag, Send, CheckCircle,
  Wifi, WifiOff, Save, AlertTriangle, FileText, MessageSquare, PenTool,
} from "lucide-react";

export default function ExamPage() {
  const { attemptId } = useParams() as { attemptId: string };
  const router = useRouter();
  const { toast } = useToast();

  const [data, setData] = useState<any>(null);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [timeLeft, setTimeLeft] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [showScratchpad, setShowScratchpad] = useState(false);
  const [scratchContent, setScratchContent] = useState("");
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [showAnnouncements, setShowAnnouncements] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [preferences, setPreferences] = useState<any>({ font_size: "medium", question_display: "one-at-a-time", show_timer: 1 });
  const [showSettings, setShowSettings] = useState(false);
  const saveTimeout = useRef<NodeJS.Timeout | null>(null);
  const lastSaveRef = useRef<string>("");

  // Load attempt data
  const loadData = useCallback(async () => {
    try {
      const res = await fetch(`/api/attempts/${attemptId}`);
      if (!res.ok) { router.push("/candidate"); return; }
      const d = await res.json();
      setData(d);
      setTimeLeft(d.remainingSeconds || 0);
      setAnnouncements(d.announcements || []);

      // Build answers map
      const ansMap: Record<string, any> = {};
      d.answers?.forEach((a: any) => {
        ansMap[a.exam_question_id] = {
          selectedOptionIds: a.selected_option_ids ? JSON.parse(a.selected_option_ids) : [],
          writtenResponse: a.written_response || "",
          status: a.status || "UNANSWERED",
        };
      });
      setAnswers(ansMap);

      if (["SUBMITTED", "AUTO_SUBMITTED", "GRADED"].includes(d.attempt?.status)) {
        setSubmitted(true);
      }
    } catch { toast("Failed to load exam", "error"); }
  }, [attemptId, router, toast]);

  useEffect(() => { loadData(); }, [loadData]);

  // Load preferences
  useEffect(() => {
    fetch("/api/preferences").then(r => r.json()).then(d => { if (d.preferences) setPreferences(d.preferences); });
  }, []);

  // Load scratchpad
  useEffect(() => {
    fetch(`/api/attempts/${attemptId}/scratchpad`).then(r => r.json()).then(d => setScratchContent(d.scratchpad?.content || ""));
  }, [attemptId]);

  // Timer
  useEffect(() => {
    if (submitted || timeLeft <= 0) return;
    const iv = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { handleAutoSubmit(); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [submitted]);

  // Network status
  useEffect(() => {
    const handleOnline = () => { setIsOnline(true); toast("Connection restored", "success"); };
    const handleOffline = () => { setIsOnline(false); toast("Connection lost — answers will save when reconnected", "warning"); };
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => { window.removeEventListener("online", handleOnline); window.removeEventListener("offline", handleOffline); };
  }, [toast]);

  // Poll announcements
  useEffect(() => {
    if (submitted) return;
    const iv = setInterval(async () => {
      try {
        const res = await fetch(`/api/announcements?examId=${data?.exam?.id}`);
        const d = await res.json();
        if (d.announcements?.length > announcements.length) {
          setAnnouncements(d.announcements);
          setNewAnnouncement(true);
          toast("📢 New announcement from examiner", "info");
        }
      } catch {}
    }, 15000);
    return () => clearInterval(iv);
  }, [data?.exam?.id, announcements.length, submitted, toast]);

  // Report incidents (tab switch, blur)
  useEffect(() => {
    if (submitted) return;
    const reportIncident = (type: string) => {
      fetch(`/api/monitoring/${data?.exam?.id}/incidents`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attemptId, type, description: type, severity: "MEDIUM" }),
      }).catch(() => {});
    };
    const handleVisibility = () => { if (document.hidden) reportIncident("TAB_SWITCH"); };
    const handleBlur = () => reportIncident("WINDOW_BLUR");
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("blur", handleBlur);
    return () => { document.removeEventListener("visibilitychange", handleVisibility); window.removeEventListener("blur", handleBlur); };
  }, [data?.exam?.id, attemptId, submitted]);

  // Auto-save with debounce
  const saveAnswers = useCallback(async (ans: Record<string, any>) => {
    const serialized = JSON.stringify(ans);
    if (serialized === lastSaveRef.current) return;
    lastSaveRef.current = serialized;

    setSaving("saving");
    try {
      const formatted = Object.entries(ans).map(([eqId, a]) => ({
        examQuestionId: eqId,
        selectedOptionIds: a.selectedOptionIds?.length > 0 ? a.selectedOptionIds : undefined,
        writtenResponse: a.writtenResponse || undefined,
        status: a.status,
      }));
      const res = await fetch(`/api/attempts/${attemptId}/answers`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: formatted }),
      });
      if (res.ok) setSaving("saved");
      else setSaving("error");
    } catch { setSaving("error"); }

    setTimeout(() => setSaving("idle"), 2000);
  }, [attemptId]);

  const debouncedSave = useCallback((ans: Record<string, any>) => {
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => saveAnswers(ans), 1500);
  }, [saveAnswers]);

  // Update answer
  const updateAnswer = (eqId: string, update: Partial<typeof answers[string]>) => {
    const newAns = { ...answers, [eqId]: { ...answers[eqId], ...update } };
    // Auto-set status
    const a = newAns[eqId];
    if ((a.selectedOptionIds?.length > 0 || a.writtenResponse) && a.status === "UNANSWERED") {
      a.status = "ANSWERED";
    }
    setAnswers(newAns);
    debouncedSave(newAns);
  };

  const toggleReview = (eqId: string) => {
    const a = answers[eqId];
    const newStatus = a?.status === "MARKED_FOR_REVIEW" ? (a.selectedOptionIds?.length > 0 || a.writtenResponse ? "ANSWERED" : "UNANSWERED") : "MARKED_FOR_REVIEW";
    updateAnswer(eqId, { status: newStatus });
  };

  // MCQ handlers
  const selectSingle = (eqId: string, optId: string) => updateAnswer(eqId, { selectedOptionIds: [optId], status: "ANSWERED" });
  const toggleMultiple = (eqId: string, optId: string) => {
    const current = answers[eqId]?.selectedOptionIds || [];
    const next = current.includes(optId) ? current.filter((id: string) => id !== optId) : [...current, optId];
    updateAnswer(eqId, { selectedOptionIds: next, status: next.length > 0 ? "ANSWERED" : "UNANSWERED" });
  };

  // Submit
  const handleSubmit = async () => {
    // Save first
    await saveAnswers(answers);
    const res = await fetch(`/api/attempts/${attemptId}/submit`, { method: "POST" });
    if (res.ok) { setSubmitted(true); toast("Exam submitted successfully!", "success"); }
    else { const d = await res.json(); toast(d.error || "Submit failed", "error"); }
  };

  const handleAutoSubmit = async () => {
    await saveAnswers(answers);
    await fetch(`/api/attempts/${attemptId}/submit`, { method: "POST" });
    setSubmitted(true);
    toast("⏱ Time expired — exam auto-submitted", "warning");
  };

  // Save scratchpad
  const saveScratchpad = useCallback(async (content: string) => {
    await fetch(`/api/attempts/${attemptId}/scratchpad`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
  }, [attemptId]);

  // Format timer
  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  if (!data) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" /></div>;

  if (submitted) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50">
      <div className="text-center">
        <CheckCircle className="h-20 w-20 text-emerald-500 mx-auto mb-6" />
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Exam Submitted</h1>
        <p className="text-gray-500 mb-6">Your answers have been recorded.</p>
        <Button onClick={() => router.push("/candidate")}>Return to Dashboard</Button>
      </div>
    </div>
  );

  const questions = data.questions || [];
  const question = questions[currentQ];
  if (!question) return null;

  const answered = Object.values(answers).filter((a: any) => a.status === "ANSWERED").length;
  const review = Object.values(answers).filter((a: any) => a.status === "MARKED_FOR_REVIEW").length;
  const unanswered = questions.length - answered - review;
  const isWarning = timeLeft < 300;

  const fontSize = preferences.font_size === "large" ? "text-lg" : preferences.font_size === "small" ? "text-sm" : "text-base";

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b shadow-sm px-4 py-3 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm">E</span>
          </div>
          <div>
            <h1 className="font-semibold text-gray-900 text-sm">{data.exam?.title}</h1>
            <p className="text-xs text-gray-500">Q{currentQ + 1} of {questions.length}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Network */}
          {!isOnline && <Badge variant="destructive"><WifiOff className="h-3 w-3 mr-1" />Offline</Badge>}
          {isOnline && saving === "saving" && <Badge variant="warning"><Save className="h-3 w-3 mr-1 animate-spin" />Saving...</Badge>}
          {isOnline && saving === "saved" && <Badge variant="success"><CheckCircle className="h-3 w-3 mr-1" />Saved</Badge>}
          {saving === "error" && <Badge variant="destructive">Save failed</Badge>}

          {/* Announcements */}
          <button onClick={() => { setShowAnnouncements(!showAnnouncements); setNewAnnouncement(false); }}
            className={cn("relative p-2 rounded-lg hover:bg-gray-100", newAnnouncement && "text-amber-600")}>
            <MessageSquare className="h-5 w-5" />
            {newAnnouncement && <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-500" />}
          </button>

          {/* Timer */}
          {preferences.show_timer !== 0 && (
            <div className={cn("flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-lg font-bold",
              isWarning ? "bg-red-100 text-red-700 animate-pulse" : "bg-gray-100 text-gray-900")}>
              <Clock className="h-5 w-5" />
              {formatTime(timeLeft)}
            </div>
          )}

          {/* Settings */}
          <button onClick={() => setShowSettings(!showSettings)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">⚙</button>

          <Button variant="destructive" size="sm" onClick={() => setShowSummary(true)}>
            <Send className="h-4 w-4" /> Submit
          </Button>
        </div>
      </header>

      {/* Announcements Panel */}
      {showAnnouncements && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-3 max-h-32 overflow-y-auto">
          {announcements.length === 0 ? <p className="text-sm text-amber-700">No announcements.</p> :
            announcements.map((a: any) => (
              <div key={a.id} className={cn("text-sm py-1", a.priority === "URGENT" ? "text-red-700 font-bold" : a.priority === "IMPORTANT" ? "text-amber-800 font-medium" : "text-amber-700")}>
                📢 {a.message} <span className="text-xs text-amber-500 ml-2">{new Date(a.created_at).toLocaleTimeString()}</span>
              </div>
            ))
          }
        </div>
      )}

      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-white border-b px-4 py-3 flex items-center gap-6">
          <label className="text-sm text-gray-600">Font:
            <select className="ml-2 text-sm border rounded px-2 py-1" value={preferences.font_size}
              onChange={e => { const v = e.target.value; setPreferences((p: any) => ({ ...p, font_size: v })); fetch("/api/preferences", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fontSize: v }) }); }}>
              <option value="small">Small</option><option value="medium">Medium</option><option value="large">Large</option>
            </select>
          </label>
          <label className="text-sm text-gray-600 flex items-center gap-2">
            <input type="checkbox" checked={preferences.show_timer !== 0} onChange={e => { const v = e.target.checked; setPreferences((p: any) => ({ ...p, show_timer: v ? 1 : 0 })); fetch("/api/preferences", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ showTimer: v }) }); }} />
            Show Timer
          </label>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Question Navigation Sidebar */}
        <div className="w-20 bg-white border-r p-3 overflow-y-auto hidden md:block">
          <div className="grid grid-cols-2 gap-1.5">
            {questions.map((_: any, i: number) => {
              const eqId = questions[i].id;
              const a = answers[eqId];
              const bg = a?.status === "ANSWERED" ? "bg-emerald-500 text-white"
                : a?.status === "MARKED_FOR_REVIEW" ? "bg-amber-400 text-white"
                : currentQ === i ? "bg-blue-100 text-blue-700 ring-2 ring-blue-500"
                : "bg-gray-100 text-gray-600";
              return (
                <button key={i} onClick={() => setCurrentQ(i)}
                  className={cn("w-full aspect-square rounded-lg text-xs font-bold flex items-center justify-center hover:opacity-80 transition-all", bg)}>
                  {i + 1}
                </button>
              );
            })}
          </div>
          <div className="mt-4 space-y-1 text-xs">
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-emerald-500" />{answered}</div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-amber-400" />{review}</div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-gray-200" />{unanswered}</div>
          </div>
        </div>

        {/* Question Area */}
        <div className="flex-1 overflow-y-auto p-6 lg:p-8">
          <div className="max-w-3xl mx-auto">
            {/* Question Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">Q{currentQ + 1}</span>
                <Badge variant="secondary">{question.type === "MCQ_SINGLE" ? "Single Answer" : question.type === "MCQ_MULTIPLE" ? "Multiple Select" : "Written"}</Badge>
                <Badge variant="outline">{question.marks} marks</Badge>
              </div>
              <button onClick={() => toggleReview(question.id)}
                className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                  answers[question.id]?.status === "MARKED_FOR_REVIEW" ? "bg-amber-100 text-amber-700" : "text-gray-500 hover:bg-gray-100")}>
                <Flag className="h-4 w-4" /> {answers[question.id]?.status === "MARKED_FOR_REVIEW" ? "Marked" : "Mark for Review"}
              </button>
            </div>

            {/* Question Text */}
            <div className={cn("text-gray-900 mb-8 leading-relaxed", fontSize)}>
              {question.text}
            </div>

            {/* Answer Area */}
            {question.type === "MCQ_SINGLE" && (
              <div className="space-y-3">
                {question.options?.map((opt: any) => {
                  const selected = answers[question.id]?.selectedOptionIds?.includes(opt.id);
                  return (
                    <button key={opt.id} onClick={() => selectSingle(question.id, opt.id)}
                      className={cn("w-full text-left p-4 rounded-xl border-2 transition-all", fontSize,
                        selected ? "border-blue-500 bg-blue-50 shadow-sm" : "border-gray-200 hover:border-gray-300 hover:bg-gray-50")}>
                      <div className="flex items-center gap-3">
                        <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0",
                          selected ? "border-blue-500 bg-blue-500" : "border-gray-300")}>
                          {selected && <div className="w-2 h-2 rounded-full bg-white" />}
                        </div>
                        <span>{opt.text}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {question.type === "MCQ_MULTIPLE" && (
              <div className="space-y-3">
                <p className="text-sm text-gray-500 mb-2">Select all that apply</p>
                {question.options?.map((opt: any) => {
                  const selected = answers[question.id]?.selectedOptionIds?.includes(opt.id);
                  return (
                    <button key={opt.id} onClick={() => toggleMultiple(question.id, opt.id)}
                      className={cn("w-full text-left p-4 rounded-xl border-2 transition-all", fontSize,
                        selected ? "border-blue-500 bg-blue-50 shadow-sm" : "border-gray-200 hover:border-gray-300 hover:bg-gray-50")}>
                      <div className="flex items-center gap-3">
                        <div className={cn("w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0",
                          selected ? "border-blue-500 bg-blue-500" : "border-gray-300")}>
                          {selected && <CheckCircle className="h-3 w-3 text-white" />}
                        </div>
                        <span>{opt.text}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {question.type === "WRITTEN" && (
              <Textarea
                className={cn("min-h-[200px]", fontSize)}
                placeholder="Type your answer here..."
                value={answers[question.id]?.writtenResponse || ""}
                onChange={e => updateAnswer(question.id, { writtenResponse: e.target.value, status: e.target.value ? "ANSWERED" : "UNANSWERED" })}
              />
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t">
              <Button variant="outline" disabled={currentQ === 0} onClick={() => setCurrentQ(currentQ - 1)}>
                <ChevronLeft className="h-4 w-4" /> Previous
              </Button>

              {/* Mobile nav dots */}
              <div className="flex gap-1 md:hidden">
                {questions.slice(Math.max(0, currentQ - 2), currentQ + 3).map((_: any, i: number) => {
                  const idx = Math.max(0, currentQ - 2) + i;
                  return <div key={idx} className={cn("w-2 h-2 rounded-full", idx === currentQ ? "bg-blue-600" : "bg-gray-300")} />;
                })}
              </div>

              {currentQ < questions.length - 1 ? (
                <Button onClick={() => setCurrentQ(currentQ + 1)}>
                  Next <ChevronRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button variant="success" onClick={() => setShowSummary(true)}>
                  Review & Submit
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Scratchpad */}
        {showScratchpad && (
          <div className="w-80 bg-white border-l flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <span className="font-medium text-sm">Scratchpad</span>
              <button onClick={() => setShowScratchpad(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <textarea
              className="flex-1 p-4 text-sm resize-none focus:outline-none font-mono"
              placeholder="Rough work here..."
              value={scratchContent}
              onChange={e => {
                setScratchContent(e.target.value);
                // Debounced save
                clearTimeout(saveTimeout.current as any);
                saveTimeout.current = setTimeout(() => saveScratchpad(e.target.value), 2000) as any;
              }}
            />
          </div>
        )}
      </div>

      {/* Bottom bar */}
      <div className="bg-white border-t px-4 py-2 flex items-center justify-between md:hidden">
        <span className="text-xs text-gray-500">{answered}/{questions.length} answered</span>
        <div className={cn("text-sm font-mono font-bold", isWarning ? "text-red-600" : "text-gray-700")}>
          {formatTime(timeLeft)}
        </div>
      </div>

      {/* Scratchpad toggle FAB */}
      {!showScratchpad && (
        <button onClick={() => setShowScratchpad(true)}
          className="fixed bottom-6 right-6 w-12 h-12 rounded-full bg-gray-800 text-white shadow-lg flex items-center justify-center hover:bg-gray-700 z-20">
          <PenTool className="h-5 w-5" />
        </button>
      )}

      {/* Submit Summary Modal */}
      {showSummary && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Submit Examination?</h2>
            <div className="space-y-3 mb-6">
              <div className="flex justify-between p-3 rounded-lg bg-emerald-50">
                <span className="text-emerald-700">Answered</span>
                <span className="font-bold text-emerald-700">{answered}</span>
              </div>
              <div className="flex justify-between p-3 rounded-lg bg-amber-50">
                <span className="text-amber-700">Marked for Review</span>
                <span className="font-bold text-amber-700">{review}</span>
              </div>
              <div className="flex justify-between p-3 rounded-lg bg-gray-50">
                <span className="text-gray-700">Unanswered</span>
                <span className="font-bold text-gray-700">{unanswered}</span>
              </div>
            </div>
            {unanswered > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
                <p className="text-sm text-red-700">You have {unanswered} unanswered question(s).</p>
              </div>
            )}
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowSummary(false)}>Go Back</Button>
              <Button variant="destructive" className="flex-1" onClick={handleSubmit}><Send className="h-4 w-4" /> Confirm Submit</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
