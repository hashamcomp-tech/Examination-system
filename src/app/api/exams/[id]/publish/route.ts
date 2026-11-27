import { NextRequest } from "next/server";
import getDb from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "EXAMINER") return Response.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;

  const db = getDb();
  const exam = db.prepare("SELECT * FROM exams WHERE id = ? AND creator_id = ?").get(id, session.id) as any;
  if (!exam) return Response.json({ error: "Exam not found" }, { status: 404 });
  if (exam.status !== "DRAFT") return Response.json({ error: "Only draft exams can be published" }, { status: 400 });

  // Validate exam has questions
  const questionCount = db.prepare("SELECT COUNT(*) as count FROM exam_questions WHERE exam_id = ?").get(id) as any;
  if (questionCount.count === 0) return Response.json({ error: "Exam must have at least one question" }, { status: 400 });

  // Snapshot questions for active attempts
  const examQuestions = db.prepare(`
    SELECT eq.id as eq_id, q.*, eq.marks as eq_marks FROM exam_questions eq
    JOIN questions q ON eq.question_id = q.id WHERE eq.exam_id = ?`).all(id) as any[];

  for (const eq of examQuestions) {
    const options = db.prepare("SELECT * FROM question_options WHERE question_id = ? ORDER BY order_index").all(eq.id);
    const snapshot = JSON.stringify({ text: eq.text, type: eq.type, options, marks: eq.eq_marks });
    db.prepare("UPDATE exam_questions SET question_snapshot = ? WHERE id = ?").run(snapshot, eq.eq_id);
  }

  db.prepare("UPDATE exams SET status = 'PUBLISHED', updated_at = datetime('now') WHERE id = ?").run(id);

  return Response.json({ message: "Exam published successfully" });
}
