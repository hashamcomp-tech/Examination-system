import { NextRequest } from "next/server";
import getDb from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const db = getDb();
  const attempt = db.prepare("SELECT * FROM attempts WHERE id = ? AND user_id = ?").get(id, session.id) as any;
  if (!attempt) return Response.json({ error: "Attempt not found" }, { status: 404 });
  if (attempt.status !== "IN_PROGRESS") return Response.json({ error: "Attempt is not active" }, { status: 400 });

  // Check deadline & exam end time (server-side timing enforcement)
  const now = new Date();
  const deadline = new Date(attempt.server_deadline);
  const exam = db.prepare("SELECT scheduled_end FROM exams WHERE id = ?").get(attempt.exam_id) as any;
  const examEnd = exam?.scheduled_end ? new Date(exam.scheduled_end) : null;
  if (now > deadline || (examEnd && now >= examEnd)) {
    return Response.json({ error: "Time has expired" }, { status: 400 });
  }

  const body = await request.json();
  const { answers } = body;

  if (!Array.isArray(answers)) return Response.json({ error: "Invalid answers format" }, { status: 400 });

  const updateStmt = db.prepare(`
    UPDATE answers SET 
      selected_option_ids = COALESCE(?, selected_option_ids),
      written_response = COALESCE(?, written_response),
      status = COALESCE(?, status),
      saved_at = datetime('now'),
      updated_at = datetime('now')
    WHERE attempt_id = ? AND exam_question_id = ?
  `);

  const savedAnswers = [];
  for (const ans of answers) {
    if (!ans.examQuestionId) continue;
    
    updateStmt.run(
      ans.selectedOptionIds ? JSON.stringify(ans.selectedOptionIds) : null,
      ans.writtenResponse ?? null,
      ans.status || null,
      id,
      ans.examQuestionId
    );
    savedAnswers.push(ans.examQuestionId);
  }

  return Response.json({ saved: savedAnswers.length, serverTime: new Date().toISOString() });
}
