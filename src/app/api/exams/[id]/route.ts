import { NextRequest } from "next/server";
import getDb from "@/lib/db";
import { getSession } from "@/lib/auth";
import { computeExamStatus } from "../route";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const db = getDb();
  const exam = db.prepare("SELECT * FROM exams WHERE id = ?").get(id) as any;
  if (!exam) return Response.json({ error: "Exam not found" }, { status: 404 });

  const computedStatus = computeExamStatus(exam);
  if (computedStatus !== exam.status) {
    db.prepare("UPDATE exams SET status = ? WHERE id = ?").run(computedStatus, id);
    exam.status = computedStatus;
  }

  // Authorization check
  if (session.role === "EXAMINER" && exam.creator_id !== session.id) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  if (session.role === "CANDIDATE") {
    if (exam.classroom_id) {
      const isBanned = db.prepare("SELECT id FROM classroom_bans WHERE classroom_id = ? AND user_id = ?").get(exam.classroom_id, session.id);
      if (isBanned) return Response.json({ error: "Forbidden: You have been banned from this classroom" }, { status: 403 });
      const isMember = db.prepare("SELECT id FROM classroom_members WHERE classroom_id = ? AND user_id = ?").get(exam.classroom_id, session.id);
      if (!isMember) return Response.json({ error: "Forbidden: You are not a member of this classroom" }, { status: 403 });
    }
    const enrolled = db.prepare("SELECT id FROM enrollments WHERE exam_id = ? AND user_id = ?").get(id, session.id);
    if (!enrolled) return Response.json({ error: "Not enrolled" }, { status: 403 });
  }

  // Get questions with options
  const questions = db.prepare(`
    SELECT eq.*, q.text, q.type, q.category, q.topic, q.difficulty, q.explanation
    FROM exam_questions eq
    JOIN questions q ON eq.question_id = q.id
    WHERE eq.exam_id = ?
    ORDER BY eq.order_index`).all(id) as any[];

  for (const q of questions) {
    q.options = db.prepare("SELECT * FROM question_options WHERE question_id = ? ORDER BY order_index").all(q.question_id);
    // Hide correct answers from candidates unless results are published
    if (session.role === "CANDIDATE" && !exam.results_published) {
      q.options = q.options.map((o: any) => ({ ...o, is_correct: undefined }));
      q.explanation = undefined;
    }
  }

  // Get enrollments for examiners
  let enrollments: any[] = [];
  if (session.role !== "CANDIDATE") {
    enrollments = db.prepare(`
      SELECT en.*, u.name, u.email FROM enrollments en
      JOIN users u ON en.user_id = u.id
      WHERE en.exam_id = ?`).all(id);
  }

  return Response.json({ exam, questions, enrollments });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "EXAMINER") return Response.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;

  const db = getDb();
  const exam = db.prepare("SELECT * FROM exams WHERE id = ? AND creator_id = ?").get(id, session.id) as any;
  if (!exam) return Response.json({ error: "Exam not found" }, { status: 404 });

  const body = await request.json();
  const fields = ["title", "description", "instructions", "duration", "total_marks", "passing_marks",
    "scheduled_start", "scheduled_end", "randomize_questions", "randomize_options",
    "multiple_select_grading", "negative_marking_penalty", "max_attempts", "status", "classroom_id"];

  const updates: string[] = [];
  const values: any[] = [];

  for (const field of fields) {
    const camelField = field.replace(/_([a-z])/g, (_, l) => l.toUpperCase());
    if (body[camelField] !== undefined) {
      let val = body[camelField];
      if (typeof val === "boolean") val = val ? 1 : 0;
      updates.push(`${field} = ?`);
      values.push(val);
    }
  }

  if (updates.length > 0) {
    updates.push("updated_at = datetime('now')");
    values.push(id);
    db.prepare(`UPDATE exams SET ${updates.join(", ")} WHERE id = ?`).run(...values);
  }

  // If classroom changed and exam is already published, enroll members
  if (body.classroomId) {
    const { v4: uuid } = await import("uuid");
    const members = db.prepare("SELECT user_id FROM classroom_members WHERE classroom_id = ?").all(body.classroomId) as any[];
    const enrollStmt = db.prepare("INSERT OR IGNORE INTO enrollments (id, exam_id, user_id) VALUES (?, ?, ?)");
    for (const m of members) {
      enrollStmt.run(uuid(), id, m.user_id);
    }
  }

  const updated = db.prepare("SELECT * FROM exams WHERE id = ?").get(id);
  return Response.json({ exam: updated });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "EXAMINER") return Response.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;

  const db = getDb();
  const exam = db.prepare("SELECT * FROM exams WHERE id = ? AND creator_id = ?").get(id, session.id) as any;
  if (!exam) return Response.json({ error: "Exam not found" }, { status: 404 });
  if (exam.status !== "DRAFT") return Response.json({ error: "Only draft exams can be deleted" }, { status: 400 });

  db.prepare("DELETE FROM exams WHERE id = ?").run(id);
  return Response.json({ message: "Exam deleted" });
}
