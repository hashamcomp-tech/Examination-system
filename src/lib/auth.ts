import { getJwtSecret } from "./jwt-secret";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";


export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "EXAMINER" | "CANDIDATE";
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSession(user: SessionUser): Promise<string> {
  const token = await new SignJWT({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(getJwtSecret());

  const cookieStore = await cookies();
  cookieStore.set("session", token, {
    httpOnly: true,
    secure: false, // Must be false for http://localhost
    sameSite: "lax",
    maxAge: 60 * 60 * 24, // 24 hours
    path: "/",
  });

  return token;
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    return payload as unknown as SessionUser;
  } catch {
    return null;
  }
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete("session");
}

export async function requireAuth(
  ...roles: string[]
): Promise<SessionUser> {
  const session = await getSession();
  if (!session) {
    throw new Error("UNAUTHORIZED");
  }
  if (roles.length > 0 && !roles.includes(session.role)) {
    throw new Error("FORBIDDEN");
  }
  return session;
}

export async function requireAuthAPI(
  ...roles: string[]
): Promise<SessionUser> {
  try {
    return await requireAuth(...roles);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "UNAUTHORIZED";
    throw new Response(JSON.stringify({ error: message }), {
      status: message === "FORBIDDEN" ? 403 : 401,
      headers: { "Content-Type": "application/json" },
    });
  }
}