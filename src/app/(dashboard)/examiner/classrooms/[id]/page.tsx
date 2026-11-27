"use client";
import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import {
  School, Users, FileText, Copy, Check, ArrowLeft, Plus, ExternalLink, ShieldCheck,
  UserMinus, Ban, ShieldAlert, CheckCircle2, AlertTriangle, X
} from "lucide-react";

export default function ExaminerClassroomDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { toast } = useToast();

  const [classroom, setClassroom] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [bannedStudents, setBannedStudents] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [allMyExams, setAllMyExams] = useState<any[]>([]);
  const [selectedExamId, setSelectedExamId] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState(false);

  // Moderation state: Kick & Ban modals
  const [modalType, setModalType] = useState<"kick" | "ban" | null>(null);
  const [targetStudent, setTargetStudent] = useState<any>(null);
  const [banReason, setBanReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

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
        setBannedStudents(d.bannedStudents || []);
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

  const handleKickConfirm = async () => {
    if (!targetStudent) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/classrooms/${id}/kick`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: targetStudent.id }),
      });
      const d = await res.json();
      if (res.ok) {
        toast(d.message || `${targetStudent.name} kicked from classroom`, "success");
        setModalType(null);
        setTargetStudent(null);
        load();
      } else {
        toast(d.error || "Failed to kick student", "error");
      }
    } catch {
      toast("An error occurred while kicking the student", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleBanConfirm = async () => {
    if (!targetStudent) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/classrooms/${id}/ban`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: targetStudent.id, reason: banReason }),
      });
      const d = await res.json();
      if (res.ok) {
        toast(d.message || `${targetStudent.name} banned from classroom`, "success");
        setModalType(null);
        setTargetStudent(null);
        setBanReason("");
        load();
      } else {
        toast(d.error || "Failed to ban student", "error");
      }
    } catch {
      toast("An error occurred while banning the student", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnban = async (student: any) => {
    if (!confirm(`Are you sure you want to unban ${student.name}? They will be able to rejoin with the classroom code.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/classrooms/${id}/unban`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: student.id }),
      });
      const d = await res.json();
      if (res.ok) {
        toast(d.message || `${student.name} unbanned`, "success");
        load();
      } else {
        toast(d.error || "Failed to unban student", "error");
      }
    } catch {
      toast("An error occurred while unbanning the student", "error");
    }
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left Column: Students Management (Enrolled & Banned) */}
        <div className="space-y-6">
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
                  {students.map((s) => (
                    <div key={s.id} className="p-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                      <div className="flex items-center gap-3 min-w-0 mr-2">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                          {s.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-gray-900 truncate">{s.name}</div>
                          <div className="text-xs text-gray-500 truncate">{s.email}</div>
                          <div className="text-[11px] text-gray-400 mt-0.5">
                            Joined {s.joined_at ? new Date(s.joined_at).toLocaleDateString() : "Recently"}
                          </div>
                        </div>
                      </div>

                      {/* Moderation Actions: Kick & Ban */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 px-2.5 text-xs text-amber-700 hover:text-amber-800 hover:bg-amber-50 rounded-lg border border-transparent hover:border-amber-200"
                          onClick={() => {
                            setTargetStudent(s);
                            setModalType("kick");
                          }}
                          title={`Kick ${s.name} from class`}
                        >
                          <UserMinus className="h-3.5 w-3.5 mr-1 text-amber-600" />
                          Kick
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 px-2.5 text-xs text-rose-700 hover:text-rose-800 hover:bg-rose-50 rounded-lg border border-transparent hover:border-rose-200"
                          onClick={() => {
                            setTargetStudent(s);
                            setBanReason("");
                            setModalType("ban");
                          }}
                          title={`Ban ${s.name} permanently from class`}
                        >
                          <Ban className="h-3.5 w-3.5 mr-1 text-rose-600" />
                          Ban
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Banned Students Card */}
          {bannedStudents.length > 0 && (
            <Card className="shadow-xs border-rose-200">
              <CardHeader className="pb-3 border-b bg-rose-50/40">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-bold flex items-center gap-2 text-rose-950">
                    <ShieldAlert className="h-5 w-5 text-rose-600" />
                    Banned Students ({bannedStudents.length})
                  </CardTitle>
                  <Badge className="bg-rose-100 text-rose-800 border-rose-300 font-semibold text-xs">
                    Access Blocked
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-gray-100 max-h-72 overflow-y-auto">
                  {bannedStudents.map((b) => (
                    <div key={b.id} className="p-4 flex items-center justify-between hover:bg-rose-50/20 transition-colors">
                      <div className="flex items-center gap-3 min-w-0 mr-3">
                        <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-xs shrink-0">
                          {b.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-gray-900 flex items-center gap-1.5 truncate">
                            <span>{b.name}</span>
                            <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200">
                              Banned
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 truncate">{b.email}</div>
                          {b.reason && (
                            <div className="text-xs text-rose-700 mt-1 italic font-medium">
                              "{b.reason}"
                            </div>
                          )}
                          <div className="text-[10px] text-gray-400 mt-0.5">
                            Banned {b.banned_at ? new Date(b.banned_at).toLocaleDateString() : "Recently"}
                          </div>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-3 text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50 shrink-0 font-medium"
                        onClick={() => handleUnban(b)}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1.5 text-emerald-600" />
                        Unban
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column: Assigned Exams Card */}
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

      {/* Confirmation Modal for Kick */}
      {modalType === "kick" && targetStudent && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center">
                  <UserMinus className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">Kick Student</h3>
                  <p className="text-xs text-gray-500">Remove from classroom</p>
                </div>
              </div>
              <button
                onClick={() => { setModalType(null); setTargetStudent(null); }}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="my-5 p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-2">
              <p>
                Are you sure you want to kick <strong>{targetStudent.name}</strong> (<span className="font-mono">{targetStudent.email}</span>)?
              </p>
              <ul className="list-disc pl-4 space-y-1 text-amber-800">
                <li>They will be removed from this classroom immediately.</li>
                <li>Uncompleted exams for this classroom will be withdrawn from their dashboard.</li>
                <li>They <strong>can rejoin</strong> in the future if they enter the class join code again.</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setModalType(null); setTargetStudent(null); }}
                disabled={actionLoading}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleKickConfirm}
                loading={actionLoading}
                className="bg-amber-600 hover:bg-amber-700 text-white font-medium"
              >
                Kick Student
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Ban */}
      {modalType === "ban" && targetStudent && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center">
                  <Ban className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">Ban Student</h3>
                  <p className="text-xs text-gray-500">Block permanently from classroom</p>
                </div>
              </div>
              <button
                onClick={() => { setModalType(null); setTargetStudent(null); }}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="my-5 p-3.5 bg-rose-50/80 border border-rose-200 rounded-xl text-xs text-rose-900 space-y-2">
              <p>
                Are you sure you want to ban <strong>{targetStudent.name}</strong> (<span className="font-mono">{targetStudent.email}</span>)?
              </p>
              <ul className="list-disc pl-4 space-y-1 text-rose-800">
                <li>They will be removed from this classroom immediately.</li>
                <li>They will be <strong>permanently blocked</strong> from rejoining even if they have the class code.</li>
                <li>You can unban them at any time from the Banned Students list.</li>
              </ul>
            </div>

            <div className="space-y-1.5 mb-5">
              <label className="text-xs font-semibold text-gray-700 block">
                Ban Reason (optional)
              </label>
              <Input
                placeholder="e.g. Academic dishonesty, policy violation..."
                value={banReason}
                onChange={e => setBanReason(e.target.value)}
                className="text-xs"
                maxLength={200}
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setModalType(null); setTargetStudent(null); }}
                disabled={actionLoading}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleBanConfirm}
                loading={actionLoading}
                className="bg-rose-600 hover:bg-rose-700 text-white font-medium"
              >
                Ban Student
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
