"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, FileText, CheckCircle, AlertCircle } from "lucide-react";

export default function CandidateDashboard() {
  const [exams, setExams] = useState<any[]>([]);

  useEffect(() => { fetch("/api/exams").then(r => r.json()).then(d => setExams(d.exams || [])); }, []);

  const available = exams.filter(e => e.status === "ONGOING" && (!e.my_attempts || e.my_attempts < e.max_attempts));
  const inProgress = exams.filter(e => e.enrollment_status === "STARTED");
  const completed = exams.filter(e => e.status === "COMPLETED" || e.enrollment_status === "COMPLETED" || (e.my_attempts && e.my_attempts >= e.max_attempts));

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">My Dashboard</h1>
        <p className="text-gray-500 mt-1">Your examination overview</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {[
          { title: "Available", value: available.length, icon: FileText, color: "text-blue-600 bg-blue-50" },
          { title: "In Progress", value: inProgress.length, icon: Clock, color: "text-amber-600 bg-amber-50" },
          { title: "Completed", value: completed.length, icon: CheckCircle, color: "text-emerald-600 bg-emerald-50" },
        ].map(s => (
          <Card key={s.title}>
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{s.title}</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{s.value}</p>
              </div>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${s.color}`}>
                <s.icon className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {available.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Available Exams</h2>
          <div className="grid gap-3">
            {available.map(exam => (
              <Link key={exam.id} href={`/candidate/exams/${exam.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-5 flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">{exam.title}</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        ⏱ {exam.duration} min · 📝 {exam.total_marks} marks
                        {exam.scheduled_start && ` · Starts: ${new Date(exam.scheduled_start).toLocaleDateString()}`}
                      </p>
                    </div>
                    <Button size="sm">View</Button>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {exams.length === 0 && (
        <Card><CardContent className="p-12 text-center">
          <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="font-semibold text-gray-700">No Exams Available</h3>
          <p className="text-gray-500 mt-1">You haven&apos;t been enrolled in any exams yet.</p>
        </CardContent></Card>
      )}
    </div>
  );
}
