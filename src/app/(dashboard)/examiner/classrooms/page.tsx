"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import {
  School, Plus, Users, FileText, Copy, Check, Trash2, ArrowRight, Sparkles
} from "lucide-react";

export default function ExaminerClassroomsPage() {
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const { toast } = useToast();

  const load = () => {
    fetch("/api/classrooms")
      .then(r => r.json())
      .then(d => {
        setClassrooms(d.classrooms || []);
        setLoading(false);
      });
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast("Please enter a classroom name", "error");
      return;
    }

    setCreating(true);
    const res = await fetch("/api/classrooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description }),
    });
    const d = await res.json();
    if (res.ok) {
      toast("Classroom created successfully!", "success");
      setName("");
      setDescription("");
      setShowCreate(false);
      load();
    } else {
      toast(d.error || "Failed to create classroom", "error");
    }
    setCreating(false);
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast(`Class code ${code} copied to clipboard! Give it to your students.`, "success");
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const handleDelete = async (id: string, className: string) => {
    if (!confirm(`Are you sure you want to delete classroom "${className}"?`)) return;
    const res = await fetch(`/api/classrooms/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast("Classroom deleted", "success");
      load();
    } else {
      toast("Failed to delete classroom", "error");
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <School className="h-6 w-6 text-blue-600" />
            Classrooms
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Organize students into classes. When you publish an exam to a classroom, only enrolled students can view and take it.
          </p>
        </div>
        <Button onClick={() => setShowCreate(!showCreate)} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-1.5" />
          {showCreate ? "Cancel" : "Create Classroom"}
        </Button>
      </div>

      {/* Create Classroom Form Card */}
      {showCreate && (
        <Card className="mb-6 border-2 border-blue-500/30 shadow-md animate-in fade-in duration-200">
          <CardHeader className="bg-blue-50/50 pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2 text-blue-950">
              <Sparkles className="h-4 w-4 text-blue-600" />
              New Classroom
            </CardTitle>
            <CardDescription>
              A unique 6-character code will be generated for students to join this class.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Class Name *</label>
                <Input
                  placeholder="e.g. Computer Science 101 - Section A"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Subject / Description (Optional)</label>
                <Textarea
                  placeholder="e.g. Algorithms, Data Structures and Database Systems"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={2}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="submit" loading={creating} className="bg-blue-600 hover:bg-blue-700">
                  Generate Class Code & Create
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Classroom Cards Grid */}
      {loading ? (
        <div className="animate-pulse py-12 text-center text-gray-400">Loading classrooms...</div>
      ) : classrooms.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <School className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-gray-800 mb-1">No Classrooms Created Yet</h3>
            <p className="text-sm text-gray-500 max-w-md mx-auto mb-5">
              Create your first classroom to generate a join code. Share the code with your students so they can join and take exams restricted to your class.
            </p>
            <Button onClick={() => setShowCreate(true)} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-1.5" /> Create Classroom
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classrooms.map(c => (
            <Card key={c.id} className="hover:shadow-md transition-all border border-gray-200 flex flex-col justify-between">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-lg font-bold text-gray-900 line-clamp-1">{c.name}</CardTitle>
                    {c.description && (
                      <CardDescription className="line-clamp-2 mt-1 text-xs">{c.description}</CardDescription>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(c.id, c.name)}
                    className="p-1.5 text-gray-400 hover:text-red-600 rounded transition-colors"
                    title="Delete classroom"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Join Code Box */}
                <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-semibold text-blue-700 uppercase tracking-wider">Student Join Code</div>
                    <div className="text-xl font-mono font-bold text-blue-900 tracking-wider mt-0.5">{c.code}</div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="bg-white hover:bg-blue-50 border-blue-200 text-blue-700 h-8 gap-1.5 text-xs shadow-xs"
                    onClick={() => copyCode(c.code)}
                  >
                    {copiedCode === c.code ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-green-600" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </Button>
                </div>

                {/* Class Stats */}
                <div className="flex items-center justify-between text-xs text-gray-600 pt-1">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Users className="h-3.5 w-3.5 text-gray-400" />
                    {c.student_count} Student{c.student_count !== 1 ? "s" : ""}
                  </span>
                  <span className="flex items-center gap-1.5 font-medium">
                    <FileText className="h-3.5 w-3.5 text-gray-400" />
                    {c.exam_count} Exam{c.exam_count !== 1 ? "s" : ""}
                  </span>
                </div>

                {/* Link to detail */}
                <Link href={`/examiner/classrooms/${c.id}`}>
                  <Button variant="outline" className="w-full justify-between text-xs font-semibold group mt-2">
                    <span>Manage Students & Exams</span>
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
