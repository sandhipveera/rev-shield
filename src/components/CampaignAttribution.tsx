"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from "recharts";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface Props {
  leak: any;
  leaks: any[];
  visible: boolean;
}

// Simulated ad spend data per channel (in a real app, pulled from Google Ads / Meta Ads APIs)
const CHANNEL_SPEND: Record<string, { dailySpend: number; cpc: number; cpa: number; roas: number }> = {
  "paid_social_mobile": { dailySpend: 4200, cpc: 1.85, cpa: 28.50, roas: 3.8 },
  "paid_social_desktop": { dailySpend: 2800, cpc: 2.10, cpa: 32.00, roas: 3.2 },
  "paid_search_mobile": { dailySpend: 3500, cpc: 3.20, cpa: 22.00, roas: 4.5 },
  "paid_search_desktop": { dailySpend: 2100, cpc: 3.80, cpa: 25.00, roas: 4.0 },
  "email_mobile": { dailySpend: 150, cpc: 0.15, cpa: 8.00, roas: 12.0 },
  "email_desktop": { dailySpend: 100, cpc: 0.12, cpa: 6.50, roas: 14.0 },
  "direct_mobile": { dailySpend: 0, cpc: 0, cpa: 0, roas: 0 },
  "direct_desktop": { dailySpend: 0, cpc: 0, cpa: 0, roas: 0 },
};

