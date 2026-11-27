import Link from "next/link";
import { GraduationCap, Shield, Clock, BarChart3, Users, Zap } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 lg:px-12 py-4">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-600/20">
            <span className="text-white font-bold">E</span>
          </div>
          <span className="text-xl font-bold text-gray-900">Examina</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors">
            Log in
          </Link>
          <Link href="/register" className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm transition-all">
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 lg:px-12 pt-20 pb-24 max-w-6xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium mb-6">
          <Shield className="h-3.5 w-3.5" /> Secure & Reliable
        </div>
        <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight text-gray-900 mb-6 leading-[1.1]">
          Examination Management<br />
          <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Made Simple</span>
        </h1>
        <p className="text-lg lg:text-xl text-gray-600 max-w-2xl mx-auto mb-10 leading-relaxed">
          Create, conduct, monitor, and evaluate online examinations with built-in integrity safeguards, 
          real-time monitoring, and comprehensive analytics.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link href="/register" className="px-8 py-3.5 text-base font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-600/25 transition-all">
            Start for Free →
          </Link>
          <Link href="/login" className="px-8 py-3.5 text-base font-semibold text-gray-700 bg-white rounded-xl border border-gray-200 hover:bg-gray-50 shadow-sm transition-all">
            Sign In
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 lg:px-12 pb-24 max-w-6xl mx-auto">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { icon: GraduationCap, title: "Exam Management", desc: "Create and configure exams with MCQs, multi-select, and written questions. Full lifecycle management." },
            { icon: Shield, title: "Integrity Monitoring", desc: "Real-time proctoring indicators, incident logging, and anomaly detection during active examinations." },
            { icon: Clock, title: "Reliable Timing", desc: "Server-enforced timing with auto-save, graceful reconnection, and automatic submission at expiry." },
            { icon: BarChart3, title: "Smart Analytics", desc: "Question difficulty analysis, score distributions, and comprehensive performance reports with PDF export." },
            { icon: Users, title: "Role-Based Access", desc: "Secure access for administrators, examiners, and candidates with granular permission controls." },
            { icon: Zap, title: "Dispute Resolution", desc: "Transparent dispute filing, evidence tracking, and accountable resolution workflows." },
          ].map((f) => (
            <div key={f.title} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center mb-4">
                <f.icon className="h-5 w-5 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 px-6 py-8 text-center text-sm text-gray-500">
        <p>© 2024 Examina — Secure Examination Management System. Built for Technoverse 5.0.</p>
      </footer>
    </div>
  );
}
