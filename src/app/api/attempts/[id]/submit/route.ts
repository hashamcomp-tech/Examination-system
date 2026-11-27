import { NextRequest } from "next/server";
import getDb from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const db = getDb();
  const attempt = db.prepare("SELECT * FROM attempts WHERE id = ? AND user_id = ?").get(id, session.id) as any;
  if (!attempt) return Response.json({ error: "Attempt not found" }, { status: 404 });
  if (attempt.status !== "IN_PROGRESS") return Response.json({ error: "Already submitted" }, { status: 400 });

  const now = new Date();
  const deadline = new Date(attempt.server_deadline);
  const submittedAt = now > deadline ? deadline.toISOString() : now.toISOString();
  const status = now > deadline ? "AUTO_SUBMITTED" : "SUBMITTED";

  db.prepare("UPDATE attempts SET status = ?, submitted_at = ? WHERE id = ?").run(status, submittedAt, id);

  // Update enrollment status
  db.prepare("UPDATE enrollments SET status = 'COMPLETED' WHERE exam_id = ? AND user_id = ?")
    .run(attempt.exam_id, session.id);

  // Auto-grade objective questions
  autoGradeAttempt(db, id);

  return Response.json({ message: "Exam submitted successfully", status });
}

function autoGradeAttempt(db: any, attemptId: string) {
  const attempt = db.prepare("SELECT * FROM attempts WHERE id = ?").get(attemptId) as any;
  const exam = db.prepare("SELECT * FROM exams WHERE id = ?").get(attempt.exam_id) as any;
  const answers = db.prepare("SELECT * FROM answers WHERE attempt_id = ?").all(attemptId) as any[];

  let totalScore = 0;
  let maxScore = 0;
  let hasWritten = false;

  for (const answer of answers) {
    const eq = db.prepare("SELECT * FROM exam_questions WHERE id = ?").get(answer.exam_question_id) as any;
    const question = db.prepare("SELECT * FROM questions WHERE id = ?").get(eq.question_id) as any;
    maxScore += eq.marks;

    if (question.type === "WRITTEN") {
      hasWritten = true;
      continue;
    }

    if (answer.status === "UNANSWERED" || !answer.selected_option_ids) {
      db.prepare("UPDATE answers SET is_correct = 0, marks_awarded = 0, graded_at = datetime('now') WHERE id = ?").run(answer.id);
      continue;
    }

    const selectedIds: string[] = JSON.parse(answer.selected_option_ids);
    const correctOptions = db.prepare("SELECT id FROM question_options WHERE question_id = ? AND is_correct = 1").all(eq.question_id) as any[];
    const correctIds = correctOptions.map((o: any) => o.id);

    let marksAwarded = 0;
    let isCorrect = false;

    if (question.type === "MCQ_SINGLE") {
      isCorrect = selectedIds.length === 1 && correctIds.includes(selectedIds[0]);
      marksAwarded = isCorrect ? eq.marks : 0;
    } else if (question.type === "MCQ_MULTIPLE") {
      const correctSelected = selectedIds.filter((sid: string) => correctIds.includes(sid)).length;
      const incorrectSelected = selectedIds.filter((sid: string) => !correctIds.includes(sid)).length;

      if (exam.multiple_select_grading === "ALL_OR_NOTHING") {
        isCorrect = correctSelected === correctIds.length && incorrectSelected === 0;
        marksAwarded = isCorrect ? eq.marks : 0;
      } else if (exam.multiple_select_grading === "PARTIAL") {
        const perOption = eq.marks / correctIds.length;
        marksAwarded = Math.max(0, (correctSelected - incorrectSelected) * perOption);
        isCorrect = marksAwarded > 0;
      } else if (exam.multiple_select_grading === "NEGATIVE") {
        const perOption = eq.marks / correctIds.length;
        marksAwarded = (correctSelected * perOption) - (incorrectSelected * (exam.negative_marking_penalty || perOption));
        marksAwarded = Math.max(0, marksAwarded);
        isCorrect = correctSelected === correctIds.length && incorrectSelected === 0;
      }
    }

    totalScore += marksAwarded;
    db.prepare("UPDATE answers SET is_correct = ?, marks_awarded = ?, graded_at = datetime('now') WHERE id = ?")
      .run(isCorrect ? 1 : 0, Math.round(marksAwarded * 100) / 100, answer.id);
  }

  const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 10000) / 100 : 0;
  db.prepare(`UPDATE attempts SET total_score = ?, max_score = ?, percentage = ?, grading_status = ? WHERE id = ?`)
    .run(Math.round(totalScore * 100) / 100, maxScore, percentage, hasWritten ? "PARTIAL" : "COMPLETE", attemptId);
}
