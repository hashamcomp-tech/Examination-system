import { NextRequest } from "next/server";
import getDb from "@/lib/db";
import { getSession } from "@/lib/auth";
import { v4 as uuid } from "uuid";

function generateClassCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();

  if (session.role === "EXAMINER" || session.role === "ADMIN") {
    const classrooms = db.prepare(`
      SELECT c.*, 
        (SELECT COUNT(*) FROM classroom_members WHERE classroom_id = c.id) as student_count,
        (SELECT COUNT(*) FROM exams WHERE classroom_id = c.id) as exam_count
      FROM classrooms c
      WHERE c.creator_id = ? OR ? = 'ADMIN'
      ORDER BY c.created_at DESC
    `).all(session.id, session.role);

    return Response.json({ classrooms });
  } else {
    // Candidate
    const classrooms = db.prepare(`
      SELECT c.*, u.name as instructor_name, u.email as instructor_email, cm.joined_at,
        (SELECT COUNT(*) FROM exams WHERE classroom_id = c.id AND status IN ('PUBLISHED', 'ONGOING', 'COMPLETED')) as exam_count
      FROM classrooms c
      JOIN classroom_members cm ON c.id = cm.classroom_id
      LEFT JOIN users u ON c.creator_id = u.id
      WHERE cm.user_id = ?
      ORDER BY cm.joined_at DESC
    `).all(session.id);

    return Response.json({ classrooms });
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || (session.role !== "EXAMINER" && session.role !== "ADMIN")) {
    return Response.json({ error: "Forbidden: Only examiners can create classrooms" }, { status: 403 });
  }

  const body = await request.json();
  const { name, description } = body;

  if (!name || !name.trim()) {
    return Response.json({ error: "Classroom name is required" }, { status: 400 });
  }

  const db = getDb();

  // Generate unique 6-character code
  let code = "";
  let exists = true;
  let attempts = 0;
  while (exists && attempts < 10) {
    code = generateClassCode();
    const found = db.prepare("SELECT id FROM classrooms WHERE code = ?").get(code);
    if (!found) exists = false;
    attempts++;
  }

  const id = uuid();
  db.prepare(`
    INSERT INTO classrooms (id, name, code, description, creator_id)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, name.trim(), code, description?.trim() || null, session.id);

  const classroom = db.prepare("SELECT * FROM classrooms WHERE id = ?").get(id);

  return Response.json({ classroom, message: "Classroom created successfully" }, { status: 201 });
}
