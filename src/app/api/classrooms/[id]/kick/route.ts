import { NextRequest } from "next/server";
import getDb from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || (session.role !== "EXAMINER" && session.role !== "ADMIN")) {
    return Response.json({ error: "Forbidden: Only examiners and admins can manage classroom members" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const { userId } = body;

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

  // Get student info for confirmation message
  const student = db.prepare("SELECT name, email FROM users WHERE id = ?").get(userId) as any;
  if (!student) {
    return Response.json({ error: "Student not found" }, { status: 404 });
  }

  // Check if member of classroom
  const isMember = db.prepare("SELECT id FROM classroom_members WHERE classroom_id = ? AND user_id = ?").get(id, userId);
  if (!isMember) {
    return Response.json({ error: "User is not currently a member of this classroom" }, { status: 400 });
  }

  // 1. Remove from classroom_members
  db.prepare("DELETE FROM classroom_members WHERE classroom_id = ? AND user_id = ?").run(id, userId);

  // 2. Remove uncompleted exam enrollments belonging to this classroom
  db.prepare(`
    DELETE FROM enrollments 
    WHERE exam_id IN (SELECT id FROM exams WHERE classroom_id = ?) 
      AND user_id = ? 
      AND status != 'COMPLETED'
  `).run(id, userId);

  return Response.json({
    message: `${student.name || "Student"} has been kicked from the classroom.`,
    userId,
  });
}
