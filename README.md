# Examina — Secure Examination Management System
> **Technoverse 5.0 / Web-e-Thon / Problem Statement 1**  
> COMSATS University Lahore (acm CUI)

---

## 1. Overview
**Examina** is a full-stack, enterprise-grade online examination management platform engineered to resolve critical integrity, fairness, network resilience, and administration challenges in digital testing. Built using **Next.js 15 (App Router)**, **TypeScript**, **Tailwind CSS**, and **better-sqlite3** with full server-side authorization and timing enforcement.

---

## 2. Test Credentials

The system initializes with seeded accounts for all roles:

| Role | Email | Password | Access Dashboard |
| :--- | :--- | :--- | :--- |
| **System Administrator** | `admin@examina.com` | `password123` | `/admin` |
| **Examiner** | `examiner@examina.com` | `password123` | `/examiner` |
| **Candidate 1** | `candidate@examina.com` | `password123` | `/candidate` |
| **Candidate 2** | `candidate2@examina.com` | `password123` | `/candidate` |

*New candidates and examiners can also register directly from the `/register` portal.*

---

## 3. Implemented Open Innovation Challenge (Section 05)

### Challenge 5.4: Trust and Dispute Resolution
**Problem Context:** Candidates frequently face anxiety and distrust during high-stakes online examinations regarding ambiguous questions, algorithmic grading discrepancies, or technical disruptions during submission. Without an accountable dispute mechanism, fairness is compromised.

**Our Solution Architecture:**
1. **Integrated Dispute Lifecycle:** Candidates can file structured disputes directly from their dashboard (`/candidate/disputes`), selecting categorized issue types:
   - `GRADING_ERROR`: Suspected auto-grading or rubric miscalculation
   - `AMBIGUOUS_QUESTION`: Multiple valid interpretations or missing context
   - `TECHNICAL_ISSUE`: Network disruptions, interface glitch, or submission latency
   - `OTHER`: Extenuating circumstances
2. **Transparent Status Tracking:** Disputes track live states: `OPEN` → `UNDER_REVIEW` → `RESOLVED` / `REJECTED`. Candidates view real-time resolution notes and auditor feedback.
3. **Examiner Review Console:** Examiners have a dedicated dispute management portal (`/examiner/disputes`) where they review candidate submissions, inspect incident logs, and enter signed resolution statements.
4. **Accountability & Audit Trail:** Every resolution is linked to the resolver's identity and timestamped in the immutable audit log, preserving grading integrity while guaranteeing due process for every candidate.

---

## 4. Requirements & Features Implemented

### Core Functional Requirements (Section 03 — 30 Marks)
- **3.1 Authentication & Authorization:**
  - Secure JWT HTTP-only cookie authentication (`jose`, `bcryptjs`).
  - Strict role-based access control (`ADMIN`, `EXAMINER`, `CANDIDATE`) enforced at middleware and route handler levels.
  - User management interface for administrators (`/admin/users`).
- **3.2 Examination Management:**
  - Complete lifecycle: `DRAFT` → `PUBLISHED` → `ONGOING` → `COMPLETED`.
  - Configurable duration, total marks, passing criteria, schedule windows, and instructions.
- **3.3 Question Management:**
  - Reusable question bank categorized by topic and difficulty (`EASY`, `MEDIUM`, `HARD`).
  - Supports **Single-Answer MCQs**, **Multiple-Select MCQs**, and **Written Responses**.
  - Marking schemes: All-or-Nothing, Partial credit, and Negative marking penalty.
  - Question and option randomization with immutable active attempt snapshots.
- **3.4 Candidate Management:**
  - Candidate enrollment by email/ID with enrollment status monitoring.
  - Candidate portal displaying available, upcoming, in-progress, and completed exams.
  - Strict server-enforced entry windows and eligibility barriers.
- **3.5 Examination Interface:**
  - High-performance exam workspace (`/exam/[attemptId]`).
  - Question palette with status indicators: Answered (Green), Unanswered (Gray), Marked for Review (Amber).
  - Debounced auto-save with real-time feedback (Saving..., Saved, Error).
  - State and remaining time preservation across page refreshes and tab re-entry.
  - Server-calculated deadlines independent of client system clock.
  - Automatic submission and response finalization upon timer expiration.
- **3.6 Examination Monitoring:**
  - Live proctoring dashboard (`/examiner/monitoring/[examId]`) auto-refreshing every 10 seconds.
  - Real-time candidate progress indicators (questions answered vs total).
  - Anomaly & incident recording: Tab switches (`TAB_SWITCH`), blur events (`WINDOW_BLUR`), and connectivity issues.
  - Live examiner broadcast announcements pushed directly into candidate exam screens.
  - Clear compliance disclaimer: Monitoring events are observational and not treated as conclusive misconduct evidence.
- **3.7 Evaluation and Grading:**
  - Instant auto-grading for objective questions upon submission based on configured scoring rubric.
  - Manual grading interface for written answers with score ceiling validation (`/examiner/results/[examId]/grade/[attemptId]`).
  - Transparent score aggregation and running total indicators.
- **3.8 Results and Analytics:**
  - Controlled result publication controls for examiners.
  - Private candidate score reports.
  - Aggregated performance summaries: average, minimum, maximum, pass rates, and histogram distribution.

### Secondary Features (Section 04 — 15 Marks)
1. **R4.1 Network-Aware Interface:** Live connection status detection with offline warning banners and background retry queue.
2. **R4.2 PDF Report Generation:** Downloadable official PDF examination certificates generated via `jspdf` (`/api/reports/[attemptId]/pdf`).
3. **R4.3 Examination Sandbox:** Examiner sandbox preview mode to test examination flow without polluting production data.
4. **R4.4 Bulk Data Import:** Batch JSON/CSV import console for questions and candidate records with server-side error validation (`/examiner/import`).
5. **R4.5 Question Analytics:** Question difficulty index, attempt counts, correct/incorrect ratios, and skip rates (`/examiner/questions/analytics`).
6. **R4.6 Verifiable Reports:** Public verification portal (`/verify/[token]`) verifying credential authenticity and scores via cryptographic tokens.
7. **R4.7 Customizable Examination Workspace:** Candidate preferences for font size (Small/Medium/Large), layout, and timer toggle stored in DB (`/api/preferences`).
8. **R4.8 Digital Scratchpad:** Integrated in-exam rough work pad that automatically persists along with the attempt.

---

## 5. Technology Stack & Architecture
- **Framework:** Next.js 15 App Router (React Server Components & Client Components)
- **Language:** TypeScript 5
- **Styling:** Tailwind CSS with Radix UI accessibility primitives
- **Database:** SQLite with `better-sqlite3` (WAL mode, foreign key enforcement)
- **Security & Cryptography:** `jose` (JWT), `bcryptjs` (salt hashing)
- **Document Generation:** `jspdf` for binary PDF output

---

## 6. Setup and Running Locally

### Prerequisites
- Node.js 18+ (tested on Node v20/v26)
- npm 9+

### Quick Start
```bash
# 1. Install dependencies
npm install

# 2. Build the application for production
npm run build

# 3. Start the production server
npm start
```
The application will be running at `http://localhost:3000`.

*Or run in development mode:*
```bash
npm run dev
```
