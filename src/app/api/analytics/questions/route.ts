import { NextRequest } from "next/server";
import getDb from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "EXAMINER") return Response.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const examId = searchParams.get("examId");

  const db = getDb();

  let query = `
    SELECT q.id, q.text, q.type, q.category, q.difficulty, q.marks,
      COUNT(DISTINCT a.attempt_id) as total_attempts,
      SUM(CASE WHEN a.is_correct = 1 THEN 1 ELSE 0 END) as correct_count,
      SUM(CASE WHEN a.is_correct = 0 AND a.status = 'ANSWERED' THEN 1 ELSE 0 END) as incorrect_count,
      SUM(CASE WHEN a.status = 'UNANSWERED' THEN 1 ELSE 0 END) as skipped_count,
      AVG(a.marks_awarded) as avg_score
    FROM questions q
    LEFT JOIN exam_questions eq ON eq.question_id = q.id
    LEFT JOIN answers a ON a.exam_question_id = eq.id
    LEFT JOIN attempts att ON a.attempt_id = att.id AND att.is_sandbox = 0
    WHERE q.creator_id = ?`;
  
  const params: any[] = [session.id];
  if (examId) {
    query += " AND eq.exam_id = ?";
    params.push(examId);
  }
  query += " GROUP BY q.id ORDER BY q.created_at DESC";

  const analytics = db.prepare(query).all(...params);
  return Response.json({ analytics });
}
