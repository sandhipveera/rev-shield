"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend, RadarChart, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Radar,
} from "recharts";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface DrillDownModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: DrillDownType;
  data: any;
}

export type DrillDownType =
  | "rraf"
  | "lift"
  | "leak"
  | "remediation"
  | "impact"
  | "incident"
  | "funnel-stage"
  | null;

export default function DrillDownModal({ isOpen, onClose, type, data }: DrillDownModalProps) {
  if (!isOpen || !type || !data) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="bg-slate-900 border border-cyan-900/50 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 bg-slate-900/95 backdrop-blur border-b border-slate-800 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
            <h3 className="text-lg font-bold text-cyan-300">{getTitle(type)}</h3>
            <button
              onClick={onClose}
              className="text-slate-500 hover:text-white transition-colors p-1"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-5">
            {type === "rraf" && <RRAFDrillDown data={data} />}
            {type === "lift" && <LIFTDrillDown data={data} />}
            {type === "leak" && <LeakDrillDown data={data} />}
            {type === "remediation" && <RemediationDrillDown data={data} />}
            {type === "impact" && <ImpactDrillDown data={data} />}
            {type === "incident" && <IncidentDrillDown data={data} />}
            {type === "funnel-stage" && <FunnelStageDrillDown data={data} />}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function getTitle(type: DrillDownType): string {
  switch (type) {
    case "rraf": return "RRAF Score Breakdown";
    case "lift": return "LIFT Diagnosis Details";
    case "leak": return "Leak Analysis";
    case "remediation": return "Remediation Plan Details";
    case "impact": return "Revenue Impact Projection";
    case "incident": return "Incident Details";
    case "funnel-stage": return "Funnel Stage Analysis";
    default: return "Details";
  }
}

// ---------------------------------------------------------------------------
// RRAF Score Drill-Down
// ---------------------------------------------------------------------------
function RRAFDrillDown({ data }: { data: any }) {
  const { rraf, leak } = data;
  const components = [
    { name: "Risk", value: Math.round(rraf.risk * 100), weight: 30, color: "#ef4444", description: "How severe is the conversion drop relative to baseline? Factors in magnitude and segment importance." },
    { name: "Root Cause", value: Math.round(rraf.root_cause_confidence * 100), weight: 20, color: "#f59e0b", description: "How confident are we in the diagnosis? Based on correlated signals (latency spikes, error rates, support tickets)." },
    { name: "Revenue", value: Math.round(rraf.affected_revenue * 100), weight: 35, color: "#8b5cf6", description: "How much revenue is at risk? Considers daily order volume, AOV, and segment contribution." },
    { name: "Frequency", value: Math.round(rraf.frequency * 100), weight: 15, color: "#06b6d4", description: "How persistent is this issue? Measures days affected and pattern consistency." },
  ];

  const radarData = components.map((c) => ({ subject: c.name, score: c.value, fullMark: 100 }));

  return (
    <div className="space-y-6">
      {/* Score summary */}
      <div className="text-center">
        <div className="inline-flex items-center gap-3">
          <div className={`text-5xl font-black ${rraf.total >= 70 ? "text-red-400" : rraf.total >= 40 ? "text-amber-400" : "text-green-400"}`}>
            {Math.round(rraf.total)}
          </div>
          <div className="text-left">
            <div className="text-sm text-slate-400">RRAF Score</div>
            <div className={`text-sm font-bold ${rraf.total >= 70 ? "text-red-400" : rraf.total >= 40 ? "text-amber-400" : "text-green-400"}`}>
              {rraf.total >= 70 ? "HIGH RISK" : rraf.total >= 40 ? "MEDIUM RISK" : "LOW RISK"}
            </div>
          </div>
        </div>
        <p className="text-xs text-slate-500 mt-2">
          Segment: {leak?.segment_key?.replace(/_/g, " ")} | Stage: {leak?.stage?.replace(/_/g, " → ")}
        </p>
      </div>

      {/* Radar Chart */}
      <div className="h-64">
        <ResponsiveContainer>
          <RadarChart data={radarData}>
            <PolarGrid stroke="#334155" />
            <PolarAngleAxis dataKey="subject" tick={{ fill: "#94a3b8", fontSize: 12 }} />
            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: "#64748b", fontSize: 10 }} />
            <Radar name="Score" dataKey="score" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.3} strokeWidth={2} />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Component details */}
      <div className="space-y-3">
        {components.map((comp) => (
          <div key={comp.name} className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: comp.color }} />
                <span className="font-semibold text-sm text-white">{comp.name}</span>
                <span className="text-xs text-slate-500">weight: {comp.weight}%</span>
              </div>
              <span className="text-lg font-bold" style={{ color: comp.color }}>{comp.value}%</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-2 mb-2">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${comp.value}%` }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="h-2 rounded-full"
                style={{ backgroundColor: comp.color }}
              />
            </div>
            <p className="text-xs text-slate-400">{comp.description}</p>
            <p className="text-xs text-slate-500 mt-1">
              Contribution to total: <strong className="text-slate-300">{((comp.value * comp.weight) / 100).toFixed(1)} pts</strong> of {Math.round(rraf.total)}
            </p>
          </div>
        ))}
      </div>

      {/* Formula */}
      <div className="bg-slate-800/30 rounded-lg p-3 border border-slate-700/30">
        <p className="text-xs text-slate-500 font-mono">
          RRAF = (Risk × 0.30) + (Root Cause × 0.20) + (Revenue × 0.35) + (Frequency × 0.15)
        </p>
        <p className="text-xs text-slate-500 font-mono mt-1">
          = ({Math.round(rraf.risk * 100)} × 0.30) + ({Math.round(rraf.root_cause_confidence * 100)} × 0.20) + ({Math.round(rraf.affected_revenue * 100)} × 0.35) + ({Math.round(rraf.frequency * 100)} × 0.15) = <strong className="text-cyan-400">{Math.round(rraf.total)}</strong>
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// LIFT Diagnosis Drill-Down
// ---------------------------------------------------------------------------
function LIFTDrillDown({ data }: { data: any }) {
  const { diagnosis } = data;
  if (!diagnosis) return <p className="text-slate-500">No diagnosis data available.</p>;

  const hypotheses = diagnosis.hypotheses || [];
  const ICONS: Record<string, string> = { Landing: "\ud83d\udec2", Incentive: "\ud83c\udfaf", Friction: "\u26a0\ufe0f", Trust: "\ud83d\udd12" };
  const COLORS: Record<string, string> = { Landing: "#3b82f6", Incentive: "#f59e0b", Friction: "#ef4444", Trust: "#8b5cf6" };
  const DESCRIPTIONS: Record<string, string> = {
    Landing: "Page load issues, bounce rates, rendering errors affecting the initial user experience.",
    Incentive: "Promo code failures, discount calculation errors, missing or broken coupon systems.",
    Friction: "Checkout flow bottlenecks, high latency, form errors, session timeouts.",
    Trust: "Payment failures, security concerns, 3DS challenges, gateway errors.",
  };

  const pieData = hypotheses.map((h: any) => ({
    name: h.category,
    value: Math.round(h.score * 100),
  }));

  return (
    <div className="space-y-6">
      {/* Overview */}
      <div className="text-center">
        <p className="text-sm text-slate-400">Primary diagnosis:</p>
        <div className="text-2xl font-bold text-white mt-1">
          {ICONS[diagnosis.top_category]} {diagnosis.top_category}
        </div>
      </div>

      {/* Pie chart */}
      <div className="h-56">
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={3}
              dataKey="value"
            >
              {pieData.map((entry: any, idx: number) => (
                <Cell key={idx} fill={COLORS[entry.name] || "#64748b"} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "8px" }}
              itemStyle={{ color: "#e2e8f0" }}
            />
            <Legend
              formatter={(value: string) => <span className="text-slate-300 text-xs">{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Hypothesis details */}
      <div className="space-y-3">
        {hypotheses
          .sort((a: any, b: any) => b.score - a.score)
          .map((h: any) => {
            const isTop = h.category === diagnosis.top_category;
            return (
              <div
                key={h.category}
                className={`rounded-xl p-4 border transition-all ${
                  isTop
                    ? "bg-cyan-900/20 border-cyan-500/40"
                    : "bg-slate-800/40 border-slate-700/30"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{ICONS[h.category]}</span>
                    <span className="font-semibold text-white">{h.category}</span>
                    {isTop && <span className="text-[10px] bg-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded">PRIMARY</span>}
                  </div>
                  <span className="text-lg font-bold" style={{ color: COLORS[h.category] }}>
                    {Math.round(h.score * 100)}
                  </span>
                </div>

                <p className="text-xs text-slate-400 mb-3">{DESCRIPTIONS[h.category]}</p>

                {/* Signals */}
                {h.signals && h.signals.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">Evidence ({h.signals.length} signals)</p>
                    {h.signals.map((signal: string, idx: number) => (
                      <div key={idx} className="flex items-start gap-2 text-xs">
                        <span className="text-cyan-500 mt-0.5">&#x2022;</span>
                        <span className="text-slate-300">{signal}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Leak Analysis Drill-Down
// ---------------------------------------------------------------------------
function LeakDrillDown({ data }: { data: any }) {
  const { leak, leaks } = data;
  if (!leak) return null;

  const allLeaks = leaks || [leak];

  return (
    <div className="space-y-6">
      {/* Primary leak */}
      <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-bold text-red-300">Primary Leak</h4>
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
            leak.severity === "high" ? "bg-red-500/20 text-red-300" :
            leak.severity === "medium" ? "bg-amber-500/20 text-amber-300" :
            "bg-green-500/20 text-green-300"
          }`}>
            {leak.severity?.toUpperCase()}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-slate-500">Segment</p>
            <p className="text-sm font-medium text-white">{leak.segment_key?.replace(/_/g, " ")}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Funnel Stage</p>
            <p className="text-sm font-medium text-white">{leak.stage?.replace(/_/g, " → ")}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Observed Rate</p>
            <p className="text-sm font-medium text-red-400">{(leak.observed_rate * 100).toFixed(1)}%</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Baseline Rate</p>
            <p className="text-sm font-medium text-cyan-400">{(leak.baseline_rate * 100).toFixed(1)}%</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Drop Magnitude</p>
            <p className="text-sm font-medium text-amber-400">{(leak.magnitude * 100).toFixed(1)}%</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Daily Revenue Lost</p>
            <p className="text-sm font-medium text-red-400">${leak.estimated_revenue_lost?.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Conversion comparison bar */}
      <div>
        <h4 className="text-sm font-semibold text-slate-300 mb-3">Conversion Rate Comparison</h4>
        <div className="space-y-2">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-cyan-400">Baseline</span>
              <span className="text-cyan-400">{(leak.baseline_rate * 100).toFixed(1)}%</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-4">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${leak.baseline_rate * 100}%` }}
                transition={{ duration: 0.8 }}
                className="h-4 rounded-full bg-cyan-500/60"
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-red-400">Observed (Incident)</span>
              <span className="text-red-400">{(leak.observed_rate * 100).toFixed(1)}%</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-4">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${leak.observed_rate * 100}%` }}
                transition={{ duration: 0.8, delay: 0.3 }}
                className="h-4 rounded-full bg-red-500/60"
              />
            </div>
          </div>
        </div>
        <div className="text-center mt-2">
          <span className="text-xs text-amber-400">
            &#x25BC; {((leak.baseline_rate - leak.observed_rate) * 100).toFixed(1)} percentage points drop
          </span>
        </div>
      </div>

      {/* All leaks table */}
      {allLeaks.length > 1 && (
        <div>
          <h4 className="text-sm font-semibold text-slate-300 mb-3">All Detected Leaks ({allLeaks.length})</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-2 text-slate-400 font-medium">Segment</th>
                  <th className="text-left py-2 text-slate-400 font-medium">Stage</th>
                  <th className="text-right py-2 text-slate-400 font-medium">Drop</th>
                  <th className="text-right py-2 text-slate-400 font-medium">Revenue Lost</th>
                  <th className="text-right py-2 text-slate-400 font-medium">Severity</th>
                </tr>
              </thead>
              <tbody>
                {allLeaks.map((l: any, i: number) => (
                  <tr key={i} className="border-b border-slate-800">
                    <td className="py-2 text-white">{l.segment_key?.replace(/_/g, " ")}</td>
                    <td className="py-2 text-slate-300">{l.stage?.replace(/_/g, " → ")}</td>
                    <td className="py-2 text-right text-amber-400">{(l.magnitude * 100).toFixed(1)}%</td>
                    <td className="py-2 text-right text-red-400">${l.estimated_revenue_lost?.toLocaleString()}</td>
                    <td className="py-2 text-right">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        l.severity === "high" ? "bg-red-500/20 text-red-300" :
                        l.severity === "medium" ? "bg-amber-500/20 text-amber-300" :
                        "bg-green-500/20 text-green-300"
                      }`}>{l.severity}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Remediation Drill-Down
// ---------------------------------------------------------------------------
function RemediationDrillDown({ data }: { data: any }) {
  const { remediation, diagnosis } = data;
  if (!remediation) return null;

  const PRIORITY_COLORS: Record<string, string> = {
    critical: "text-red-400 bg-red-500/20 border-red-500/30",
    high: "text-amber-400 bg-amber-500/20 border-amber-500/30",
    medium: "text-yellow-400 bg-yellow-500/20 border-yellow-500/30",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <span className={`text-xs px-3 py-1.5 rounded-full font-bold border ${PRIORITY_COLORS[remediation.priority] || ""}`}>
          {remediation.priority?.toUpperCase()} PRIORITY
        </span>
        <span className="text-sm text-slate-400">Category: <strong className="text-white">{remediation.category}</strong></span>
        <span className="text-sm text-slate-400">ETA: <strong className="text-cyan-400">{remediation.estimated_time_to_fix}</strong></span>
      </div>

      {/* Action steps */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-slate-300">Action Plan</h4>
        {(remediation.actions || []).map((action: string, idx: number) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="flex items-start gap-3 bg-slate-800/50 rounded-lg p-4 border border-slate-700/30"
          >
            <div className="flex-shrink-0 w-7 h-7 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center">
              <span className="text-xs font-bold text-cyan-400">{idx + 1}</span>
            </div>
            <div>
              <p className="text-sm text-white">{action}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Root cause context */}
      {diagnosis && (
        <div className="bg-slate-800/30 rounded-lg p-4 border border-slate-700/30">
          <h4 className="text-sm font-semibold text-slate-300 mb-2">Root Cause Context</h4>
          <p className="text-xs text-slate-400">
            Primary diagnosis: <strong className="text-white">{diagnosis.top_category}</strong>.
            {diagnosis.hypotheses?.length > 0 && (
              <> Based on {diagnosis.hypotheses.reduce((s: number, h: any) => s + (h.signals?.length || 0), 0)} correlated signals across {diagnosis.hypotheses.length} LIFT categories.</>
            )}
          </p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Impact Projection Drill-Down
// ---------------------------------------------------------------------------
function ImpactDrillDown({ data }: { data: any }) {
  const { impact, leak } = data;
  if (!impact) return null;

  const projectionData = Array.from({ length: 7 }, (_, i) => {
    const dayLoss = leak?.estimated_revenue_lost || 0;
    const recoveryFactor = i < 2 ? 0 : (i - 1) / 6;
    return {
      day: `Day ${i + 1}`,
      noAction: dayLoss,
      withFix: Math.round(dayLoss * (1 - recoveryFactor * 0.7)),
      bestCase: Math.round(dayLoss * (1 - recoveryFactor * 0.9)),
    };
  });

  return (
    <div className="space-y-6">
      {/* Key numbers */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-4 text-center">
          <p className="text-xs text-red-300 mb-1">7-Day Risk</p>
          <p className="text-2xl font-bold text-red-400">${impact.revenue_at_risk?.toLocaleString()}</p>
          <p className="text-[10px] text-slate-500">if no action taken</p>
        </div>
        <div className="bg-amber-900/20 border border-amber-500/30 rounded-xl p-4 text-center">
          <p className="text-xs text-amber-300 mb-1">Conservative</p>
          <p className="text-2xl font-bold text-amber-400">${impact.projected_recovery_low?.toLocaleString()}</p>
          <p className="text-[10px] text-slate-500">50% recovery</p>
        </div>
        <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-xl p-4 text-center">
          <p className="text-xs text-emerald-300 mb-1">Optimistic</p>
          <p className="text-2xl font-bold text-emerald-400">${impact.projected_recovery_high?.toLocaleString()}</p>
          <p className="text-[10px] text-slate-500">90% recovery</p>
        </div>
      </div>

      {/* Projection chart */}
      <div>
        <h4 className="text-sm font-semibold text-slate-300 mb-3">7-Day Revenue Impact Projection</h4>
        <div className="h-56">
          <ResponsiveContainer>
            <AreaChart data={projectionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="day" tick={{ fill: "#64748b", fontSize: 11 }} />
              <YAxis tick={{ fill: "#64748b", fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "8px" }}
                formatter={(v: any) => [`$${Number(v).toLocaleString()}`, ""]}
              />
              <Area type="monotone" dataKey="noAction" name="No Action" stroke="#ef4444" fill="#ef4444" fillOpacity={0.15} strokeWidth={2} />
              <Area type="monotone" dataKey="withFix" name="With Fix (50%)" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.10} strokeWidth={2} strokeDasharray="5 5" />
              <Area type="monotone" dataKey="bestCase" name="Best Case (90%)" stroke="#10b981" fill="#10b981" fillOpacity={0.10} strokeWidth={2} strokeDasharray="3 3" />
              <Legend
                formatter={(value: string) => <span className="text-slate-400 text-xs">{value}</span>}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Confidence */}
      <div className="bg-slate-800/30 rounded-lg p-3 border border-slate-700/30">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">Projection Confidence</span>
          <span className="text-sm font-bold text-cyan-400">{Math.round((impact.confidence || 0) * 100)}%</span>
        </div>
        <div className="w-full bg-slate-700 rounded-full h-2 mt-2">
          <div className="h-2 rounded-full bg-cyan-500" style={{ width: `${(impact.confidence || 0) * 100}%` }} />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Incident Drill-Down (from timeline)
// ---------------------------------------------------------------------------
function IncidentDrillDown({ data }: { data: any }) {
  const incident = data;
  const STATUS_COLORS: Record<string, string> = {
    active: "text-red-400 bg-red-500/20",
    mitigated: "text-amber-400 bg-amber-500/20",
    resolved: "text-emerald-400 bg-emerald-500/20",
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[incident.status] || ""}`}>
          {incident.status?.toUpperCase()}
        </span>
        <span className="text-sm text-slate-400">{incident.date}</span>
      </div>

      <div>
        <h4 className="text-lg font-bold text-white">{incident.segment}</h4>
        <p className="text-sm text-slate-300 mt-2">{incident.summary}</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-800/50 rounded-lg p-3 text-center">
          <p className="text-xs text-slate-500">RRAF Score</p>
          <p className={`text-xl font-bold ${incident.rrafScore >= 70 ? "text-red-400" : incident.rrafScore >= 40 ? "text-amber-400" : "text-green-400"}`}>
            {incident.rrafScore}
          </p>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-3 text-center">
          <p className="text-xs text-slate-500">Revenue Impact</p>
          <p className="text-xl font-bold text-red-400">${incident.revenueLost?.toLocaleString()}</p>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-3 text-center">
          <p className="text-xs text-slate-500">Category</p>
          <p className="text-xl font-bold text-cyan-400">{incident.category}</p>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-3 text-center">
          <p className="text-xs text-slate-500">Severity</p>
          <p className={`text-xl font-bold ${
            incident.severity === "high" ? "text-red-400" : incident.severity === "medium" ? "text-amber-400" : "text-green-400"
          }`}>{incident.severity}</p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Funnel Stage Drill-Down
// ---------------------------------------------------------------------------
function FunnelStageDrillDown({ data }: { data: any }) {
  const { stageName, observed, baseline, percentage } = data;

  return (
    <div className="space-y-5">
      <div className="text-center">
        <h4 className="text-2xl font-bold text-white">{stageName}</h4>
        <div className="flex items-center justify-center gap-6 mt-3">
          <div>
            <p className="text-xs text-slate-500">Observed</p>
            <p className="text-xl font-bold text-cyan-400">{observed?.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Baseline</p>
            <p className="text-xl font-bold text-slate-400">{baseline?.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Conversion</p>
            <p className="text-xl font-bold text-white">{percentage}%</p>
          </div>
        </div>
      </div>

      {/* Visual comparison */}
      <div className="space-y-3">
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-cyan-400">Observed</span>
            <span className="text-cyan-400">{observed?.toLocaleString()}</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-6">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, (observed / Math.max(1, baseline)) * 100)}%` }}
              transition={{ duration: 0.8 }}
              className="h-6 rounded-full bg-gradient-to-r from-cyan-500/60 to-cyan-400/40 flex items-center justify-end pr-2"
            >
              <span className="text-[10px] text-white font-medium">{Math.round((observed / Math.max(1, baseline)) * 100)}%</span>
            </motion.div>
          </div>
        </div>
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-400">Baseline</span>
            <span className="text-slate-400">{baseline?.toLocaleString()}</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-6">
            <div className="h-6 rounded-full bg-slate-600/40 border border-dashed border-slate-500 w-full flex items-center justify-end pr-2">
              <span className="text-[10px] text-slate-400">100%</span>
            </div>
          </div>
        </div>
      </div>

      {observed < baseline && (
        <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3 text-center">
          <span className="text-sm text-red-400">
            &#x25BC; {(((baseline - observed) / baseline) * 100).toFixed(1)}% below baseline ({(baseline - observed).toLocaleString()} fewer)
          </span>
        </div>
      )}
    </div>
  );
}
