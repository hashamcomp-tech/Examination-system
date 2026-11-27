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

  const db = getDb();
  const exam = db.prepare("SELECT * FROM exams WHERE id = ? AND creator_id = ?").get(id, session.id) as any;
  if (!exam) return Response.json({ error: "Exam not found" }, { status: 404 });
  if (exam.status !== "DRAFT") return Response.json({ error: "Can only modify questions for draft exams" }, { status: 400 });

  const body = await request.json();
  let questionId = body.questionId;
  let marks = body.marks;

  // Support creating a brand new question on the spot
  if (body.createOnTheSpot || (!questionId && body.text)) {
    const { text, type, category, topic, difficulty, explanation, options } = body;
    if (!text || !type || marks === undefined) {
      return Response.json({ error: "Text, type, and marks are required" }, { status: 400 });
    }
    if (!["MCQ_SINGLE", "MCQ_MULTIPLE", "WRITTEN"].includes(type)) {
      return Response.json({ error: "Invalid question type" }, { status: 400 });
    }
    if ((type === "MCQ_SINGLE" || type === "MCQ_MULTIPLE") && (!options || options.length < 2)) {
      return Response.json({ error: "MCQ questions need at least 2 options" }, { status: 400 });
    }

    questionId = uuid();
    db.prepare(`INSERT INTO questions (id, text, type, category, topic, difficulty, marks, explanation, creator_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      questionId, text, type, category || null, topic || null, difficulty || "MEDIUM", marks, explanation || null, session.id
    );

    if (options && options.length > 0) {
      const stmt = db.prepare("INSERT INTO question_options (id, question_id, text, is_correct, order_index) VALUES (?, ?, ?, ?, ?)");
      options.forEach((opt: any, i: number) => {
        stmt.run(uuid(), questionId, opt.text, opt.isCorrect ? 1 : 0, i);
      });
    }
  }

  if (!questionId) return Response.json({ error: "Question ID required" }, { status: 400 });

  const question = db.prepare("SELECT * FROM questions WHERE id = ?").get(questionId) as any;
  if (!question) return Response.json({ error: "Question not found" }, { status: 404 });

  // Check not already assigned
  const existing = db.prepare("SELECT id FROM exam_questions WHERE exam_id = ? AND question_id = ?").get(id, questionId);
  if (existing) return Response.json({ error: "Question already in exam" }, { status: 409 });

  const maxOrder = db.prepare("SELECT MAX(order_index) as max_order FROM exam_questions WHERE exam_id = ?").get(id) as any;
  const eqId = uuid();

  db.prepare("INSERT INTO exam_questions (id, exam_id, question_id, order_index, marks) VALUES (?, ?, ?, ?, ?)").run(
    eqId, id, questionId, body.orderIndex ?? (maxOrder?.max_order ?? -1) + 1, marks ?? question.marks
  );

  return Response.json({ id: eqId, questionId, message: "Question added to exam" }, { status: 201 });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "EXAMINER") return Response.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const examQuestionId = searchParams.get("examQuestionId");

  if (!examQuestionId) return Response.json({ error: "Exam question ID required" }, { status: 400 });

  const db = getDb();
  const exam = db.prepare("SELECT * FROM exams WHERE id = ? AND creator_id = ?").get(id, session.id) as any;
  if (!exam) return Response.json({ error: "Exam not found" }, { status: 404 });
  if (exam.status !== "DRAFT") return Response.json({ error: "Can only modify questions for draft exams" }, { status: 400 });

  db.prepare("DELETE FROM exam_questions WHERE id = ? AND exam_id = ?").run(examQuestionId, id);
  return Response.json({ message: "Question removed from exam" });
}
