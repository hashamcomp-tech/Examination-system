"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Award, Clock, School, CheckCircle2, XCircle, ArrowRight, FileText } from "lucide-react";

export default function CandidateResultsPage() {
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/exams")
      .then((r) => r.json())
      .then((d) => {
        setExams(d.exams?.filter((e: any) => e.results_published) || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Results</h1>
        <p className="text-sm text-gray-500 mt-1">
          View your performance, marks obtained out of total, and overall pass/fail status.
        </p>
      </div>

      {loading ? (
        <Card>
          <CardContent className="p-12 text-center text-gray-500">
            Loading your examination results...
          </CardContent>
        </Card>
      ) : exams.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-gray-500">
            No published results yet. Once examiners publish your grades, they will appear here.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {exams.map((exam) => {
            const hasScore = exam.my_score != null;
            const score = exam.my_score ?? 0;
            const maxScore = exam.my_max_score ?? exam.total_marks;
            const percentage = exam.my_percentage != null ? exam.my_percentage : maxScore > 0 ? Math.round((score / maxScore) * 10000) / 100 : 0;
            const passed = exam.passing_marks != null && hasScore ? score >= exam.passing_marks : null;

            return (
              <Link key={exam.id} href={`/candidate/results/${exam.id}`}>
                <Card className="hover:shadow-md hover:border-blue-200 transition-all cursor-pointer overflow-hidden border border-gray-200">
                  <CardContent className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                    {/* Left: Exam Details */}
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-lg text-gray-900 truncate">{exam.title}</h3>
                        {exam.classroom_name && (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                            <School className="h-3 w-3" /> {exam.classroom_name}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" /> {exam.duration} mins
                        </span>
                      </div>
                    </div>

                    {/* Middle: Marks & Pass/Fail status */}
                    <div className="flex items-center gap-5 sm:gap-6 border-t sm:border-t-0 pt-3 sm:pt-0 border-gray-100">
                      {hasScore ? (
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-xs uppercase font-semibold tracking-wider text-gray-500">Marks Scored</p>
                            <p className="text-2xl font-extrabold text-gray-900 leading-tight">
                              {score} <span className="text-sm font-normal text-gray-500">/ {maxScore}</span>
                            </p>
                            <p className="text-xs font-semibold text-blue-600">{percentage}%</p>
                          </div>

                          <div className="min-w-[90px] text-center">
                            {passed === true ? (
                              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 flex items-center justify-center gap-1.5 font-bold px-3 py-1.5 text-xs shadow-none">
                                <CheckCircle2 className="h-4 w-4 text-emerald-600" /> PASSED
                              </Badge>
                            ) : passed === false ? (
                              <Badge className="bg-rose-100 text-rose-800 border-rose-300 flex items-center justify-center gap-1.5 font-bold px-3 py-1.5 text-xs shadow-none">
                                <XCircle className="h-4 w-4 text-rose-600" /> FAILED
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs font-medium px-2.5 py-1">
                                COMPLETED
                              </Badge>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="text-right">
                          <Badge variant="secondary" className="text-xs">
                            NO SUBMISSION
                          </Badge>
                        </div>
                      )}

                      {/* Right: Action */}
                      <Button size="sm" variant="outline" className="pointer-events-none group-hover:bg-primary group-hover:text-white shrink-0">
                        View Result <ArrowRight className="h-3.5 w-3.5 ml-1" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
