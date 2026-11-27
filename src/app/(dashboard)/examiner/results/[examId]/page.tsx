"use client";
import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { Award, CheckCircle, Download } from "lucide-react";

export default function ExamResultsPage() {
  const { examId } = useParams() as { examId: string };
  const [data, setData] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => { fetch(`/api/results/${examId}`).then(r => r.json()).then(d => setData(d)); }, [examId]);

  if (!data) return <div className="animate-pulse p-8">Loading results...</div>;

  const publishResults = async () => {
    const res = await fetch(`/api/results/${examId}/publish`, { method: "POST" });
    if (res.ok) { toast("Results published!", "success"); window.location.reload(); }
    else toast("Failed to publish", "error");
  };

  const { exam, attempts, stats } = data;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{exam?.title} — Results</h1>
          <p className="text-gray-500 mt-1">{attempts?.length || 0} submissions</p>
        </div>
        {!exam?.results_published && <Button onClick={publishResults} variant="success"><CheckCircle className="h-4 w-4" /> Publish Results</Button>}
        {exam?.results_published && <Badge variant="success">✓ Published</Badge>}
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          {[
            { label: "Total", value: stats.total },
            { label: "Average", value: `${Math.round(stats.avg_pct || 0)}%` },
            { label: "Highest", value: `${Math.round(stats.max_pct || 0)}%` },
            { label: "Lowest", value: `${Math.round(stats.min_pct || 0)}%` },
            { label: "Passed", value: stats.passCount || 0 },
          ].map(s => (
            <Card key={s.label}><CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </CardContent></Card>
          ))}
        </div>
      )}

      {/* Score distribution */}
      <Card className="mb-6">
        <CardHeader><CardTitle>Score Distribution</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-end gap-1 h-32">
            {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90].map(bucket => {
              const count = attempts?.filter((a: any) => a.percentage >= bucket && a.percentage < bucket + 10).length || 0;
              const maxCount = Math.max(...[0, 10, 20, 30, 40, 50, 60, 70, 80, 90].map(b => attempts?.filter((a: any) => a.percentage >= b && a.percentage < b + 10).length || 0), 1);
              const height = (count / maxCount) * 100;
              return (
                <div key={bucket} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs text-gray-500">{count}</span>
                  <div className="w-full bg-blue-500 rounded-t" style={{ height: `${height}%`, minHeight: count > 0 ? "4px" : "0" }} />
                  <span className="text-xs text-gray-400">{bucket}%</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Candidates Table */}
      <Card>
        <CardHeader><CardTitle>Submissions</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left text-gray-500">
              <th className="pb-3">Candidate</th><th className="pb-3">Score</th><th className="pb-3">Percentage</th>
              <th className="pb-3">Status</th><th className="pb-3">Grading</th><th className="pb-3">Actions</th>
            </tr></thead>
            <tbody>
              {attempts?.map((a: any) => (
                <tr key={a.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="py-3">
                    <div className="font-medium">{a.candidate_name}</div>
                    <div className="text-gray-500 text-xs">{a.candidate_email}</div>
                  </td>
                  <td className="py-3">{a.total_score ?? "—"} / {a.max_score ?? "—"}</td>
                  <td className="py-3 font-medium">{a.percentage != null ? `${a.percentage}%` : "—"}</td>
                  <td className="py-3"><Badge variant={a.status === "SUBMITTED" ? "success" : a.status === "AUTO_SUBMITTED" ? "warning" : "secondary"}>{a.status}</Badge></td>
                  <td className="py-3"><Badge variant={a.grading_status === "COMPLETE" ? "success" : a.grading_status === "PARTIAL" ? "warning" : "secondary"}>{a.grading_status}</Badge></td>
                  <td className="py-3">
                    <Link href={`/examiner/results/${examId}/grade/${a.id}`}>
                      <Button size="sm" variant="outline">{a.grading_status === "COMPLETE" ? "Review" : "Grade"}</Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
