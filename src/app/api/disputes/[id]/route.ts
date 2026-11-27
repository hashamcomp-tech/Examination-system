import { NextRequest } from "next/server";
import getDb from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const db = getDb();
  const dispute = db.prepare(`SELECT d.*, e.title as exam_title, u.name as candidate_name, u.email as candidate_email
    FROM disputes d JOIN exams e ON d.exam_id = e.id JOIN users u ON d.candidate_id = u.id WHERE d.id = ?`).get(id) as any;
  if (!dispute) return Response.json({ error: "Dispute not found" }, { status: 404 });

  return Response.json({ dispute });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "EXAMINER") return Response.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;

  const body = await request.json();
  const { status, resolution } = body;

  if (!status || !["UNDER_REVIEW", "RESOLVED", "REJECTED"].includes(status)) {
    return Response.json({ error: "Invalid status" }, { status: 400 });
  }

  const db = getDb();
  db.prepare("UPDATE disputes SET status = ?, resolution = ?, resolver_id = ?, updated_at = datetime('now') WHERE id = ?")
    .run(status, resolution || null, session.id, id);

  return Response.json({ message: "Dispute updated" });
}
