"use client";
import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import {
  School, Users, FileText, Copy, Check, ArrowLeft, Plus, ExternalLink, ShieldCheck
} from "lucide-react";

export default function ExaminerClassroomDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { toast } = useToast();

  const [classroom, setClassroom] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [allMyExams, setAllMyExams] = useState<any[]>([]);
  const [selectedExamId, setSelectedExamId] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState(false);

  const load = () => {
    fetch(`/api/classrooms/${id}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) {
          toast(d.error, "error");
          router.push("/examiner/classrooms");
          return;
        }
        setClassroom(d.classroom);
        setStudents(d.students || []);
        setExams(d.exams || []);
        setLoading(false);
      });

    // Also load examiner's all exams to offer assigning
    fetch("/api/exams")
      .then(r => r.json())
      .then(d => {
        setAllMyExams(d.exams || []);
      });
  };

  useEffect(() => {
    load();
  }, [id]);

  const copyCode = () => {
    if (!classroom?.code) return;
    navigator.clipboard.writeText(classroom.code);
    setCopiedCode(true);
    toast(`Class code ${classroom.code} copied!`, "success");
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleAssignExam = async () => {
    if (!selectedExamId) {
      toast("Please select an exam to assign", "error");
      return;
    }
    setAssigning(true);
    const res = await fetch(`/api/classrooms/${id}/assign-exam`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ examId: selectedExamId }),
    });
    const d = await res.json();
    if (res.ok) {
      toast(d.message || "Exam assigned to classroom!", "success");
      setSelectedExamId("");
      load();
    } else {
      toast(d.error || "Failed to assign exam", "error");
    }
    setAssigning(false);
  };

  if (loading || !classroom) {
    return <div className="animate-pulse p-8 text-center text-gray-400">Loading classroom details...</div>;
  }

  // Filter exams that are not yet assigned to this classroom
  const unassignedExams = allMyExams.filter(e => e.classroom_id !== classroom.id);

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb */}
      <div>
        <Link href="/examiner/classrooms" className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1.5 mb-2 font-medium">
          <ArrowLeft className="h-4 w-4" />
          Back to Classrooms
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{classroom.name}</h1>
            {classroom.description && (
              <p className="text-sm text-gray-500 mt-1">{classroom.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Instructor: {classroom.instructor_name || "You"}</span>
          </div>
        </div>
      </div>

      {/* Classroom Code Share Banner */}
      <Card className="border-2 border-blue-500/20 bg-gradient-to-r from-blue-50 via-indigo-50 to-white shadow-sm">
        <CardContent className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-blue-600" />
              <h3 className="font-bold text-gray-900">Student Access Join Code</h3>
            </div>
            <p className="text-xs text-gray-600 mt-1 max-w-lg">
              Share this code with your students. Once they join with this code on their dashboard, they will automatically gain access to all exams published for this classroom.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-white px-5 py-2.5 rounded-xl border-2 border-blue-600/30 font-mono text-2xl font-black text-blue-800 tracking-widest shadow-xs">
              {classroom.code}
            </div>
            <Button onClick={copyCode} className="bg-blue-600 hover:bg-blue-700 gap-2">
              {copiedCode ? <Check className="h-4 w-4 text-green-300" /> : <Copy className="h-4 w-4" />}
              {copiedCode ? "Copied!" : "Copy Code"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Enrolled Students Card */}
        <Card className="shadow-xs">
          <CardHeader className="pb-3 border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                Enrolled Students ({students.length})
              </CardTitle>
              <Badge variant="outline">{students.length} joined</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {students.length === 0 ? (
              <div className="text-center py-10 px-4 text-gray-500">
                <Users className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm font-medium">No students have joined yet.</p>
                <p className="text-xs text-gray-400 mt-1">
                  Share class code <strong className="text-blue-700 font-mono">{classroom.code}</strong> with your students so they can join!
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
                {students.map((s, idx) => (
                  <div key={s.id} className="p-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                        {s.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-gray-900">{s.name}</div>
                        <div className="text-xs text-gray-500">{s.email}</div>
                      </div>
                    </div>
                    <span className="text-[11px] text-gray-400">
                      Joined {s.joined_at ? new Date(s.joined_at).toLocaleDateString() : "Recently"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Assigned Exams Card */}
        <Card className="shadow-xs space-y-4">
          <CardHeader className="pb-3 border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <FileText className="h-5 w-5 text-indigo-600" />
                Classroom Exams ({exams.length})
              </CardTitle>
              <Badge variant="outline">Restricted to this Class</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            {/* Quick Assign Form */}
            <div className="p-3 bg-gray-50 rounded-lg border space-y-2">
              <label className="text-xs font-semibold text-gray-700 block">
                Assign an Existing Exam to this Class
              </label>
              <div className="flex gap-2">
                <Select
                  value={selectedExamId}
                  onChange={e => setSelectedExamId(e.target.value)}
                  className="flex-1 text-xs"
                >
                  <option value="">-- Choose an Exam --</option>
                  {unassignedExams.map(e => (
                    <option key={e.id} value={e.id}>
                      {e.title} ({e.status})
                    </option>
                  ))}
                </Select>
                <Button size="sm" onClick={handleAssignExam} loading={assigning} className="shrink-0 bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-3.5 w-3.5 mr-1" /> Assign
                </Button>
              </div>
            </div>

            {/* List of Exams */}
            {exams.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileText className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm font-medium">No exams assigned to this classroom yet.</p>
                <p className="text-xs text-gray-400 mt-1">
                  Assign an existing exam above, or select this classroom when creating a new exam.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {exams.map(e => (
                  <div key={e.id} className="p-3 rounded-lg border border-gray-200 bg-white hover:border-blue-200 transition-all flex items-center justify-between">
                    <div className="flex-1 mr-3">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-gray-900">{e.title}</span>
                        <Badge variant={e.status === "PUBLISHED" ? "success" : e.status === "ONGOING" ? "warning" : "secondary"}>
                          {e.status}
                        </Badge>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {e.duration} mins · {e.total_marks} marks · {e.enrollment_count} enrolled
                      </div>
                    </div>
                    <Link href={`/examiner/exams/${e.id}`}>
                      <Button size="sm" variant="ghost" className="h-8 text-xs text-blue-600 gap-1">
                        <span>Edit</span>
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
