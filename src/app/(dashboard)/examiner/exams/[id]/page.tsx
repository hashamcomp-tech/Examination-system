"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import {
  Save, Send, Trash2, Plus, Eye, Users, Settings, BookOpen,
  CheckCircle2, HelpCircle, FileText, CheckSquare, Radio, Sparkles, ChevronDown, ChevronUp
} from "lucide-react";

export default function ExamDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { toast } = useToast();
  const [exam, setExam] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [bankQuestions, setBankQuestions] = useState<any[]>([]);
  const [tab, setTab] = useState("details");
  const [enrollEmail, setEnrollEmail] = useState("");
  const [saving, setSaving] = useState(false);

  // On-the-spot question creation states
  const [showCreateSpot, setShowCreateSpot] = useState(false);
  const [showBankSelector, setShowBankSelector] = useState(false);
  const [spotLoading, setSpotLoading] = useState(false);
  const [spotQ, setSpotQ] = useState({
    text: "",
    type: "MCQ_SINGLE", // MCQ_SINGLE, MCQ_MULTIPLE, WRITTEN
    category: "",
    topic: "",
    difficulty: "MEDIUM",
    marks: 5,
    explanation: "",
    options: [
      { text: "", isCorrect: true },
      { text: "", isCorrect: false },
      { text: "", isCorrect: false },
      { text: "", isCorrect: false },
    ],
  });

  const load = () => {
    fetch(`/api/exams/${id}`).then(r => r.json()).then(d => {
      setExam(d.exam); setQuestions(d.questions || []); setEnrollments(d.enrollments || []);
    });
  };

  useEffect(() => { load(); }, [id]);
  useEffect(() => {
    if (tab === "questions") {
      fetch("/api/questions").then(r => r.json()).then(d => setBankQuestions(d.questions || []));
    }
  }, [tab]);

  if (!exam) return <div className="animate-pulse p-8">Loading...</div>;

  const handleSave = async () => {
    setSaving(true);
    const res = await fetch(`/api/exams/${id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: exam.title, description: exam.description, instructions: exam.instructions,
        duration: exam.duration, totalMarks: exam.total_marks, passingMarks: exam.passing_marks,
        scheduledStart: exam.scheduled_start, scheduledEnd: exam.scheduled_end,
        randomizeQuestions: !!exam.randomize_questions, randomizeOptions: !!exam.randomize_options,
        multipleSelectGrading: exam.multiple_select_grading,
        negativeMarkingPenalty: exam.negative_marking_penalty, maxAttempts: exam.max_attempts,
      }),
    });
    if (res.ok) toast("Exam saved!", "success"); else toast("Save failed", "error");
    setSaving(false);
  };

  const handlePublish = async () => {
    const res = await fetch(`/api/exams/${id}/publish`, { method: "POST" });
    const d = await res.json();
    if (res.ok) { toast("Exam published!", "success"); load(); }
    else toast(d.error || "Publish failed", "error");
  };

  const addQuestion = async (qId: string) => {
    const res = await fetch(`/api/exams/${id}/questions`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId: qId }),
    });
    if (res.ok) { toast("Question added to exam!", "success"); load(); }
    else { const d = await res.json(); toast(d.error, "error"); }
  };

  const removeQuestion = async (eqId: string) => {
    const res = await fetch(`/api/exams/${id}/questions?examQuestionId=${eqId}`, {
      method: "DELETE",
    });
    const d = await res.json();
    if (res.ok) {
      toast("Question removed from exam", "success");
      load();
    } else {
      toast(d.error || "Failed to remove question", "error");
    }
  };

  const handleCreateSpot = async () => {
    if (!spotQ.text.trim()) {
      toast("Please enter the question text", "error");
      return;
    }
    if (spotQ.marks <= 0) {
      toast("Marks must be greater than 0", "error");
      return;
    }

    if (spotQ.type !== "WRITTEN") {
      const validOptions = spotQ.options.filter(o => o.text.trim());
      if (validOptions.length < 2) {
        toast("Please provide at least 2 non-empty options", "error");
        return;
      }
      const hasCorrect = validOptions.some(o => o.isCorrect);
      if (!hasCorrect) {
        toast("Please select at least one correct option", "error");
        return;
      }
    }

    setSpotLoading(true);
    const res = await fetch(`/api/exams/${id}/questions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        createOnTheSpot: true,
        text: spotQ.text.trim(),
        type: spotQ.type,
        category: spotQ.category.trim() || exam.title,
        topic: spotQ.topic.trim() || undefined,
        difficulty: spotQ.difficulty,
        marks: Number(spotQ.marks),
        explanation: spotQ.explanation.trim() || undefined,
        options: spotQ.type === "WRITTEN" ? [] : spotQ.options.filter(o => o.text.trim()),
      }),
    });

    const d = await res.json();
    if (res.ok) {
      toast("Question created and added to exam!", "success");
      setShowCreateSpot(false);
      setSpotQ({
        text: "",
        type: "MCQ_SINGLE",
        category: "",
        topic: "",
        difficulty: "MEDIUM",
        marks: 5,
        explanation: "",
        options: [
          { text: "", isCorrect: true },
          { text: "", isCorrect: false },
          { text: "", isCorrect: false },
          { text: "", isCorrect: false },
        ],
      });
      load();
    } else {
      toast(d.error || "Failed to create question", "error");
    }
    setSpotLoading(false);
  };

  const addSpotOption = () => {
    setSpotQ(q => ({
      ...q,
      options: [...q.options, { text: "", isCorrect: false }]
    }));
  };

  const updateSpotOption = (index: number, field: string, value: any) => {
    const newOptions = [...spotQ.options];
    (newOptions[index] as any)[field] = value;
    if (field === "isCorrect" && spotQ.type === "MCQ_SINGLE" && value) {
      newOptions.forEach((opt, idx) => {
        if (idx !== index) opt.isCorrect = false;
      });
    }
    setSpotQ(q => ({ ...q, options: newOptions }));
  };

  const removeSpotOption = (index: number) => {
    setSpotQ(q => ({
      ...q,
      options: q.options.filter((_, idx) => idx !== index)
    }));
  };

  const enrollCandidate = async () => {
    if (!enrollEmail) return;
    const res = await fetch(`/api/exams/${id}/enrollments`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: enrollEmail }),
    });
    if (res.ok) { toast("Candidate enrolled!", "success"); setEnrollEmail(""); load(); }
    else { const d = await res.json(); toast(d.error, "error"); }
  };

  const tabs = [
    { key: "details", label: "Details", icon: Settings },
    { key: "questions", label: "Questions", icon: BookOpen },
    { key: "candidates", label: "Candidates", icon: Users },
    { key: "preview", label: "Preview", icon: Eye },
  ];

  const update = (field: string, value: any) => setExam({ ...exam, [field]: value });
  const totalAssignedMarks = questions.reduce((acc, q) => acc + (q.marks || 0), 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{exam.title}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant={exam.status === "DRAFT" ? "secondary" : exam.status === "ONGOING" ? "success" : "default"}>
              {exam.status}
            </Badge>
            <span className="text-sm text-gray-500">
              {questions.length} questions · {totalAssignedMarks} / {exam.total_marks} marks
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          {exam.status === "DRAFT" && (
            <>
              <Button variant="outline" onClick={handleSave} loading={saving}><Save className="h-4 w-4" /> Save</Button>
              <Button onClick={handlePublish}><Send className="h-4 w-4" /> Publish</Button>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}>
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>

      {/* Details Tab */}
      {tab === "details" && (
        <div className="grid gap-6">
          <Card><CardContent className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <Input value={exam.title} onChange={e => update("title", e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <Textarea value={exam.description || ""} onChange={e => update("description", e.target.value)} rows={3} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Instructions</label>
              <Textarea value={exam.instructions || ""} onChange={e => update("instructions", e.target.value)} rows={4} />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Duration (min)</label>
                <Input type="number" value={exam.duration} onChange={e => update("duration", parseInt(e.target.value))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Total Marks</label>
                <Input type="number" value={exam.total_marks} onChange={e => update("total_marks", parseFloat(e.target.value))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Passing Marks</label>
                <Input type="number" value={exam.passing_marks || ""} onChange={e => update("passing_marks", parseFloat(e.target.value) || null)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Attempts</label>
                <Input type="number" value={exam.max_attempts} onChange={e => update("max_attempts", parseInt(e.target.value))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Scheduled Start</label>
                <Input type="datetime-local" value={exam.scheduled_start?.slice(0, 16) || ""} onChange={e => update("scheduled_start", e.target.value ? new Date(e.target.value).toISOString() : null)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Scheduled End</label>
                <Input type="datetime-local" value={exam.scheduled_end?.slice(0, 16) || ""} onChange={e => update("scheduled_end", e.target.value ? new Date(e.target.value).toISOString() : null)} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Multi-Select Grading</label>
                <Select value={exam.multiple_select_grading} onChange={e => update("multiple_select_grading", e.target.value)}>
                  <option value="ALL_OR_NOTHING">All or Nothing</option>
                  <option value="PARTIAL">Partial Credit</option>
                  <option value="NEGATIVE">Negative Marking</option>
                </Select>
              </div>
              <div className="flex items-center gap-3 pt-6">
                <input type="checkbox" id="rq" checked={!!exam.randomize_questions} onChange={e => update("randomize_questions", e.target.checked ? 1 : 0)} className="h-4 w-4 rounded" />
                <label htmlFor="rq" className="text-sm text-gray-700">Randomize Questions</label>
              </div>
              <div className="flex items-center gap-3 pt-6">
                <input type="checkbox" id="ro" checked={!!exam.randomize_options} onChange={e => update("randomize_options", e.target.checked ? 1 : 0)} className="h-4 w-4 rounded" />
                <label htmlFor="ro" className="text-sm text-gray-700">Randomize Options</label>
              </div>
            </div>
          </CardContent></Card>
        </div>
      )}

      {/* Questions Tab */}
      {tab === "questions" && (
        <div className="space-y-6">
          {/* Header Action Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Questions in this Exam</h2>
              <p className="text-sm text-gray-600">
                {questions.length} question{questions.length !== 1 ? "s" : ""} · {totalAssignedMarks} marks total (Exam target: {exam.total_marks} marks)
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={() => setShowCreateSpot(!showCreateSpot)} className="bg-blue-600 hover:bg-blue-700 shadow-sm">
                <Sparkles className="h-4 w-4 mr-1.5" />
                {showCreateSpot ? "Close Creator" : "Create Question On The Spot"}
              </Button>
              <Button variant="outline" onClick={() => setShowBankSelector(!showBankSelector)}>
                <BookOpen className="h-4 w-4 mr-1.5" />
                {showBankSelector ? "Hide Question Bank" : "Add from Bank"}
              </Button>
            </div>
          </div>

          {/* On-The-Spot Question Creator Form */}
          {showCreateSpot && (
            <Card className="border-2 border-blue-500/30 shadow-lg bg-white animate-in fade-in duration-200">
              <CardHeader className="bg-blue-50/50 border-b pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-blue-600" />
                    <CardTitle className="text-lg font-bold text-gray-900">Create Question on the Spot</CardTitle>
                  </div>
                  <Badge variant="outline" className="bg-white">Adds directly to this exam</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-5">
                {/* Type Selection Tabs */}
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">Question Type</label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setSpotQ(q => ({ ...q, type: "MCQ_SINGLE" }))}
                      className={`flex items-start gap-3 p-3.5 rounded-lg border text-left transition-all ${
                        spotQ.type === "MCQ_SINGLE"
                          ? "border-blue-600 bg-blue-50/70 text-blue-900 ring-2 ring-blue-600/20"
                          : "border-gray-200 hover:bg-gray-50 text-gray-700"
                      }`}
                    >
                      <Radio className="h-5 w-5 mt-0.5 text-blue-600 shrink-0" />
                      <div>
                        <div className="font-semibold text-sm">Single Choice (MCQ)</div>
                        <div className="text-xs text-gray-500 mt-0.5">One correct answer among multiple choices</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSpotQ(q => ({ ...q, type: "MCQ_MULTIPLE" }))}
                      className={`flex items-start gap-3 p-3.5 rounded-lg border text-left transition-all ${
                        spotQ.type === "MCQ_MULTIPLE"
                          ? "border-blue-600 bg-blue-50/70 text-blue-900 ring-2 ring-blue-600/20"
                          : "border-gray-200 hover:bg-gray-50 text-gray-700"
                      }`}
                    >
                      <CheckSquare className="h-5 w-5 mt-0.5 text-blue-600 shrink-0" />
                      <div>
                        <div className="font-semibold text-sm">Multiple Select (MCQ)</div>
                        <div className="text-xs text-gray-500 mt-0.5">One or more correct answers</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSpotQ(q => ({ ...q, type: "WRITTEN" }))}
                      className={`flex items-start gap-3 p-3.5 rounded-lg border text-left transition-all ${
                        spotQ.type === "WRITTEN"
                          ? "border-blue-600 bg-blue-50/70 text-blue-900 ring-2 ring-blue-600/20"
                          : "border-gray-200 hover:bg-gray-50 text-gray-700"
                      }`}
                    >
                      <FileText className="h-5 w-5 mt-0.5 text-blue-600 shrink-0" />
                      <div>
                        <div className="font-semibold text-sm">Written Response</div>
                        <div className="text-xs text-gray-500 mt-0.5">Free-form essay, short answer, or code</div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Metadata Row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Marks Awarded *</label>
                    <Input
                      type="number"
                      min={1}
                      value={spotQ.marks}
                      onChange={e => setSpotQ(q => ({ ...q, marks: parseFloat(e.target.value) || 0 }))}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Difficulty</label>
                    <Select
                      value={spotQ.difficulty}
                      onChange={e => setSpotQ(q => ({ ...q, difficulty: e.target.value }))}
                    >
                      <option value="EASY">Easy</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HARD">Hard</option>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Category / Topic (Optional)</label>
                    <Input
                      placeholder="e.g. Algorithms, Science"
                      value={spotQ.category}
                      onChange={e => setSpotQ(q => ({ ...q, category: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Question Text */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Question Text *</label>
                  <Textarea
                    placeholder="Enter the question text here..."
                    rows={3}
                    value={spotQ.text}
                    onChange={e => setSpotQ(q => ({ ...q, text: e.target.value }))}
                    required
                  />
                </div>

                {/* MCQ Options Authoring */}
                {spotQ.type !== "WRITTEN" ? (
                  <div className="space-y-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-gray-700">
                        Options (Mark the {spotQ.type === "MCQ_SINGLE" ? "correct radio button" : "correct checkbox(es)"})
                      </label>
                      <Button size="sm" variant="outline" type="button" onClick={addSpotOption}>
                        <Plus className="h-3.5 w-3.5 mr-1" /> Add Option
                      </Button>
                    </div>

                    <div className="space-y-2.5">
                      {spotQ.options.map((opt, i) => (
                        <div key={i} className="flex items-center gap-3 bg-white p-2.5 rounded-lg border border-gray-200">
                          {spotQ.type === "MCQ_SINGLE" ? (
                            <input
                              type="radio"
                              name="spot_correct"
                              checked={opt.isCorrect}
                              onChange={e => updateSpotOption(i, "isCorrect", e.target.checked)}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 cursor-pointer"
                              title="Mark as correct answer"
                            />
                          ) : (
                            <input
                              type="checkbox"
                              checked={opt.isCorrect}
                              onChange={e => updateSpotOption(i, "isCorrect", e.target.checked)}
                              className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                              title="Mark as correct answer"
                            />
                          )}
                          <Input
                            placeholder={`Option ${i + 1} text...`}
                            value={opt.text}
                            onChange={e => updateSpotOption(i, "text", e.target.value)}
                            className="flex-1"
                          />
                          {opt.isCorrect && (
                            <span className="text-xs font-medium text-green-700 bg-green-50 px-2 py-1 rounded border border-green-200 flex items-center gap-1 shrink-0">
                              <CheckCircle2 className="h-3 w-3 text-green-600" /> Correct
                            </span>
                          )}
                          {spotQ.options.length > 2 && (
                            <button
                              type="button"
                              onClick={() => removeSpotOption(i)}
                              className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
                              title="Delete option"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  /* Written Response Guidance */
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-2">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-gray-600" />
                      <label className="text-xs font-semibold text-gray-700">
                        Written Response Guidelines / Model Answer (Optional)
                      </label>
                    </div>
                    <Textarea
                      placeholder="Add reference notes, grading rubric, or expected keywords for manual evaluation..."
                      rows={3}
                      value={spotQ.explanation}
                      onChange={e => setSpotQ(q => ({ ...q, explanation: e.target.value }))}
                    />
                    <p className="text-xs text-gray-500">
                      Candidates will see a multi-line text editor to write their answer. You will evaluate it under the Grading tab.
                    </p>
                  </div>
                )}

                {/* Explanation / Notes for MCQ */}
                {spotQ.type !== "WRITTEN" && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Explanation / Feedback (Optional)
                    </label>
                    <Input
                      placeholder="Shown to candidate after results are published"
                      value={spotQ.explanation}
                      onChange={e => setSpotQ(q => ({ ...q, explanation: e.target.value }))}
                    />
                  </div>
                )}

                {/* Submit Actions */}
                <div className="flex items-center gap-3 pt-3 border-t">
                  <Button onClick={handleCreateSpot} loading={spotLoading} className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="h-4 w-4 mr-1.5" /> Create & Add to Exam
                  </Button>
                  <Button variant="outline" type="button" onClick={() => setShowCreateSpot(false)}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Assigned Questions List */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base font-bold">Assigned Questions ({questions.length})</CardTitle>
              <Badge variant="outline">{totalAssignedMarks} / {exam.total_marks} Marks</Badge>
            </CardHeader>
            <CardContent>
              {questions.length === 0 ? (
                <div className="text-center py-10 px-4 border-2 border-dashed rounded-lg bg-gray-50">
                  <BookOpen className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-gray-700 mb-1">No questions assigned yet</p>
                  <p className="text-xs text-gray-500 mb-4">Click "Create Question On The Spot" above or pick questions from your Question Bank.</p>
                  <Button size="sm" onClick={() => setShowCreateSpot(true)}>
                    <Sparkles className="h-4 w-4 mr-1.5" /> Create First Question
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {questions.map((q, i) => (
                    <div key={q.id} className="p-4 rounded-xl border border-gray-200 bg-white hover:border-blue-200 transition-all shadow-sm">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="font-bold text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                              Q{i + 1}
                            </span>
                            <Badge variant="secondary">
                              {q.type === "MCQ_SINGLE" ? "Single Choice MCQ" : q.type === "MCQ_MULTIPLE" ? "Multi-Select MCQ" : "Written Response"}
                            </Badge>
                            <Badge variant={q.difficulty === "EASY" ? "success" : q.difficulty === "HARD" ? "destructive" : "warning"}>
                              {q.difficulty}
                            </Badge>
                            <Badge variant="outline" className="font-semibold text-blue-700 bg-blue-50">
                              {q.marks} {q.marks === 1 ? "mark" : "marks"}
                            </Badge>
                          </div>
                          <p className="text-sm font-medium text-gray-900 mt-1 whitespace-pre-wrap">{q.text}</p>

                          {/* Options Preview for MCQ */}
                          {q.options && q.options.length > 0 && (
                            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                              {q.options.map((opt: any, optIdx: number) => (
                                <div
                                  key={opt.id || optIdx}
                                  className={`flex items-center gap-2 p-2 rounded-md border ${
                                    opt.is_correct
                                      ? "bg-green-50 border-green-200 text-green-900 font-medium"
                                      : "bg-gray-50 border-gray-200 text-gray-600"
                                  }`}
                                >
                                  {opt.is_correct ? (
                                    <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />
                                  ) : (
                                    <span className="w-3.5 h-3.5 rounded-full border border-gray-300 inline-block shrink-0" />
                                  )}
                                  <span className="truncate">{opt.text}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Written guidelines preview */}
                          {q.type === "WRITTEN" && q.explanation && (
                            <div className="mt-2 text-xs text-gray-500 bg-gray-50 p-2 rounded border">
                              <span className="font-medium text-gray-700">Guidelines: </span>
                              {q.explanation}
                            </div>
                          )}
                        </div>

                        {exam.status === "DRAFT" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => removeQuestion(q.id)}
                            title="Remove question from exam"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Question Bank Accordion / Section */}
          {showBankSelector && (
            <Card className="animate-in fade-in duration-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-blue-600" />
                  Select from Existing Question Bank
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {bankQuestions.filter(bq => !questions.find(q => q.question_id === bq.id)).map(q => (
                    <div key={q.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 transition-colors">
                      <div className="flex-1 mr-4">
                        <span className="text-sm text-gray-900 font-medium line-clamp-1">{q.text}</span>
                        <div className="flex gap-2 mt-1.5">
                          <Badge variant="secondary">{q.type}</Badge>
                          <Badge variant="outline">{q.difficulty}</Badge>
                          <Badge variant="outline">{q.marks} marks</Badge>
                          {q.category && <Badge variant="outline" className="text-gray-500">{q.category}</Badge>}
                        </div>
                      </div>
                      <Button size="sm" onClick={() => addQuestion(q.id)}>
                        <Plus className="h-3.5 w-3.5 mr-1" /> Add
                      </Button>
                    </div>
                  ))}
                  {bankQuestions.filter(bq => !questions.find(q => q.question_id === bq.id)).length === 0 && (
                    <p className="text-gray-500 text-center py-6 text-sm">
                      All available questions from your Question Bank are already assigned.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Candidates Tab */}
      {tab === "candidates" && (
        <Card><CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Enrolled Candidates ({enrollments.length})</CardTitle>
            <div className="flex gap-2">
              <Input placeholder="Candidate email" value={enrollEmail} onChange={e => setEnrollEmail(e.target.value)} className="w-64" />
              <Button onClick={enrollCandidate}><Plus className="h-4 w-4" /> Enroll</Button>
            </div>
          </div>
        </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left text-gray-500">
                <th className="pb-3">Name</th><th className="pb-3">Email</th><th className="pb-3">Status</th>
              </tr></thead>
              <tbody>
                {enrollments.map((e: any) => (
                  <tr key={e.id} className="border-b last:border-0">
                    <td className="py-3 font-medium">{e.name}</td>
                    <td className="py-3 text-gray-600">{e.email}</td>
                    <td className="py-3"><Badge variant={e.status === "COMPLETED" ? "success" : "default"}>{e.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Preview Tab */}
      {tab === "preview" && (
        <Card><CardContent className="p-6 text-center">
          <Eye className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Examination Sandbox</h3>
          <p className="text-gray-500 mb-4">Preview this exam as a candidate. Sandbox attempts do not affect real results.</p>
          <Button onClick={async () => {
            const res = await fetch("/api/attempts", {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ examId: id, isSandbox: true }),
            });
            if (res.ok) {
              const d = await res.json();
              window.open(`/exam/${d.attemptId}`, "_blank");
            } else toast("Failed to start sandbox", "error");
          }}>Launch Sandbox Preview</Button>
        </CardContent></Card>
      )}
    </div>
  );
}
