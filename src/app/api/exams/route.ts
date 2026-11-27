import { NextRequest } from "next/server";
import getDb from "@/lib/db";
import { getSession } from "@/lib/auth";
import { v4 as uuid } from "uuid";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  let exams;
  if (session.role === "ADMIN") {
    exams = db.prepare(`SELECT e.*, u.name as creator_name, 
      (SELECT COUNT(*) FROM enrollments WHERE exam_id = e.id) as enrollment_count,
      (SELECT COUNT(*) FROM attempts WHERE exam_id = e.id AND is_sandbox = 0) as attempt_count
      FROM exams e LEFT JOIN users u ON e.creator_id = u.id 
      WHERE e.is_sandbox = 0 ${status ? "AND e.status = ?" : ""} 
      ORDER BY e.created_at DESC`).all(...(status ? [status] : []));
  } else if (session.role === "EXAMINER") {
    exams = db.prepare(`SELECT e.*, 
      (SELECT COUNT(*) FROM enrollments WHERE exam_id = e.id) as enrollment_count,
      (SELECT COUNT(*) FROM attempts WHERE exam_id = e.id AND is_sandbox = 0) as attempt_count
      FROM exams e WHERE e.creator_id = ? AND e.is_sandbox = 0 ${status ? "AND e.status = ?" : ""} 
      ORDER BY e.created_at DESC`).all(session.id, ...(status ? [status] : []));
  } else {
    exams = db.prepare(`SELECT e.*, u.name as creator_name, en.status as enrollment_status,
      (SELECT COUNT(*) FROM attempts a WHERE a.exam_id = e.id AND a.user_id = ? AND a.is_sandbox = 0) as my_attempts
      FROM exams e 
      INNER JOIN enrollments en ON en.exam_id = e.id AND en.user_id = ?
      LEFT JOIN users u ON e.creator_id = u.id
      WHERE e.is_sandbox = 0 AND e.status IN ('PUBLISHED', 'ONGOING', 'COMPLETED')
      ORDER BY e.scheduled_start ASC`).all(session.id, session.id);
  }

  return Response.json({ exams });
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
      multipleSelectGrading, negativeMarkingPenalty, maxAttempts } = body;

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
      multiple_select_grading, negative_marking_penalty, max_attempts) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      examId, title, description || null, instructions || null, session.id,
      duration, totalMarks, passingMarks || null,
      scheduledStart || null, scheduledEnd || null,
      randomizeQuestions ? 1 : 0, randomizeOptions ? 1 : 0,
      multipleSelectGrading || "ALL_OR_NOTHING",
      negativeMarkingPenalty || 0, maxAttempts || 1
    );

    return Response.json({ exam: { id: examId, title, status: "DRAFT" } }, { status: 201 });
  } catch {
    return Response.json({ error: "Failed to create exam" }, { status: 500 });
  }
}
