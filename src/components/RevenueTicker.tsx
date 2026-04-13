"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";

interface RevenueTickerProps {
  dailyLoss: number; // dollars per day
  active: boolean;
}

export default function RevenueTicker({ dailyLoss, active }: RevenueTickerProps) {
  const [accumulated, setAccumulated] = useState(0);
  const perSecond = dailyLoss / 86400; // $/sec

  useEffect(() => {
    if (!active) {
      setAccumulated(0);
      return;
    }

    const interval = setInterval(() => {
      setAccumulated((prev) => prev + perSecond * 0.1); // update every 100ms
    }, 100);

    return () => clearInterval(interval);
  }, [active, perSecond]);

  if (!active) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-4 bg-red-500/10 border border-red-500/30 rounded-2xl px-6 py-3"
    >
      <div className="flex items-center gap-2">
        <motion.div
          className="w-2 h-2 rounded-full bg-red-500"
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ repeat: Infinity, duration: 1 }}
        />
        <span className="text-xs text-red-400 font-semibold uppercase tracking-wider">Revenue Leaking</span>
      </div>

      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-red-400 tabular-nums">
          ${accumulated.toFixed(2)}
        </span>
        <span className="text-xs text-red-400/60">lost since detection</span>
      </div>

      <div className="text-xs text-red-400/50 border-l border-red-500/20 pl-4">
        ${perSecond.toFixed(2)}/sec &middot; ${Math.round(dailyLoss).toLocaleString()}/day
      </div>
    </motion.div>
  );
}
