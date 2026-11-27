"use client";
import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { Clock, FileText, AlertTriangle, PlayCircle } from "lucide-react";

export default function CandidateExamDetailPage() {
  const { id } = useParams() as { id: string };
  const [data, setData] = useState<any>(null);
  const [starting, setStarting] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => { fetch(`/api/exams/${id}`).then(r => r.json()).then(d => setData(d)); }, [id]);

  if (!data) return <div className="animate-pulse p-8">Loading...</div>;

  const { exam } = data;

  const startExam = async () => {
    setStarting(true);
    const res = await fetch("/api/attempts", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ examId: id }),
    });
    const d = await res.json();
    if (res.ok) {
      router.push(`/exam/${d.attemptId}`);
    } else {
      toast(d.error || "Cannot start exam", "error");
    }
    setStarting(false);
  };

  const canStart = ["PUBLISHED", "ONGOING"].includes(exam.status);

  return (
    <div className="max-w-3xl mx-auto">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl">{exam.title}</CardTitle>
            <Badge variant={exam.status === "ONGOING" ? "success" : "default"}>{exam.status}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {exam.description && <p className="text-gray-600">{exam.description}</p>}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Duration", value: `${exam.duration} min`, icon: Clock },
              { label: "Total Marks", value: exam.total_marks, icon: FileText },
              { label: "Passing", value: exam.passing_marks || "N/A", icon: AlertTriangle },
              { label: "Attempts", value: `${data.my_attempts || 0}/${exam.max_attempts}`, icon: PlayCircle },
            ].map(s => (
              <div key={s.label} className="bg-gray-50 rounded-lg p-4 text-center">
                <s.icon className="h-5 w-5 text-gray-400 mx-auto mb-1" />
                <p className="text-lg font-bold text-gray-900">{s.value}</p>
                <p className="text-xs text-gray-500">{s.label}</p>
              </div>
            ))}
          </div>

          {exam.instructions && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">Instructions</h3>
              <div className="text-sm text-blue-800 whitespace-pre-wrap">{exam.instructions}</div>
            </div>
          )}

          {exam.scheduled_start && (
            <div className="text-sm text-gray-500">
              <strong>Window:</strong> {new Date(exam.scheduled_start).toLocaleString()} — {exam.scheduled_end ? new Date(exam.scheduled_end).toLocaleString() : "Open"}
            </div>
          )}

          <div className="pt-4 border-t flex justify-center">
            {canStart ? (
              <Button size="lg" onClick={startExam} loading={starting} className="px-12">
                <PlayCircle className="h-5 w-5" /> Start Examination
              </Button>
            ) : (
              <p className="text-gray-500">This exam is not currently available.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
