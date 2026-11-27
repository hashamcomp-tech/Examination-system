"use client";
import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import {
  Save, CheckCircle, ArrowLeft, Lock, FileText, CheckCircle2,
  XCircle, HelpCircle, Award, Sparkles, User, Info
} from "lucide-react";

export default function GradingPage() {
  const { examId, attemptId } = useParams() as { examId: string; attemptId: string };
  const [data, setData] = useState<any>(null);
  const [grades, setGrades] = useState<Record<string, { marks: number; feedback: string }>>({});
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const load = () => {
    fetch(`/api/results/${examId}/grade/${attemptId}`).then(r => r.json()).then(d => {
      setData(d);
      const g: Record<string, any> = {};
      d.answers?.forEach((a: any) => {
        g[a.id] = {
          marks: a.marks_awarded ?? 0,
          feedback: a.examiner_feedback || "",
        };
      });
      setGrades(g);
    });
  };

  useEffect(() => {
    load();
  }, [examId, attemptId]);

  if (!data) return <div className="animate-pulse p-8 text-center text-gray-400">Loading student submission...</div>;

  const handleSave = async () => {
    setSaving(true);
    // Only send grades for WRITTEN answers or feedback
    const gradeData = Object.entries(grades).map(([answerId, g]) => ({
      answerId,
      marksAwarded: g.marks,
      feedback: g.feedback,
    }));

    const res = await fetch(`/api/results/${examId}/grade/${attemptId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ grades: gradeData }),
    });

    const d = await res.json();
    if (res.ok) {
      toast(`Evaluation saved! Total Score: ${d.totalScore}/${d.maxScore} (${d.percentage}%)`, "success");
      load();
    } else {
      toast(d.error || "Failed to save grades", "error");
    }
    setSaving(false);
  };

  const setQuickMarks = (answerId: string, marks: number) => {
    setGrades(g => ({
      ...g,
      [answerId]: {
        ...g[answerId],
        marks,
      },
    }));
  };

  // Compute breakdown
  const mcqAnswers = data.answers?.filter((a: any) => a.question_type !== "WRITTEN") || [];
  const writtenAnswers = data.answers?.filter((a: any) => a.question_type === "WRITTEN") || [];

  const mcqScore = mcqAnswers.reduce((sum: number, a: any) => sum + (a.marks_awarded || 0), 0);
  const mcqMax = mcqAnswers.reduce((sum: number, a: any) => sum + (a.max_marks || 0), 0);

  const writtenScore = writtenAnswers.reduce((sum: number, a: any) => sum + (grades[a.id]?.marks || 0), 0);
  const writtenMax = writtenAnswers.reduce((sum: number, a: any) => sum + (a.max_marks || 0), 0);

  const grandTotal = mcqScore + writtenScore;
  const grandMax = mcqMax + writtenMax;
  const percentage = grandMax > 0 ? Math.round((grandTotal / grandMax) * 1000) / 10 : 0;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div>
        <Link href={`/examiner/results/${examId}`} className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1.5 mb-2 font-medium">
          <ArrowLeft className="h-4 w-4" />
          Back to Exam Submissions
        </Link>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Evaluate Student Submission</h1>
            <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
              <User className="h-4 w-4 text-gray-400" />
              <strong className="text-gray-800">{data.attempt?.candidate_name}</strong>
              <span>({data.attempt?.candidate_email})</span>
              <span>·</span>
              <span>Exam: {data.exam?.title}</span>
            </p>
          </div>
          <Button onClick={handleSave} loading={saving} className="bg-blue-600 hover:bg-blue-700 gap-2 shadow-sm">
            <Save className="h-4 w-4" />
            Save Written Evaluation
          </Button>
        </div>
      </div>

      {/* Score Overview Bar */}
      <Card className="border border-blue-100 bg-gradient-to-r from-blue-50/70 via-indigo-50/50 to-white shadow-xs">
        <CardContent className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div className="border-r border-blue-100/80 pr-2">
            <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider flex items-center justify-center gap-1">
              <Lock className="h-3 w-3 text-blue-600" /> MCQs (Auto-Graded)
            </div>
            <div className="text-lg font-bold text-gray-900 mt-1">
              {mcqScore} <span className="text-xs font-normal text-gray-500">/ {mcqMax} marks</span>
            </div>
            <div className="text-[10px] text-blue-700 mt-0.5">Immutable / Locked</div>
          </div>

          <div className="border-r border-blue-100/80 pr-2">
            <div className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider flex items-center justify-center gap-1">
              <FileText className="h-3 w-3 text-amber-600" /> Subjective (Written)
            </div>
            <div className="text-lg font-bold text-amber-900 mt-1">
              {writtenScore} <span className="text-xs font-normal text-gray-500">/ {writtenMax} marks</span>
            </div>
            <div className="text-[10px] text-amber-700 mt-0.5">{writtenAnswers.length} questions to check</div>
          </div>

          <div className="border-r border-blue-100/80 pr-2">
            <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Total Score</div>
            <div className="text-xl font-black text-gray-900 mt-1">
              {grandTotal} <span className="text-xs font-normal text-gray-500">/ {grandMax}</span>
            </div>
            <div className="text-[10px] text-gray-500 mt-0.5">{percentage}% Score</div>
          </div>

          <div>
            <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Evaluation Status</div>
            <div className="mt-1">
              <Badge variant={data.attempt?.grading_status === "COMPLETE" ? "success" : "warning"} className="text-xs">
                {data.attempt?.grading_status === "COMPLETE" ? "Fully Evaluated" : "Requires Checking"}
              </Badge>
            </div>
            <div className="text-[10px] text-gray-500 mt-0.5">
              {data.attempt?.status}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notice about MCQs */}
      <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-lg text-xs text-blue-900 flex items-center gap-2">
        <Info className="h-4 w-4 text-blue-600 shrink-0" />
        <span>
          <strong>Exam Grading Policy:</strong> Multiple choice questions are graded mathematically according to the exam's marking scheme and cannot be manually modified. Written answers below are available for you to review and assign marks.
        </span>
      </div>

      {/* Questions Evaluation Section */}
      <div className="space-y-6">
        {data.answers?.map((answer: any, i: number) => {
          const isWritten = answer.question_type === "WRITTEN";

          return (
            <Card
              key={answer.id}
              className={`transition-all ${
                isWritten
                  ? "border-2 border-amber-300 shadow-md bg-white"
                  : "border border-gray-200 bg-gray-50/50 shadow-xs"
              }`}
            >
              <CardContent className="p-6 space-y-4">
                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs px-2.5 py-1 rounded bg-gray-200 text-gray-800">
                      Question {i + 1}
                    </span>
                    <Badge variant={isWritten ? "warning" : "secondary"}>
                      {answer.question_type.replace("_", " ")}
                    </Badge>
                    <Badge variant="outline" className="font-semibold">
                      Max {answer.max_marks} marks
                    </Badge>
                  </div>

                  <div>
                    {isWritten ? (
                      <Badge variant="warning" className="gap-1 bg-amber-100 text-amber-900 border-amber-300">
                        <FileText className="h-3 w-3" />
                        Subjective Answer (Examiner Graded)
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1 bg-white text-blue-800 border-blue-200">
                        <Lock className="h-3 w-3 text-blue-600" />
                        Auto-Graded: {answer.marks_awarded} / {answer.max_marks} marks
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Question Text */}
                <div>
                  <h3 className="font-semibold text-gray-900 text-base leading-relaxed whitespace-pre-wrap">
                    {answer.question_text}
                  </h3>
                </div>

                {/* WRITTEN RESPONSE EVALUATION PANEL */}
                {isWritten ? (
                  <div className="space-y-4 pt-2">
                    {/* Model Answer / Rubric Reference */}
                    {answer.explanation && (
                      <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-lg text-xs">
                        <div className="font-semibold text-amber-900 mb-1 flex items-center gap-1.5">
                          <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                          Evaluation Rubric / Model Answer Reference:
                        </div>
                        <p className="text-amber-800 whitespace-pre-wrap">{answer.explanation}</p>
                      </div>
                    )}

                    {/* Candidate's Actual Response */}
                    <div>
                      <div className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                        <span>Candidate's Written Response:</span>
                        {answer.written_response && (
                          <span className="text-[11px] font-normal text-gray-500">
                            {answer.written_response.trim().split(/\s+/).length} words
                          </span>
                        )}
                      </div>
                      <div className="p-4 bg-white rounded-lg border-2 border-gray-300 text-sm text-gray-900 leading-relaxed whitespace-pre-wrap min-h-[120px] font-mono shadow-inner">
                        {answer.written_response ? (
                          answer.written_response
                        ) : (
                          <span className="text-gray-400 italic font-sans">No response submitted by candidate.</span>
                        )}
                      </div>
                    </div>

                    {/* Examiner Award & Feedback Box */}
                    <div className="p-4 bg-gradient-to-r from-amber-50/50 via-yellow-50/30 to-white rounded-xl border border-amber-200 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <label className="text-xs font-bold text-gray-900 block">
                            Marks Awarded (Out of {answer.max_marks}):
                          </label>
                          <span className="text-[11px] text-gray-500">Enter a score from 0 to {answer.max_marks}</span>
                        </div>

                        {/* Quick Scoring Buttons */}
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-gray-400 mr-1">Quick Score:</span>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs px-2.5"
                            onClick={() => setQuickMarks(answer.id, 0)}
                          >
                            0
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs px-2.5"
                            onClick={() => setQuickMarks(answer.id, answer.max_marks / 2)}
                          >
                            Half ({answer.max_marks / 2})
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs px-2.5 bg-green-50 text-green-800 border-green-200 hover:bg-green-100"
                            onClick={() => setQuickMarks(answer.id, answer.max_marks)}
                          >
                            Full ({answer.max_marks})
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-start">
                        <div className="sm:col-span-1">
                          <Input
                            type="number"
                            min={0}
                            max={answer.max_marks}
                            step={0.5}
                            value={grades[answer.id]?.marks ?? 0}
                            onChange={e => {
                              const val = Math.min(Math.max(0, parseFloat(e.target.value) || 0), answer.max_marks);
                              setQuickMarks(answer.id, val);
                            }}
                            className="text-lg font-bold text-center h-11 border-amber-300 focus:ring-amber-500"
                          />
                        </div>
                        <div className="sm:col-span-3">
                          <Input
                            placeholder="Feedback / evaluation notes for this answer (e.g. Well argued, missed point #2)..."
                            value={grades[answer.id]?.feedback || ""}
                            onChange={e => setGrades(g => ({
                              ...g,
                              [answer.id]: { ...g[answer.id], feedback: e.target.value },
                            }))}
                            className="h-11 bg-white"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* OBJECTIVE MCQ DISPLAY (LOCKED / AUTOMATIC) */
                  <div className="space-y-3 pt-1">
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Student Choice vs Correct Answer:
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {answer.options?.map((opt: any) => {
                        const selectedIds = answer.selected_option_ids ? JSON.parse(answer.selected_option_ids) : [];
                        const isSelected = selectedIds.includes(opt.id);
                        const isCorrect = opt.is_correct === 1 || opt.is_correct === true;

                        return (
                          <div
                            key={opt.id}
                            className={`p-3 rounded-lg border flex items-center justify-between gap-2 ${
                              isCorrect && isSelected
                                ? "bg-green-50 border-green-300 text-green-950 font-medium"
                                : isCorrect && !isSelected
                                ? "bg-emerald-50/60 border-emerald-200 text-emerald-900 border-dashed"
                                : isSelected && !isCorrect
                                ? "bg-red-50 border-red-300 text-red-950"
                                : "bg-white border-gray-200 text-gray-600"
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              <span className="font-mono">{isSelected ? "●" : "○"}</span>
                              <span className="truncate">{opt.text}</span>
                            </div>
                            <div className="shrink-0 flex items-center gap-1.5 text-[11px]">
                              {isSelected && !isCorrect && (
                                <Badge variant="destructive" className="h-5 text-[10px] px-1.5">
                                  Selected (Wrong)
                                </Badge>
                              )}
                              {isCorrect && isSelected && (
                                <Badge variant="success" className="h-5 text-[10px] px-1.5">
                                  Selected (Correct)
                                </Badge>
                              )}
                              {isCorrect && !isSelected && (
                                <span className="text-green-700 font-semibold text-[11px]">
                                  (Correct Answer)
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t">
                      <span className="flex items-center gap-1 text-gray-500">
                        <Lock className="h-3 w-3 text-gray-400" />
                        Graded by automated scoring engine
                      </span>
                      <span className="font-semibold text-gray-800">
                        Awarded: {answer.marks_awarded} / {answer.max_marks} marks
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Floating or Bottom Save Bar */}
      <div className="sticky bottom-4 p-4 rounded-xl bg-white border-2 border-blue-500/30 shadow-xl flex items-center justify-between gap-4">
        <div>
          <span className="font-bold text-gray-900 text-sm">Overall Candidate Score: </span>
          <span className="text-blue-700 font-extrabold text-lg">{grandTotal} / {grandMax} ({percentage}%)</span>
        </div>
        <Button onClick={handleSave} loading={saving} className="bg-blue-600 hover:bg-blue-700 px-6">
          <Save className="h-4 w-4 mr-1.5" />
          Save All Evaluations
        </Button>
      </div>
    </div>
  );
}
