import { NextRequest } from "next/server";
import getDb from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(request: NextRequest, { params }: { params: Promise<{ examId: string; attemptId: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "EXAMINER") return Response.json({ error: "Forbidden" }, { status: 403 });
  const { examId, attemptId } = await params;

  const db = getDb();
  const attempt = db.prepare("SELECT a.*, u.name as candidate_name FROM attempts a JOIN users u ON a.user_id = u.id WHERE a.id = ?").get(attemptId) as any;
  if (!attempt) return Response.json({ error: "Attempt not found" }, { status: 404 });

  const exam = db.prepare("SELECT * FROM exams WHERE id = ?").get(examId) as any;

  const answers = db.prepare(`
    SELECT a.*, eq.marks as max_marks, eq.question_id,
      q.text as question_text, q.type as question_type, q.explanation
    FROM answers a 
    JOIN exam_questions eq ON a.exam_question_id = eq.id
    JOIN questions q ON eq.question_id = q.id 
    WHERE a.attempt_id = ?
    ORDER BY eq.order_index`).all(attemptId) as any[];

  for (const a of answers) {
    a.options = db.prepare("SELECT * FROM question_options WHERE question_id = ? ORDER BY order_index").all(a.question_id);
  }

  return Response.json({ attempt, exam, answers });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ examId: string; attemptId: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "EXAMINER") return Response.json({ error: "Forbidden" }, { status: 403 });
  const { attemptId } = await params;

  const body = await request.json();
  const { grades } = body; // Array of { answerId, marksAwarded, feedback }

  if (!Array.isArray(grades)) return Response.json({ error: "Invalid grades format" }, { status: 400 });

  const db = getDb();

  for (const grade of grades) {
    const answer = db.prepare("SELECT * FROM answers WHERE id = ?").get(grade.answerId) as any;
    if (!answer) continue;

    const eq = db.prepare(`
      SELECT eq.marks, q.type FROM exam_questions eq 
      JOIN questions q ON eq.question_id = q.id 
      WHERE eq.id = ?
    `).get(answer.exam_question_id) as any;
    if (!eq) continue;

    // MCQs are strictly auto-graded and unchangeable by the examiner
    if (eq.type !== "WRITTEN") {
      // Examiner may only leave qualitative feedback, not alter calculated marks
      if (grade.feedback !== undefined) {
        db.prepare("UPDATE answers SET examiner_feedback = ? WHERE id = ?")
          .run(grade.feedback || null, grade.answerId);
      }
      continue;
    }

    if (grade.marksAwarded > eq.marks) {
      return Response.json({ error: `Marks for written answer exceed maximum (${eq.marks})` }, { status: 400 });
    }

    const marks = Math.max(0, Number(grade.marksAwarded) || 0);

    db.prepare(`UPDATE answers SET marks_awarded = ?, examiner_feedback = ?, 
      is_correct = ?, graded_at = datetime('now') WHERE id = ?`)
      .run(marks, grade.feedback || null, marks > 0 ? 1 : 0, grade.answerId);
  }

  // Recalculate totals
  const attempt = db.prepare("SELECT * FROM attempts WHERE id = ?").get(attemptId) as any;
  const answers = db.prepare("SELECT a.*, eq.marks as max_marks FROM answers a JOIN exam_questions eq ON a.exam_question_id = eq.id WHERE a.attempt_id = ?").all(attemptId) as any[];

  let totalScore = 0;
  let maxScore = 0;
  let allGraded = true;

  for (const a of answers) {
    maxScore += a.max_marks;
    if (a.marks_awarded !== null) {
      totalScore += a.marks_awarded;
    } else {
      allGraded = false;
    }
  }

  const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 10000) / 100 : 0;
  db.prepare("UPDATE attempts SET total_score = ?, max_score = ?, percentage = ?, grading_status = ? WHERE id = ?")
    .run(Math.round(totalScore * 100) / 100, maxScore, percentage, allGraded ? "COMPLETE" : "PARTIAL", attemptId);

  return Response.json({ message: "Grades saved", totalScore, maxScore, percentage });
}
