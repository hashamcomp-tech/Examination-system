"use client";
import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Shield, Printer, ExternalLink } from "lucide-react";

export default function VerifyPage() {
  const { token } = useParams() as { token: string };
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/verify/${token}`).then(r => r.json()).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, [token]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="animate-spin h-8 w-8 border-2 border-blue-600 rounded-full border-t-transparent" /></div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <Card className="max-w-lg w-full shadow-lg">
        <CardContent className="p-8 text-center">
          {data?.valid ? (
            <>
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-emerald-600" />
              </div>
              <Badge variant="success" className="mb-2">Cryptographically Verified</Badge>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Official Result Certificate</h1>
              <p className="text-sm text-gray-500 mb-6">
                This academic examination credential was issued and validated by Examina.
              </p>
              <div className="text-left space-y-3 bg-gray-50 rounded-xl p-5 border">
                <div className="flex justify-between text-sm py-1 border-b">
                  <span className="text-gray-500">Verification Token</span>
                  <span className="font-mono font-semibold text-blue-700">{token}</span>
                </div>
                <div className="flex justify-between text-sm py-1 border-b">
                  <span className="text-gray-500">Examination</span>
                  <span className="font-medium text-gray-900">{data.examTitle}</span>
                </div>
                <div className="flex justify-between text-sm py-1 border-b">
                  <span className="text-gray-500">Candidate Name</span>
                  <span className="font-medium text-gray-900">{data.candidateName}</span>
                </div>
                <div className="flex justify-between text-sm py-1 border-b">
                  <span className="text-gray-500">Score Achieved</span>
                  <span className="font-bold text-gray-900">{data.score} / {data.maxScore}</span>
                </div>
                <div className="flex justify-between text-sm py-1 border-b">
                  <span className="text-gray-500">Percentage</span>
                  <span className="font-bold text-emerald-700">{data.percentage}%</span>
                </div>
                <div className="flex justify-between text-sm py-1">
                  <span className="text-gray-500">Submission Date</span>
                  <span className="font-medium text-gray-900">{data.submittedAt ? new Date(data.submittedAt).toLocaleDateString() : "—"}</span>
                </div>
              </div>

              <div className="mt-6 flex justify-center gap-3">
                <Button variant="outline" size="sm" onClick={() => window.print()}>
                  <Printer className="h-4 w-4 mr-1.5" /> Print Certificate
                </Button>
                <Button size="sm" onClick={() => window.location.href = "/"}>
                  Return to Home
                </Button>
              </div>

              <div className="mt-6 flex items-center justify-center gap-1.5 text-xs text-gray-400">
                <Shield className="h-3.5 w-3.5 text-emerald-600" />
                <span>Verified record from institutional database at {new Date().toLocaleString()}</span>
              </div>
            </>
          ) : (
            <>
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <XCircle className="h-8 w-8 text-red-600" />
              </div>
              <h1 className="text-xl font-bold text-gray-900 mb-1">Invalid Verification Token</h1>
              <p className="text-sm text-gray-500">
                The verification code <code className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">{token}</code> is either expired or could not be matched with any issued examination result.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
