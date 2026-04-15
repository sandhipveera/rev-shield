"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell,
} from "recharts";
import FunnelVisualization from "@/components/FunnelVisualization";
import RevenueTicker from "@/components/RevenueTicker";
import BeforeAfterComparison from "@/components/BeforeAfterComparison";
import IncidentTimeline, { type HistoricalIncident } from "@/components/IncidentTimeline";
import ThresholdConfig, { type Thresholds } from "@/components/ThresholdConfig";
import ExportButton from "@/components/ExportButton";
import DataSourcePanel, { type DataPayload, type ApifyIntelData } from "@/components/DataSourcePanel";
import DrillDownModal, { type DrillDownType } from "@/components/DrillDownModal";
import AgentActionsPanel from "@/components/AgentActionsPanel";
import CampaignAttribution from "@/components/CampaignAttribution";
import FunnelChatAgent from "@/components/FunnelChatAgent";
import { useSoundEffects } from "@/hooks/useSoundEffects";

/* eslint-disable @typescript-eslint/no-explicit-any */

// ---------------------------------------------------------------------------
// Pipeline stages
// ---------------------------------------------------------------------------

const PIPELINE_STAGES = [
  { id: "detect", label: "Detect", icon: "\ud83d\udd0d" },
  { id: "score", label: "Score", icon: "\ud83d\udcca" },
  { id: "diagnose", label: "Diagnose", icon: "\ud83e\ude7a" },
  { id: "heal", label: "Heal", icon: "\u2728" },
  { id: "verify", label: "Verify", icon: "\u2705" },
] as const;

const LIFT_ICONS: Record<string, string> = {
  Landing: "\ud83d\udec2", Incentive: "\ud83c\udfaf", Friction: "\u26a0\ufe0f", Trust: "\ud83d\udd12",
};

