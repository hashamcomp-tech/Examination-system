import { NextRequest } from "next/server";
import getDb from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return Response.json({ error: "Forbidden" }, { status: 403 });

  const db = getDb();
  const users = db.prepare("SELECT id, email, name, role, is_active, created_at FROM users ORDER BY created_at DESC").all();
  return Response.json({ users });
}
