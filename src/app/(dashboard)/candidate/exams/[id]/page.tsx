"use client";
import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { Clock, FileText, AlertTriangle, PlayCircle, ArrowLeft, Calendar, CheckCircle2 } from "lucide-react";

export default function CandidateExamDetailPage() {
  const { id } = useParams() as { id: string };
  const [data, setData] = useState<any>(null);
  const [starting, setStarting] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    fetch(`/api/exams/${id}`)
      .then((r) => r.json())
      .then((d) => setData(d));
  }, [id]);

  if (!data) return <div className="animate-pulse p-8 text-center text-gray-500">Loading examination details...</div>;

  const { exam } = data;
  const now = new Date();
  const startTime = exam.scheduled_start ? new Date(exam.scheduled_start) : null;
  const endTime = exam.scheduled_end ? new Date(exam.scheduled_end) : null;

  const isBeforeStart = startTime ? now < startTime : false;
  const isAfterEnd = (endTime ? now >= endTime : false) || exam.status === "COMPLETED";
  const isMaxAttemptsReached = data.my_attempts != null && data.my_attempts >= exam.max_attempts;
  const isCandidateCompleted = data.enrollment_status === "COMPLETED" || isMaxAttemptsReached;

  // Strict check: only allow starting if exam is ONGOING, not completed by candidate, start time arrived, end time not passed, and attempts remain
  const canStart = exam.status === "ONGOING" && !isCandidateCompleted && !isBeforeStart && !isAfterEnd;

  const startExam = async () => {
    if (!canStart) return;
    setStarting(true);
    const res = await fetch("/api/attempts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ examId: id }),
    });
    const d = await res.json();
    if (res.ok) {
      router.push(`/exam/${d.attemptId}`);
    } else {
      toast(d.error || "Cannot start exam at this time.", "error");
      setStarting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <Link href="/candidate/exams">
        <Button variant="ghost" size="sm">
          <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to My Examinations
        </Button>
      </Link>

      <Card className="border border-gray-200 shadow-sm">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <CardTitle className="text-2xl font-bold text-gray-900">{exam.title}</CardTitle>
            <div>
              {isCandidateCompleted ? (
                <Badge className="bg-purple-100 text-purple-800 border-purple-200 px-3 py-1 font-semibold text-xs">
                  COMPLETED
                </Badge>
              ) : isAfterEnd ? (
                <Badge className="bg-gray-100 text-gray-700 border-gray-200 px-3 py-1 font-semibold text-xs">
                  CLOSED
                </Badge>
              ) : isBeforeStart ? (
                <Badge className="bg-amber-100 text-amber-800 border-amber-300 px-3 py-1 font-semibold text-xs">
                  SCHEDULED
                </Badge>
              ) : (
                <Badge variant="success" className="bg-emerald-100 text-emerald-800 border-emerald-300 px-3 py-1 font-semibold text-xs">
                  ACTIVE
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {exam.description && <p className="text-gray-600 leading-relaxed">{exam.description}</p>}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Duration", value: `${exam.duration} min`, icon: Clock },
              { label: "Total Marks", value: exam.total_marks, icon: FileText },
              { label: "Passing Marks", value: exam.passing_marks || "N/A", icon: AlertTriangle },
              { label: "Attempts Used", value: `${data.my_attempts || 0} / ${exam.max_attempts}`, icon: PlayCircle },
            ].map((s) => (
              <div key={s.label} className="bg-gray-50 rounded-xl p-4 text-center border border-gray-100">
                <s.icon className="h-5 w-5 text-gray-400 mx-auto mb-1.5" />
                <p className="text-lg font-bold text-gray-900">{s.value}</p>
                <p className="text-xs text-gray-500">{s.label}</p>
              </div>
            ))}
          </div>

          {exam.instructions && (
            <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-5">
              <h3 className="font-semibold text-blue-900 mb-2 text-sm flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-blue-700" /> Instructions for Candidates
              </h3>
              <div className="text-sm text-blue-950 whitespace-pre-wrap leading-relaxed">{exam.instructions}</div>
            </div>
          )}

          {/* Schedule Window Banner */}
          {(startTime || endTime) && (
            <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/70 space-y-1 text-sm text-gray-700">
              <div className="font-semibold text-gray-900 flex items-center gap-1.5 text-xs uppercase tracking-wider mb-2">
                <Calendar className="h-4 w-4 text-primary" /> Examination Schedule Window
              </div>
              {startTime && (
                <div className="flex justify-between py-1 border-b border-gray-200/60">
                  <span className="text-gray-500">Opens:</span>
                  <span className="font-medium text-gray-900">{startTime.toLocaleString()}</span>
                </div>
              )}
              {endTime && (
                <div className="flex justify-between py-1">
                  <span className="text-gray-500">Closes (Strict Deadline):</span>
                  <span className="font-medium text-gray-900">{endTime.toLocaleString()}</span>
                </div>
              )}
            </div>
          )}

          {/* Action / Participation Gate */}
          <div className="pt-4 border-t flex flex-col items-center justify-center">
            {isCandidateCompleted ? (
              <div className="text-center p-5 bg-purple-50 border border-purple-200 rounded-xl max-w-md w-full">
                <CheckCircle2 className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                <h4 className="font-bold text-purple-900 text-base">You Have Completed This Exam</h4>
                <p className="text-xs text-purple-700 mt-1 leading-relaxed">
                  Your submission has been recorded. You can view your marks and solution review in the Results section once published.
                </p>
                <div className="mt-4">
                  <Link href="/candidate/results">
                    <Button variant="outline" size="sm" className="border-purple-300 text-purple-900 hover:bg-purple-100">
                      View My Results
                    </Button>
                  </Link>
                </div>
              </div>
            ) : isBeforeStart ? (
              <div className="text-center p-5 bg-amber-50 border border-amber-200 rounded-xl max-w-md w-full">
                <Clock className="h-8 w-8 text-amber-600 mx-auto mb-2" />
                <h4 className="font-bold text-amber-900 text-base">This exam has not started yet</h4>
                <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                  The examination opens on <strong>{startTime?.toLocaleString()}</strong>.
                  You cannot participate or solve questions until the start time arrives.
                </p>
              </div>
            ) : isAfterEnd ? (
              <div className="text-center p-5 bg-rose-50 border border-rose-200 rounded-xl max-w-md w-full">
                <AlertTriangle className="h-8 w-8 text-rose-600 mx-auto mb-2" />
                <h4 className="font-bold text-rose-900 text-base">This examination has closed</h4>
                <p className="text-xs text-rose-700 mt-1 leading-relaxed">
                  The scheduled end time was <strong>{endTime ? endTime.toLocaleString() : "expired"}</strong>.
                  Submissions are closed and no further participation is permitted.
                </p>
              </div>
            ) : canStart ? (
              <Button size="lg" onClick={startExam} loading={starting} className="px-12 py-3 text-base font-semibold shadow-sm">
                <PlayCircle className="h-5 w-5 mr-2" /> Start Examination
              </Button>
            ) : (
              <p className="text-gray-500 text-sm">This examination is not currently available.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
