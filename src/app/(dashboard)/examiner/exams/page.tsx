"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Plus } from "lucide-react";

export default function ExamsListPage() {
  const [exams, setExams] = useState<any[]>([]);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    fetch("/api/exams").then(r => r.json()).then(d => setExams(d.exams || []));
  }, []);

  const filtered = filter ? exams.filter(e => e.status === filter) : exams;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Examinations</h1>
        <div className="flex gap-3">
          <Select className="w-40" value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="">All Status</option>
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
            <option value="ONGOING">Ongoing</option>
            <option value="COMPLETED">Completed</option>
          </Select>
          <Link href="/examiner/exams/new"><Button><Plus className="h-4 w-4" /> New Exam</Button></Link>
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card><CardContent className="p-12 text-center text-gray-500">No examinations found.</CardContent></Card>
      ) : (
        <div className="grid gap-4">
          {filtered.map(exam => (
            <Link key={exam.id} href={`/examiner/exams/${exam.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-gray-900">{exam.title}</h3>
                        <Badge variant={exam.status === "DRAFT" ? "secondary" : exam.status === "ONGOING" ? "success" : exam.status === "PUBLISHED" ? "default" : "purple"}>
                          {exam.status}
                        </Badge>
                      </div>
                      {exam.description && <p className="text-gray-500 mt-1 line-clamp-2">{exam.description}</p>}
                      <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                        <span>⏱ {exam.duration} min</span>
                        <span>📝 {exam.total_marks} marks</span>
                        <span>👥 {exam.enrollment_count || 0} enrolled</span>
                        <span>📊 {exam.attempt_count || 0} attempts</span>
                      </div>
                    </div>
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
