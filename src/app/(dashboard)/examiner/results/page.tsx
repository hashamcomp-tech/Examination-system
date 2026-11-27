"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { BarChart3 } from "lucide-react";

export default function ExaminerResultsPage() {
  const [exams, setExams] = useState<any[]>([]);
  useEffect(() => { fetch("/api/exams").then(r => r.json()).then(d => setExams(d.exams || [])); }, []);

  const completedExams = exams.filter(e => ["ONGOING", "COMPLETED"].includes(e.status));

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Results & Grading</h1>
      {completedExams.length === 0 ? (
        <Card><CardContent className="p-12 text-center text-gray-500"><BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-300" />No exams with results yet.</CardContent></Card>
      ) : (
        <div className="grid gap-4">
          {completedExams.map(exam => (
            <Link key={exam.id} href={`/examiner/results/${exam.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-6 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">{exam.title}</h3>
                    <p className="text-sm text-gray-500 mt-1">{exam.attempt_count || 0} attempts · {exam.total_marks} marks</p>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant={exam.results_published ? "success" : "warning"}>
                      {exam.results_published ? "Published" : "Unpublished"}
                    </Badge>
                    <Badge variant={exam.status === "ONGOING" ? "success" : "purple"}>{exam.status}</Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
