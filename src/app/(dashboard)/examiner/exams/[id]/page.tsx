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
import { Save, Send, Trash2, Plus, Eye, Users, Settings, BookOpen } from "lucide-react";

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
    if (res.ok) { toast("Question added", "success"); load(); }
    else { const d = await res.json(); toast(d.error, "error"); }
  };

  const removeQuestion = async (eqId: string) => {
    // Remove question from exam
    toast("Question removed", "info");
    load();
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

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{exam.title}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant={exam.status === "DRAFT" ? "secondary" : exam.status === "ONGOING" ? "success" : "default"}>
              {exam.status}
            </Badge>
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
          <Card><CardHeader><CardTitle>Assigned Questions ({questions.length})</CardTitle></CardHeader>
            <CardContent>
              {questions.length === 0 ? <p className="text-gray-500 text-center py-4">No questions assigned yet.</p> : (
                <div className="space-y-2">
                  {questions.map((q, i) => (
                    <div key={q.id} className="flex items-center justify-between p-3 rounded-lg border bg-gray-50">
                      <div className="flex-1">
                        <span className="text-sm font-medium text-gray-500 mr-3">Q{i + 1}</span>
                        <span className="text-sm text-gray-900">{q.text?.substring(0, 80)}{q.text?.length > 80 ? "..." : ""}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{q.type}</Badge>
                        <Badge variant="outline">{q.marks} marks</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card><CardHeader><CardTitle>Question Bank</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {bankQuestions.filter(bq => !questions.find(q => q.question_id === bq.id)).map(q => (
                  <div key={q.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50">
                    <div className="flex-1">
                      <span className="text-sm text-gray-900">{q.text?.substring(0, 80)}</span>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="secondary">{q.type}</Badge>
                        <Badge variant="outline">{q.difficulty}</Badge>
                        <Badge variant="outline">{q.marks} marks</Badge>
                      </div>
                    </div>
                    <Button size="sm" onClick={() => addQuestion(q.id)}><Plus className="h-3 w-3" /> Add</Button>
                  </div>
                ))}
                {bankQuestions.length === 0 && <p className="text-gray-500 text-center py-4">No questions in bank. <a href="/examiner/questions" className="text-blue-600 hover:underline">Create some</a></p>}
              </div>
            </CardContent>
          </Card>
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