// Synthetic historical incidents for timeline
const HISTORICAL_INCIDENTS: HistoricalIncident[] = [
  { id: "inc-001", date: "2026-04-08", segment: "Paid Social / Mobile", category: "Friction", severity: "high", rrafScore: 80, revenueLost: 32190, status: "active", summary: "Checkout latency spike causing payment failures and cart abandonment" },
  { id: "inc-002", date: "2026-03-22", segment: "Email / Desktop", category: "Incentive", severity: "medium", rrafScore: 52, revenueLost: 8400, status: "resolved", summary: "Spring promo code validation failing for 15% of desktop email traffic" },
  { id: "inc-003", date: "2026-03-15", segment: "Direct / Desktop", category: "Trust", severity: "medium", rrafScore: 45, revenueLost: 6200, status: "resolved", summary: "3DS challenge rate spike after fraud rule update" },
  { id: "inc-004", date: "2026-03-02", segment: "Paid Search / Mobile", category: "Landing", severity: "low", rrafScore: 28, revenueLost: 3100, status: "resolved", summary: "New landing page variant underperforming on mobile Safari" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Home() {
  const [activeStep, setActiveStep] = useState<number>(-1);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [isRunning, setIsRunning] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // API data states
  const [leaks, setLeaks] = useState<any[] | null>(null);
  const [topIncident, setTopIncident] = useState<any | null>(null);
  const [verified, setVerified] = useState(false);
  const [aiNarrative, setAiNarrative] = useState<string | null>(null);
  const [tickerActive, setTickerActive] = useState(false);
  const [noLeaks, setNoLeaks] = useState(false);

  // Thresholds
  const [thresholds, setThresholds] = useState<Thresholds>({
    leakSensitivity: 5, rrafWeightRisk: 0.30, rrafWeightRootCause: 0.20,
    rrafWeightRevenue: 0.35, rrafWeightFrequency: 0.15, alertThreshold: 50,
  });

  // Incident history (combine current with historical)
  const [incidents, setIncidents] = useState<HistoricalIncident[]>(HISTORICAL_INCIDENTS);

  // External data source
  const [externalData, setExternalData] = useState<DataPayload | null>(null);
  const [dataSourceLabel, setDataSourceLabel] = useState<string>("Demo Data");

  // Apify competitive intelligence
  const [apifyIntel, setApifyIntel] = useState<ApifyIntelData | null>(null);

  // Drill-down modal
  const [drillDown, setDrillDown] = useState<{ isOpen: boolean; type: DrillDownType; data: any }>({ isOpen: false, type: null, data: null });
  const openDrillDown = useCallback((type: DrillDownType, data: any) => {
    setDrillDown({ isOpen: true, type, data });
  }, []);
  const closeDrillDown = useCallback(() => {
    setDrillDown({ isOpen: false, type: null, data: null });
  }, []);

  const handleDataReady = useCallback((data: DataPayload | null) => {
    setExternalData(data);
    if (data) {
      setDataSourceLabel(data.meta?.description || data.source.toUpperCase());
    } else {
      setDataSourceLabel("Demo Data");
    }
  }, []);

  const handleApifyResults = useCallback((data: ApifyIntelData) => {
    setApifyIntel(data);
  }, []);

  const { playAlert, playDetect, playScore, playDiagnose, playHeal, playSuccess } = useSoundEffects();
  const sfx = useRef({ playAlert, playDetect, playScore, playDiagnose, playHeal, playSuccess });
  useEffect(() => { sfx.current = { playAlert, playDetect, playScore, playDiagnose, playHeal, playSuccess }; });

  const playSfx = useCallback((name: keyof typeof sfx.current) => {
    if (soundEnabled) sfx.current[name]();
  }, [soundEnabled]);

  // ---------------------------------------------------------------------------
  // SSE-based analysis
  // ---------------------------------------------------------------------------

  const runAnalysis = useCallback(async () => {
    if (isRunning) return;
    setIsRunning(true);
    setLeaks(null);
    setTopIncident(null);
    setVerified(false);
    setAiNarrative(null);
    setTickerActive(false);
    setNoLeaks(false);
    setCompletedSteps(new Set());

    const stageMap: Record<string, number> = { detect: 0, score: 1, diagnose: 2, heal: 3, verify: 4 };

    try {
      const res = await fetch("/api/analyze-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weights: {
            risk: thresholds.rrafWeightRisk,
            rootCause: thresholds.rrafWeightRootCause,
            revenue: thresholds.rrafWeightRevenue,
            frequency: thresholds.rrafWeightFrequency,
          },
          // Pass external data if available (null = use seed data)
          ...(externalData ? {
            funnelData: externalData.funnelData,
            baselines: externalData.baselines,
            paymentEvents: externalData.paymentEvents,
            supportTickets: externalData.supportTickets,
          } : {}),
        }),
      });

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      if (!reader) throw new Error("No reader");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        let eventName = "";
        for (const line of lines) {
          if (line.startsWith("event: ")) {
            eventName = line.slice(7).trim();
          } else if (line.startsWith("data: ") && eventName) {
            const data = JSON.parse(line.slice(6));

            if (eventName === "step") {
              const idx = stageMap[data.step];
              if (idx !== undefined) {
                if (data.status === "running") {
                  setActiveStep(idx);
                } else if (data.status === "done") {
                  setCompletedSteps((s) => new Set(s).add(idx));
                  // Play sound for each step
                  const sounds: Record<number, keyof typeof sfx.current> = {
                    0: "playDetect", 1: "playScore", 2: "playDiagnose", 3: "playHeal", 4: "playSuccess",
                  };
                  if (sounds[idx]) playSfx(sounds[idx]);
                }
              }
            } else if (eventName === "detect") {
              setLeaks(data.leaks);
              if (data.leaks?.length > 0) {
                setTickerActive(true);
                playSfx("playAlert");
              }
            } else if (eventName === "score") {
              setTopIncident((prev: any) => ({ ...prev, ...data.topIncident }));
            } else if (eventName === "diagnose") {
              setTopIncident((prev: any) => ({ ...prev, diagnosis: data.diagnosis }));
            } else if (eventName === "remediate") {
              setTopIncident((prev: any) => ({ ...prev, remediation: data.remediation }));
            } else if (eventName === "project") {
              setTopIncident((prev: any) => ({ ...prev, impact: data.impact }));
            } else if (eventName === "done") {
              if (data.topIncident) {
                setTopIncident(data.topIncident);
                // Add to incident history
                setIncidents((prev) => {
                  const updated = [...prev];
                  if (updated[0]?.id === "inc-001") {
                    updated[0] = { ...updated[0], rrafScore: Math.round(data.topIncident.rraf.total), status: "mitigated" };
                  }
                  return updated;
                });
              } else {
                // No leaks detected
                setNoLeaks(true);
                setCompletedSteps(new Set([0, 1, 2, 3, 4]));
                playSfx("playSuccess");
              }
              setVerified(true);
              setTickerActive(false);
            }
            eventName = "";
          }
        }
      }

      // Fetch AI narrative
      const fullData = topIncident;
      if (fullData) {
        try {
          const aiRes = await fetch("/api/ai-narrative", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ incident: fullData }),
          });
          if (aiRes.ok) {
            const aiData = await aiRes.json();
            setAiNarrative(aiData.narrative);
          }
        } catch { /* optional */ }
      }

      setActiveStep(-1);
    } catch (err) {
      console.error("Analysis failed:", err);
      // Fallback to regular API
      try {
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ step: "full" }),
        });
        const data = await res.json();
        setLeaks(data.leaks);
        setTopIncident(data.topIncident);
        setVerified(true);
        setCompletedSteps(new Set([0, 1, 2, 3, 4]));
      } catch { /* */ }
    } finally {
      setIsRunning(false);
    }
  }, [isRunning, thresholds, playSfx, topIncident, externalData]);

  // Fetch AI narrative when topIncident is fully loaded and verified
  useEffect(() => {
    if (verified && topIncident?.impact && !aiNarrative) {
      fetch("/api/ai-narrative", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ incident: topIncident }),
      })
        .then((r) => r.ok ? r.json() : null)
        .then((d) => { if (d?.narrative) setAiNarrative(d.narrative); })
        .catch(() => {});
    }
  }, [verified, topIncident, aiNarrative]);

  // ---------------------------------------------------------------------------
  // Derived display data
  // ---------------------------------------------------------------------------

  const leak = topIncident?.leak;
  const rraf = topIncident?.rraf;
  const diagnosis = topIncident?.diagnosis;
  const remediation = topIncident?.remediation;
  const impact = topIncident?.impact;

  const severityColor = (s: string) => {
    if (s === "high") return "bg-red-500/20 text-red-400 border-red-500/30";
    if (s === "medium") return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    return "bg-green-500/20 text-green-400 border-green-500/30";
  };

  const funnelChartData = leaks ? leaks.map((l: any) => ({
    segment: l.segment_key.replace(/_/g, " "), magnitude: Math.round(l.magnitude * 100),
    revenue_lost: Math.round(l.estimated_revenue_lost), severity: l.severity,
  })) : [];

  const liftChartData = diagnosis ? diagnosis.hypotheses.map((h: any) => ({
    category: h.category, score: h.score, isTop: h.category === diagnosis.top_category,
  })) : [];

  // Funnel stages for FunnelVisualization (from the incident data)
  const funnelStages = leak ? [
    { label: "Sessions", value: 5096, baseline: 5200 },
    { label: "View Item", value: 3669, baseline: 3744 },
    { label: "Add to Cart", value: 770, baseline: 786 },
    { label: "Checkout", value: 431, baseline: 440 },
    { label: "Paid", value: Math.round(431 * leak.observed_rate), baseline: Math.round(440 * leak.baseline_rate) },
  ] : [];

  // Before/After comparison data
  const comparisonMetrics = leak ? [
    { label: "Checkout → Paid CVR", baseline: "91.0", incident: (leak.observed_rate * 100).toFixed(1), recovered: "91.4", unit: "%", worse: false },
    { label: "Payment Success", baseline: "92.0", incident: "77.5", recovered: "91.4", unit: "%", worse: false },
    { label: "Latency (P95)", baseline: "1,200", incident: "3,100", recovered: "1,230", unit: "ms", worse: true },
    { label: "Error Rate", baseline: "1.2", incident: "4.2", recovered: "1.3", unit: "%", worse: true },
    { label: "Support Tickets", baseline: "8", incident: "75", recovered: "10", unit: "/day", worse: true },
    { label: "Daily Revenue", baseline: "$33,768", incident: "$26,386", recovered: "$33,768", unit: "", worse: false },
  ] : [];

  const hasResults = leaks || topIncident;

  return (
    <div className="min-h-screen bg-[#0a0a1a] text-white font-sans selection:bg-cyan-500/30">
      {/* Subtle grid background */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03]" style={{
        backgroundImage: "linear-gradient(rgba(6,182,212,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,0.3) 1px, transparent 1px)",
        backgroundSize: "60px 60px",
      }} />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* ================================================================
            HEADER
        ================================================================ */}
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 sm:mb-12">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              RevShield
            </h1>
            <p className="text-sm text-slate-400 mt-1 tracking-wide">Autonomous GTM Revenue Agent</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Sound toggle */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors bg-slate-800/60 border border-slate-700/50 rounded-full px-3 py-1.5 cursor-pointer"
            >
              {soundEnabled ? "\ud83d\udd0a" : "\ud83d\udd07"} Sound
            </button>
            {/* Export button */}
            {topIncident && <ExportButton incident={topIncident} narrative={aiNarrative} />}
            {/* Status */}
            <div className="flex items-center gap-2 bg-slate-800/60 border border-slate-700/50 rounded-full px-4 py-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
              </span>
              <span className="text-xs text-green-400 font-medium">System Active</span>
            </div>
          </div>
        </header>

        {/* ================================================================
            DATA SOURCE PANEL
        ================================================================ */}
        <section className="mb-6">
          <DataSourcePanel onDataReady={handleDataReady} onApifyResults={handleApifyResults} isRunning={isRunning} />
          {externalData && (
            <div className="mt-2 flex items-center gap-2 text-xs text-cyan-400">
              <span className="inline-block w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
              Data loaded: {dataSourceLabel}
              {externalData.meta && (
                <span className="text-slate-500">
                  ({externalData.meta.rowCount} rows, {externalData.meta.segments.length} segments, {externalData.meta.dateRange.from} to {externalData.meta.dateRange.to})
                </span>
              )}
            </div>
          )}
        </section>

        {/* ================================================================
            PIPELINE VISUALIZATION
        ================================================================ */}
        <section className="mb-8 sm:mb-12 overflow-x-auto">
          <div className="flex items-center justify-center gap-0 min-w-[500px]">
            {PIPELINE_STAGES.map((stage, i) => {
              const isActive = activeStep === i;
              const isComplete = completedSteps.has(i);
              return (
                <div key={stage.id} className="flex items-center">
                  <motion.div
                    className={`relative flex flex-col items-center justify-center w-20 sm:w-28 h-20 sm:h-24 rounded-2xl border transition-all duration-300 ${
                      isActive ? "bg-cyan-500/10 border-cyan-400/60 shadow-[0_0_30px_rgba(6,182,212,0.3)]"
                      : isComplete ? "bg-cyan-500/5 border-cyan-500/30"
                      : "bg-slate-800/40 border-slate-700/40"
                    }`}
                    animate={isActive ? { scale: [1, 1.05, 1], transition: { repeat: Infinity, duration: 1.2 } } : { scale: 1 }}
                  >
                    <span className="text-xl sm:text-2xl mb-1">{stage.icon}</span>
                    <span className={`text-[10px] sm:text-xs font-semibold tracking-wide ${
                      isActive ? "text-cyan-300" : isComplete ? "text-cyan-400/80" : "text-slate-500"
                    }`}>{stage.label}</span>
                    {isComplete && (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-cyan-500 rounded-full flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </motion.div>
                    )}
                  </motion.div>
                  {i < PIPELINE_STAGES.length - 1 && (
                    <div className="flex items-center mx-0.5 sm:mx-1">
                      <div className={`w-4 sm:w-8 h-0.5 transition-colors duration-500 ${completedSteps.has(i) ? "bg-cyan-500/60" : "bg-slate-700/40"}`} />
                      <svg className={`w-3 h-3 -ml-1 transition-colors duration-500 ${completedSteps.has(i) ? "text-cyan-500/60" : "text-slate-700/40"}`} fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* ================================================================
            THRESHOLD CONFIG + ACTION BUTTON
        ================================================================ */}
        <section className="flex flex-col items-center gap-4 mb-12 sm:mb-16">
          <ThresholdConfig thresholds={thresholds} onChange={setThresholds} />
          <motion.button
            onClick={runAnalysis} disabled={isRunning}
            className={`relative px-8 sm:px-10 py-3 sm:py-4 rounded-2xl font-semibold text-base sm:text-lg transition-all duration-300 cursor-pointer ${
              isRunning ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
              : "bg-cyan-500 text-white hover:bg-cyan-400 shadow-[0_0_40px_rgba(6,182,212,0.4)] hover:shadow-[0_0_60px_rgba(6,182,212,0.6)]"
            }`}
            whileHover={!isRunning ? { scale: 1.03 } : {}} whileTap={!isRunning ? { scale: 0.97 } : {}}
          >
            {isRunning ? (
              <span className="flex items-center gap-3">
                <motion.span className="inline-block w-5 h-5 border-2 border-cyan-300 border-t-transparent rounded-full"
                  animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }} />
                Analyzing Funnel...
              </span>
            ) : "Analyze Funnel"}
            {!isRunning && (
              <motion.div className="absolute inset-0 rounded-2xl border-2 border-cyan-400/50"
                animate={{ scale: [1, 1.05, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ repeat: Infinity, duration: 2 }} />
            )}
          </motion.button>
        </section>

        {/* ================================================================
            REVENUE TICKER (#2)
        ================================================================ */}
        <AnimatePresence>
          {tickerActive && leak && (
            <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mb-8">
              <RevenueTicker dailyLoss={leak.estimated_revenue_lost} active={tickerActive} />
            </motion.section>
          )}
        </AnimatePresence>

        {/* ================================================================
            LEAKS OVERVIEW + FUNNEL VIZ (#1, #6)
        ================================================================ */}
        <AnimatePresence>
          {leaks && leaks.length > 0 && (
            <motion.section initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-12">
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-4">Detected Revenue Leaks</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Funnel visualization (#1) */}
                <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-6">
                  <h3 className="text-xs text-slate-500 uppercase tracking-wider mb-4">Funnel Flow &mdash; Incident Segment</h3>
                  {funnelStages.length > 0 && <FunnelVisualization stages={funnelStages} leakStageIndex={4}
                    onStageClick={(stage, idx) => openDrillDown("funnel-stage", {
                      stageName: stage.label, observed: stage.value, baseline: stage.baseline,
                      percentage: stage.baseline > 0 ? ((stage.value / stage.baseline) * 100).toFixed(1) : "N/A",
                    })} />}
                </div>
                {/* Leak severity chart + cards */}
                <div className="space-y-4">
                  <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-6">
                    <h3 className="text-xs text-slate-500 uppercase tracking-wider mb-4">Drop Magnitude by Segment</h3>
                    <ResponsiveContainer width="100%" height={160}>
                      <BarChart data={funnelChartData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis type="number" tick={{ fill: "#64748b", fontSize: 12 }} unit="%" />
                        <YAxis type="category" dataKey="segment" tick={{ fill: "#94a3b8", fontSize: 11 }} width={120} />
                        <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: "12px", fontSize: "12px" }} />
                        <Bar dataKey="magnitude" radius={[0, 6, 6, 0]}>
                          {funnelChartData.map((entry: any, index: number) => (
                            <Cell key={index} fill={entry.severity === "high" ? "#ef4444" : entry.severity === "medium" ? "#eab308" : "#22c55e"} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  {leaks.map((l: any, i: number) => (
                    <motion.div key={l.segment_key} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      onClick={() => openDrillDown("leak", { leak: l, leaks })}
                      className={`bg-slate-900/60 border rounded-xl p-4 flex items-center justify-between cursor-pointer hover:border-cyan-400/50 transition-colors ${i === 0 ? "border-cyan-500/40" : "border-slate-700/50"}`}>
                      <div>
                        <span className={`inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${severityColor(l.severity)}`}>{l.severity}</span>
                        <p className="text-sm text-slate-300 mt-1 font-medium">{l.segment_key.replace(/_/g, " ")}</p>
                        <p className="text-xs text-slate-500">{l.stage.replace(/_/g, " ")}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-red-400">${Math.round(l.estimated_revenue_lost).toLocaleString()}</p>
                        <p className="text-xs text-slate-500">daily loss</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* ================================================================
            TOP INCIDENT - RRAF SCORE
        ================================================================ */}
        <AnimatePresence>
          {rraf && leak && (
            <motion.section initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-12">
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-4">Top Incident &mdash; Risk Score <span className="text-[10px] text-slate-600 normal-case tracking-normal font-normal ml-2">click to drill down</span></h2>
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <div className="lg:col-span-3 bg-slate-900/60 border border-slate-700/50 rounded-2xl p-6 cursor-pointer hover:border-cyan-500/40 transition-colors"
                  onClick={() => openDrillDown("rraf", { rraf, leak })}>
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <span className={`inline-block text-xs font-bold uppercase px-3 py-1 rounded-full border ${severityColor(leak.severity)}`}>{leak.severity}</span>
                      <p className="text-slate-400 text-sm mt-3">Funnel Stage</p>
                      <p className="text-white font-semibold text-lg">Checkout &rarr; Payment</p>
                      <div className="flex gap-3 mt-3">
                        <span className="text-xs bg-slate-800 text-slate-300 px-3 py-1 rounded-full border border-slate-700/50">{leak.segment_key.replace(/_/g, " ")}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="relative w-24 h-24 sm:w-28 sm:h-28">
                        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                          <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(51,65,85,0.5)" strokeWidth="8" />
                          <motion.circle cx="50" cy="50" r="42" fill="none"
                            stroke={rraf.total >= 70 ? "#ef4444" : rraf.total >= 40 ? "#eab308" : "#22c55e"}
                            strokeWidth="8" strokeLinecap="round" strokeDasharray={2 * Math.PI * 42}
                            initial={{ strokeDashoffset: 2 * Math.PI * 42 }}
                            animate={{ strokeDashoffset: 2 * Math.PI * 42 * (1 - rraf.total / 100) }}
                            transition={{ duration: 1.2, ease: "easeOut" }} />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-2xl sm:text-3xl font-bold text-cyan-400">{Math.round(rraf.total)}</span>
                          <span className="text-[10px] text-slate-500 uppercase tracking-wider">RRAF</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: "Risk", value: rraf.risk, weight: `${(thresholds.rrafWeightRisk * 100).toFixed(0)}%` },
                      { label: "Root Cause", value: rraf.root_cause_confidence, weight: `${(thresholds.rrafWeightRootCause * 100).toFixed(0)}%` },
                      { label: "Revenue", value: rraf.affected_revenue, weight: `${(thresholds.rrafWeightRevenue * 100).toFixed(0)}%` },
                      { label: "Frequency", value: rraf.frequency, weight: `${(thresholds.rrafWeightFrequency * 100).toFixed(0)}%` },
                    ].map((c) => (
                      <div key={c.label} className="bg-slate-800/40 rounded-lg p-3 text-center">
                        <p className="text-[10px] text-slate-500 uppercase">{c.label}</p>
                        <p className="text-lg font-bold text-white">{(c.value * 100).toFixed(0)}%</p>
                        <div className="mt-1 h-1 bg-slate-700/50 rounded-full overflow-hidden">
                          <motion.div className="h-full bg-cyan-500 rounded-full" initial={{ width: "0%" }}
                            animate={{ width: `${c.value * 100}%` }} transition={{ duration: 0.8 }} />
                        </div>
                        <p className="text-[9px] text-slate-600 mt-1">weight: {c.weight}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="lg:col-span-2 grid grid-cols-1 gap-4">
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}
                    className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-5">
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Revenue at Risk</p>
                    <p className="text-3xl font-bold text-red-400">${Math.round(leak.estimated_revenue_lost).toLocaleString()}</p>
                    <p className="text-xs text-red-400/70 mt-1">per day</p>
                  </motion.div>
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
                    className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-5">
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Conversion Drop</p>
                    <div className="flex items-baseline gap-3">
                      <p className="text-2xl font-bold text-white">{(leak.observed_rate * 100).toFixed(1)}%</p>
                      <span className="text-sm font-semibold text-red-400">{((leak.observed_rate - leak.baseline_rate) * 100).toFixed(1)}pp</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">baseline: {(leak.baseline_rate * 100).toFixed(1)}%</p>
                  </motion.div>
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}
                    className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-5">
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Drop Magnitude</p>
                    <p className="text-2xl font-bold text-amber-400">{(leak.magnitude * 100).toFixed(1)}%</p>
                    <p className="text-xs text-slate-500 mt-1">below baseline</p>
                  </motion.div>
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* ================================================================
            LIFT DIAGNOSIS
        ================================================================ */}
        <AnimatePresence>
          {diagnosis && (
            <motion.section initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-12">
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-4">LIFT Diagnosis</h2>
              <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-6 cursor-pointer hover:border-cyan-500/40 transition-colors"
                onClick={() => openDrillDown("lift", { diagnosis })}>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                  <div>
                    <div className="flex gap-2 sm:gap-3 mb-4 flex-wrap">
                      {diagnosis.hypotheses.map((h: any) => (
                        <motion.div key={h.category} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                          className={`px-3 sm:px-4 py-2 rounded-xl border text-sm font-semibold transition-all ${
                            h.category === diagnosis.top_category
                              ? "bg-cyan-500/15 border-cyan-400/50 text-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.2)]"
                              : "bg-slate-800/60 border-slate-700/40 text-slate-500"
                          }`}>
                          <span className="mr-1 sm:mr-2">{LIFT_ICONS[h.category]}</span>{h.category}
                        </motion.div>
                      ))}
                    </div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Primary Category</p>
                    <p className="text-xl font-bold text-cyan-400">{LIFT_ICONS[diagnosis.top_category]} {diagnosis.top_category}</p>
                  </div>
                  <div>
                    <ResponsiveContainer width="100%" height={160}>
                      <BarChart data={liftChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="category" tick={{ fill: "#94a3b8", fontSize: 12 }} />
                        <YAxis tick={{ fill: "#64748b", fontSize: 12 }} />
                        <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: "12px", fontSize: "12px" }} />
                        <Bar dataKey="score" radius={[6, 6, 0, 0]}>
                          {liftChartData.map((entry: any, index: number) => (
                            <Cell key={index} fill={entry.isTop ? "#06b6d4" : "#334155"} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div>
                  <h3 className="text-xs text-slate-500 uppercase tracking-wider mb-3">Supporting Evidence</h3>
                  <ul className="space-y-2">
                    {diagnosis.hypotheses.filter((h: any) => h.signals.length > 0).flatMap((h: any) =>
                      h.signals.map((s: string, si: number) => (
                        <motion.li key={`${h.category}-${si}`} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: si * 0.05 }} className="flex items-start gap-3 text-sm text-slate-400">
                          <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${h.category === diagnosis.top_category ? "bg-cyan-500" : "bg-slate-600"}`} />
                          <span><span className="text-slate-500 text-xs font-medium mr-2">[{h.category}]</span>{s}</span>
                        </motion.li>
                      ))
                    )}
                  </ul>
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* ================================================================
            REMEDIATION + IMPACT
        ================================================================ */}
        <AnimatePresence>
          {remediation && (
            <motion.section initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-12">
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-4">Remediation Plan</h2>
              <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-6 cursor-pointer hover:border-cyan-500/40 transition-colors"
                onClick={() => openDrillDown("remediation", { remediation, diagnosis })}>
                <div className="flex flex-wrap items-center gap-3 mb-6">
                  <span className={`text-xs font-bold uppercase px-3 py-1 rounded-full border ${
                    remediation.priority === "critical" ? "bg-red-500/20 text-red-400 border-red-500/30"
                    : remediation.priority === "high" ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                    : "bg-blue-500/20 text-blue-400 border-blue-500/30"
                  }`}>{remediation.priority} priority</span>
                  <span className="text-xs text-slate-500">Category: {remediation.category}</span>
                  <span className="text-xs text-slate-500">ETA: {remediation.estimated_time_to_fix}</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {remediation.actions.map((action: string, i: number) => (
                    <motion.li key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}
                      className="flex items-start gap-3">
                      <span className="mt-0.5 w-5 h-5 rounded-md border bg-slate-800/60 border-slate-700/50 flex items-center justify-center shrink-0 text-xs text-slate-500">{i + 1}</span>
                      <span className="text-sm text-slate-300">{action}</span>
                    </motion.li>
                  ))}
                </ul>
                {impact && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 cursor-pointer" onClick={() => openDrillDown("impact", { impact, leak })}>
                    <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/30 hover:border-cyan-500/40 transition-colors">
                      <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">7-Day Revenue at Risk</p>
                      <p className="text-xl font-bold text-red-400">${Math.round(impact.revenue_at_risk).toLocaleString()}</p>
                    </div>
                    <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/30">
                      <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Projected Recovery</p>
                      <p className="text-xl font-bold text-green-400">${Math.round(impact.projected_recovery_low).toLocaleString()} &ndash; ${Math.round(impact.projected_recovery_high).toLocaleString()}</p>
                    </div>
                    <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/30">
                      <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Confidence</p>
                      <p className="text-xl font-bold text-cyan-400">{Math.round(impact.confidence * 100)}%</p>
                      <div className="mt-2 h-2 bg-slate-700/50 rounded-full overflow-hidden">
                        <motion.div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"
                          initial={{ width: "0%" }} animate={{ width: `${impact.confidence * 100}%` }}
                          transition={{ duration: 1, ease: "easeOut" }} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* ================================================================
            AUTONOMOUS AGENT ACTIONS
        ================================================================ */}
        <AnimatePresence>
          {remediation && topIncident && (
            <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-12">
              <AgentActionsPanel incident={topIncident} visible={!!remediation} />
            </motion.section>
          )}
        </AnimatePresence>

        {/* ================================================================
            CAMPAIGN ATTRIBUTION
        ================================================================ */}
        <AnimatePresence>
          {leaks && leaks.length > 0 && verified && (
            <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-12">
              <CampaignAttribution leak={leak} leaks={leaks} visible={true} />
            </motion.section>
          )}
        </AnimatePresence>

        {/* ================================================================
            BEFORE / AFTER COMPARISON (#3)
        ================================================================ */}
        <AnimatePresence>
          {verified && comparisonMetrics.length > 0 && (
            <motion.section initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-12">
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-4">Before / During / After</h2>
              <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-6">
                <BeforeAfterComparison metrics={comparisonMetrics} />
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* ================================================================
            AI NARRATIVE
        ================================================================ */}
        <AnimatePresence>
          {aiNarrative && (
            <motion.section initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-12">
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-4">
                <span className="mr-2">&#x1F916;</span> AI Executive Summary
              </h2>
              <div className="bg-slate-900/60 border border-cyan-500/20 rounded-2xl p-6">
                <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">{aiNarrative}</p>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* ================================================================
            APIFY COMPETITIVE INTELLIGENCE
        ================================================================ */}
        <AnimatePresence>
          {apifyIntel && (
            <motion.section initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-12">
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-4">
                <span className="mr-2">&#x1F577;&#xFE0F;</span> Competitive Intelligence
                <span className="ml-2 text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold">Apify</span>
              </h2>

              {/* Competitor Pricing Results */}
              {apifyIntel.mode === "competitor-pricing" && (
                <div className="bg-slate-900/60 border border-amber-500/20 rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-amber-300">Competitor Price Monitor</h3>
                    <div className="text-xs text-slate-500">
                      {apifyIntel.summary.totalScraped} scraped &middot; {apifyIntel.summary.withPrices} with prices &middot; avg ${apifyIntel.summary.avgPrice}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {apifyIntel.results.map((r: any, i: number) => (
                      <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                        className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4">
                        <p className="text-xs text-slate-500 truncate mb-1">{r.url}</p>
                        <p className="text-sm font-medium text-white truncate">{r.title}</p>
                        <div className="flex items-baseline justify-between mt-2">
                          <span className="text-xl font-bold text-amber-400">{r.price !== "N/A" ? `$${r.price}` : "N/A"}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            r.availability === "InStock" ? "bg-green-500/10 text-green-400" : "bg-slate-700 text-slate-400"
                          }`}>{r.availability === "InStock" ? "In Stock" : r.availability}</span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Landing Page Health Results */}
              {apifyIntel.mode === "landing-page-health" && (
                <div className="bg-slate-900/60 border border-amber-500/20 rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-amber-300">Landing Page Health</h3>
                    <div className="text-xs text-slate-500">
                      {apifyIntel.summary.healthy}/{apifyIntel.summary.totalChecked} healthy &middot; avg {apifyIntel.summary.avgLoadTimeMs}ms
                    </div>
                  </div>
                  <div className="space-y-2">
                    {apifyIntel.results.map((r: any, i: number) => (
                      <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                        className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4 flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">{r.title}</p>
                          <p className="text-xs text-slate-500 truncate">{r.url}</p>
                        </div>
                        <div className="flex items-center gap-3 ml-4">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                            r.status < 400 ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
                          }`}>{r.status}</span>
                          <span className={`text-xs ${r.hasSSL ? "text-green-400" : "text-red-400"}`}>
                            {r.hasSSL ? "SSL" : "No SSL"}
                          </span>
                          <span className={`text-xs ${r.brokenLinks > 3 ? "text-red-400" : "text-slate-400"}`}>
                            {r.brokenLinks} broken
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                  {apifyIntel.alerts && apifyIntel.alerts.length > 0 && (
                    <div className="mt-4 p-3 bg-red-900/20 border border-red-500/20 rounded-lg">
                      <p className="text-xs font-semibold text-red-400 mb-2">Alerts</p>
                      {apifyIntel.alerts.map((a: any, i: number) => (
                        <p key={i} className="text-xs text-red-300">{a.url} &mdash; {a.reason}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Review Sentiment Results */}
              {apifyIntel.mode === "review-sentiment" && (
                <div className="bg-slate-900/60 border border-amber-500/20 rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-amber-300">Review Sentiment</h3>
                    <div className="text-xs text-slate-500">
                      {apifyIntel.summary.totalPlatforms} platforms &middot; avg {apifyIntel.summary.avgRating}/5 &middot; {apifyIntel.summary.totalReviews} total
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {apifyIntel.results.map((r: any, i: number) => (
                      <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                        className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded">{r.platform}</span>
                          <div className="flex items-center gap-1">
                            <span className="text-amber-400">&#x2B50;</span>
                            <span className="text-lg font-bold text-white">{r.avgRating.toFixed(1)}</span>
                            <span className="text-xs text-slate-500">/ 5</span>
                          </div>
                        </div>
                        <p className="text-xs text-slate-400">{r.totalReviews.toLocaleString()} reviews</p>
                        {r.recentNegative.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-slate-700/50">
                            <p className="text-[10px] text-red-400/70 uppercase tracking-wider mb-1">Recent Negative</p>
                            {r.recentNegative.slice(0, 2).map((text: string, j: number) => (
                              <p key={j} className="text-xs text-slate-500 truncate">&ldquo;{text}&rdquo;</p>
                            ))}
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </motion.section>
          )}
        </AnimatePresence>

        {/* ================================================================
            VERIFIED BANNER
        ================================================================ */}
        <AnimatePresence>
          {verified && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="mb-12 bg-green-500/10 border border-green-500/30 rounded-2xl p-6 text-center">
              <p className="text-green-400 font-semibold text-lg">Pipeline Complete &mdash; Remediation Verified</p>
              <p className="text-sm text-green-400/60 mt-1">Self-healing actions have been validated. Funnel recovery is in progress.</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ================================================================
            FUNNEL TREND CHART
        ================================================================ */}
        <AnimatePresence>
          {verified && (
            <motion.section initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-12">
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-4">Funnel Trend &mdash; Paid Social Mobile</h2>
              <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-6">
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={[
                    { date: "Mar 28", cvr: 91.3, baseline: 91.0 }, { date: "Mar 29", cvr: 91.4, baseline: 91.0 },
                    { date: "Mar 30", cvr: 91.2, baseline: 91.0 }, { date: "Mar 31", cvr: 91.4, baseline: 91.0 },
                    { date: "Apr 01", cvr: 91.2, baseline: 91.0 }, { date: "Apr 02", cvr: 91.1, baseline: 91.0 },
                    { date: "Apr 03", cvr: 91.2, baseline: 91.0 }, { date: "Apr 04", cvr: 91.0, baseline: 91.0 },
                    { date: "Apr 05", cvr: 85.0, baseline: 91.0 }, { date: "Apr 06", cvr: 80.9, baseline: 91.0 },
                    { date: "Apr 07", cvr: 80.3, baseline: 91.0 }, { date: "Apr 08", cvr: 77.5, baseline: 91.0 },
                    { date: "Apr 09", cvr: 83.5, baseline: 91.0 }, { date: "Apr 10", cvr: 91.4, baseline: 91.0 },
                  ]}>
                    <defs>
                      <linearGradient id="cvrGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="date" tick={{ fill: "#64748b", fontSize: 11 }} />
                    <YAxis domain={[70, 95]} tick={{ fill: "#64748b", fontSize: 11 }} unit="%" />
                    <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: "12px", fontSize: "12px" }} />
                    <Area type="monotone" dataKey="baseline" stroke="#475569" strokeWidth={2} strokeDasharray="6 3" fill="none" name="Baseline" />
                    <Area type="monotone" dataKey="cvr" stroke="#06b6d4" strokeWidth={2} fill="url(#cvrGradient)" name="Checkout-to-Paid CVR" />
                  </AreaChart>
                </ResponsiveContainer>
                <div className="flex items-center gap-6 mt-3 justify-center text-xs text-slate-500">
                  <span className="flex items-center gap-2"><span className="w-4 h-0.5 bg-cyan-500 inline-block" /> Observed CVR</span>
                  <span className="flex items-center gap-2"><span className="w-4 h-0.5 bg-slate-500 inline-block" style={{ borderTop: "2px dashed #64748b", height: 0 }} /> Baseline</span>
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* ================================================================
            INCIDENT HISTORY TIMELINE (#7)
        ================================================================ */}
        <AnimatePresence>
          {verified && (
            <motion.section initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-12">
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-4">Incident History</h2>
              <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-6">
                <IncidentTimeline incidents={incidents} onIncidentClick={(incident) => openDrillDown("incident", incident)} />
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* No leaks detected */}
        {noLeaks && !isRunning && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-8 border border-emerald-500/30 bg-emerald-900/20 rounded-2xl p-8 text-center"
          >
            <div className="text-5xl mb-4">&#x2705;</div>
            <h3 className="text-2xl font-bold text-emerald-400 mb-2">Funnel is Healthy</h3>
            <p className="text-slate-400 max-w-lg mx-auto">
              No revenue leaks detected. All funnel stages are operating within baseline parameters.
              {externalData?.source === "shopify" && (
                <span className="block mt-2 text-xs text-slate-500">
                  Tip: For a more comprehensive analysis, try loading more days of data or use the Scenario Generator to simulate degradation patterns.
                </span>
              )}
            </p>
          </motion.div>
        )}

        {/* Footer */}
        {!hasResults && !noLeaks && !isRunning && (
          <div className="text-center text-slate-600 text-sm mt-8">
            Press <span className="text-slate-400 font-medium">Analyze Funnel</span> to run the self-healing pipeline
          </div>
        )}
      </div>

      {/* Drill-down modal */}
      <DrillDownModal isOpen={drillDown.isOpen} onClose={closeDrillDown} type={drillDown.type} data={drillDown.data} />

      {/* Floating chat agent (Minds AI) */}
      <FunnelChatAgent incident={topIncident} />
    </div>
  );
}
