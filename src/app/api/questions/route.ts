import { NextRequest } from "next/server";
import getDb from "@/lib/db";
import { getSession } from "@/lib/auth";
import { v4 as uuid } from "uuid";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const difficulty = searchParams.get("difficulty");
  const type = searchParams.get("type");
  const search = searchParams.get("search");

  let query = "SELECT * FROM questions WHERE creator_id = ?";
  const params: any[] = [session.id];

  if (category) { query += " AND category = ?"; params.push(category); }
  if (difficulty) { query += " AND difficulty = ?"; params.push(difficulty); }
  if (type) { query += " AND type = ?"; params.push(type); }
  if (search) { query += " AND text LIKE ?"; params.push(`%${search}%`); }

  query += " ORDER BY created_at DESC";

  const questions = db.prepare(query).all(...params) as any[];

  for (const q of questions) {
    q.options = db.prepare("SELECT * FROM question_options WHERE question_id = ? ORDER BY order_index").all(q.id);
  }

  // Get categories for filter
  const categories = db.prepare("SELECT DISTINCT category FROM questions WHERE creator_id = ? AND category IS NOT NULL").all(session.id);

  return Response.json({ questions, categories: categories.map((c: any) => c.category) });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "EXAMINER") return Response.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const { text, type, category, topic, difficulty, marks, explanation, options } = body;

  if (!text || !type || !marks) return Response.json({ error: "Text, type, and marks are required" }, { status: 400 });
  if (!["MCQ_SINGLE", "MCQ_MULTIPLE", "WRITTEN"].includes(type)) {
    return Response.json({ error: "Invalid question type" }, { status: 400 });
  }

  if ((type === "MCQ_SINGLE" || type === "MCQ_MULTIPLE") && (!options || options.length < 2)) {
    return Response.json({ error: "MCQ questions need at least 2 options" }, { status: 400 });
  }

  const db = getDb();
  const questionId = uuid();

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

  return Response.json({ question: { id: questionId } }, { status: 201 });
}
