"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";

export default function NewExamPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: "", description: "", instructions: "", duration: 60, totalMarks: 100,
    passingMarks: 40, maxAttempts: 1, multipleSelectGrading: "ALL_OR_NOTHING",
    randomizeQuestions: false, randomizeOptions: false,
  });

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
