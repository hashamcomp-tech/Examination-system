import { NextRequest } from "next/server";
import getDb from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { v4 as uuid } from "uuid";

export async function POST(request: NextRequest) {
  try {
    const { email, name, password, role } = await request.json();

    if (!email || !name || !password) {
      return Response.json({ error: "Email, name, and password are required" }, { status: 400 });
    }
    if (password.length < 6) {
      return Response.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return Response.json({ error: "Invalid email format" }, { status: 400 });
    }

    const userRole = role && ["EXAMINER", "CANDIDATE"].includes(role) ? role : "CANDIDATE";

    const db = getDb();
    const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
    if (existing) {
      return Response.json({ error: "Email already registered" }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const userId = uuid();

    db.prepare(
      "INSERT INTO users (id, email, name, password_hash, role) VALUES (?, ?, ?, ?, ?)"
    ).run(userId, email, name, passwordHash, userRole);

    db.prepare("INSERT INTO user_preferences (id, user_id) VALUES (?, ?)").run(uuid(), userId);

    return Response.json({
      user: { id: userId, email, name, role: userRole },
      message: "Registration successful",
    }, { status: 201 });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
