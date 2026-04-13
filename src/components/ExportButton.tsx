"use client";

import { useCallback, useState } from "react";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface ExportButtonProps {
  incident: any;
  narrative: string | null;
}

export default function ExportButton({ incident, narrative }: ExportButtonProps) {
  const [exporting, setExporting] = useState(false);

  const exportReport = useCallback(() => {
    if (!incident) return;
    setExporting(true);

    const { leak, rraf, diagnosis, remediation, impact } = incident;

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>RevShield Incident Report</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; color: #1a1a2e; }
  h1 { color: #0891b2; border-bottom: 3px solid #0891b2; padding-bottom: 8px; }
  h2 { color: #334155; margin-top: 30px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; }
  .badge { display: inline-block; padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
  .badge-high { background: #fef2f2; color: #dc2626; border: 1px solid #fca5a5; }
  .badge-critical { background: #fef2f2; color: #dc2626; border: 1px solid #fca5a5; }
  .metric-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 16px 0; }
  .metric-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; text-align: center; }
  .metric-label { font-size: 10px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; }
  .metric-value { font-size: 22px; font-weight: 700; color: #0f172a; margin: 4px 0; }
  .metric-sub { font-size: 11px; color: #64748b; }
  table { width: 100%; border-collapse: collapse; margin: 12px 0; }
  th, td { padding: 8px 12px; text-align: left; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
  th { background: #f8fafc; color: #64748b; text-transform: uppercase; font-size: 10px; letter-spacing: 0.5px; }
  .evidence { background: #f8fafc; border-left: 3px solid #0891b2; padding: 12px; margin: 8px 0; border-radius: 0 8px 8px 0; font-size: 13px; }
  .action-item { padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-size: 13px; }
  .action-num { display: inline-block; width: 22px; height: 22px; background: #0891b2; color: white; border-radius: 50%; text-align: center; line-height: 22px; font-size: 11px; margin-right: 8px; }
  .narrative { background: #f0fdfa; border: 1px solid #99f6e4; border-radius: 8px; padding: 16px; margin: 16px 0; font-size: 13px; line-height: 1.6; }
  .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center; }
  @media print { body { padding: 20px; } }
</style>
</head>
<body>
<h1>RevShield Incident Report</h1>
<p style="color:#64748b;font-size:13px;">Generated ${new Date().toLocaleString()} | Segment: ${leak.segment_key.replace(/_/g, " ")} | Stage: ${leak.stage.replace(/_/g, " ")}</p>

<span class="badge badge-${leak.severity}">${leak.severity} severity</span>

<h2>Risk Score (RRAF)</h2>
<div class="metric-grid">
  <div class="metric-card">
    <div class="metric-label">Overall</div>
    <div class="metric-value" style="color:#0891b2">${Math.round(rraf.total)}</div>
    <div class="metric-sub">/ 100</div>
  </div>
  <div class="metric-card">
    <div class="metric-label">Risk</div>
    <div class="metric-value">${(rraf.risk * 100).toFixed(0)}%</div>
    <div class="metric-sub">weight: 30%</div>
  </div>
  <div class="metric-card">
    <div class="metric-label">Root Cause</div>
    <div class="metric-value">${(rraf.root_cause_confidence * 100).toFixed(0)}%</div>
    <div class="metric-sub">weight: 20%</div>
  </div>
  <div class="metric-card">
    <div class="metric-label">Revenue</div>
    <div class="metric-value">${(rraf.affected_revenue * 100).toFixed(0)}%</div>
    <div class="metric-sub">weight: 35%</div>
  </div>
</div>

<h2>Impact</h2>
<div class="metric-grid">
  <div class="metric-card">
    <div class="metric-label">Daily Loss</div>
    <div class="metric-value" style="color:#dc2626">$${Math.round(leak.estimated_revenue_lost).toLocaleString()}</div>
  </div>
  <div class="metric-card">
    <div class="metric-label">7-Day Risk</div>
    <div class="metric-value" style="color:#dc2626">$${Math.round(impact.revenue_at_risk).toLocaleString()}</div>
  </div>
  <div class="metric-card">
    <div class="metric-label">Recovery Range</div>
    <div class="metric-value" style="color:#16a34a;font-size:16px">$${Math.round(impact.projected_recovery_low).toLocaleString()} - $${Math.round(impact.projected_recovery_high).toLocaleString()}</div>
  </div>
  <div class="metric-card">
    <div class="metric-label">Confidence</div>
    <div class="metric-value">${Math.round(impact.confidence * 100)}%</div>
  </div>
</div>

<h2>LIFT Diagnosis</h2>
<p>Primary category: <strong>${diagnosis.top_category}</strong></p>
<table>
  <thead><tr><th>Category</th><th>Score</th><th>Signals</th></tr></thead>
  <tbody>
    ${diagnosis.hypotheses.map((h: any) => `<tr><td>${h.category === diagnosis.top_category ? "<strong>" + h.category + "</strong>" : h.category}</td><td>${h.score.toFixed(2)}</td><td>${h.signals.length}</td></tr>`).join("")}
  </tbody>
</table>

<h3>Evidence</h3>
${diagnosis.hypotheses.filter((h: any) => h.signals.length > 0).flatMap((h: any) => h.signals.map((s: string) => `<div class="evidence"><strong>[${h.category}]</strong> ${s}</div>`)).join("")}

<h2>Remediation Plan</h2>
<p><span class="badge badge-${remediation.priority}">${remediation.priority} priority</span> &nbsp; Category: ${remediation.category} &nbsp; ETA: ${remediation.estimated_time_to_fix}</p>
${remediation.actions.map((a: string, i: number) => `<div class="action-item"><span class="action-num">${i + 1}</span>${a}</div>`).join("")}

${narrative ? `<h2>AI Executive Summary</h2><div class="narrative">${narrative.replace(/\n/g, "<br>")}</div>` : ""}

<div class="footer">
  RevShield - Self-Healing Funnel AI | Report generated automatically
</div>
</body>
</html>`;

    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, "_blank");
    if (win) {
      win.onload = () => {
        setTimeout(() => {
          win.print();
          setExporting(false);
        }, 500);
      };
    } else {
      // Fallback: download as HTML
      const a = document.createElement("a");
      a.href = url;
      a.download = "revshield-incident-report.html";
      a.click();
      setExporting(false);
    }
    URL.revokeObjectURL(url);
  }, [incident, narrative]);

  return (
    <button
      onClick={exportReport}
      disabled={!incident || exporting}
      className="flex items-center gap-2 px-4 py-2 bg-slate-800/60 border border-slate-700/50 rounded-xl text-xs text-slate-400 hover:text-slate-200 hover:border-slate-600 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      {exporting ? "Generating..." : "Export Report"}
    </button>
  );
}
