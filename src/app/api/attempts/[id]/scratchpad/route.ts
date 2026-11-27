import { NextRequest } from "next/server";
import getDb from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const db = getDb();
  const scratchpad = db.prepare("SELECT * FROM scratchpads WHERE attempt_id = ?").get(id) as any;
  return Response.json({ scratchpad: scratchpad || { content: "" } });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const body = await request.json();
  const db = getDb();

  db.prepare("UPDATE scratchpads SET content = ?, updated_at = datetime('now') WHERE attempt_id = ?")
    .run(body.content || "", id);

  return Response.json({ saved: true });
}
