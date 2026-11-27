import { NextRequest } from "next/server";
import getDb from "@/lib/db";
import { getSession } from "@/lib/auth";

function seededShuffle<T>(arr: T[], seedStr: string): T[] {
  let seed = 0;
  for (let i = 0; i < seedStr.length; i++) {
    seed = (seed * 31 + seedStr.charCodeAt(i)) >>> 0;
  }
  const s = [...arr];
  for (let i = s.length - 1; i > 0; i--) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const j = seed % (i + 1);
    [s[i], s[j]] = [s[j], s[i]];
  }
  return s;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const db = getDb();
  const attempt = db.prepare("SELECT * FROM attempts WHERE id = ?").get(id) as any;
  if (!attempt) return Response.json({ error: "Attempt not found" }, { status: 404 });

  // Authorization: candidate sees own, examiner sees own exams'
  if (session.role === "CANDIDATE" && attempt.user_id !== session.id) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  if (session.role === "EXAMINER") {
    const exam = db.prepare("SELECT creator_id FROM exams WHERE id = ?").get(attempt.exam_id) as any;
    if (exam?.creator_id !== session.id) return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const exam = db.prepare("SELECT * FROM exams WHERE id = ?").get(attempt.exam_id) as any;

  // Check if attempt is expired OR exam end time has passed and auto-finalize
  const now = new Date();
  const deadline = new Date(attempt.server_deadline);
  const examEnd = exam?.scheduled_end ? new Date(exam.scheduled_end) : null;
  const isTimeUp = now > deadline || (examEnd && now >= examEnd);

  if (attempt.status === "IN_PROGRESS" && isTimeUp) {
    const finalSubmitTime = (examEnd && examEnd < deadline ? examEnd : deadline).toISOString();
    db.prepare("UPDATE attempts SET status = 'AUTO_SUBMITTED', submitted_at = ? WHERE id = ?")
      .run(finalSubmitTime, id);
    attempt.status = "AUTO_SUBMITTED";
    attempt.submitted_at = finalSubmitTime;
    // Auto-grade
    autoGradeAttempt(db, id);
  }

  // Get questions in order
  const questionOrder: string[] = attempt.question_order ? JSON.parse(attempt.question_order) : [];
  const examQuestions = db.prepare(`
    SELECT eq.*, q.text, q.type, q.category, q.difficulty
    FROM exam_questions eq JOIN questions q ON eq.question_id = q.id
    WHERE eq.exam_id = ?`).all(attempt.exam_id) as any[];

  // Order questions
  const orderedQuestions = questionOrder.length > 0
    ? questionOrder.map((eqId: string) => examQuestions.find((q: any) => q.id === eqId)).filter(Boolean)
    : examQuestions;

  // Add options (always shuffle options uniquely per attempt + question so no two exams have the same choices order)
  for (const q of orderedQuestions) {
    let options = db.prepare("SELECT * FROM question_options WHERE question_id = ? ORDER BY order_index").all(q.question_id) as any[];
    // Shuffled with deterministic attempt seed: unique to this student attempt, but stable across page reloads
    options = seededShuffle(options, `${attempt.id}_${q.question_id}`);
    
    // Hide correct answers during active attempt
    if (attempt.status === "IN_PROGRESS" || (!exam.results_published && session.role === "CANDIDATE")) {
      options = options.map((o: any) => ({ id: o.id, text: o.text, order_index: o.order_index, question_id: o.question_id }));
    }
    q.options = options;
  }

  // Get answers
  const answers = db.prepare("SELECT * FROM answers WHERE attempt_id = ?").all(id) as any[];

  // Get announcements
  const announcements = db.prepare(
    "SELECT * FROM announcements WHERE exam_id = ? ORDER BY created_at DESC"
  ).all(attempt.exam_id);

  const serverTime = new Date().toISOString();
  let effectiveDeadline = deadline;
  if (examEnd && examEnd < deadline) {
    effectiveDeadline = examEnd;
  }
  const remainingSeconds = Math.max(0, Math.floor((effectiveDeadline.getTime() - now.getTime()) / 1000));

  return Response.json({
    attempt,
    exam,
    questions: orderedQuestions,
    answers,
    announcements,
    serverTime,
    remainingSeconds,
  });
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
      continue; // Skip auto-grading for written
    }

    if (answer.status === "UNANSWERED" || !answer.selected_option_ids) {
      db.prepare("UPDATE answers SET is_correct = 0, marks_awarded = 0, graded_at = datetime('now') WHERE id = ?").run(answer.id);
      continue;
    }

    const selectedIds: string[] = JSON.parse(answer.selected_option_ids);
    const correctOptions = db.prepare("SELECT id FROM question_options WHERE question_id = ? AND is_correct = 1").all(eq.question_id) as any[];
    const correctIds = correctOptions.map((o: any) => o.id);
    const allOptions = db.prepare("SELECT id FROM question_options WHERE question_id = ?").all(eq.question_id) as any[];

    let marksAwarded = 0;
    let isCorrect = false;

    if (question.type === "MCQ_SINGLE") {
      isCorrect = selectedIds.length === 1 && correctIds.includes(selectedIds[0]);
      marksAwarded = isCorrect ? eq.marks : 0;
    } else if (question.type === "MCQ_MULTIPLE") {
      const correctSelected = selectedIds.filter((id: string) => correctIds.includes(id)).length;
      const incorrectSelected = selectedIds.filter((id: string) => !correctIds.includes(id)).length;

      if (exam.multiple_select_grading === "ALL_OR_NOTHING") {
        isCorrect = correctSelected === correctIds.length && incorrectSelected === 0;
        marksAwarded = isCorrect ? eq.marks : 0;
      } else if (exam.multiple_select_grading === "PARTIAL") {
        const perOption = eq.marks / correctIds.length;
        marksAwarded = Math.max(0, (correctSelected * perOption) - (incorrectSelected * perOption));
        isCorrect = marksAwarded > 0;
      } else if (exam.multiple_select_grading === "NEGATIVE") {
        const perOption = eq.marks / correctIds.length;
        marksAwarded = (correctSelected * perOption) - (incorrectSelected * (exam.negative_marking_penalty || perOption));
        marksAwarded = Math.max(0, marksAwarded); // Floor at 0
        isCorrect = correctSelected === correctIds.length && incorrectSelected === 0;
      }
    }

    totalScore += marksAwarded;
    db.prepare("UPDATE answers SET is_correct = ?, marks_awarded = ?, graded_at = datetime('now') WHERE id = ?")
      .run(isCorrect ? 1 : 0, Math.round(marksAwarded * 100) / 100, answer.id);
  }

  const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 10000) / 100 : 0;
  const gradingStatus = hasWritten ? "PARTIAL" : "COMPLETE";

  db.prepare(`UPDATE attempts SET total_score = ?, max_score = ?, percentage = ?, grading_status = ? WHERE id = ?`)
    .run(Math.round(totalScore * 100) / 100, maxScore, percentage, gradingStatus, attemptId);
}
