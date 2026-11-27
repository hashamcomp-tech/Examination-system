"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, BookOpen, Users, Clock, Plus, BarChart3 } from "lucide-react";

export default function ExaminerDashboard() {
  const [exams, setExams] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/exams").then(r => r.json()).then(d => setExams(d.exams || []));
  }, []);

  const stats = {
    total: exams.length,
    draft: exams.filter(e => e.status === "DRAFT").length,
    active: exams.filter(e => ["PUBLISHED", "ONGOING"].includes(e.status)).length,
    completed: exams.filter(e => e.status === "COMPLETED").length,
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Examiner Dashboard</h1>
          <p className="text-gray-500 mt-1">Manage your examinations</p>
        </div>
        <Link href="/examiner/exams/new">
          <Button><Plus className="h-4 w-4" /> Create Exam</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {[
          { title: "Total Exams", value: stats.total, icon: FileText, color: "text-blue-600 bg-blue-50" },
          { title: "Drafts", value: stats.draft, icon: BookOpen, color: "text-gray-600 bg-gray-50" },
          { title: "Active", value: stats.active, icon: Clock, color: "text-emerald-600 bg-emerald-50" },
          { title: "Completed", value: stats.completed, icon: BarChart3, color: "text-purple-600 bg-purple-50" },
        ].map(s => (
          <Card key={s.title}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{s.title}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{s.value}</p>
                </div>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${s.color}`}>
                  <s.icon className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold mb-4">Recent Exams</h2>
          {exams.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No exams yet. Create your first exam!</p>
          ) : (
            <div className="space-y-3">
              {exams.slice(0, 5).map(exam => (
                <Link key={exam.id} href={`/examiner/exams/${exam.id}`} className="block">
                  <div className="flex items-center justify-between p-4 rounded-lg border hover:bg-gray-50 transition-colors">
                    <div>
                      <h3 className="font-medium text-gray-900">{exam.title}</h3>
                      <p className="text-sm text-gray-500 mt-0.5">{exam.duration} min · {exam.total_marks} marks · {exam.enrollment_count || 0} enrolled</p>
                    </div>
                    <Badge variant={exam.status === "DRAFT" ? "secondary" : exam.status === "ONGOING" ? "success" : exam.status === "PUBLISHED" ? "default" : "purple"}>
                      {exam.status}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
