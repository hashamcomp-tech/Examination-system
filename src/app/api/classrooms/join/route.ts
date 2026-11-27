import { NextRequest } from "next/server";
import getDb from "@/lib/db";
import { getSession } from "@/lib/auth";
import { v4 as uuid } from "uuid";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "CANDIDATE") {
    return Response.json({ error: "Only candidates/students can join classrooms" }, { status: 403 });
  }

  const body = await request.json();
  const { code } = body;

  if (!code || !code.trim()) {
    return Response.json({ error: "Classroom join code is required" }, { status: 400 });
  }

  const cleanCode = code.trim().toUpperCase();
  const db = getDb();

  const classroom = db.prepare("SELECT * FROM classrooms WHERE code = ?").get(cleanCode) as any;
  if (!classroom) {
    return Response.json({ error: "Invalid class code. No classroom found with code: " + cleanCode }, { status: 404 });
  }

  // Check if already a member
  const existing = db.prepare("SELECT id FROM classroom_members WHERE classroom_id = ? AND user_id = ?").get(classroom.id, session.id);
  if (existing) {
    return Response.json({ error: "You have already joined this classroom (" + classroom.name + ")" }, { status: 409 });
  }

  // Join classroom
  const memberId = uuid();
  db.prepare("INSERT INTO classroom_members (id, classroom_id, user_id) VALUES (?, ?, ?)").run(memberId, classroom.id, session.id);

  // Automatically enroll candidate into all published/ongoing exams in this classroom
  const activeExams = db.prepare(`
    SELECT id FROM exams 
    WHERE classroom_id = ? AND status IN ('PUBLISHED', 'ONGOING')
  `).all(classroom.id) as any[];

  const enrollStmt = db.prepare("INSERT OR IGNORE INTO enrollments (id, exam_id, user_id) VALUES (?, ?, ?)");
  for (const ex of activeExams) {
    enrollStmt.run(uuid(), ex.id, session.id);
  }

  return Response.json({
    message: `Successfully joined ${classroom.name}!`,
    classroom: {
      id: classroom.id,
      name: classroom.name,
      code: classroom.code,
      description: classroom.description,
    },
    examsUnlocked: activeExams.length,
  });
}
