import { NextRequest } from "next/server";
import getDb from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(request: NextRequest, { params }: { params: Promise<{ examId: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "EXAMINER") return Response.json({ error: "Forbidden" }, { status: 403 });
  const { examId } = await params;

  const db = getDb();
  const exam = db.prepare("SELECT * FROM exams WHERE id = ? AND creator_id = ?").get(examId, session.id) as any;
  if (!exam) return Response.json({ error: "Exam not found" }, { status: 404 });

  // Active attempts with progress
  const attempts = db.prepare(`
    SELECT a.*, u.name as candidate_name, u.email as candidate_email,
      (SELECT COUNT(*) FROM answers WHERE attempt_id = a.id AND status = 'ANSWERED') as answered_count,
      (SELECT COUNT(*) FROM answers WHERE attempt_id = a.id) as total_questions,
      (SELECT COUNT(*) FROM incidents WHERE attempt_id = a.id) as incident_count
    FROM attempts a JOIN users u ON a.user_id = u.id
    WHERE a.exam_id = ? AND a.is_sandbox = 0
    ORDER BY a.started_at DESC`).all(examId);

  const incidents = db.prepare(`
    SELECT i.*, u.name as user_name FROM incidents i 
    JOIN users u ON i.user_id = u.id 
    WHERE i.exam_id = ? ORDER BY i.timestamp DESC LIMIT 50`).all(examId);

  const announcements = db.prepare("SELECT * FROM announcements WHERE exam_id = ? ORDER BY created_at DESC").all(examId);

  return Response.json({ exam, attempts, incidents, announcements, serverTime: new Date().toISOString() });
}
