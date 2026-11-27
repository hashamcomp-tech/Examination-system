"use client";
import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";

export default function QuestionAnalyticsPage() {
  const [analytics, setAnalytics] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [examFilter, setExamFilter] = useState("");

  useEffect(() => {
    fetch("/api/exams").then(r => r.json()).then(d => setExams(d.exams || []));
  }, []);

  useEffect(() => {
    const params = examFilter ? `?examId=${examFilter}` : "";
    fetch(`/api/analytics/questions${params}`).then(r => r.json()).then(d => setAnalytics(d.analytics || []));
  }, [examFilter]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Question Analytics</h1>
        <Select className="w-56" value={examFilter} onChange={e => setExamFilter(e.target.value)}>
          <option value="">All Exams</option>
          {exams.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left text-gray-500 bg-gray-50">
              <th className="p-4 font-medium">Question</th><th className="p-4 font-medium">Type</th>
              <th className="p-4 font-medium">Difficulty</th><th className="p-4 font-medium">Attempts</th>
              <th className="p-4 font-medium">Correct</th><th className="p-4 font-medium">Incorrect</th>
              <th className="p-4 font-medium">Skipped</th><th className="p-4 font-medium">Avg Score</th>
            </tr></thead>
            <tbody>
              {analytics.map((q: any) => {
                const correctPct = q.total_attempts > 0 ? Math.round((q.correct_count / q.total_attempts) * 100) : 0;
                return (
                  <tr key={q.id} className="border-b hover:bg-gray-50">
                    <td className="p-4 max-w-xs truncate">{q.text}</td>
                    <td className="p-4"><Badge variant="secondary">{q.type}</Badge></td>
                    <td className="p-4"><Badge variant={q.difficulty === "EASY" ? "success" : q.difficulty === "HARD" ? "destructive" : "warning"}>{q.difficulty}</Badge></td>
                    <td className="p-4">{q.total_attempts || 0}</td>
                    <td className="p-4 text-emerald-600 font-medium">{q.correct_count || 0} ({correctPct}%)</td>
                    <td className="p-4 text-red-600">{q.incorrect_count || 0}</td>
                    <td className="p-4 text-gray-500">{q.skipped_count || 0}</td>
                    <td className="p-4 font-medium">{q.avg_score != null ? Number(q.avg_score).toFixed(1) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {analytics.length === 0 && <p className="text-center text-gray-500 py-8">No analytics data available.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
