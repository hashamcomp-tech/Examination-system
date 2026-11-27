import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { getJwtSecret } from "@/lib/jwt-secret";

const publicPaths = ["/login", "/register", "/api/auth/login", "/api/auth/register", "/verify", "/api/verify"];
const roleDashboards: Record<string, string> = {
  ADMIN: "/admin",
  EXAMINER: "/examiner",
  CANDIDATE: "/candidate",
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths, static files, and API auth routes
  if (
    publicPaths.some((p) => pathname.startsWith(p)) ||
    pathname === "/" ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    // If authenticated and trying to access login/register, redirect to dashboard
    if (pathname === "/login" || pathname === "/register") {
      const token = request.cookies.get("session")?.value;
      if (token) {
        try {
          const { payload } = await jwtVerify(token, getJwtSecret());
          const role = payload.role as string;
          const dashboard = roleDashboards[role] || "/candidate";
          return NextResponse.redirect(new URL(dashboard, request.url));
        } catch {
          // Invalid token, let them proceed to login
        }
      }
    }
    return NextResponse.next();
  }

  // Check authentication for protected routes
  const token = request.cookies.get("session")?.value;
  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    const role = payload.role as string;

    // Role-based access control
    if (pathname.startsWith("/admin") && role !== "ADMIN") {
      return NextResponse.redirect(new URL(roleDashboards[role] || "/", request.url));
    }
    if (pathname.startsWith("/examiner") && role !== "EXAMINER") {
      return NextResponse.redirect(new URL(roleDashboards[role] || "/", request.url));
    }
    if (pathname.startsWith("/candidate") && role !== "CANDIDATE") {
      return NextResponse.redirect(new URL(roleDashboards[role] || "/", request.url));
    }

    // Add user info to headers for downstream use
    const response = NextResponse.next();
    response.headers.set("x-user-id", payload.id as string);
    response.headers.set("x-user-role", role);
    return response;
  } catch {
    // Invalid token
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete("session");
    return response;
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};