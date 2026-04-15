"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface AgentAction {
  id: string;
  type: "pause-ads" | "adjust-discount" | "slack-alert" | "scale-infra" | "rollback-deploy";
  title: string;
  description: string;
  risk: "low" | "medium" | "high";
  estimatedImpact: string;
  reversible: boolean;
  autoApprove: boolean;
  status: "proposed" | "approved" | "executing" | "executed" | "rejected";
  executedAt?: string;
}

interface Props {
  incident: any;
  visible: boolean;
}

const ACTION_ICONS: Record<string, string> = {
  "slack-alert": "\uD83D\uDD14",
  "pause-ads": "\u23F8\uFE0F",
  "adjust-discount": "\uD83C\uDFF7\uFE0F",
  "scale-infra": "\u2699\uFE0F",
  "rollback-deploy": "\u23EA",
};

const RISK_STYLES: Record<string, string> = {
  low: "bg-green-500/10 text-green-400 border-green-500/30",
  medium: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  high: "bg-red-500/10 text-red-400 border-red-500/30",
};

export default function AgentActionsPanel({ incident, visible }: Props) {
  const [actions, setActions] = useState<AgentAction[]>([]);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<any>(null);
  const [executionLog, setExecutionLog] = useState<{ actionId: string; message: string; time: string }[]>([]);

  const proposeActions = useCallback(async () => {
    if (!incident) return;
    setLoading(true);
    try {
      const res = await fetch("/api/agent-actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "propose", incident }),
      });
      const data = await res.json();
      if (res.ok) {
        setActions(data.actions);
        setSummary(data.summary);
        // Auto-execute auto-approved actions
        for (const action of data.actions) {
          if (action.autoApprove) {
            executeAction(action, data.actions);
          }
        }
      }
    } catch {
      // silent fail
    } finally {
      setLoading(false);
    }
  }, [incident]);

  useEffect(() => {
    if (visible && incident && actions.length === 0) {
      proposeActions();
    }
  }, [visible, incident, actions.length, proposeActions]);

  const executeAction = async (action: AgentAction, currentActions?: AgentAction[]) => {
    const allActions = currentActions || actions;
    // Update status to executing
    const updated = allActions.map((a) =>
      a.id === action.id ? { ...a, status: "executing" as const } : a
    );
    setActions(updated);

    try {
      const res = await fetch("/api/agent-actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "execute", actionId: action.id, action }),
      });
      const data = await res.json();

      setActions((prev) =>
        prev.map((a) =>
          a.id === action.id ? { ...a, status: "executed" as const, executedAt: data.executedAt } : a
        )
      );
      setExecutionLog((prev) => [
        { actionId: action.id, message: data.message, time: new Date().toLocaleTimeString() },
        ...prev,
      ]);
    } catch {
      setActions((prev) =>
        prev.map((a) => (a.id === action.id ? { ...a, status: "proposed" as const } : a))
      );
    }
  };

  const approveAction = (action: AgentAction) => {
    setActions((prev) =>
      prev.map((a) => (a.id === action.id ? { ...a, status: "approved" as const } : a))
    );
    executeAction({ ...action, status: "approved" });
  };

  const rejectAction = (actionId: string) => {
    setActions((prev) =>
      prev.map((a) => (a.id === actionId ? { ...a, status: "rejected" as const } : a))
    );
  };

  const approveAll = () => {
    const pending = actions.filter((a) => a.status === "proposed" && !a.autoApprove);
    for (const action of pending) {
      approveAction(action);
    }
  };

  if (!visible || !incident) return null;

  const pendingApproval = actions.filter((a) => a.status === "proposed" && !a.autoApprove);
  const executedCount = actions.filter((a) => a.status === "executed").length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-widest flex items-center gap-2">
          <span>&#x1F916;</span> Autonomous Agent Actions
          <span className="text-[10px] text-cyan-400 bg-cyan-500/10 border border-cyan-500/30 px-2 py-0.5 rounded-full font-bold normal-case tracking-normal">
            Human-in-the-Loop
          </span>
        </h2>
        {pendingApproval.length > 0 && (
          <button
            onClick={approveAll}
            className="px-3 py-1.5 text-xs font-medium bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 rounded-lg hover:bg-cyan-500/30 transition-colors"
          >
            Approve All ({pendingApproval.length})
          </button>
        )}
      </div>

      {/* Summary bar */}
      {summary && (
        <div className="flex items-center gap-4 mb-4 text-xs text-slate-500">
          <span>{summary.totalProposed} actions proposed</span>
          <span className="text-green-400">{executedCount} executed</span>
          {pendingApproval.length > 0 && (
            <span className="text-amber-400 animate-pulse">{pendingApproval.length} awaiting approval</span>
          )}
        </div>
      )}

      {loading && (
        <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-8 flex items-center justify-center gap-3">
          <motion.span
            className="inline-block w-5 h-5 border-2 border-cyan-300 border-t-transparent rounded-full"
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
          />
          <span className="text-sm text-slate-400">Agent analyzing incident and proposing actions...</span>
        </div>
      )}

      {/* Action cards */}
      <div className="space-y-3">
        <AnimatePresence>
          {actions.map((action, i) => (
            <motion.div
              key={action.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              className={`bg-slate-900/60 border rounded-xl p-5 transition-all ${
                action.status === "executed"
                  ? "border-green-500/30"
                  : action.status === "rejected"
                  ? "border-red-500/20 opacity-50"
                  : action.status === "executing"
                  ? "border-cyan-500/50 shadow-[0_0_20px_rgba(6,182,212,0.15)]"
                  : action.autoApprove && action.status === "proposed"
                  ? "border-green-500/20"
                  : "border-amber-500/30"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="text-lg">{ACTION_ICONS[action.type] || "\u26A1"}</span>
                    <h3 className="text-sm font-semibold text-white">{action.title}</h3>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${RISK_STYLES[action.risk]}`}>
                      {action.risk} risk
                    </span>
                    {action.reversible && (
                      <span className="text-[10px] text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">reversible</span>
                    )}
                    {action.autoApprove && (
                      <span className="text-[10px] text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full">auto-approved</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed mb-2">{action.description}</p>
                  <p className="text-xs text-cyan-400/70">
                    <span className="text-slate-500">Expected impact:</span> {action.estimatedImpact}
                  </p>
                </div>

                {/* Action buttons */}
                <div className="flex flex-col items-end gap-2 shrink-0">
                  {action.status === "proposed" && !action.autoApprove && (
                    <>
                      <button
                        onClick={() => approveAction(action)}
                        className="px-4 py-1.5 text-xs font-medium bg-green-500/20 text-green-300 border border-green-500/40 rounded-lg hover:bg-green-500/30 transition-colors"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => rejectAction(action.id)}
                        className="px-4 py-1.5 text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700 rounded-lg hover:bg-slate-700 transition-colors"
                      >
                        Reject
                      </button>
                    </>
                  )}
                  {action.status === "executing" && (
                    <motion.div
                      className="flex items-center gap-2 text-xs text-cyan-300"
                      animate={{ opacity: [1, 0.5, 1] }}
                      transition={{ repeat: Infinity, duration: 1.5 }}
                    >
                      <span className="w-3 h-3 border-2 border-cyan-300 border-t-transparent rounded-full animate-spin" />
                      Executing...
                    </motion.div>
                  )}
                  {action.status === "executed" && (
                    <div className="flex items-center gap-1.5 text-xs text-green-400">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      Executed
                    </div>
                  )}
                  {action.status === "rejected" && (
                    <span className="text-xs text-red-400/60">Rejected</span>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Execution log */}
      {executionLog.length > 0 && (
        <div className="mt-4 bg-slate-800/40 border border-slate-700/30 rounded-xl p-4">
          <h4 className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Execution Log</h4>
          <div className="space-y-1.5 max-h-32 overflow-y-auto">
            {executionLog.map((log, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <span className="text-slate-600 font-mono">{log.time}</span>
                <span className="text-green-400">&#x2713;</span>
                <span className="text-slate-400">{log.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Guardrails note */}
      <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-600">
        <span>&#x1F6E1;&#xFE0F;</span>
        <span>All actions are reversible. High-risk actions require human approval. Auto-approved actions are low-risk notifications and scaling.</span>
      </div>
    </motion.div>
  );
}
