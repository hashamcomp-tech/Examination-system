"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { Monitor, Send, AlertTriangle, RefreshCw } from "lucide-react";

export default function MonitoringPage() {
  const [exams, setExams] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/exams?status=ONGOING").then(r => r.json()).then(d => setExams(d.exams || []));
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Exam Monitoring</h1>
        <Button variant="outline" onClick={() => window.location.reload()}><RefreshCw className="h-4 w-4" /> Refresh</Button>
      </div>

      {exams.length === 0 ? (
        <Card><CardContent className="p-12 text-center">
          <Monitor className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="font-semibold text-gray-700">No Active Exams</h3>
          <p className="text-gray-500 mt-1">Exams will appear here when they are ongoing.</p>
        </CardContent></Card>
      ) : (
        <div className="grid gap-4">
          {exams.map(exam => (
            <Link key={exam.id} href={`/examiner/monitoring/${exam.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">{exam.title}</h3>
                      <p className="text-sm text-gray-500 mt-1">{exam.enrollment_count || 0} enrolled · {exam.attempt_count || 0} attempts</p>
                    </div>
                    <Badge variant="success">LIVE</Badge>
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
