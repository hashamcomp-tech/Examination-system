import { NextRequest } from "next/server";
import getDb from "@/lib/db";
import { getSession, hashPassword } from "@/lib/auth";
import { v4 as uuid } from "uuid";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || !["ADMIN", "EXAMINER"].includes(session.role)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { candidates } = body;

  if (!Array.isArray(candidates) || candidates.length === 0) {
    return Response.json({ error: "No candidates provided" }, { status: 400 });
  }

  const db = getDb();
  const results = { success: 0, errors: [] as { row: number; error: string }[] };

  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i];
    try {
      if (!c.email || !c.name) {
        results.errors.push({ row: i + 1, error: "Name and email are required" });
        continue;
      }
      const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(c.email);
      if (existing) {
        results.errors.push({ row: i + 1, error: `Email already exists: ${c.email}` });
        continue;
      }

      const password = c.password || "examina123";
      const hash = await hashPassword(password);
      const userId = uuid();
      db.prepare("INSERT INTO users (id, email, name, password_hash, role) VALUES (?, ?, ?, ?, 'CANDIDATE')").run(userId, c.email, c.name, hash);
      db.prepare("INSERT INTO user_preferences (id, user_id) VALUES (?, ?)").run(uuid(), userId);
      results.success++;
    } catch (e: any) {
      results.errors.push({ row: i + 1, error: e.message || "Unknown error" });
    }
  }

  return Response.json(results);
}
