"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { Plus, Search, Trash2 } from "lucide-react";

export default function QuestionBankPage() {
  const [questions, setQuestions] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [filter, setFilter] = useState({ search: "", category: "", type: "", difficulty: "" });
  const [showCreate, setShowCreate] = useState(false);
  const [newQ, setNewQ] = useState({ text: "", type: "MCQ_SINGLE", category: "", topic: "", difficulty: "MEDIUM", marks: 1, explanation: "", options: [{ text: "", isCorrect: false }, { text: "", isCorrect: false }] });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const load = () => {
    const params = new URLSearchParams();
    if (filter.search) params.set("search", filter.search);
    if (filter.category) params.set("category", filter.category);
    if (filter.type) params.set("type", filter.type);
    if (filter.difficulty) params.set("difficulty", filter.difficulty);
    fetch(`/api/questions?${params}`).then(r => r.json()).then(d => { setQuestions(d.questions || []); setCategories(d.categories || []); });
  };

  useEffect(() => { load(); }, [filter.category, filter.type, filter.difficulty]);

  const handleSearch = () => load();

  const handleCreate = async () => {
    if (!newQ.text || !newQ.marks) { toast("Text and marks required", "error"); return; }
    setLoading(true);
    const res = await fetch("/api/questions", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newQ),
    });
    if (res.ok) { toast("Question created!", "success"); setShowCreate(false); load(); setNewQ({ text: "", type: "MCQ_SINGLE", category: "", topic: "", difficulty: "MEDIUM", marks: 1, explanation: "", options: [{ text: "", isCorrect: false }, { text: "", isCorrect: false }] }); }
    else { const d = await res.json(); toast(d.error, "error"); }
    setLoading(false);
  };

  const addOption = () => setNewQ(q => ({ ...q, options: [...q.options, { text: "", isCorrect: false }] }));
  const updateOption = (i: number, field: string, value: any) => {
    const opts = [...newQ.options];
    (opts[i] as any)[field] = value;
    if (field === "isCorrect" && newQ.type === "MCQ_SINGLE" && value) {
      opts.forEach((o, j) => { if (j !== i) o.isCorrect = false; });
    }
    setNewQ(q => ({ ...q, options: opts }));
  };
  const removeOption = (i: number) => setNewQ(q => ({ ...q, options: q.options.filter((_, j) => j !== i) }));

  const deleteQuestion = async (id: string) => {
    const res = await fetch(`/api/questions/${id}`, { method: "DELETE" });
    if (res.ok) { toast("Deleted", "success"); load(); }
    else { const d = await res.json(); toast(d.error, "error"); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Question Bank</h1>
        <Button onClick={() => setShowCreate(!showCreate)}><Plus className="h-4 w-4" /> New Question</Button>
      </div>

      {showCreate && (
        <Card className="mb-6"><CardContent className="p-6 space-y-4">
          <h3 className="font-semibold">Create Question</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Select value={newQ.type} onChange={e => setNewQ(q => ({ ...q, type: e.target.value }))}>
              <option value="MCQ_SINGLE">Single Answer MCQ</option>
              <option value="MCQ_MULTIPLE">Multiple Select</option>
              <option value="WRITTEN">Written Response</option>
            </Select>
            <Input placeholder="Category" value={newQ.category} onChange={e => setNewQ(q => ({ ...q, category: e.target.value }))} />
            <Select value={newQ.difficulty} onChange={e => setNewQ(q => ({ ...q, difficulty: e.target.value }))}>
              <option value="EASY">Easy</option><option value="MEDIUM">Medium</option><option value="HARD">Hard</option>
            </Select>
            <Input type="number" placeholder="Marks" value={newQ.marks} onChange={e => setNewQ(q => ({ ...q, marks: parseFloat(e.target.value) }))} />
          </div>
          <Textarea placeholder="Question text..." value={newQ.text} onChange={e => setNewQ(q => ({ ...q, text: e.target.value }))} rows={3} />
          {newQ.type !== "WRITTEN" && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Options</label>
              {newQ.options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input type={newQ.type === "MCQ_SINGLE" ? "radio" : "checkbox"} name="correct" checked={opt.isCorrect} onChange={e => updateOption(i, "isCorrect", e.target.checked)} className="h-4 w-4" />
                  <Input placeholder={`Option ${i + 1}`} value={opt.text} onChange={e => updateOption(i, "text", e.target.value)} className="flex-1" />
                  {newQ.options.length > 2 && <button onClick={() => removeOption(i)} className="text-red-500"><Trash2 className="h-4 w-4" /></button>}
                </div>
              ))}
              <Button size="sm" variant="outline" onClick={addOption}>+ Add Option</Button>
            </div>
          )}
          <Textarea placeholder="Explanation (optional)" value={newQ.explanation} onChange={e => setNewQ(q => ({ ...q, explanation: e.target.value }))} rows={2} />
          <div className="flex gap-2">
            <Button onClick={handleCreate} loading={loading}>Create</Button>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
          </div>
        </CardContent></Card>
      )}

      {/* Filters */}
      <Card className="mb-6"><CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input className="pl-10" placeholder="Search..." value={filter.search} onChange={e => setFilter(f => ({ ...f, search: e.target.value }))} onKeyDown={e => e.key === "Enter" && handleSearch()} />
          </div>
          <Select className="w-36" value={filter.type} onChange={e => setFilter(f => ({ ...f, type: e.target.value }))}>
            <option value="">All Types</option><option value="MCQ_SINGLE">MCQ Single</option><option value="MCQ_MULTIPLE">MCQ Multiple</option><option value="WRITTEN">Written</option>
          </Select>
          <Select className="w-36" value={filter.difficulty} onChange={e => setFilter(f => ({ ...f, difficulty: e.target.value }))}>
            <option value="">All Levels</option><option value="EASY">Easy</option><option value="MEDIUM">Medium</option><option value="HARD">Hard</option>
          </Select>
        </div>
      </CardContent></Card>

      {/* Questions list */}
      <div className="space-y-3">
        {questions.map(q => (
          <Card key={q.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm text-gray-900">{q.text}</p>
                  <div className="flex gap-2 mt-2">
                    <Badge variant="secondary">{q.type.replace("_", " ")}</Badge>
                    <Badge variant={q.difficulty === "EASY" ? "success" : q.difficulty === "HARD" ? "destructive" : "warning"}>{q.difficulty}</Badge>
                    <Badge variant="outline">{q.marks} marks</Badge>
                    {q.category && <Badge variant="outline">{q.category}</Badge>}
                  </div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => deleteQuestion(q.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {questions.length === 0 && <p className="text-center text-gray-500 py-8">No questions found.</p>}
      </div>
    </div>
  );
}
