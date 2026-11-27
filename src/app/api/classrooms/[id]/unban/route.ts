import { NextRequest } from "next/server";
import getDb from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || (session.role !== "EXAMINER" && session.role !== "ADMIN")) {
    return Response.json({ error: "Forbidden: Only examiners and admins can unban students" }, { status: 403 });
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

  const student = db.prepare("SELECT name, email FROM users WHERE id = ?").get(userId) as any;

  // Remove from classroom_bans
  db.prepare("DELETE FROM classroom_bans WHERE classroom_id = ? AND user_id = ?").run(id, userId);

  return Response.json({
    message: `${student?.name || "Student"} has been unbanned. They may now rejoin using the class code.`,
    userId,
  });
}
