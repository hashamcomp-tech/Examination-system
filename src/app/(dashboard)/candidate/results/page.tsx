"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function CandidateResultsPage() {
  const [exams, setExams] = useState<any[]>([]);
  useEffect(() => { fetch("/api/exams").then(r => r.json()).then(d => setExams(d.exams?.filter((e: any) => e.results_published) || [])); }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Results</h1>
      {exams.length === 0 ? (
        <Card><CardContent className="p-12 text-center text-gray-500">No published results yet.</CardContent></Card>
      ) : (
        <div className="grid gap-4">
          {exams.map(exam => (
            <Link key={exam.id} href={`/candidate/results/${exam.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-6 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">{exam.title}</h3>
                    <p className="text-sm text-gray-500 mt-1">{exam.total_marks} marks · {exam.duration} min</p>
                  </div>
                  <Button size="sm" variant="outline" className="pointer-events-none">View Result</Button>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
