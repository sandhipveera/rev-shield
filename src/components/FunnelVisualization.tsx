"use client";

import { motion } from "framer-motion";

interface FunnelStage {
  label: string;
  value: number;
  baseline: number;
}

interface FunnelVisualizationProps {
  stages: FunnelStage[];
  leakStageIndex: number; // which stage has the leak
  onStageClick?: (stage: FunnelStage, index: number) => void;
}

export default function FunnelVisualization({ stages, leakStageIndex, onStageClick }: FunnelVisualizationProps) {
  const maxValue = stages[0]?.value ?? 1;

  return (
    <div className="w-full">
      <div className="flex flex-col items-center gap-0">
        {stages.map((stage, i) => {
          const widthPercent = Math.max(20, (stage.value / maxValue) * 100);
          const baselineWidthPercent = Math.max(20, (stage.baseline / maxValue) * 100);
          const isLeak = i === leakStageIndex;
          const isAfterLeak = i > leakStageIndex;
          const dropFromBaseline = stage.baseline > 0 ? ((stage.baseline - stage.value) / stage.baseline) * 100 : 0;

          return (
            <div key={stage.label} className={`w-full flex flex-col items-center ${onStageClick ? "cursor-pointer" : ""}`}
              onClick={() => onStageClick?.(stage, i)}>
              {/* Stage row */}
              <div className="w-full flex items-center gap-4">
                {/* Label */}
                <div className="w-28 text-right shrink-0">
                  <p className={`text-xs font-semibold ${isLeak ? "text-red-400" : "text-slate-400"}`}>
                    {stage.label}
                  </p>
                  <p className={`text-[10px] ${isLeak ? "text-red-400/70" : "text-slate-600"}`}>
                    {stage.value.toLocaleString()}
                  </p>
                </div>

                {/* Bar container */}
                <div className="flex-1 relative h-10 flex items-center justify-center">
                  {/* Baseline ghost bar */}
                  <div
                    className="absolute h-10 rounded-lg border border-dashed border-slate-700/40 opacity-40"
                    style={{ width: `${baselineWidthPercent}%` }}
                  />

                  {/* Actual bar */}
                  <motion.div
                    className={`relative h-10 rounded-lg flex items-center justify-center overflow-hidden ${
                      isLeak
                        ? "bg-gradient-to-r from-red-500/30 to-red-600/20 border border-red-500/50"
                        : isAfterLeak
                        ? "bg-gradient-to-r from-amber-500/20 to-amber-600/10 border border-amber-500/30"
                        : "bg-gradient-to-r from-cyan-500/20 to-cyan-600/10 border border-cyan-500/30"
                    }`}
                    initial={{ width: 0 }}
                    animate={{ width: `${widthPercent}%` }}
                    transition={{ duration: 0.8, delay: i * 0.15, ease: "easeOut" }}
                  >
                    {/* Animated leak drain effect */}
                    {isLeak && (
                      <motion.div
                        className="absolute right-0 top-0 bottom-0 bg-gradient-to-l from-red-500/40 to-transparent"
                        initial={{ width: "0%" }}
                        animate={{ width: ["0%", "40%", "0%"] }}
                        transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                      />
                    )}

                    {/* Value text inside bar */}
                    <span className={`text-[10px] font-bold z-10 ${isLeak ? "text-red-300" : "text-slate-400"}`}>
                      {((stage.value / maxValue) * 100).toFixed(0)}%
                    </span>
                  </motion.div>

                  {/* Leak indicator */}
                  {isLeak && dropFromBaseline > 2 && (
                    <motion.div
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 1 }}
                      className="absolute -right-2 top-0 bottom-0 flex items-center"
                    >
                      <div className="flex items-center gap-1 bg-red-500/20 border border-red-500/40 rounded-lg px-2 py-1 ml-4">
                        <svg className="w-3 h-3 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                        </svg>
                        <span className="text-[10px] font-bold text-red-400">
                          -{dropFromBaseline.toFixed(1)}%
                        </span>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>

              {/* Connector arrow between stages */}
              {i < stages.length - 1 && (
                <div className="flex items-center justify-center py-0.5">
                  <svg
                    className={`w-4 h-4 ${isLeak ? "text-red-500/60" : "text-slate-700/60"}`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-4 text-[10px] text-slate-600">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-2 rounded-sm bg-cyan-500/30 border border-cyan-500/30 inline-block" />
          Observed
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-2 rounded-sm border border-dashed border-slate-600 inline-block" />
          Baseline
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-2 rounded-sm bg-red-500/30 border border-red-500/40 inline-block" />
          Leak Point
        </span>
      </div>
    </div>
  );
}
