"use client";

import { motion } from "framer-motion";

interface MetricComparison {
  label: string;
  baseline: string;
  incident: string;
  recovered: string;
  unit: string;
  worse: boolean; // true = higher is worse (latency, errors), false = lower is worse (CVR, pay rate)
}

interface BeforeAfterComparisonProps {
  metrics: MetricComparison[];
}

export default function BeforeAfterComparison({ metrics }: BeforeAfterComparisonProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-700/50">
            <th className="text-left text-xs text-slate-500 uppercase tracking-wider py-3 pr-4">Metric</th>
            <th className="text-center text-xs text-slate-500 uppercase tracking-wider py-3 px-4">
              <span className="flex items-center justify-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-500/60" />
                Baseline
              </span>
            </th>
            <th className="text-center text-xs text-slate-500 uppercase tracking-wider py-3 px-4">
              <span className="flex items-center justify-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500/60" />
                Incident
              </span>
            </th>
            <th className="text-center text-xs text-slate-500 uppercase tracking-wider py-3 pl-4">
              <span className="flex items-center justify-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-green-500/60" />
                Post-Fix
              </span>
            </th>
          </tr>
        </thead>
        <tbody>
          {metrics.map((m, i) => (
            <motion.tr
              key={m.label}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              className="border-b border-slate-800/50"
            >
              <td className="py-3 pr-4 text-slate-300 font-medium">{m.label}</td>
              <td className="py-3 px-4 text-center">
                <span className="text-cyan-400 font-semibold">{m.baseline}</span>
                <span className="text-slate-600 text-xs ml-1">{m.unit}</span>
              </td>
              <td className="py-3 px-4 text-center">
                <span className="text-red-400 font-semibold">{m.incident}</span>
                <span className="text-slate-600 text-xs ml-1">{m.unit}</span>
              </td>
              <td className="py-3 pl-4 text-center">
                <span className="text-green-400 font-semibold">{m.recovered}</span>
                <span className="text-slate-600 text-xs ml-1">{m.unit}</span>
                <span className="ml-2 text-green-400/60 text-xs">&#x2713;</span>
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
