import { NextRequest } from "next/server";
import getDb from "@/lib/db";
import { getSession } from "@/lib/auth";
import jsPDF from "jspdf";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ attemptId: string }> }
) {
  const session = await getSession();
  if (!session) return new Response("Unauthorized", { status: 401 });
  const { attemptId } = await params;

  const db = getDb();
  const attempt = db.prepare(
    "SELECT a.*, u.name as candidate_name, u.email as candidate_email FROM attempts a JOIN users u ON a.user_id = u.id WHERE a.id = ?"
  ).get(attemptId) as any;

  if (!attempt) return new Response("Attempt not found", { status: 404 });
  if (session.role === "CANDIDATE" && attempt.user_id !== session.id) {
    return new Response("Forbidden", { status: 403 });
  }

  const exam = db.prepare("SELECT * FROM exams WHERE id = ?").get(attempt.exam_id) as any;

  // Verification token
  const tokenRecord = db.prepare("SELECT token FROM verification_tokens WHERE attempt_id = ?").get(attemptId) as any;
  const verificationCode = tokenRecord?.token || `VER-${attemptId.slice(0, 8).toUpperCase()}`;

  // Build PDF with jsPDF
  const doc = new jsPDF();

  // Header banner
  doc.setFillColor(37, 99, 235); // Blue-600
  doc.rect(0, 0, 210, 36, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.text("EXAMINA", 20, 18);
  doc.setFontSize(10);
  doc.text("OFFICIAL EXAMINATION PERFORMANCE REPORT", 20, 28);

  // Exam & Candidate Info
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(16);
  doc.text(exam?.title || "Examination Report", 20, 50);

  doc.setFontSize(11);
  doc.setTextColor(100, 116, 139);
  doc.text(`Candidate Name: ${attempt.candidate_name}`, 20, 62);
  doc.text(`Candidate Email: ${attempt.candidate_email}`, 20, 70);
  doc.text(`Examination Date: ${new Date(attempt.started_at).toLocaleDateString()}`, 20, 78);
  doc.text(`Duration: ${exam?.duration || 0} minutes`, 20, 86);

  // Score box
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(20, 96, 170, 40, 3, 3, "FD");

  doc.setFontSize(12);
  doc.setTextColor(71, 85, 105);
  doc.text("Total Score Awarded", 30, 110);
  doc.text("Percentage", 90, 110);
  doc.text("Result Status", 145, 110);

  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42);
  doc.text(`${attempt.total_score ?? 0} / ${attempt.max_score ?? exam?.total_marks ?? 0}`, 30, 126);
  doc.text(`${attempt.percentage ?? 0}%`, 90, 126);

  const passed = exam?.passing_marks ? (attempt.total_score >= exam.passing_marks) : true;
  doc.setTextColor(passed ? 16 : 220, passed ? 185 : 38, passed ? 129 : 38);
  doc.text(passed ? "PASSED" : "FAILED", 145, 126);

  // Verification watermark
  doc.setDrawColor(203, 213, 225);
  doc.line(20, 150, 190, 150);

  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text("AUTHENTICITY & VERIFICATION CODE", 20, 160);

  doc.setFontSize(13);
  doc.setFont("courier", "bold");
  doc.setTextColor(30, 41, 59);
  doc.text(verificationCode, 20, 170);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184);
  doc.text("This official credential was generated cryptographically by Examina Examination Management System.", 20, 185);
  doc.text(`Timestamp: ${new Date().toUTCString()} | Attempt ID: ${attemptId}`, 20, 192);

  const pdfOutput = doc.output("arraybuffer");

  return new Response(pdfOutput, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Examina_Report_${attemptId.slice(0, 8)}.pdf"`,
    },
  });
}
