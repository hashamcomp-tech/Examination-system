import { NextRequest } from "next/server";
import getDb from "@/lib/db";
import { getSession } from "@/lib/auth";
import { v4 as uuid } from "uuid";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || (session.role !== "EXAMINER" && session.role !== "ADMIN")) {
    return Response.json({ error: "Forbidden: Only examiners and admins can ban students" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const { userId, reason } = body;

  if (!userId) {
    return Response.json({ error: "User ID is required" }, { status: 400 });
  }

  const db = getDb();
  const classroom = db.prepare("SELECT * FROM classrooms WHERE id = ?").get(id) as any;
  if (!classroom) {
    return Response.json({ error: "Classroom not found" }, { status: 404 });
  }

  if (session.role !== "ADMIN" && classroom.creator_id !== session.id) {
    return Response.json({ error: "Forbidden: You are not the instructor of this classroom" }, { status: 403 });
  }

  const student = db.prepare("SELECT name, email FROM users WHERE id = ?").get(userId) as any;
  if (!student) {
    return Response.json({ error: "Student not found" }, { status: 404 });
  }

  // 1. Record ban in classroom_bans
  const banId = uuid();
  const banReason = reason && reason.trim() ? reason.trim() : "Banned by instructor";
  db.prepare(`
    INSERT INTO classroom_bans (id, classroom_id, user_id, banned_by, reason, banned_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(classroom_id, user_id) DO UPDATE SET
      banned_by = excluded.banned_by,
      reason = excluded.reason,
      banned_at = datetime('now')
  `).run(banId, id, userId, session.id, banReason);

  // 2. Remove from classroom_members if present
  db.prepare("DELETE FROM classroom_members WHERE classroom_id = ? AND user_id = ?").run(id, userId);

  // 3. Remove uncompleted exam enrollments belonging to this classroom
  db.prepare(`
    DELETE FROM enrollments 
    WHERE exam_id IN (SELECT id FROM exams WHERE classroom_id = ?) 
      AND user_id = ? 
      AND status != 'COMPLETED'
  `).run(id, userId);

  return Response.json({
    message: `${student.name || "Student"} has been banned from the classroom.`,
    userId,
  });
}