export default function CampaignAttribution({ leak, leaks, visible }: Props) {
  const attribution = useMemo(() => {
    if (!leaks || leaks.length === 0) return null;

    const channels = leaks.map((l: any) => {
      const key = l.segment_key?.toLowerCase().replace(/ \/ /g, "_").replace(/ /g, "_") || "";
      const spend = CHANNEL_SPEND[key] || { dailySpend: 500, cpc: 2.0, cpa: 25.0, roas: 3.0 };
      const revenueLost = l.estimated_revenue_lost || 0;
      const magnitude = l.magnitude || 0;

      // Wasted spend = ad spend that drove traffic to a broken funnel
      const wastedSpend = spend.dailySpend * magnitude;
      // Degraded ROAS during incident
      const degradedRoas = spend.dailySpend > 0
        ? ((revenueLost > 0 ? (spend.dailySpend * spend.roas - revenueLost) : spend.dailySpend * spend.roas) / spend.dailySpend)
        : 0;

      return {
        channel: l.segment_key?.replace(/_/g, " ") || "Unknown",
        key,
        dailySpend: spend.dailySpend,
        cpc: spend.cpc,
        cpa: spend.cpa,
        normalRoas: spend.roas,
        degradedRoas: Math.max(0, degradedRoas),
        revenueLost,
        wastedSpend: Math.round(wastedSpend),
        severity: l.severity,
        magnitude,
      };
    });

    const totalWasted = channels.reduce((s, c) => s + c.wastedSpend, 0);
    const totalSpend = channels.reduce((s, c) => s + c.dailySpend, 0);
    const totalLost = channels.reduce((s, c) => s + c.revenueLost, 0);

    return { channels, totalWasted, totalSpend, totalLost };
  }, [leaks]);

  if (!visible || !attribution) return null;

  const primaryChannel = attribution.channels[0];

  const roasData = attribution.channels
    .filter((c) => c.dailySpend > 0)
    .map((c) => ({
      channel: c.channel,
      "Normal ROAS": Number(c.normalRoas.toFixed(1)),
      "Degraded ROAS": Number(c.degradedRoas.toFixed(1)),
    }));

  const spendBreakdown = attribution.channels
    .filter((c) => c.dailySpend > 0)
    .map((c) => ({
      name: c.channel,
      value: c.dailySpend,
      wasted: c.wastedSpend,
    }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
        <span>&#x1F4B8;</span> Campaign Attribution &amp; Wasted Spend
      </h2>

      {/* Top-level metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Total Daily Ad Spend</p>
          <p className="text-xl font-bold text-white">${attribution.totalSpend.toLocaleString()}</p>
        </div>
        <div className="bg-slate-900/60 border border-red-500/30 rounded-xl p-4">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Wasted Spend (Leak)</p>
          <p className="text-xl font-bold text-red-400">${attribution.totalWasted.toLocaleString()}</p>
          <p className="text-[10px] text-red-400/60 mt-0.5">{((attribution.totalWasted / Math.max(1, attribution.totalSpend)) * 100).toFixed(0)}% of budget</p>
        </div>
        <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Revenue Lost</p>
          <p className="text-xl font-bold text-amber-400">${Math.round(attribution.totalLost).toLocaleString()}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">per day across all segments</p>
        </div>
        <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Blended ROAS Impact</p>
          <div className="flex items-baseline gap-2">
            <p className="text-xl font-bold text-white">
              {primaryChannel ? primaryChannel.degradedRoas.toFixed(1) : "0"}x
            </p>
            <span className="text-xs text-red-400">
              (was {primaryChannel ? primaryChannel.normalRoas.toFixed(1) : "0"}x)
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ROAS comparison chart */}
        <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-6">
          <h3 className="text-xs text-slate-500 uppercase tracking-wider mb-4">ROAS: Normal vs Degraded</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={roasData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis type="number" tick={{ fill: "#64748b", fontSize: 11 }} />
              <YAxis type="category" dataKey="channel" tick={{ fill: "#94a3b8", fontSize: 10 }} width={130} />
              <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: "12px", fontSize: "12px" }} />
              <Bar dataKey="Normal ROAS" fill="#22c55e" radius={[0, 4, 4, 0]} barSize={10} />
              <Bar dataKey="Degraded ROAS" fill="#ef4444" radius={[0, 4, 4, 0]} barSize={10} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Spend breakdown */}
        <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-6">
          <h3 className="text-xs text-slate-500 uppercase tracking-wider mb-4">Ad Spend Breakdown</h3>
          <div className="flex items-center gap-6">
            <ResponsiveContainer width="50%" height={200}>
              <PieChart>
                <Pie
                  data={spendBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  dataKey="value"
                  nameKey="name"
                  stroke="none"
                >
                  {spendBreakdown.map((_, i) => (
                    <Cell key={i} fill={["#06b6d4", "#8b5cf6", "#f59e0b", "#ec4899", "#10b981"][i % 5]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: "12px", fontSize: "12px" }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-2">
              {spendBreakdown.map((item, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: ["#06b6d4", "#8b5cf6", "#f59e0b", "#ec4899", "#10b981"][i % 5] }} />
                    <span className="text-slate-400">{item.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-white font-medium">${item.value.toLocaleString()}</span>
                    {item.wasted > 0 && (
                      <span className="text-red-400 ml-2 text-[10px]">-${item.wasted.toLocaleString()}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Per-channel detail cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
        {attribution.channels.filter((c) => c.dailySpend > 0).map((channel, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className={`bg-slate-800/40 border rounded-xl p-4 ${
              channel.severity === "high" ? "border-red-500/30" : "border-slate-700/30"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-300">{channel.channel}</span>
              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                channel.severity === "high" ? "bg-red-500/10 text-red-400 border-red-500/30"
                : channel.severity === "medium" ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                : "bg-green-500/10 text-green-400 border-green-500/30"
              }`}>{channel.severity}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <p className="text-slate-500">CPC</p>
                <p className="text-white font-medium">${channel.cpc.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-slate-500">CPA</p>
                <p className="text-white font-medium">${channel.cpa.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-slate-500">Wasted</p>
                <p className="text-red-400 font-medium">${channel.wastedSpend.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-slate-500">ROAS</p>
                <p className="text-white font-medium">
                  {channel.degradedRoas.toFixed(1)}x
                  <span className="text-red-400 text-[10px] ml-1">({(channel.degradedRoas - channel.normalRoas).toFixed(1)})</span>
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
