import { NextRequest } from "next/server";
import getDb from "@/lib/db";
import { verifyPassword, createSession } from "@/lib/auth";

const MAX_FAILED_ATTEMPTS = 3;
const LOCKOUT_SECONDS = 30;

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    if (!email || !password) {
      return Response.json({ error: "Email and password are required" }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const db = getDb();

    // Check rate limit / lockout for this account
    const record = db.prepare("SELECT * FROM login_rate_limits WHERE identifier = ?").get(cleanEmail) as any;

    const now = Date.now();
    if (record?.locked_until) {
      const lockExpiry = new Date(record.locked_until).getTime();
      if (lockExpiry > now) {
        const remainingSeconds = Math.ceil((lockExpiry - now) / 1000);
        return Response.json({
          error: `Too many failed login attempts. Please wait ${remainingSeconds} second${remainingSeconds === 1 ? "" : "s"} before trying again.`,
          retryAfter: remainingSeconds,
          isLocked: true,
        }, { status: 429 });
      }
    }

    const user = db.prepare("SELECT * FROM users WHERE email = ? AND is_active = 1").get(cleanEmail) as any;
    let isValid = false;
    if (user) {
      isValid = await verifyPassword(password, user.password_hash);
    }

    if (!isValid) {
      // Compute failed attempts count
      let currentFails = (record?.failed_attempts || 0) + 1;

      // If previous lock expired, reset fails count to 1
      if (record?.locked_until && new Date(record.locked_until).getTime() <= now) {
        currentFails = 1;
      }

      if (currentFails >= MAX_FAILED_ATTEMPTS) {
        const lockUntil = new Date(now + LOCKOUT_SECONDS * 1000).toISOString();
        db.prepare(`
          INSERT INTO login_rate_limits (identifier, failed_attempts, locked_until, last_attempt_at)
          VALUES (?, ?, ?, datetime('now'))
          ON CONFLICT(identifier) DO UPDATE SET
            failed_attempts = excluded.failed_attempts,
            locked_until = excluded.locked_until,
            last_attempt_at = datetime('now')
        `).run(cleanEmail, currentFails, lockUntil);

        return Response.json({
          error: `Too many failed login attempts (3/3). You must wait ${LOCKOUT_SECONDS} seconds before trying again to prevent brute-force attacks.`,
          retryAfter: LOCKOUT_SECONDS,
          isLocked: true,
        }, { status: 429 });
      } else {
        db.prepare(`
          INSERT INTO login_rate_limits (identifier, failed_attempts, locked_until, last_attempt_at)
          VALUES (?, ?, NULL, datetime('now'))
          ON CONFLICT(identifier) DO UPDATE SET
            failed_attempts = excluded.failed_attempts,
            locked_until = NULL,
            last_attempt_at = datetime('now')
        `).run(cleanEmail, currentFails);

        const remainingAttempts = MAX_FAILED_ATTEMPTS - currentFails;
        return Response.json({
          error: `Invalid email or password. (${remainingAttempts} attempt${remainingAttempts === 1 ? "" : "s"} remaining before 30-second delay lockout)`,
          remainingAttempts,
          isLocked: false,
        }, { status: 401 });
      }
    }

    // Login successful -> clear failed login attempts for this email
    db.prepare("DELETE FROM login_rate_limits WHERE identifier = ?").run(cleanEmail);

    await createSession({ id: user.id, email: user.email, name: user.name, role: user.role });

    return Response.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
  } catch (err: any) {
    console.error("Login API error:", err);
    return Response.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}
