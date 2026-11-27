import { DashboardShell } from "@/components/layout/dashboard-shell";

export default function ExaminerLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell role="EXAMINER">{children}</DashboardShell>;
}
