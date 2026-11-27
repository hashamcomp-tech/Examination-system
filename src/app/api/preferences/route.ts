import { NextRequest } from "next/server";
import getDb from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();
  const prefs = db.prepare("SELECT * FROM user_preferences WHERE user_id = ?").get(session.id);
  return Response.json({ preferences: prefs || {} });
}

export async function PUT(request: NextRequest) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { theme, fontSize, layout, questionDisplay, showTimer, compactNav } = body;

  const db = getDb();
  db.prepare(`UPDATE user_preferences SET 
    theme = COALESCE(?, theme), font_size = COALESCE(?, font_size),
    layout = COALESCE(?, layout), question_display = COALESCE(?, question_display),
    show_timer = COALESCE(?, show_timer), compact_nav = COALESCE(?, compact_nav)
    WHERE user_id = ?`).run(
    theme, fontSize, layout, questionDisplay,
    showTimer !== undefined ? (showTimer ? 1 : 0) : null,
    compactNav !== undefined ? (compactNav ? 1 : 0) : null,
    session.id
  );

  return Response.json({ message: "Preferences updated" });
}
