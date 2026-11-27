"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function CandidateExamsPage() {
  const [exams, setExams] = useState<any[]>([]);
  useEffect(() => { fetch("/api/exams").then(r => r.json()).then(d => setExams(d.exams || [])); }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Examinations</h1>
      {exams.length === 0 ? (
        <Card><CardContent className="p-12 text-center text-gray-500">No exams assigned.</CardContent></Card>
      ) : (
        <div className="grid gap-4">
          {exams.map(exam => (
            <Link key={exam.id} href={`/candidate/exams/${exam.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-6 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{exam.title}</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {exam.duration} min · {exam.total_marks} marks · Attempts: {exam.my_attempts || 0}/{exam.max_attempts}
                    </p>
                  </div>
                  <div className="flex gap-2 items-center flex-wrap">
                    {exam.classroom_name && (
                      <Badge variant="outline" className="border-blue-200 text-blue-800 bg-blue-50/80 font-medium text-xs">
                        Class: {exam.classroom_name}
                      </Badge>
                    )}
                    {exam.status === "COMPLETED" ? (
                      <Badge variant="purple" className="text-xs">COMPLETED</Badge>
                    ) : exam.status === "PUBLISHED" ? (
                      <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-xs">
                        SCHEDULED
                      </Badge>
                    ) : (
                      <Badge variant="success" className="bg-emerald-100 text-emerald-800 border-emerald-300 text-xs">
                        ACTIVE / ONGOING
                      </Badge>
                    )}
                    {exam.enrollment_status && <Badge variant="secondary">{exam.enrollment_status}</Badge>}
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
