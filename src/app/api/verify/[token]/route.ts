import { NextRequest } from "next/server";
import getDb from "@/lib/db";

export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const db = getDb();
  const record = db.prepare("SELECT * FROM verification_tokens WHERE token = ?").get(token) as any;
  if (!record) return Response.json({ error: "Invalid verification token", valid: false }, { status: 404 });

  const data = JSON.parse(record.data);
  return Response.json({
    valid: true,
    examTitle: data.examTitle,
    candidateName: data.candidateName,
    score: data.score,
    maxScore: data.maxScore,
    percentage: data.percentage,
    submittedAt: data.submittedAt,
    verifiedAt: new Date().toISOString(),
  });
}
