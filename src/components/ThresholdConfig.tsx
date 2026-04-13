"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export interface Thresholds {
  leakSensitivity: number;     // % drop from baseline to flag (default 5)
  rrafWeightRisk: number;      // 0-1 (default 0.30)
  rrafWeightRootCause: number; // 0-1 (default 0.20)
  rrafWeightRevenue: number;   // 0-1 (default 0.35)
  rrafWeightFrequency: number; // 0-1 (default 0.15)
  alertThreshold: number;      // RRAF score to trigger alert (default 50)
}

interface ThresholdConfigProps {
  thresholds: Thresholds;
  onChange: (t: Thresholds) => void;
}

export default function ThresholdConfig({ thresholds, onChange }: ThresholdConfigProps) {
  const [open, setOpen] = useState(false);

  const update = (key: keyof Thresholds, value: number) => {
    onChange({ ...thresholds, [key]: value });
  };

  const weightsSum = thresholds.rrafWeightRisk + thresholds.rrafWeightRootCause + thresholds.rrafWeightRevenue + thresholds.rrafWeightFrequency;
  const weightsValid = Math.abs(weightsSum - 1) < 0.01;

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        Configure Thresholds
        <svg className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-4 bg-slate-800/40 border border-slate-700/30 rounded-xl p-5 space-y-4">
              {/* Leak Sensitivity */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Leak Sensitivity</span>
                  <span className="text-cyan-400 font-mono">{thresholds.leakSensitivity}% drop</span>
                </div>
                <input
                  type="range" min={1} max={20} step={1}
                  value={thresholds.leakSensitivity}
                  onChange={(e) => update("leakSensitivity", Number(e.target.value))}
                  className="w-full accent-cyan-500 h-1"
                />
                <div className="flex justify-between text-[10px] text-slate-600">
                  <span>Sensitive (1%)</span><span>Conservative (20%)</span>
                </div>
              </div>

              {/* Alert Threshold */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Alert Threshold (RRAF)</span>
                  <span className="text-cyan-400 font-mono">{thresholds.alertThreshold}</span>
                </div>
                <input
                  type="range" min={10} max={90} step={5}
                  value={thresholds.alertThreshold}
                  onChange={(e) => update("alertThreshold", Number(e.target.value))}
                  className="w-full accent-cyan-500 h-1"
                />
                <div className="flex justify-between text-[10px] text-slate-600">
                  <span>Low (10)</span><span>High (90)</span>
                </div>
              </div>

              {/* RRAF Weights */}
              <div>
                <p className="text-xs text-slate-400 mb-2">
                  RRAF Weights
                  {!weightsValid && <span className="text-red-400 ml-2">(must sum to 1.0, currently {weightsSum.toFixed(2)})</span>}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: "rrafWeightRisk" as const, label: "Risk" },
                    { key: "rrafWeightRootCause" as const, label: "Root Cause" },
                    { key: "rrafWeightRevenue" as const, label: "Revenue" },
                    { key: "rrafWeightFrequency" as const, label: "Frequency" },
                  ].map(({ key, label }) => (
                    <div key={key}>
                      <div className="flex justify-between text-[10px] mb-0.5">
                        <span className="text-slate-500">{label}</span>
                        <span className="text-slate-400 font-mono">{(thresholds[key] * 100).toFixed(0)}%</span>
                      </div>
                      <input
                        type="range" min={0} max={100} step={5}
                        value={thresholds[key] * 100}
                        onChange={(e) => update(key, Number(e.target.value) / 100)}
                        className="w-full accent-cyan-500 h-1"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
