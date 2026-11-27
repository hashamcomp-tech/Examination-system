import { NextRequest } from "next/server";
import getDb from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function POST(request: NextRequest, { params }: { params: Promise<{ examId: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "EXAMINER") return Response.json({ error: "Forbidden" }, { status: 403 });
  const { examId } = await params;

  const db = getDb();
  const exam = db.prepare("SELECT * FROM exams WHERE id = ? AND creator_id = ?").get(examId, session.id) as any;
  if (!exam) return Response.json({ error: "Exam not found" }, { status: 404 });

  db.prepare("UPDATE exams SET results_published = 1, status = 'COMPLETED', updated_at = datetime('now') WHERE id = ?").run(examId);

  return Response.json({ message: "Results published" });
}
