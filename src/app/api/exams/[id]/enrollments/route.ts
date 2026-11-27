import { NextRequest } from "next/server";
import getDb from "@/lib/db";
import { getSession } from "@/lib/auth";
import { v4 as uuid } from "uuid";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const db = getDb();
  const enrollments = db.prepare(`
    SELECT en.*, u.name, u.email FROM enrollments en
    JOIN users u ON en.user_id = u.id WHERE en.exam_id = ?`).all(id);

  return Response.json({ enrollments });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "EXAMINER") return Response.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;

  const body = await request.json();
  const { email, userId } = body;

  const db = getDb();
  const exam = db.prepare("SELECT * FROM exams WHERE id = ? AND creator_id = ?").get(id, session.id) as any;
  if (!exam) return Response.json({ error: "Exam not found" }, { status: 404 });

  let user: any;
  if (userId) {
    user = db.prepare("SELECT * FROM users WHERE id = ? AND role = 'CANDIDATE'").get(userId);
  } else if (email) {
    user = db.prepare("SELECT * FROM users WHERE email = ? AND role = 'CANDIDATE'").get(email);
  }

  if (!user) return Response.json({ error: "Candidate not found" }, { status: 404 });

  const existing = db.prepare("SELECT id FROM enrollments WHERE exam_id = ? AND user_id = ?").get(id, user.id);
  if (existing) return Response.json({ error: "Already enrolled" }, { status: 409 });

  const enrollmentId = uuid();
  db.prepare("INSERT INTO enrollments (id, exam_id, user_id) VALUES (?, ?, ?)").run(enrollmentId, id, user.id);

  return Response.json({ enrollment: { id: enrollmentId, user: { name: user.name, email: user.email } } }, { status: 201 });
}
