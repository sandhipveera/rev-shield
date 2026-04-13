"use client";

import { motion } from "framer-motion";

export interface HistoricalIncident {
  id: string;
  date: string;
  segment: string;
  category: string;
  severity: "high" | "medium" | "low";
  rrafScore: number;
  revenueLost: number;
  status: "active" | "mitigated" | "resolved";
  summary: string;
}

interface IncidentTimelineProps {
  incidents: HistoricalIncident[];
}

const statusColors: Record<string, string> = {
  active: "bg-red-500",
  mitigated: "bg-amber-500",
  resolved: "bg-green-500",
};

const statusLabels: Record<string, string> = {
  active: "Active",
  mitigated: "Mitigated",
  resolved: "Resolved",
};

const severityBorder: Record<string, string> = {
  high: "border-red-500/40",
  medium: "border-amber-500/40",
  low: "border-green-500/40",
};

export default function IncidentTimeline({ incidents }: IncidentTimelineProps) {
  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-slate-700/50" />

      <div className="space-y-4">
        {incidents.map((incident, i) => (
          <motion.div
            key={incident.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className="flex gap-4"
          >
            {/* Timeline dot */}
            <div className="relative shrink-0 mt-2">
              <div className={`w-4 h-4 rounded-full ${statusColors[incident.status]} ring-4 ring-slate-900/80`} />
            </div>

            {/* Card */}
            <div className={`flex-1 bg-slate-900/60 border ${severityBorder[incident.severity]} rounded-xl p-4`}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-slate-500">{incident.date}</span>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                      incident.status === "active" ? "bg-red-500/20 text-red-400"
                      : incident.status === "mitigated" ? "bg-amber-500/20 text-amber-400"
                      : "bg-green-500/20 text-green-400"
                    }`}>
                      {statusLabels[incident.status]}
                    </span>
                  </div>
                  <p className="text-sm text-slate-300 font-medium">{incident.segment}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500">RRAF</p>
                  <p className={`text-lg font-bold ${
                    incident.rrafScore >= 70 ? "text-red-400" : incident.rrafScore >= 40 ? "text-amber-400" : "text-green-400"
                  }`}>
                    {incident.rrafScore}
                  </p>
                </div>
              </div>
              <p className="text-xs text-slate-500">{incident.summary}</p>
              <div className="flex items-center gap-4 mt-2 text-xs text-slate-600">
                <span>Category: {incident.category}</span>
                <span>Revenue impact: ${incident.revenueLost.toLocaleString()}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
