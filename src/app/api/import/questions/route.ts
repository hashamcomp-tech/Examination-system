import { NextRequest } from "next/server";
import getDb from "@/lib/db";
import { getSession } from "@/lib/auth";
import { v4 as uuid } from "uuid";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "EXAMINER") return Response.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const { questions } = body; // Array of question objects

  if (!Array.isArray(questions) || questions.length === 0) {
    return Response.json({ error: "No questions provided" }, { status: 400 });
  }

  const db = getDb();
  const results = { success: 0, errors: [] as { row: number; error: string }[] };

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    try {
      if (!q.text || !q.type || !q.marks) {
        results.errors.push({ row: i + 1, error: "Missing required fields (text, type, marks)" });
        continue;
      }
      if (!["MCQ_SINGLE", "MCQ_MULTIPLE", "WRITTEN"].includes(q.type)) {
        results.errors.push({ row: i + 1, error: `Invalid type: ${q.type}` });
        continue;
      }

      const qId = uuid();
      db.prepare(`INSERT INTO questions (id, text, type, category, topic, difficulty, marks, explanation, creator_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
        qId, q.text, q.type, q.category || null, q.topic || null, q.difficulty || "MEDIUM", q.marks, q.explanation || null, session.id
      );

      if (q.options && Array.isArray(q.options)) {
        for (let j = 0; j < q.options.length; j++) {
          const opt = q.options[j];
          db.prepare("INSERT INTO question_options (id, question_id, text, is_correct, order_index) VALUES (?, ?, ?, ?, ?)")
            .run(uuid(), qId, opt.text, opt.isCorrect ? 1 : 0, j);
        }
      }
      results.success++;
    } catch (e: any) {
      results.errors.push({ row: i + 1, error: e.message || "Unknown error" });
    }
  }

  return Response.json(results);
}
