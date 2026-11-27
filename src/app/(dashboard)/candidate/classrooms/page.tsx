"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import {
  School, LogIn, BookOpen, User, Calendar, ArrowRight, Sparkles, CheckCircle2
} from "lucide-react";

export default function CandidateClassroomsPage() {
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState("");
  const [joining, setJoining] = useState(false);
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

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      toast("Please enter a classroom code", "error");
      return;
    }

    setJoining(true);
    const res = await fetch("/api/classrooms/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: code.trim() }),
    });
    const d = await res.json();
    if (res.ok) {
      toast(d.message || "Successfully joined classroom!", "success");
      setCode("");
      load();
    } else {
      toast(d.error || "Failed to join classroom", "error");
    }
    setJoining(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <School className="h-6 w-6 text-blue-600" />
          My Classrooms
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Join your classes using codes provided by your examiners to access class-restricted exams.
        </p>
      </div>

      {/* Join Classroom Card */}
      <Card className="border-2 border-blue-500/20 bg-gradient-to-r from-blue-50/70 via-indigo-50/50 to-white shadow-sm">
        <CardContent className="p-6">
          <form onSubmit={handleJoin} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="flex-1">
              <label htmlFor="code" className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                Have a Class Join Code?
              </label>
              <Input
                id="code"
                placeholder="Enter 6-character code (e.g. CS101A)"
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                className="font-mono uppercase text-base tracking-widest bg-white"
                maxLength={10}
                required
              />
            </div>
            <div className="sm:self-end">
              <Button type="submit" loading={joining} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 h-10 px-6 gap-2">
                <LogIn className="h-4 w-4" />
                Join Classroom
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Joined Classrooms List */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-4">Enrolled Classrooms ({classrooms.length})</h2>

        {loading ? (
          <div className="animate-pulse py-12 text-center text-gray-400">Loading your classrooms...</div>
        ) : classrooms.length === 0 ? (
          <Card>
            <CardContent className="p-10 text-center">
              <School className="h-10 w-10 text-gray-300 mx-auto mb-2" />
              <h3 className="text-base font-semibold text-gray-700 mb-1">You haven't joined any classrooms yet</h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto mb-4">
                Ask your instructor for their classroom code and enter it above to unlock exams restricted to your class.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {classrooms.map(c => (
              <Card key={c.id} className="border border-gray-200 hover:shadow-md transition-all flex flex-col justify-between">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base font-bold text-gray-900 line-clamp-1">{c.name}</CardTitle>
                    <Badge variant="success" className="gap-1 shrink-0">
                      <CheckCircle2 className="h-3 w-3" /> Enrolled
                    </Badge>
                  </div>
                  {c.description && (
                    <CardDescription className="text-xs line-clamp-2 mt-1">{c.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2 text-xs text-gray-600 border-t pt-3">
                    <div className="flex items-center gap-2">
                      <User className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                      <span className="truncate">Instructor: <strong className="text-gray-800">{c.instructor_name}</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                      <span>Joined: {c.joined_at ? new Date(c.joined_at).toLocaleDateString() : "Recently"}</span>
                    </div>
                  </div>

                  <div className="p-2.5 bg-blue-50/60 rounded-lg border border-blue-100 flex items-center justify-between text-xs">
                    <span className="font-medium text-blue-900 flex items-center gap-1.5">
                      <BookOpen className="h-3.5 w-3.5 text-blue-600" />
                      Class Exams
                    </span>
                    <Badge variant="outline" className="bg-white text-blue-700 font-bold">
                      {c.exam_count} Available
                    </Badge>
                  </div>

                  <Link href="/candidate/exams">
                    <Button variant="outline" className="w-full justify-between text-xs font-semibold group mt-1">
                      <span>Go to My Exams</span>
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
