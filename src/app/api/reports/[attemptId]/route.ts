import { NextRequest } from "next/server";
import getDb from "@/lib/db";
import { getSession } from "@/lib/auth";
import { v4 as uuid } from "uuid";

export async function GET(request: NextRequest, { params }: { params: Promise<{ attemptId: string }> }) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { attemptId } = await params;

  const db = getDb();
  const attempt = db.prepare("SELECT a.*, u.name as candidate_name, u.email as candidate_email FROM attempts a JOIN users u ON a.user_id = u.id WHERE a.id = ?").get(attemptId) as any;
  if (!attempt) return Response.json({ error: "Attempt not found" }, { status: 404 });

  // Authorization
  if (session.role === "CANDIDATE" && attempt.user_id !== session.id) return Response.json({ error: "Forbidden" }, { status: 403 });

  const exam = db.prepare("SELECT * FROM exams WHERE id = ?").get(attempt.exam_id) as any;
  if (session.role === "CANDIDATE" && !exam.results_published) return Response.json({ error: "Results not published" }, { status: 403 });

  // Generate or get verification token
  let token = db.prepare("SELECT * FROM verification_tokens WHERE attempt_id = ?").get(attemptId) as any;
  if (!token) {
    const tokenStr = `VER-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const tokenId = uuid();
    const data = JSON.stringify({
      examTitle: exam.title, candidateName: attempt.candidate_name,
      score: attempt.total_score, maxScore: attempt.max_score, percentage: attempt.percentage,
      submittedAt: attempt.submitted_at,
    });
    db.prepare("INSERT INTO verification_tokens (id, token, exam_id, user_id, attempt_id, data) VALUES (?, ?, ?, ?, ?, ?)")
      .run(tokenId, tokenStr, exam.id, attempt.user_id, attemptId, data);
    token = { token: tokenStr, data };
  }

  return Response.json({
    exam: { title: exam.title, duration: exam.duration, total_marks: exam.total_marks },
    candidate: { name: attempt.candidate_name, email: attempt.candidate_email },
    result: { score: attempt.total_score, maxScore: attempt.max_score, percentage: attempt.percentage,
      gradingStatus: attempt.grading_status, submittedAt: attempt.submitted_at },
    verificationToken: token.token,
  });
}
