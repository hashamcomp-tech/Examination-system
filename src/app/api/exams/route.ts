import { NextRequest } from "next/server";
import getDb from "@/lib/db";
import { getSession } from "@/lib/auth";
import { v4 as uuid } from "uuid";

export function computeExamStatus(exam: any): "DRAFT" | "PUBLISHED" | "ONGOING" | "COMPLETED" {
  if (exam.status === "DRAFT") return "DRAFT";

  const now = new Date();

  // 1. If scheduled_end is provided:
  if (exam.scheduled_end) {
    const end = new Date(exam.scheduled_end);
    if (!isNaN(end.getTime())) {
      return now > end ? "COMPLETED" : "ONGOING";
    }
  }

  // 2. If scheduled_start is provided:
  if (exam.scheduled_start) {
    const start = new Date(exam.scheduled_start);
    if (!isNaN(start.getTime())) {
      if (now < start) {
        return "PUBLISHED";
      }
      if (exam.duration) {
        const end = new Date(start.getTime() + exam.duration * 60 * 1000);
        return now > end ? "COMPLETED" : "ONGOING";
      }
    }
  }

  // 3. Published and still has time remaining (open window):
  return "ONGOING";
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();
  const { searchParams } = new URL(request.url);
  const statusFilter = searchParams.get("status");

  let rawExams: any[];
  if (session.role === "ADMIN") {
    rawExams = db.prepare(`SELECT e.*, u.name as creator_name, c.name as classroom_name,
      (SELECT COUNT(*) FROM enrollments WHERE exam_id = e.id) as enrollment_count,
      (SELECT COUNT(*) FROM attempts WHERE exam_id = e.id AND is_sandbox = 0) as attempt_count
      FROM exams e 
      LEFT JOIN users u ON e.creator_id = u.id 
      LEFT JOIN classrooms c ON e.classroom_id = c.id
      WHERE e.is_sandbox = 0
      ORDER BY e.created_at DESC`).all();
  } else if (session.role === "EXAMINER") {
    rawExams = db.prepare(`SELECT e.*, c.name as classroom_name,
      (SELECT COUNT(*) FROM enrollments WHERE exam_id = e.id) as enrollment_count,
      (SELECT COUNT(*) FROM attempts WHERE exam_id = e.id AND is_sandbox = 0) as attempt_count
      FROM exams e 
      LEFT JOIN classrooms c ON e.classroom_id = c.id
      WHERE e.creator_id = ? AND e.is_sandbox = 0
      ORDER BY e.created_at DESC`).all(session.id);
  } else {
    rawExams = db.prepare(`SELECT e.*, u.name as creator_name, en.status as enrollment_status, c.name as classroom_name,
      (SELECT COUNT(*) FROM attempts a WHERE a.exam_id = e.id AND a.user_id = ? AND a.is_sandbox = 0) as my_attempts,
      att.total_score as my_score,
      att.max_score as my_max_score,
      att.percentage as my_percentage,
      att.status as my_attempt_status,
      att.grading_status as my_grading_status
      FROM exams e 
      INNER JOIN enrollments en ON en.exam_id = e.id AND en.user_id = ?
      LEFT JOIN users u ON e.creator_id = u.id
      LEFT JOIN classrooms c ON e.classroom_id = c.id
      LEFT JOIN attempts att ON att.id = (
        SELECT a2.id FROM attempts a2 
        WHERE a2.exam_id = e.id AND a2.user_id = ? AND a2.is_sandbox = 0 
          AND a2.status IN ('SUBMITTED','AUTO_SUBMITTED','GRADED')
        ORDER BY a2.attempt_number DESC LIMIT 1
      )
      WHERE e.is_sandbox = 0 AND e.status != 'DRAFT'
      ORDER BY e.scheduled_start ASC`).all(session.id, session.id, session.id);
  }

  // Compute status based on time: only exams whose time is up are COMPLETED, others with time remaining are ONGOING
  const updateStatusStmt = db.prepare("UPDATE exams SET status = ? WHERE id = ?");
  const exams = rawExams.map((e: any) => {
    const computedStatus = computeExamStatus(e);
    if (computedStatus !== e.status) {
      updateStatusStmt.run(computedStatus, e.id);
    }
    return { ...e, status: computedStatus };
  });

  const filteredExams = statusFilter ? exams.filter((e: any) => e.status === statusFilter) : exams;

  return Response.json({ exams: filteredExams });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "EXAMINER") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { title, description, instructions, duration, totalMarks, passingMarks,
      scheduledStart, scheduledEnd, randomizeQuestions, randomizeOptions,
      multipleSelectGrading, negativeMarkingPenalty, maxAttempts, classroomId } = body;

    if (!title || !duration || !totalMarks) {
      return Response.json({ error: "Title, duration, and total marks are required" }, { status: 400 });
    }
    if (duration < 1 || duration > 600) {
      return Response.json({ error: "Duration must be between 1 and 600 minutes" }, { status: 400 });
    }

    const db = getDb();
    const examId = uuid();

    db.prepare(`INSERT INTO exams (id, title, description, instructions, creator_id, duration, total_marks, 
      passing_marks, scheduled_start, scheduled_end, randomize_questions, randomize_options,
      multiple_select_grading, negative_marking_penalty, max_attempts, classroom_id) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      examId, title, description || null, instructions || null, session.id,
      duration, totalMarks, passingMarks || null,
      scheduledStart || null, scheduledEnd || null,
      randomizeQuestions ? 1 : 0, randomizeOptions ? 1 : 0,
      multipleSelectGrading || "ALL_OR_NOTHING",
      negativeMarkingPenalty || 0, maxAttempts || 1, classroomId || null
    );

    return Response.json({ exam: { id: examId, title, status: "DRAFT" } }, { status: 201 });
  } catch {
    return Response.json({ error: "Failed to create exam" }, { status: 500 });
  }
}
