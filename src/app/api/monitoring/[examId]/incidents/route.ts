import { NextRequest } from "next/server";
import getDb from "@/lib/db";
import { getSession } from "@/lib/auth";
import { v4 as uuid } from "uuid";

export async function GET(request: NextRequest, { params }: { params: Promise<{ examId: string }> }) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { examId } = await params;

  const db = getDb();
  const incidents = db.prepare(`SELECT i.*, u.name as user_name FROM incidents i 
    JOIN users u ON i.user_id = u.id WHERE i.exam_id = ? ORDER BY i.timestamp DESC`).all(examId);
  return Response.json({ incidents });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ examId: string }> }) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { examId } = await params;

  const body = await request.json();
  const { attemptId, type, description, severity } = body;

  const db = getDb();
  const id = uuid();
  db.prepare("INSERT INTO incidents (id, attempt_id, exam_id, user_id, type, description, severity) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .run(id, attemptId || null, examId, session.id, type, description || null, severity || "LOW");

  return Response.json({ id }, { status: 201 });
}
