import { NextRequest } from "next/server";
import getDb from "@/lib/db";
import { getSession } from "@/lib/auth";
import { v4 as uuid } from "uuid";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();
  let disputes;
  if (session.role === "CANDIDATE") {
    disputes = db.prepare(`SELECT d.*, e.title as exam_title FROM disputes d 
      JOIN exams e ON d.exam_id = e.id WHERE d.candidate_id = ? ORDER BY d.created_at DESC`).all(session.id);
  } else if (session.role === "EXAMINER") {
    disputes = db.prepare(`SELECT d.*, e.title as exam_title, u.name as candidate_name 
      FROM disputes d JOIN exams e ON d.exam_id = e.id JOIN users u ON d.candidate_id = u.id
      WHERE e.creator_id = ? ORDER BY d.created_at DESC`).all(session.id);
  } else {
    disputes = db.prepare(`SELECT d.*, e.title as exam_title, u.name as candidate_name 
      FROM disputes d JOIN exams e ON d.exam_id = e.id JOIN users u ON d.candidate_id = u.id
      ORDER BY d.created_at DESC`).all();
  }

  return Response.json({ disputes });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "CANDIDATE") return Response.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const { examId, type, subject, description, evidence } = body;

  if (!examId || !type || !subject || !description) {
    return Response.json({ error: "All fields are required" }, { status: 400 });
  }

  const db = getDb();
  const id = uuid();
  db.prepare(`INSERT INTO disputes (id, exam_id, candidate_id, type, subject, description, evidence)
    VALUES (?, ?, ?, ?, ?, ?, ?)`).run(id, examId, session.id, type, subject, description, evidence || null);

  return Response.json({ id, message: "Dispute filed" }, { status: 201 });
}
