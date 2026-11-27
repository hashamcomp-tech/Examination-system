"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { Upload, FileSpreadsheet, Users, CheckCircle2, AlertCircle } from "lucide-react";

export default function BulkImportPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"questions" | "candidates">("questions");
  const [jsonInput, setJsonInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const sampleQuestions = [
    {
      text: "Which of the following is a balanced binary search tree?",
      type: "MCQ_SINGLE",
      category: "Data Structures",
      topic: "Trees",
      difficulty: "MEDIUM",
      marks: 2,
      explanation: "An AVL tree is a self-balancing binary search tree.",
      options: [
        { text: "AVL Tree", isCorrect: true },
        { text: "Binary Heap", isCorrect: false },
        { text: "Trie", isCorrect: false },
        { text: "Linked List", isCorrect: false }
      ]
    },
    {
      text: "Which protocols operate at the Transport layer of the OSI model? (Select all that apply)",
      type: "MCQ_MULTIPLE",
      category: "Networking",
      topic: "OSI Model",
      difficulty: "EASY",
      marks: 3,
      explanation: "TCP and UDP operate at Layer 4.",
      options: [
        { text: "TCP", isCorrect: true },
        { text: "UDP", isCorrect: true },
        { text: "IP", isCorrect: false },
        { text: "HTTP", isCorrect: false }
      ]
    },
    {
      text: "Explain the difference between process and thread with examples.",
      type: "WRITTEN",
      category: "Operating Systems",
      topic: "Concurrency",
      difficulty: "HARD",
      marks: 5,
      explanation: "Processes have separate memory spaces; threads share memory."
    }
  ];

  const sampleCandidates = [
    { name: "Alice Walker", email: "alice@student.edu", password: "Password123!" },
    { name: "Bob Martin", email: "bob@student.edu", password: "Password123!" },
    { name: "Charlie Davis", email: "charlie@student.edu", password: "Password123!" }
  ];

  const handleLoadSample = () => {
    if (activeTab === "questions") {
      setJsonInput(JSON.stringify(sampleQuestions, null, 2));
    } else {
      setJsonInput(JSON.stringify(sampleCandidates, null, 2));
    }
  };

  const handleImport = async () => {
    if (!jsonInput.trim()) {
      toast("Please enter JSON data to import", "warning");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const parsed = JSON.parse(jsonInput);
      const endpoint = activeTab === "questions" ? "/api/import/questions" : "/api/import/candidates";
      const payloadKey = activeTab === "questions" ? "questions" : "candidates";

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [payloadKey]: Array.isArray(parsed) ? parsed : [parsed] }),
      });

      const data = await res.json();
      if (res.ok) {
        setResult(data);
        toast(`Import completed: ${data.success} succeeded, ${data.errors?.length || 0} failed`, "success");
      } else {
        toast(data.error || "Import failed", "error");
      }
    } catch {
      toast("Invalid JSON format. Please verify your syntax.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Bulk Data Import</h1>
        <p className="text-gray-500 mt-1">
          Import question bank items or candidate records in batch using structured JSON/CSV records.
        </p>
      </div>

      <div className="flex gap-2 border-b pb-2">
        <Button
          variant={activeTab === "questions" ? "default" : "outline"}
          onClick={() => { setActiveTab("questions"); setResult(null); }}
        >
          <FileSpreadsheet className="h-4 w-4 mr-2" /> Questions Import
        </Button>
        <Button
          variant={activeTab === "candidates" ? "default" : "outline"}
          onClick={() => { setActiveTab("candidates"); setResult(null); }}
        >
          <Users className="h-4 w-4 mr-2" /> Candidates Import
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>
                {activeTab === "questions" ? "Import Questions Batch" : "Import Candidates Batch"}
              </CardTitle>
              <CardDescription>
                Paste JSON array or load sample template below. Each item will be validated on the server.
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={handleLoadSample}>
              Load Sample Template
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            className="font-mono text-xs min-h-[300px]"
            placeholder={`[ \n  // Paste JSON array of ${activeTab} here\n]`}
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
          />

          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-gray-500">
              Validates schema, unique constraints, and formats prior to database insertion.
            </span>
            <Button onClick={handleImport} loading={loading}>
              <Upload className="h-4 w-4 mr-2" /> Execute Batch Import
            </Button>
          </div>

          {result && (
            <div className="mt-4 p-4 rounded-lg bg-gray-50 border">
              <div className="flex items-center gap-2 mb-2 font-medium text-sm">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>Successfully imported: {result.success} records</span>
              </div>
              {result.errors && result.errors.length > 0 && (
                <div className="mt-2 space-y-1">
                  <div className="flex items-center gap-2 text-sm text-red-600 font-medium">
                    <AlertCircle className="h-4 w-4" />
                    <span>Failed records ({result.errors.length}):</span>
                  </div>
                  <ul className="text-xs text-red-500 list-disc list-inside">
                    {result.errors.map((err: any, idx: number) => (
                      <li key={idx}>Row {err.row}: {err.error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
