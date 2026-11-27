"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";

function parseIsoToDateAndTime(isoString?: string | null): { date: string; time: string } {
  if (!isoString) return { date: "", time: "" };
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return { date: "", time: "" };
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return { date: `${year}-${month}-${day}`, time: `${hours}:${minutes}` };
  } catch {
    return { date: "", time: "" };
  }
}

function combineDateAndTime(dateStr: string, timeStr: string): string | null {
  if (!dateStr) return null;
  const time = timeStr || "00:00";
  try {
    const d = new Date(`${dateStr}T${time}:00`);
    return isNaN(d.getTime()) ? null : d.toISOString();
  } catch {
    return null;
  }
}

export default function NewExamPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [form, setForm] = useState({
    title: "", description: "", instructions: "", duration: 60, totalMarks: 100,
    passingMarks: 40, maxAttempts: 1, multipleSelectGrading: "ALL_OR_NOTHING",
    randomizeQuestions: true, randomizeOptions: true, classroomId: "",
    scheduledStart: "", scheduledEnd: "",
  });

  React.useEffect(() => {
    fetch("/api/classrooms").then(r => r.json()).then(d => setClassrooms(d.classrooms || []));
  }, []);

  const update = (f: string, v: any) => setForm(p => ({ ...p, [f]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/exams", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
    });
    const data = await res.json();
    if (res.ok) {
      toast("Exam created!", "success");
      router.push(`/examiner/exams/${data.exam.id}`);
    } else toast(data.error || "Failed", "error");
    setLoading(false);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Create New Exam</h1>
      <form onSubmit={handleSubmit}>
        <Card><CardContent className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <Input value={form.title} onChange={e => update("title", e.target.value)} required placeholder="e.g., Midterm Examination" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <Textarea value={form.description} onChange={e => update("description", e.target.value)} rows={2} placeholder="Brief description of the exam" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Instructions</label>
            <Textarea value={form.instructions} onChange={e => update("instructions", e.target.value)} rows={3} placeholder="Instructions for candidates" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Duration (min) *</label>
              <Input type="number" value={form.duration} onChange={e => update("duration", parseInt(e.target.value))} required min={1} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Total Marks *</label>
              <Input type="number" value={form.totalMarks} onChange={e => update("totalMarks", parseFloat(e.target.value))} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Passing Marks</label>
              <Input type="number" value={form.passingMarks} onChange={e => update("passingMarks", parseFloat(e.target.value))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Attempts</label>
              <Input type="number" value={form.maxAttempts} onChange={e => update("maxAttempts", parseInt(e.target.value))} min={1} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Scheduled Start (Optional)</label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Input
                    type="date"
                    value={parseIsoToDateAndTime(form.scheduledStart).date}
                    onChange={e => {
                      const parsed = parseIsoToDateAndTime(form.scheduledStart);
                      const iso = combineDateAndTime(e.target.value, parsed.time);
                      update("scheduledStart", iso || "");
                    }}
                  />
                  <span className="text-[11px] text-gray-500 mt-0.5 block">Start Date</span>
                </div>
                <div>
                  <Input
                    type="time"
                    value={parseIsoToDateAndTime(form.scheduledStart).time}
                    onChange={e => {
                      const parsed = parseIsoToDateAndTime(form.scheduledStart);
                      const iso = combineDateAndTime(parsed.date || new Date().toISOString().slice(0, 10), e.target.value);
                      update("scheduledStart", iso || "");
                    }}
                  />
                  <span className="text-[11px] text-gray-500 mt-0.5 block">Start Time</span>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-1">When students can begin taking this exam.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Scheduled End / Deadline (Optional)</label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Input
                    type="date"
                    value={parseIsoToDateAndTime(form.scheduledEnd).date}
                    onChange={e => {
                      const parsed = parseIsoToDateAndTime(form.scheduledEnd);
                      const iso = combineDateAndTime(e.target.value, parsed.time);
                      update("scheduledEnd", iso || "");
                    }}
                  />
                  <span className="text-[11px] text-gray-500 mt-0.5 block">End Date</span>
                </div>
                <div>
                  <Input
                    type="time"
                    value={parseIsoToDateAndTime(form.scheduledEnd).time}
                    onChange={e => {
                      const parsed = parseIsoToDateAndTime(form.scheduledEnd);
                      const iso = combineDateAndTime(parsed.date || new Date().toISOString().slice(0, 10), e.target.value);
                      update("scheduledEnd", iso || "");
                    }}
                  />
                  <span className="text-[11px] text-gray-500 mt-0.5 block">End Time</span>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-1">Once this time passes, the exam is marked Completed.</p>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Target Classroom (Optional)</label>
            <Select value={form.classroomId} onChange={e => update("classroomId", e.target.value)}>
              <option value="">-- No Restriction (Public / All Enrolled) --</option>
              {classrooms.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} (Code: {c.code})
                </option>
              ))}
            </Select>
            <p className="text-xs text-gray-500 mt-1">
              If selected, only students who have joined this classroom will be able to see and solve this exam.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Multi-Select Grading</label>
            <Select value={form.multipleSelectGrading} onChange={e => update("multipleSelectGrading", e.target.value)}>
              <option value="ALL_OR_NOTHING">All or Nothing</option>
              <option value="PARTIAL">Partial Credit</option>
              <option value="NEGATIVE">Negative Marking</option>
            </Select>
          </div>
          <div className="flex gap-6">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.randomizeQuestions} onChange={e => update("randomizeQuestions", e.target.checked)} className="h-4 w-4 rounded" />
              <span className="text-sm text-gray-700">Randomize Questions</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.randomizeOptions} onChange={e => update("randomizeOptions", e.target.checked)} className="h-4 w-4 rounded" />
              <span className="text-sm text-gray-700">Randomize Options</span>
            </label>
          </div>
          <div className="flex gap-3 pt-4">
            <Button type="submit" loading={loading}>Create Exam</Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
          </div>
        </CardContent></Card>
      </form>
    </div>
  );
}
