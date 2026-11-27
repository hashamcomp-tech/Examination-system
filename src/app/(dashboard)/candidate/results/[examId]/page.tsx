"use client";
import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Award, Download, ShieldCheck } from "lucide-react";

export default function CandidateResultDetailPage() {
  const { examId } = useParams() as { examId: string };
  const [data, setData] = useState<any>(null);

  useEffect(() => { fetch(`/api/results/${examId}`).then(r => r.json()).then(d => setData(d)); }, [examId]);

  if (!data || data.error) return <Card><CardContent className="p-12 text-center text-gray-500">{data?.error || "Loading..."}</CardContent></Card>;

  const { exam, attempt, answers } = data;
  const passed = exam?.passing_marks ? (attempt?.total_score >= exam.passing_marks) : null;

  const openVerifyPage = async () => {
    if (!attempt?.id) return;
    const res = await fetch(`/api/reports/${attempt.id}`);
    const d = await res.json();
    if (d.verificationToken) {
      window.open(`/verify/${d.verificationToken}`, "_blank");
    }
  };

  const downloadPdf = () => {
    if (!attempt?.id) return;
    window.open(`/api/reports/${attempt.id}/pdf`, "_blank");
  };

  return (
    <div className="max-w-3xl mx-auto">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{exam?.title}</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" onClick={openVerifyPage}>
                <ShieldCheck className="h-4 w-4 mr-1.5 text-blue-600" /> Verify Credential
              </Button>
              <Button onClick={downloadPdf}>
                <Download className="h-4 w-4 mr-1.5" /> Download PDF
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center py-6">
            <Award className={`h-16 w-16 mx-auto mb-4 ${passed === true ? "text-emerald-500" : passed === false ? "text-red-500" : "text-blue-500"}`} />
            <p className="text-4xl font-bold text-gray-900">{attempt?.total_score ?? 0} / {attempt?.max_score ?? 0}</p>
            <p className="text-xl text-gray-500 mt-1">{attempt?.percentage ?? 0}%</p>
            {passed !== null && (
              <Badge variant={passed ? "success" : "destructive"} className="mt-2 text-sm px-4 py-1">
                {passed ? "PASSED" : "FAILED"}
              </Badge>
            )}
          </div>

          {answers && answers.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Question Breakdown</h3>
              <div className="space-y-2">
                {answers.map((a: any, i: number) => (
                  <div key={a.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-gray-500">Q{i + 1}</span>
                      <span className="text-sm text-gray-700">{a.question_text?.substring(0, 60)}...</span>
                      <Badge variant="secondary">{a.question_type}</Badge>
                    </div>
                    <span className="font-medium text-gray-900">{a.marks_awarded ?? "—"} / {a.max_marks}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
