import { NextRequest } from "next/server";
import getDb from "@/lib/db";
import { getSession } from "@/lib/auth";

function seededShuffle<T>(arr: T[], seedStr: string): T[] {
  let seed = 0;
  for (let i = 0; i < seedStr.length; i++) {
    seed = (seed * 31 + seedStr.charCodeAt(i)) >>> 0;
  }
  const s = [...arr];
  for (let i = s.length - 1; i > 0; i--) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const j = seed % (i + 1);
    [s[i], s[j]] = [s[j], s[i]];
  }
  return s;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ examId: string }> }) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { examId } = await params;

  const db = getDb();
  const exam = db.prepare("SELECT * FROM exams WHERE id = ?").get(examId) as any;
  if (!exam) return Response.json({ error: "Exam not found" }, { status: 404 });

  if (session.role === "CANDIDATE") {
    if (!exam.results_published) return Response.json({ error: "Results not published yet" }, { status: 403 });
    const attempt = db.prepare(`SELECT * FROM attempts WHERE exam_id = ? AND user_id = ? AND is_sandbox = 0 
      AND status IN ('SUBMITTED','AUTO_SUBMITTED','GRADED') ORDER BY attempt_number DESC LIMIT 1`).get(examId, session.id) as any;
    if (!attempt) return Response.json({ error: "No completed attempt found" }, { status: 404 });

    const rawAnswers = db.prepare(`
      SELECT 
        a.id, a.attempt_id, a.exam_question_id, a.selected_option_ids, a.written_response, 
        a.status, a.is_correct, a.marks_awarded, a.examiner_feedback, a.graded_at,
        eq.marks as max_marks, eq.order_index, 
        q.id as question_id, q.text as question_text, q.type as question_type, q.explanation
      FROM answers a 
      JOIN exam_questions eq ON a.exam_question_id = eq.id
      JOIN questions q ON eq.question_id = q.id 
      WHERE a.attempt_id = ?
    `).all(attempt.id) as any[];

    // Sort answers matching candidate's exact shuffled exam question sequence
    let sortedAnswers = rawAnswers;
    if (attempt.question_order) {
      try {
        const orderIds: string[] = JSON.parse(attempt.question_order);
        if (Array.isArray(orderIds) && orderIds.length > 0) {
          sortedAnswers = [...rawAnswers].sort((x, y) => {
            const idxX = orderIds.indexOf(x.exam_question_id);
            const idxY = orderIds.indexOf(y.exam_question_id);
            if (idxX === -1) return 1;
            if (idxY === -1) return -1;
            return idxX - idxY;
          });
        }
      } catch {}
    }

    const answers = sortedAnswers.map(ans => {
      let selectedOptionIds: string[] = [];
      try {
        if (ans.selected_option_ids) {
          const parsed = JSON.parse(ans.selected_option_ids);
          selectedOptionIds = Array.isArray(parsed) ? parsed : [ans.selected_option_ids];
        }
      } catch {
        selectedOptionIds = ans.selected_option_ids ? [ans.selected_option_ids] : [];
      }

      let options: any[] = [];
      if (ans.question_type !== 'WRITTEN') {
        const rawOpts = db.prepare(
          "SELECT id, text, is_correct, order_index FROM question_options WHERE question_id = ? ORDER BY order_index ASC"
        ).all(ans.question_id) as any[];
        // Shuffle options with same attempt seed so candidate results reflect exact options order seen during test
        options = seededShuffle(rawOpts, `${attempt.id}_${ans.question_id}`);
      }

      return {
        ...ans,
        selectedOptionIds,
        options,
      };
    });

    return Response.json({ exam, attempt, answers, type: "candidate" });
  }

  // Examiner view: all results
  if (exam.creator_id !== session.id && session.role !== "ADMIN") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const attempts = db.prepare(`
    SELECT a.*, u.name as candidate_name, u.email as candidate_email
    FROM attempts a JOIN users u ON a.user_id = u.id
    WHERE a.exam_id = ? AND a.is_sandbox = 0
    ORDER BY a.total_score DESC`).all(examId);

  // Statistics
  const stats = db.prepare(`
    SELECT COUNT(*) as total, AVG(percentage) as avg_pct, MIN(percentage) as min_pct, 
    MAX(percentage) as max_pct, AVG(total_score) as avg_score
    FROM attempts WHERE exam_id = ? AND is_sandbox = 0 AND status IN ('SUBMITTED','AUTO_SUBMITTED','GRADED')`).get(examId) as any;

  const passCount = exam.passing_marks ? db.prepare(
    "SELECT COUNT(*) as count FROM attempts WHERE exam_id = ? AND is_sandbox = 0 AND total_score >= ? AND status IN ('SUBMITTED','AUTO_SUBMITTED','GRADED')"
  ).get(examId, exam.passing_marks) as any : { count: 0 };

  return Response.json({
    exam, attempts, stats: { ...stats, passCount: passCount.count }, type: "examiner",
  });
}
