import Database from "better-sqlite3";
import path from "path";
import { hashSync } from "bcryptjs";
import { v4 as uuid } from "uuid";

const DB_PATH = path.join(process.cwd(), "examina.db");

let dbInstance: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!dbInstance) {
    dbInstance = new Database(DB_PATH);
    dbInstance.pragma("journal_mode = WAL");
    dbInstance.pragma("foreign_keys = ON");
    initializeDatabase(dbInstance);
  }
  return dbInstance;
}

function initializeDatabase(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'CANDIDATE' CHECK(role IN ('ADMIN','EXAMINER','CANDIDATE')),
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS user_preferences (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      theme TEXT NOT NULL DEFAULT 'light',
      font_size TEXT NOT NULL DEFAULT 'medium',
      layout TEXT NOT NULL DEFAULT 'sidebar',
      question_display TEXT NOT NULL DEFAULT 'one-at-a-time',
      show_timer INTEGER NOT NULL DEFAULT 1,
      compact_nav INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS exams (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      instructions TEXT,
      creator_id TEXT NOT NULL REFERENCES users(id),
      status TEXT NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','PUBLISHED','ONGOING','COMPLETED')),
      scheduled_start TEXT,
      scheduled_end TEXT,
      duration INTEGER NOT NULL,
      total_marks REAL NOT NULL,
      passing_marks REAL,
      randomize_questions INTEGER NOT NULL DEFAULT 0,
      randomize_options INTEGER NOT NULL DEFAULT 0,
      show_results INTEGER NOT NULL DEFAULT 0,
      allow_review INTEGER NOT NULL DEFAULT 1,
      multiple_select_grading TEXT NOT NULL DEFAULT 'ALL_OR_NOTHING',
      negative_marking_penalty REAL NOT NULL DEFAULT 0,
      max_attempts INTEGER NOT NULL DEFAULT 1,
      is_sandbox INTEGER NOT NULL DEFAULT 0,
      results_published INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS questions (
      id TEXT PRIMARY KEY,
      text TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('MCQ_SINGLE','MCQ_MULTIPLE','WRITTEN')),
      category TEXT,
      topic TEXT,
      difficulty TEXT NOT NULL DEFAULT 'MEDIUM' CHECK(difficulty IN ('EASY','MEDIUM','HARD')),
      marks REAL NOT NULL,
      explanation TEXT,
      creator_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS question_options (
      id TEXT PRIMARY KEY,
      question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
      text TEXT NOT NULL,
      is_correct INTEGER NOT NULL DEFAULT 0,
      order_index INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS exam_questions (
      id TEXT PRIMARY KEY,
      exam_id TEXT NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
      question_id TEXT NOT NULL REFERENCES questions(id),
      order_index INTEGER NOT NULL DEFAULT 0,
      marks REAL NOT NULL,
      question_snapshot TEXT,
      UNIQUE(exam_id, question_id)
    );

    CREATE TABLE IF NOT EXISTS enrollments (
      id TEXT PRIMARY KEY,
      exam_id TEXT NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      enrolled_at TEXT NOT NULL DEFAULT (datetime('now')),
      status TEXT NOT NULL DEFAULT 'ENROLLED' CHECK(status IN ('ENROLLED','STARTED','COMPLETED','WITHDRAWN')),
      UNIQUE(exam_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS attempts (
      id TEXT PRIMARY KEY,
      exam_id TEXT NOT NULL REFERENCES exams(id),
      user_id TEXT NOT NULL REFERENCES users(id),
      attempt_number INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'IN_PROGRESS' CHECK(status IN ('IN_PROGRESS','SUBMITTED','AUTO_SUBMITTED','GRADED')),
      started_at TEXT NOT NULL DEFAULT (datetime('now')),
      submitted_at TEXT,
      server_deadline TEXT NOT NULL,
      total_score REAL,
      max_score REAL,
      percentage REAL,
      grading_status TEXT NOT NULL DEFAULT 'PENDING' CHECK(grading_status IN ('PENDING','PARTIAL','COMPLETE')),
      is_sandbox INTEGER NOT NULL DEFAULT 0,
      question_order TEXT,
      UNIQUE(exam_id, user_id, attempt_number)
    );

    CREATE TABLE IF NOT EXISTS answers (
      id TEXT PRIMARY KEY,
      attempt_id TEXT NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
      exam_question_id TEXT NOT NULL REFERENCES exam_questions(id),
      selected_option_ids TEXT,
      written_response TEXT,
      status TEXT NOT NULL DEFAULT 'UNANSWERED' CHECK(status IN ('UNANSWERED','ANSWERED','MARKED_FOR_REVIEW')),
      is_correct INTEGER,
      marks_awarded REAL,
      examiner_feedback TEXT,
      graded_at TEXT,
      saved_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(attempt_id, exam_question_id)
    );

    CREATE TABLE IF NOT EXISTS scratchpads (
      id TEXT PRIMARY KEY,
      attempt_id TEXT UNIQUE NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
      content TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS announcements (
      id TEXT PRIMARY KEY,
      exam_id TEXT NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
      author_id TEXT NOT NULL REFERENCES users(id),
      message TEXT NOT NULL,
      priority TEXT NOT NULL DEFAULT 'NORMAL' CHECK(priority IN ('NORMAL','IMPORTANT','URGENT')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS incidents (
      id TEXT PRIMARY KEY,
      attempt_id TEXT REFERENCES attempts(id),
      exam_id TEXT NOT NULL REFERENCES exams(id),
      user_id TEXT NOT NULL REFERENCES users(id),
      type TEXT NOT NULL,
      description TEXT,
      severity TEXT NOT NULL DEFAULT 'LOW' CHECK(severity IN ('LOW','MEDIUM','HIGH')),
      timestamp TEXT NOT NULL DEFAULT (datetime('now')),
      is_reviewed INTEGER NOT NULL DEFAULT 0,
      review_note TEXT
    );

    CREATE TABLE IF NOT EXISTS disputes (
      id TEXT PRIMARY KEY,
      exam_id TEXT NOT NULL REFERENCES exams(id),
      candidate_id TEXT NOT NULL REFERENCES users(id),
      type TEXT NOT NULL CHECK(type IN ('GRADING_ERROR','AMBIGUOUS_QUESTION','TECHNICAL_ISSUE','OTHER')),
      subject TEXT NOT NULL,
      description TEXT NOT NULL,
      evidence TEXT,
      status TEXT NOT NULL DEFAULT 'OPEN' CHECK(status IN ('OPEN','UNDER_REVIEW','RESOLVED','REJECTED')),
      resolution TEXT,
      resolver_id TEXT REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS verification_tokens (
      id TEXT PRIMARY KEY,
      token TEXT UNIQUE NOT NULL,
      exam_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      attempt_id TEXT NOT NULL,
      data TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      expires_at TEXT
    );

    CREATE TABLE IF NOT EXISTS classrooms (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      description TEXT,
      creator_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS classroom_members (
      id TEXT PRIMARY KEY,
      classroom_id TEXT NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      joined_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(classroom_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS classroom_bans (
      id TEXT PRIMARY KEY,
      classroom_id TEXT NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      banned_by TEXT NOT NULL REFERENCES users(id),
      reason TEXT,
      banned_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(classroom_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS login_rate_limits (
      identifier TEXT PRIMARY KEY,
      failed_attempts INTEGER NOT NULL DEFAULT 0,
      locked_until TEXT,
      last_attempt_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS login_rate_limits (
        identifier TEXT PRIMARY KEY,
        failed_attempts INTEGER NOT NULL DEFAULT 0,
        locked_until TEXT,
        last_attempt_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);
  } catch {}

  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS classroom_bans (
        id TEXT PRIMARY KEY,
        classroom_id TEXT NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        banned_by TEXT NOT NULL REFERENCES users(id),
        reason TEXT,
        banned_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(classroom_id, user_id)
      );
    `);
  } catch {}

  try {
    db.exec("ALTER TABLE exams ADD COLUMN classroom_id TEXT REFERENCES classrooms(id)");
  } catch {}

  // Seed default admin user if not exists
  const admin = db.prepare("SELECT id FROM users WHERE email = ?").get("admin@examina.com");
  if (!admin) {
    const adminId = uuid();
    const examinerId = uuid();
    const candidateId = uuid();
    const candidate2Id = uuid();
    const passwordHash = hashSync("password123", 12);

    db.prepare(`INSERT INTO users (id, email, name, password_hash, role) VALUES (?, ?, ?, ?, ?)`).run(
      adminId, "admin@examina.com", "System Administrator", passwordHash, "ADMIN"
    );
    db.prepare(`INSERT INTO users (id, email, name, password_hash, role) VALUES (?, ?, ?, ?, ?)`).run(
      examinerId, "examiner@examina.com", "Dr. Sarah Johnson", passwordHash, "EXAMINER"
    );
    db.prepare(`INSERT INTO users (id, email, name, password_hash, role) VALUES (?, ?, ?, ?, ?)`).run(
      candidateId, "candidate@examina.com", "John Smith", passwordHash, "CANDIDATE"
    );
    db.prepare(`INSERT INTO users (id, email, name, password_hash, role) VALUES (?, ?, ?, ?, ?)`).run(
      candidate2Id, "candidate2@examina.com", "Jane Doe", passwordHash, "CANDIDATE"
    );

    // Create user preferences
    [adminId, examinerId, candidateId, candidate2Id].forEach((uid) => {
      db.prepare(`INSERT INTO user_preferences (id, user_id) VALUES (?, ?)`).run(uuid(), uid);
    });

    // Seed sample questions
    const q1Id = uuid();
    const q2Id = uuid();
    const q3Id = uuid();
    const q4Id = uuid();
    const q5Id = uuid();

    db.prepare(`INSERT INTO questions (id, text, type, category, topic, difficulty, marks, explanation, creator_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      q1Id, "What is the time complexity of binary search?", "MCQ_SINGLE", "Computer Science", "Algorithms", "EASY", 2, "Binary search divides the search space in half each iteration.", examinerId
    );
    // Options for Q1
    [
      { text: "O(n)", correct: 0 },
      { text: "O(log n)", correct: 1 },
      { text: "O(n²)", correct: 0 },
      { text: "O(1)", correct: 0 },
    ].forEach((opt, i) => {
      db.prepare(`INSERT INTO question_options (id, question_id, text, is_correct, order_index) VALUES (?, ?, ?, ?, ?)`).run(
        uuid(), q1Id, opt.text, opt.correct, i
      );
    });

    db.prepare(`INSERT INTO questions (id, text, type, category, topic, difficulty, marks, explanation, creator_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      q2Id, "Which of the following are valid sorting algorithms? (Select all that apply)", "MCQ_MULTIPLE", "Computer Science", "Algorithms", "MEDIUM", 3, "Merge Sort, Quick Sort, and Bubble Sort are all valid sorting algorithms.", examinerId
    );
    [
      { text: "Merge Sort", correct: 1 },
      { text: "Quick Sort", correct: 1 },
      { text: "Binary Sort", correct: 0 },
      { text: "Bubble Sort", correct: 1 },
      { text: "Linear Sort", correct: 0 },
    ].forEach((opt, i) => {
      db.prepare(`INSERT INTO question_options (id, question_id, text, is_correct, order_index) VALUES (?, ?, ?, ?, ?)`).run(
        uuid(), q2Id, opt.text, opt.correct, i
      );
    });

    db.prepare(`INSERT INTO questions (id, text, type, category, topic, difficulty, marks, explanation, creator_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      q3Id, "Explain the concept of recursion and provide an example.", "WRITTEN", "Computer Science", "Programming Concepts", "MEDIUM", 5, "", examinerId
    );

    db.prepare(`INSERT INTO questions (id, text, type, category, topic, difficulty, marks, explanation, creator_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      q4Id, "What does SQL stand for?", "MCQ_SINGLE", "Database", "SQL", "EASY", 1, "SQL stands for Structured Query Language.", examinerId
    );
    [
      { text: "Structured Query Language", correct: 1 },
      { text: "Simple Query Language", correct: 0 },
      { text: "Standard Query Logic", correct: 0 },
      { text: "System Query Language", correct: 0 },
    ].forEach((opt, i) => {
      db.prepare(`INSERT INTO question_options (id, question_id, text, is_correct, order_index) VALUES (?, ?, ?, ?, ?)`).run(
        uuid(), q4Id, opt.text, opt.correct, i
      );
    });

    db.prepare(`INSERT INTO questions (id, text, type, category, topic, difficulty, marks, explanation, creator_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      q5Id, "Which data structures use FIFO ordering? (Select all that apply)", "MCQ_MULTIPLE", "Computer Science", "Data Structures", "HARD", 4, "Queue and its variants use FIFO.", examinerId
    );
    [
      { text: "Stack", correct: 0 },
      { text: "Queue", correct: 1 },
      { text: "Priority Queue", correct: 0 },
      { text: "Circular Queue", correct: 1 },
      { text: "Deque", correct: 0 },
    ].forEach((opt, i) => {
      db.prepare(`INSERT INTO question_options (id, question_id, text, is_correct, order_index) VALUES (?, ?, ?, ?, ?)`).run(
        uuid(), q5Id, opt.text, opt.correct, i
      );
    });

    // Create a sample exam
    const examId = uuid();
    db.prepare(`INSERT INTO exams (id, title, description, instructions, creator_id, status, duration, total_marks, passing_marks, randomize_questions, randomize_options, multiple_select_grading) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      examId,
      "Introduction to Computer Science - Midterm",
      "Midterm examination covering algorithms, data structures, and databases.",
      "• Read each question carefully before answering.\\n• You have 60 minutes to complete this exam.\\n• MCQ questions are auto-graded.\\n• Written responses will be manually reviewed.\\n• You may mark questions for review and return to them later.",
      examinerId,
      "PUBLISHED",
      60,
      15,
      8,
      0,
      0,
      "PARTIAL"
    );

    // Assign questions to exam
    [q1Id, q2Id, q3Id, q4Id, q5Id].forEach((qId, i) => {
      const q = db.prepare("SELECT marks FROM questions WHERE id = ?").get(qId) as { marks: number };
      db.prepare(`INSERT INTO exam_questions (id, exam_id, question_id, order_index, marks) VALUES (?, ?, ?, ?, ?)`).run(
        uuid(), examId, qId, i, q.marks
      );
    });

    // Enroll candidates
    db.prepare(`INSERT INTO enrollments (id, exam_id, user_id) VALUES (?, ?, ?)`).run(uuid(), examId, candidateId);
    db.prepare(`INSERT INTO enrollments (id, exam_id, user_id) VALUES (?, ?, ?)`).run(uuid(), examId, candidate2Id);

    console.log("✅ Database seeded with test data");
  }
}

export default getDb;
