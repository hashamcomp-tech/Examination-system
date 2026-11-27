import { NextRequest } from "next/server";
import getDb from "@/lib/db";
import { getSession } from "@/lib/auth";
import { v4 as uuid } from "uuid";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const db = getDb();
  const questions = db.prepare(`
    SELECT eq.*, q.text, q.type, q.category, q.topic, q.difficulty, q.explanation
    FROM exam_questions eq JOIN questions q ON eq.question_id = q.id
    WHERE eq.exam_id = ? ORDER BY eq.order_index`).all(id) as any[];

  for (const q of questions) {
    q.options = db.prepare("SELECT * FROM question_options WHERE question_id = ? ORDER BY order_index").all(q.question_id);
  }

  return Response.json({ questions });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "EXAMINER") return Response.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;

  const body = await request.json();
  const { questionId, marks, orderIndex } = body;

  if (!questionId) return Response.json({ error: "Question ID required" }, { status: 400 });

  const db = getDb();
  const exam = db.prepare("SELECT * FROM exams WHERE id = ? AND creator_id = ?").get(id, session.id) as any;
  if (!exam) return Response.json({ error: "Exam not found" }, { status: 404 });

  const question = db.prepare("SELECT * FROM questions WHERE id = ?").get(questionId) as any;
  if (!question) return Response.json({ error: "Question not found" }, { status: 404 });

  // Check not already assigned
  const existing = db.prepare("SELECT id FROM exam_questions WHERE exam_id = ? AND question_id = ?").get(id, questionId);
  if (existing) return Response.json({ error: "Question already in exam" }, { status: 409 });

  const maxOrder = db.prepare("SELECT MAX(order_index) as max_order FROM exam_questions WHERE exam_id = ?").get(id) as any;
  const eqId = uuid();

  db.prepare("INSERT INTO exam_questions (id, exam_id, question_id, order_index, marks) VALUES (?, ?, ?, ?, ?)").run(
    eqId, id, questionId, orderIndex ?? (maxOrder?.max_order ?? -1) + 1, marks ?? question.marks
  );

  return Response.json({ id: eqId, message: "Question added" }, { status: 201 });
}
