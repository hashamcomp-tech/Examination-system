"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { LogIn, ShieldAlert, Clock } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState<number | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  // 30s lockout countdown timer
  useEffect(() => {
    if (countdown === null || countdown <= 0) return;
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [countdown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (countdown !== null && countdown > 0) return;

    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.retryAfter) {
          setCountdown(data.retryAfter);
        }
        setError(data.error || "Login failed");
        toast(data.error || "Login failed", "error");
        return;
      }

      setCountdown(null);
      toast("Welcome back!", "success");
      const dashboards: Record<string, string> = {
        ADMIN: "/admin",
        EXAMINER: "/examiner",
        CANDIDATE: "/candidate",
      };
      const target = dashboards[data.user.role] || "/candidate";
      window.location.href = target;
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const isLocked = countdown !== null && countdown > 0;

  return (
    <>
      <div className="text-center mb-8">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-600/20">
          <span className="text-white font-bold text-xl">E</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
        <p className="text-gray-500 mt-1">Sign in to your Examina account</p>
      </div>

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Lockout countdown warning */}
            {isLocked ? (
              <div className="bg-amber-50 border-2 border-amber-300 text-amber-900 px-4 py-3 rounded-xl text-xs space-y-1">
                <div className="flex items-center gap-2 font-bold text-sm text-amber-950">
                  <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0" />
                  Anti-Brute Force Protection Active
                </div>
                <p className="leading-relaxed">
                  3 consecutive failed login attempts detected. For security, login is temporarily delayed.
                  Please wait <strong className="font-mono text-base text-amber-950 underline">{countdown}s</strong> before trying again.
                </p>
              </div>
            ) : error ? (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            ) : null}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                Email address
              </label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLocked}
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                Password
              </label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLocked}
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              loading={loading}
              disabled={isLocked}
            >
              {isLocked ? (
                <span className="flex items-center justify-center gap-2">
                  <Clock className="h-4 w-4 animate-spin text-amber-300" />
                  Delayed ({countdown}s remaining)
                </span>
              ) : (
                <>
                  <LogIn className="h-4 w-4 mr-2" />
                  Sign in
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-500">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="font-medium text-blue-600 hover:text-blue-700">
              Create one
            </Link>
          </div>

          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-xs font-medium text-gray-500 mb-2">Demo Credentials</p>
            <div className="space-y-1 text-xs text-gray-600">
              <p><strong>Admin:</strong> admin@examina.com / password123</p>
              <p><strong>Examiner:</strong> examiner@examina.com / password123</p>
              <p><strong>Candidate:</strong> candidate@examina.com / password123</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
