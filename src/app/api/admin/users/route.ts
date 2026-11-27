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

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return Response.json({ error: "Forbidden: Admin access required" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { userId, isActive } = body;

    if (!userId || typeof isActive !== "boolean") {
      return Response.json({ error: "User ID and isActive boolean are required" }, { status: 400 });
    }

    if (userId === session.id) {
      return Response.json({ error: "You cannot deactivate your own admin account" }, { status: 400 });
    }

    const db = getDb();
    const user = db.prepare("SELECT id, name FROM users WHERE id = ?").get(userId) as any;
    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    db.prepare("UPDATE users SET is_active = ?, updated_at = datetime('now') WHERE id = ?").run(isActive ? 1 : 0, userId);

    return Response.json({
      message: `Account for ${user.name} has been ${isActive ? "activated" : "deactivated"} successfully.`,
      userId,
      isActive,
    });
  } catch (err: any) {
    return Response.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}
