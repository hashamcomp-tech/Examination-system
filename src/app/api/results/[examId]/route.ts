import { NextRequest } from "next/server";
import getDb from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(request: NextRequest, { params }: { params: Promise<{ examId: string }> }) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { examId } = await params;

  const db = getDb();
  const exam = db.prepare("SELECT * FROM exams WHERE id = ?").get(examId) as any;
  if (!exam) return Response.json({ error: "Exam not found" }, { status: 404 });

  if (session.role === "CANDIDATE") {
    if (!exam.results_published) return Response.json({ error: "Results not published yet" }, { status: 403 });
    const attempt = db.prepare(`SELECT * FROM attempts WHERE exam_id = ? AND user_id = ? AND is_sandbox = 0 
      AND status IN ('SUBMITTED','AUTO_SUBMITTED','GRADED') ORDER BY attempt_number DESC LIMIT 1`).get(examId, session.id) as any;
    if (!attempt) return Response.json({ error: "No completed attempt found" }, { status: 404 });

    const answers = db.prepare(`SELECT a.*, eq.marks as max_marks, q.text as question_text, q.type as question_type
      FROM answers a JOIN exam_questions eq ON a.exam_question_id = eq.id
      JOIN questions q ON eq.question_id = q.id WHERE a.attempt_id = ?`).all(attempt.id);

    return Response.json({ exam, attempt, answers, type: "candidate" });
  }

  // Examiner view: all results
  if (exam.creator_id !== session.id && session.role !== "ADMIN") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const attempts = db.prepare(`
    SELECT a.*, u.name as candidate_name, u.email as candidate_email
    FROM attempts a JOIN users u ON a.user_id = u.id
    WHERE a.exam_id = ? AND a.is_sandbox = 0
    ORDER BY a.total_score DESC`).all(examId);

  // Statistics
  const stats = db.prepare(`
    SELECT COUNT(*) as total, AVG(percentage) as avg_pct, MIN(percentage) as min_pct, 
    MAX(percentage) as max_pct, AVG(total_score) as avg_score
    FROM attempts WHERE exam_id = ? AND is_sandbox = 0 AND status IN ('SUBMITTED','AUTO_SUBMITTED','GRADED')`).get(examId) as any;

  const passCount = exam.passing_marks ? db.prepare(
    "SELECT COUNT(*) as count FROM attempts WHERE exam_id = ? AND is_sandbox = 0 AND total_score >= ? AND status IN ('SUBMITTED','AUTO_SUBMITTED','GRADED')"
  ).get(examId, exam.passing_marks) as any : { count: 0 };

  return Response.json({
    exam, attempts, stats: { ...stats, passCount: passCount.count }, type: "examiner",
  });
}
