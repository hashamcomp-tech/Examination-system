"use client";
import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { Save, CheckCircle } from "lucide-react";

export default function GradingPage() {
  const { examId, attemptId } = useParams() as { examId: string; attemptId: string };
  const [data, setData] = useState<any>(null);
  const [grades, setGrades] = useState<Record<string, { marks: number; feedback: string }>>({});
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    fetch(`/api/results/${examId}/grade/${attemptId}`).then(r => r.json()).then(d => {
      setData(d);
      const g: Record<string, any> = {};
      d.answers?.forEach((a: any) => {
        g[a.id] = { marks: a.marks_awarded ?? 0, feedback: a.examiner_feedback || "" };
      });
      setGrades(g);
    });
  }, [examId, attemptId]);

  if (!data) return <div className="animate-pulse p-8">Loading...</div>;

  const handleSave = async () => {
    setSaving(true);
    const gradeData = Object.entries(grades).map(([answerId, g]) => ({
      answerId, marksAwarded: g.marks, feedback: g.feedback,
    }));
    const res = await fetch(`/api/results/${examId}/grade/${attemptId}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ grades: gradeData }),
    });
    if (res.ok) { const d = await res.json(); toast(`Saved! Total: ${d.totalScore}/${d.maxScore} (${d.percentage}%)`, "success"); }
    else { const d = await res.json(); toast(d.error || "Failed", "error"); }
    setSaving(false);
  };

  const totalAwarded = Object.values(grades).reduce((s, g) => s + (g.marks || 0), 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Grade Submission</h1>
          <p className="text-gray-500 mt-1">{data.attempt?.candidate_name} · {data.exam?.title}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm text-gray-500">Running Total</p>
            <p className="text-xl font-bold text-gray-900">{totalAwarded} / {data.attempt?.max_score || 0}</p>
          </div>
          <Button onClick={handleSave} loading={saving}><Save className="h-4 w-4" /> Save Grades</Button>
        </div>
      </div>

      <div className="space-y-4">
        {data.answers?.map((answer: any, i: number) => (
          <Card key={answer.id} className={answer.question_type === "WRITTEN" ? "border-l-4 border-l-amber-400" : ""}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <span className="text-sm font-medium text-gray-500">Question {i + 1}</span>
                  <Badge variant="secondary" className="ml-2">{answer.question_type.replace("_", " ")}</Badge>
                  <Badge variant="outline" className="ml-2">{answer.max_marks} marks</Badge>
                </div>
              </div>
              <p className="text-gray-900 mb-4">{answer.question_text}</p>

              {/* Show answer */}
              {answer.question_type === "WRITTEN" ? (
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-500 mb-1">Candidate&apos;s Response:</p>
                  <div className="bg-gray-50 p-4 rounded-lg text-sm whitespace-pre-wrap">
                    {answer.written_response || <span className="text-gray-400 italic">No response provided</span>}
                  </div>
                </div>
              ) : (
                <div className="mb-4 space-y-1">
                  {answer.options?.map((opt: any) => {
                    const selected = answer.selected_option_ids ? JSON.parse(answer.selected_option_ids).includes(opt.id) : false;
                    return (
                      <div key={opt.id} className={`flex items-center gap-2 p-2 rounded text-sm ${
                        opt.is_correct ? "bg-green-50 border border-green-200" : selected ? "bg-red-50 border border-red-200" : "bg-gray-50"
                      }`}>
                        {selected ? "☑" : "☐"} {opt.text}
                        {opt.is_correct && <CheckCircle className="h-3 w-3 text-green-600 ml-auto" />}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Grading inputs */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-3 border-t">
                <div>
                  <label className="text-xs font-medium text-gray-500">Marks (max {answer.max_marks})</label>
                  <Input type="number" min={0} max={answer.max_marks} step={0.5}
                    value={grades[answer.id]?.marks ?? 0}
                    onChange={e => setGrades(g => ({ ...g, [answer.id]: { ...g[answer.id], marks: Math.min(parseFloat(e.target.value) || 0, answer.max_marks) } }))} />
                </div>
                <div className="md:col-span-3">
                  <label className="text-xs font-medium text-gray-500">Feedback</label>
                  <Input placeholder="Optional feedback..."
                    value={grades[answer.id]?.feedback || ""}
                    onChange={e => setGrades(g => ({ ...g, [answer.id]: { ...g[answer.id], feedback: e.target.value } }))} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
