"use client";
import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Award, 
  Download, 
  ShieldCheck, 
  ArrowLeft, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  MessageSquare, 
  HelpCircle, 
  BookOpen, 
  FileText,
  Check,
  X
} from "lucide-react";

export default function CandidateResultDetailPage() {
  const { examId } = useParams() as { examId: string };
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/results/${examId}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [examId]);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-12 text-center text-gray-500">
          Loading exam breakdown and grading results...
        </CardContent>
      </Card>
    );
  }

  if (!data || data.error) {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        <Link href="/candidate/results">
          <Button variant="ghost" size="sm" className="mb-2">
            <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to Results
          </Button>
        </Link>
        <Card>
          <CardContent className="p-12 text-center text-gray-500">
            {data?.error || "Failed to load results."}
          </CardContent>
        </Card>
      </div>
    );
  }

  const { exam, attempt, answers } = data;
  const passed = exam?.passing_marks != null ? attempt?.total_score >= exam.passing_marks : null;

  const openVerifyPage = async () => {
    if (!attempt?.id) return;
    try {
      const res = await fetch(`/api/reports/${attempt.id}`);
      const d = await res.json();
      if (d.verificationToken) {
        window.open(`/verify/${d.verificationToken}`, "_blank");
      }
    } catch (e) {
      console.error("Verification token error", e);
    }
  };

  const downloadPdf = () => {
    if (!attempt?.id) return;
    window.open(`/api/reports/${attempt.id}/pdf`, "_blank");
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "N/A";
    try {
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? dateStr : d.toLocaleString();
    } catch {
      return dateStr;
    }
  };

  const mcqCount = answers?.filter((a: any) => a.question_type !== "WRITTEN").length || 0;
  const writtenCount = answers?.filter((a: any) => a.question_type === "WRITTEN").length || 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Link href="/candidate/results">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to My Results
          </Button>
        </Link>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={openVerifyPage}>
            <ShieldCheck className="h-4 w-4 mr-1.5 text-blue-600" /> Verify Credential
          </Button>
          <Button size="sm" onClick={downloadPdf}>
            <Download className="h-4 w-4 mr-1.5" /> Download Report
          </Button>
        </div>
      </div>

      {/* Main Score Card */}
      <Card className="border-t-4 border-t-primary shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-2xl font-bold text-gray-900">{exam?.title}</CardTitle>
              <p className="text-sm text-gray-500 mt-1">
                Completed on {formatDate(attempt?.submitted_at)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {passed !== null && (
                <Badge variant={passed ? "success" : "destructive"} className="text-sm px-4 py-1.5 font-semibold">
                  {passed ? "PASSED" : "FAILED"}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 bg-gray-50/80 rounded-xl p-5 border border-gray-100 text-center">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Score Obtained</p>
              <p className="text-3xl font-extrabold text-gray-900 mt-1">
                {attempt?.total_score ?? 0} <span className="text-lg font-normal text-gray-500">/ {attempt?.max_score ?? exam?.total_marks}</span>
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Percentage</p>
              <p className="text-3xl font-extrabold text-blue-600 mt-1">
                {attempt?.percentage ?? 0}%
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Passing Marks</p>
              <p className="text-3xl font-extrabold text-gray-700 mt-1">
                {exam?.passing_marks ?? "None"}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Evaluation Status</p>
              <div className="mt-2">
                <Badge variant={attempt?.grading_status === "COMPLETE" ? "outline" : "warning"}>
                  {attempt?.grading_status === "COMPLETE" ? "Grading Finalized" : "Evaluation in Review"}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Question Breakdown */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" /> Comprehensive Question Breakdown
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Review your chosen answers, correct solutions, and teacher evaluation comments.
            </p>
          </div>
          <div className="flex gap-2">
            <span className="text-xs font-medium text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full">
              {mcqCount} MCQs (Auto-Graded)
            </span>
            {writtenCount > 0 && (
              <span className="text-xs font-medium text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full">
                {writtenCount} Subjective Answers
              </span>
            )}
          </div>
        </div>

        {answers && answers.length > 0 ? (
          <div className="space-y-5">
            {answers.map((a: any, idx: number) => {
              const isWritten = a.question_type === "WRITTEN";
              const isFullMarks = a.marks_awarded != null && a.marks_awarded === a.max_marks;
              const isZeroMarks = a.marks_awarded === 0;
              const isPartialMarks = a.marks_awarded != null && a.marks_awarded > 0 && a.marks_awarded < a.max_marks;

              return (
                <Card key={a.id} className="border border-gray-200 overflow-hidden shadow-sm">
                  {/* Question Header */}
                  <div className="bg-gray-50/90 px-5 py-3.5 border-b border-gray-200 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="flex items-center justify-center h-7 w-7 rounded-full bg-primary/10 text-primary font-bold text-sm">
                        {idx + 1}
                      </span>
                      <span className="font-semibold text-gray-800 text-sm">Question {idx + 1}</span>
                      <Badge variant="outline" className="text-xs font-normal">
                        {a.question_type === "MCQ_SINGLE"
                          ? "Single Choice MCQ"
                          : a.question_type === "MCQ_MULTIPLE"
                          ? "Multiple Select MCQ"
                          : "Subjective / Written"}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2">
                      {isWritten ? (
                        a.marks_awarded != null ? (
                          <Badge className="bg-blue-100 text-blue-800 border-blue-200 font-semibold text-xs">
                            Teacher Awarded: {a.marks_awarded} / {a.max_marks} marks
                          </Badge>
                        ) : (
                          <Badge variant="warning" className="text-xs">
                            Pending Teacher Evaluation
                          </Badge>
                        )
                      ) : isFullMarks ? (
                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 flex items-center gap-1 font-semibold text-xs">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Correct (+{a.marks_awarded}/{a.max_marks})
                        </Badge>
                      ) : isPartialMarks ? (
                        <Badge className="bg-amber-100 text-amber-800 border-amber-300 flex items-center gap-1 font-semibold text-xs">
                          <AlertCircle className="h-3.5 w-3.5" /> Partial (+{a.marks_awarded}/{a.max_marks})
                        </Badge>
                      ) : (
                        <Badge className="bg-rose-100 text-rose-800 border-rose-300 flex items-center gap-1 font-semibold text-xs">
                          <XCircle className="h-3.5 w-3.5" /> Incorrect (0/{a.max_marks})
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Question Body */}
                  <CardContent className="p-5 space-y-4">
                    {/* Full Question Text */}
                    <div className="text-base font-medium text-gray-900 leading-relaxed">
                      {a.question_text}
                    </div>

                    {/* Objective Questions Options Display */}
                    {!isWritten && a.options && a.options.length > 0 && (
                      <div className="space-y-2.5 pt-1">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Options & Your Selection:
                        </p>
                        <div className="grid gap-2">
                          {a.options.map((opt: any, optIdx: number) => {
                            const isSelected = a.selectedOptionIds?.includes(opt.id);
                            const isCorrect = Boolean(opt.is_correct);

                            // Styling based on selection vs correctness
                            let itemStyle = "border-gray-200 bg-white text-gray-700 hover:bg-gray-50/50";
                            let badgeContent = null;

                            if (isSelected && isCorrect) {
                              itemStyle = "border-emerald-500 bg-emerald-50/80 text-emerald-950 font-medium ring-1 ring-emerald-400";
                              badgeContent = (
                                <span className="inline-flex items-center gap-1 text-xs font-semibold bg-emerald-200/90 text-emerald-900 px-2 py-0.5 rounded">
                                  <Check className="h-3.5 w-3.5" /> Your Answer (Correct)
                                </span>
                              );
                            } else if (isSelected && !isCorrect) {
                              itemStyle = "border-rose-400 bg-rose-50/80 text-rose-950 font-medium ring-1 ring-rose-300";
                              badgeContent = (
                                <span className="inline-flex items-center gap-1 text-xs font-semibold bg-rose-200/90 text-rose-900 px-2 py-0.5 rounded">
                                  <X className="h-3.5 w-3.5" /> Your Answer (Incorrect)
                                </span>
                              );
                            } else if (!isSelected && isCorrect) {
                              itemStyle = "border-emerald-400 border-dashed bg-emerald-50/30 text-emerald-900 font-medium";
                              badgeContent = (
                                <span className="inline-flex items-center gap-1 text-xs font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                                  <Check className="h-3.5 w-3.5" /> Correct Answer
                                </span>
                              );
                            }

                            return (
                              <div
                                key={opt.id}
                                className={`flex items-center justify-between p-3.5 rounded-lg border transition-colors ${itemStyle}`}
                              >
                                <div className="flex items-center gap-3">
                                  <div
                                    className={`flex items-center justify-center h-5 w-5 rounded-full text-xs font-bold ${
                                      isSelected
                                        ? isCorrect
                                          ? "bg-emerald-600 text-white"
                                          : "bg-rose-600 text-white"
                                        : isCorrect
                                        ? "border-2 border-emerald-600 text-emerald-700 font-bold"
                                        : "border border-gray-300 text-gray-500"
                                    }`}
                                  >
                                    {String.fromCharCode(65 + optIdx)}
                                  </div>
                                  <span className="text-sm">{opt.text}</span>
                                </div>
                                {badgeContent}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Subjective / Written Response Display */}
                    {isWritten && (
                      <div className="space-y-4 pt-1">
                        {/* Candidate Written Text */}
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider flex items-center gap-1.5">
                              <FileText className="h-3.5 w-3.5 text-gray-500" /> Your Submitted Answer:
                            </span>
                            <span className="text-xs text-gray-400">
                              {a.written_response
                                ? `${a.written_response.trim().split(/\s+/).filter(Boolean).length} words`
                                : "0 words"}
                            </span>
                          </div>
                          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-800 whitespace-pre-wrap leading-relaxed min-h-[70px]">
                            {a.written_response ? (
                              a.written_response
                            ) : (
                              <span className="italic text-gray-400">
                                No written response was submitted for this question.
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Teacher's Feedback */}
                        <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/70">
                          <div className="flex items-center gap-2 mb-2 text-blue-900 font-semibold text-sm">
                            <MessageSquare className="h-4 w-4 text-blue-600" />
                            Teacher / Examiner Feedback:
                          </div>
                          {a.examiner_feedback ? (
                            <p className="text-sm text-blue-950 font-medium whitespace-pre-wrap pl-6 border-l-2 border-blue-400">
                              {a.examiner_feedback}
                            </p>
                          ) : (
                            <p className="text-xs italic text-blue-700 pl-6">
                              {a.marks_awarded != null
                                ? "Examiner awarded marks without custom written remarks."
                                : "Awaiting examiner evaluation and remarks."}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Explanation / Rubric / Solution Notes */}
                    {a.explanation && (
                      <div className="mt-3 p-3.5 rounded-lg bg-amber-50/70 border border-amber-200/80 text-sm text-amber-950 flex gap-2.5 items-start">
                        <HelpCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-semibold text-amber-900 mr-1.5">
                            {isWritten ? "Model Answer / Evaluation Rubric:" : "Explanation / Solution Key:"}
                          </span>
                          <span>{a.explanation}</span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 text-center text-gray-500">
              No individual questions recorded for this exam attempt.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
