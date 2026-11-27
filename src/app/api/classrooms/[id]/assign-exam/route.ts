import { NextRequest } from "next/server";
import getDb from "@/lib/db";
import { getSession } from "@/lib/auth";
import { v4 as uuid } from "uuid";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || (session.role !== "EXAMINER" && session.role !== "ADMIN")) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;

  const body = await request.json();
  const { examId } = body;

  if (!examId) return Response.json({ error: "Exam ID is required" }, { status: 400 });

  const db = getDb();
  const classroom = db.prepare("SELECT * FROM classrooms WHERE id = ?").get(id) as any;
  if (!classroom) return Response.json({ error: "Classroom not found" }, { status: 404 });

  const exam = db.prepare("SELECT * FROM exams WHERE id = ?").get(examId) as any;
  if (!exam) return Response.json({ error: "Exam not found" }, { status: 404 });

  if (session.role !== "ADMIN" && exam.creator_id !== session.id) {
    return Response.json({ error: "Forbidden: You do not own this exam" }, { status: 403 });
  }

  // Update exam's classroom_id
  db.prepare("UPDATE exams SET classroom_id = ?, updated_at = datetime('now') WHERE id = ?").run(id, examId);

  // If exam is published/ongoing, enroll all classroom students
  if (exam.status === "PUBLISHED" || exam.status === "ONGOING") {
    const members = db.prepare("SELECT user_id FROM classroom_members WHERE classroom_id = ?").all(id) as any[];
    const enrollStmt = db.prepare("INSERT OR IGNORE INTO enrollments (id, exam_id, user_id) VALUES (?, ?, ?)");
    for (const m of members) {
      enrollStmt.run(uuid(), examId, m.user_id);
    }
  }

  return Response.json({ message: `Exam '${exam.title}' assigned to classroom '${classroom.name}' successfully.` });
}
