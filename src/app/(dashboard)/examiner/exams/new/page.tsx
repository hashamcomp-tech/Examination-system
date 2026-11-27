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

function ScheduleTimePicker({
  label,
  subLabel,
  value,
  onChange,
}: {
  label: string;
  subLabel?: string;
  value?: string | null;
  onChange: (iso: string) => void;
}) {
  const parsed = parseIsoToDateAndTime(value);
  const hour = parsed.time ? parseInt(parsed.time.split(":")[0] || "0", 10) : 0;
  const isPM = hour >= 12;
  const dateObj = value ? new Date(value) : null;
  const isPast = dateObj ? dateObj < new Date() : false;

  const handleDateChange = (date: string) => {
    const time = parsed.time || "12:00";
    onChange(combineDateAndTime(date, time) || "");
  };

  const handleTimeChange = (time: string) => {
    const date = parsed.date || new Date().toISOString().slice(0, 10);
    onChange(combineDateAndTime(date, time) || "");
  };

  const toggleAmPm = (targetAmPm: "AM" | "PM") => {
    if (!parsed.time && !parsed.date) {
      const today = new Date().toISOString().slice(0, 10);
      const time = targetAmPm === "PM" ? "12:00" : "09:00";
      onChange(combineDateAndTime(today, time) || "");
      return;
    }
    const [h, m] = (parsed.time || "12:00").split(":");
    let hNum = parseInt(h || "0", 10);
    if (targetAmPm === "PM" && hNum < 12) {
      hNum += 12;
    } else if (targetAmPm === "AM" && hNum >= 12) {
      hNum -= 12;
    }
    const newTime = `${String(hNum).padStart(2, "0")}:${m || "00"}`;
    const date = parsed.date || new Date().toISOString().slice(0, 10);
    onChange(combineDateAndTime(date, newTime) || "");
  };

  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div>
          <Input
            type="date"
            value={parsed.date}
            onChange={(e) => handleDateChange(e.target.value)}
          />
          <span className="text-[11px] text-gray-500 mt-0.5 block">Date</span>
        </div>
        <div>
          <div className="flex gap-1.5 items-center">
            <Input
              type="time"
              value={parsed.time}
              onChange={(e) => handleTimeChange(e.target.value)}
              className="flex-1"
            />
            <div className="flex rounded-md border border-gray-200 overflow-hidden shrink-0">
              <button
                type="button"
                onClick={() => toggleAmPm("AM")}
                className={`px-2 py-1 text-xs font-bold transition-colors ${
                  parsed.time && !isPM
                    ? "bg-blue-600 text-white"
                    : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                }`}
              >
                AM
              </button>
              <button
                type="button"
                onClick={() => toggleAmPm("PM")}
                className={`px-2 py-1 text-xs font-bold transition-colors ${
                  parsed.time && isPM
                    ? "bg-blue-600 text-white"
                    : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                }`}
              >
                PM
              </button>
            </div>
          </div>
          <span className="text-[11px] text-gray-500 mt-0.5 block">Time & AM/PM</span>
        </div>
      </div>

      {/* Live Preview & Past-time Safety Warning */}
      {value && dateObj && !isNaN(dateObj.getTime()) && (
        <div className={`p-2 rounded-lg text-xs flex items-center justify-between gap-2 ${
          isPast ? "bg-amber-50 text-amber-900 border border-amber-200" : "bg-blue-50/70 text-blue-900 border border-blue-100"
        }`}>
          <div>
            <span className="font-semibold">{isPast ? "⚠️ Set to past: " : "📅 Scheduled: "}</span>
            <span>{dateObj.toLocaleString()}</span>
          </div>
          {isPast && !isPM && (
            <button
              type="button"
              onClick={() => toggleAmPm("PM")}
              className="font-bold underline text-amber-800 hover:text-amber-950 shrink-0 text-[11px]"
            >
              Switch to PM
            </button>
          )}
        </div>
      )}

      {subLabel && <p className="text-xs text-gray-500 mt-0.5">{subLabel}</p>}
    </div>
  );
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
            <ScheduleTimePicker
              label="Scheduled Start (Optional)"
              subLabel="When students can begin taking this exam."
              value={form.scheduledStart}
              onChange={(iso) => update("scheduledStart", iso)}
            />
            <ScheduleTimePicker
              label="Scheduled End / Deadline (Optional)"
              subLabel="Once this time passes, the exam is marked Completed."
              value={form.scheduledEnd}
              onChange={(iso) => update("scheduledEnd", iso)}
            />
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
