import { NextRequest } from "next/server";
import getDb from "@/lib/db";
import { getSession } from "@/lib/auth";
import { v4 as uuid } from "uuid";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const examId = searchParams.get("examId");
  if (!examId) return Response.json({ error: "Exam ID required" }, { status: 400 });

  const db = getDb();
  const announcements = db.prepare("SELECT a.*, u.name as author_name FROM announcements a JOIN users u ON a.author_id = u.id WHERE a.exam_id = ? ORDER BY a.created_at DESC").all(examId);
  return Response.json({ announcements });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "EXAMINER") return Response.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const { examId, message, priority } = body;
  if (!examId || !message) return Response.json({ error: "Exam ID and message required" }, { status: 400 });

  const db = getDb();
  const id = uuid();
  db.prepare("INSERT INTO announcements (id, exam_id, author_id, message, priority) VALUES (?, ?, ?, ?, ?)")
    .run(id, examId, session.id, message, priority || "NORMAL");

  return Response.json({ id, message: "Announcement sent" }, { status: 201 });
}
