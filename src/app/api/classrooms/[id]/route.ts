import { NextRequest } from "next/server";
import getDb from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const db = getDb();
  const classroom = db.prepare(`
    SELECT c.*, u.name as instructor_name, u.email as instructor_email
    FROM classrooms c
    LEFT JOIN users u ON c.creator_id = u.id
    WHERE c.id = ?
  `).get(id) as any;

  if (!classroom) return Response.json({ error: "Classroom not found" }, { status: 404 });

  // Check access: must be instructor or joined student or admin
  const isInstructor = classroom.creator_id === session.id;
  const isMember = db.prepare("SELECT id FROM classroom_members WHERE classroom_id = ? AND user_id = ?").get(id, session.id);

  if (session.role !== "ADMIN" && !isInstructor && !isMember) {
    return Response.json({ error: "Forbidden: You are not a member of this classroom" }, { status: 403 });
  }

  // Enrolled students
  const students = db.prepare(`
    SELECT u.id, u.name, u.email, cm.joined_at
    FROM classroom_members cm
    JOIN users u ON cm.user_id = u.id
    WHERE cm.classroom_id = ?
    ORDER BY cm.joined_at DESC
  `).all(id);

  // Assigned exams
  let examsQuery = `
    SELECT e.*,
      (SELECT COUNT(*) FROM enrollments WHERE exam_id = e.id) as enrollment_count,
      (SELECT COUNT(*) FROM attempts WHERE exam_id = e.id AND is_sandbox = 0) as attempt_count
    FROM exams e
    WHERE e.classroom_id = ?
  `;
  if (session.role === "CANDIDATE") {
    examsQuery += " AND e.status IN ('PUBLISHED', 'ONGOING', 'COMPLETED')";
  }
  examsQuery += " ORDER BY e.created_at DESC";

  const exams = db.prepare(examsQuery).all(id);

  return Response.json({ classroom, students, exams, isInstructor });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || (session.role !== "EXAMINER" && session.role !== "ADMIN")) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;

  const db = getDb();
  const classroom = db.prepare("SELECT * FROM classrooms WHERE id = ?").get(id) as any;
  if (!classroom) return Response.json({ error: "Classroom not found" }, { status: 404 });

  if (session.role !== "ADMIN" && classroom.creator_id !== session.id) {
    return Response.json({ error: "Forbidden: You are not the owner of this classroom" }, { status: 403 });
  }

  db.prepare("DELETE FROM classrooms WHERE id = ?").run(id);

  return Response.json({ message: "Classroom deleted successfully" });
}
