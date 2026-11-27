import { NextRequest } from "next/server";
import getDb from "@/lib/db";
import { getSession } from "@/lib/auth";
import { v4 as uuid } from "uuid";
import { computeExamStatus } from "../exams/route";

function shuffleArray<T>(arr: T[]): T[] {
  const s = [...arr];
  for (let i = s.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [s[i], s[j]] = [s[j], s[i]];
  }
  return s;
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { examId, isSandbox } = body;
  if (!examId) return Response.json({ error: "Exam ID required" }, { status: 400 });

  if (!isSandbox && session.role !== "CANDIDATE") {
    return Response.json({ error: "Forbidden: Candidates only" }, { status: 403 });
  }
  if (isSandbox && session.role !== "EXAMINER" && session.role !== "ADMIN") {
    return Response.json({ error: "Forbidden: Examiners only for sandbox" }, { status: 403 });
  }

  const db = getDb();
  const exam = db.prepare("SELECT * FROM exams WHERE id = ?").get(examId) as any;
  if (!exam) return Response.json({ error: "Exam not found" }, { status: 404 });

  // For non-sandbox: validate enrollment and exam availability
  if (!isSandbox) {
    const currentStatus = computeExamStatus(exam);
    if (currentStatus === "COMPLETED") {
      return Response.json({ error: "Exam window has closed and the exam is completed." }, { status: 400 });
    }
    if (currentStatus === "PUBLISHED") {
      const startTimeStr = exam.scheduled_start ? new Date(exam.scheduled_start).toLocaleString() : "the scheduled start time";
      return Response.json({ error: `Exam has not started yet. It will open at ${startTimeStr}.` }, { status: 400 });
    }
    if (currentStatus !== "ONGOING") {
      return Response.json({ error: "Exam is not currently active for participation." }, { status: 400 });
    }

    const enrollment = db.prepare("SELECT * FROM enrollments WHERE exam_id = ? AND user_id = ?").get(examId, session.id) as any;
    if (!enrollment) return Response.json({ error: "Not enrolled in this exam" }, { status: 403 });

    // Double check scheduling window against current time
    const now = new Date();
    if (exam.scheduled_start && new Date(exam.scheduled_start) > now) {
      return Response.json({ error: `Exam has not started yet. It will open at ${new Date(exam.scheduled_start).toLocaleString()}.` }, { status: 400 });
    }
    if (exam.scheduled_end && new Date(exam.scheduled_end) <= now) {
      return Response.json({ error: "Exam window has closed and the exam is completed." }, { status: 400 });
    }

    // Check max attempts
    const attemptCount = db.prepare(
      "SELECT COUNT(*) as count FROM attempts WHERE exam_id = ? AND user_id = ? AND is_sandbox = 0"
    ).get(examId, session.id) as any;
    if (attemptCount.count >= exam.max_attempts) {
      return Response.json({ error: "Maximum attempts reached" }, { status: 400 });
    }

    // Check no active attempt
    const activeAttempt = db.prepare(
      "SELECT id FROM attempts WHERE exam_id = ? AND user_id = ? AND status = 'IN_PROGRESS' AND is_sandbox = 0"
    ).get(examId, session.id) as any;
    if (activeAttempt) {
      return Response.json({ attemptId: activeAttempt.id, message: "Resuming active attempt" });
    }

    // Update enrollment status
    db.prepare("UPDATE enrollments SET status = 'STARTED' WHERE exam_id = ? AND user_id = ?").run(examId, session.id);
  }

  // Calculate server deadline
  const now = new Date();
  const deadline = new Date(now.getTime() + exam.duration * 60 * 1000);

  // If exam has scheduled_end, cap the deadline
  if (exam.scheduled_end) {
    const scheduledEnd = new Date(exam.scheduled_end);
    if (scheduledEnd < deadline) {
      deadline.setTime(scheduledEnd.getTime());
    }
  }

  // Get exam questions
  let examQuestions = db.prepare(
    "SELECT * FROM exam_questions WHERE exam_id = ? ORDER BY order_index"
  ).all(examId) as any[];

  // Always randomize questions per attempt so no two exams have the same question order
  let questionOrder: string[] = examQuestions.map((q: any) => q.id);
  questionOrder = shuffleArray(questionOrder);

  const attemptId = uuid();
  const attemptNumber = ((db.prepare(
    "SELECT MAX(attempt_number) as max_num FROM attempts WHERE exam_id = ? AND user_id = ?"
  ).get(examId, session.id) as any)?.max_num || 0) + 1;

  db.prepare(`INSERT INTO attempts (id, exam_id, user_id, attempt_number, server_deadline, is_sandbox, question_order)
    VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
    attemptId, examId, session.id, attemptNumber, deadline.toISOString(), isSandbox ? 1 : 0,
    JSON.stringify(questionOrder)
  );

  // Create answer records for all questions
  const answerStmt = db.prepare(
    "INSERT INTO answers (id, attempt_id, exam_question_id) VALUES (?, ?, ?)"
  );
  for (const eqId of questionOrder) {
    answerStmt.run(uuid(), attemptId, eqId);
  }

  // Create scratchpad
  db.prepare("INSERT INTO scratchpads (id, attempt_id) VALUES (?, ?)").run(uuid(), attemptId);

  // Update exam status to ONGOING if published
  if (exam.status === "PUBLISHED") {
    db.prepare("UPDATE exams SET status = 'ONGOING', updated_at = datetime('now') WHERE id = ?").run(examId);
  }

  return Response.json({ attemptId, deadline: deadline.toISOString(), serverTime: now.toISOString() }, { status: 201 });
}
