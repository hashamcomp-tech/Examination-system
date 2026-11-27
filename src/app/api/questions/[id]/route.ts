import { NextRequest } from "next/server";
import getDb from "@/lib/db";
import { getSession } from "@/lib/auth";
import { v4 as uuid } from "uuid";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const db = getDb();
  const question = db.prepare("SELECT * FROM questions WHERE id = ?").get(id) as any;
  if (!question) return Response.json({ error: "Question not found" }, { status: 404 });

  question.options = db.prepare("SELECT * FROM question_options WHERE question_id = ? ORDER BY order_index").all(id);
  return Response.json({ question });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "EXAMINER") return Response.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;

  const db = getDb();
  const question = db.prepare("SELECT * FROM questions WHERE id = ? AND creator_id = ?").get(id, session.id) as any;
  if (!question) return Response.json({ error: "Question not found" }, { status: 404 });

  const body = await request.json();
  const { text, type, category, topic, difficulty, marks, explanation, options } = body;

  db.prepare(`UPDATE questions SET text = COALESCE(?, text), type = COALESCE(?, type),
    category = ?, topic = ?, difficulty = COALESCE(?, difficulty),
    marks = COALESCE(?, marks), explanation = ?, updated_at = datetime('now')
    WHERE id = ?`).run(text, type, category ?? question.category, topic ?? question.topic,
    difficulty, marks, explanation ?? question.explanation, id);

  // Update options if provided
  if (options) {
    db.prepare("DELETE FROM question_options WHERE question_id = ?").run(id);
    const stmt = db.prepare("INSERT INTO question_options (id, question_id, text, is_correct, order_index) VALUES (?, ?, ?, ?, ?)");
    options.forEach((opt: any, i: number) => {
      stmt.run(uuid(), id, opt.text, opt.isCorrect ? 1 : 0, i);
    });
  }

  return Response.json({ message: "Question updated" });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "EXAMINER") return Response.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;

  const db = getDb();
  const question = db.prepare("SELECT * FROM questions WHERE id = ? AND creator_id = ?").get(id, session.id);
  if (!question) return Response.json({ error: "Question not found" }, { status: 404 });

  // Check if used in active exams
  const inUse = db.prepare(`SELECT COUNT(*) as count FROM exam_questions eq 
    JOIN exams e ON eq.exam_id = e.id WHERE eq.question_id = ? AND e.status IN ('ONGOING')`).get(id) as any;
  if (inUse.count > 0) return Response.json({ error: "Question is used in active exams" }, { status: 400 });

  db.prepare("DELETE FROM questions WHERE id = ?").run(id);
  return Response.json({ message: "Question deleted" });
}
