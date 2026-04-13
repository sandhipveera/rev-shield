// RevShield Core Analysis Engine
// Detects revenue leaks, scores risk, diagnoses root causes, and generates remediation plans.

import type {
  FunnelMetric,
  SegmentBaseline,
  PaymentEvent,
  SupportTicket,
} from "./data";

// ---------------------------------------------------------------------------
// Result interfaces
// ---------------------------------------------------------------------------

export interface Leak {
  segment_key: string;
  stage: string;
  severity: "high" | "medium" | "low";
  magnitude: number;
  observed_rate: number;
  baseline_rate: number;
  estimated_revenue_lost: number;
}

export interface RRAFScore {
  total: number;
  risk: number;
  root_cause_confidence: number;
  affected_revenue: number;
  frequency: number;
}

export type LIFTCategory = "Landing" | "Incentive" | "Friction" | "Trust";

export interface LIFTHypothesis {
  category: LIFTCategory;
  score: number;
  signals: string[];
}

export interface Diagnosis {
  leak: Leak;
  hypotheses: LIFTHypothesis[];
  top_category: LIFTCategory;
}

export interface Remediation {
  category: LIFTCategory;
  actions: string[];
  priority: "critical" | "high" | "medium";
  estimated_time_to_fix: string;
}

export interface ImpactProjection {
  revenue_at_risk: number;
  projected_recovery_low: number;
  projected_recovery_high: number;
  confidence: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getLatestMetric(
  funnelData: FunnelMetric[],
  segmentKey: string
): FunnelMetric | undefined {
  const segmentRows = funnelData
    .filter((r) => r.segment_key === segmentKey)
    .sort((a, b) => a.date.localeCompare(b.date));
  return segmentRows[segmentRows.length - 1];
}

function getSegmentMetrics(
  funnelData: FunnelMetric[],
  segmentKey: string
): FunnelMetric[] {
  return funnelData
    .filter((r) => r.segment_key === segmentKey)
    .sort((a, b) => a.date.localeCompare(b.date));
}

// ---------------------------------------------------------------------------
// 1. detectLeaks
// ---------------------------------------------------------------------------

export function detectLeaks(
  funnelData: FunnelMetric[],
  baselines: SegmentBaseline[]
): Leak[] {
  const leaks: Leak[] = [];

  for (const baseline of baselines) {
    const metrics = getSegmentMetrics(funnelData, baseline.segment_key);
    if (metrics.length === 0) continue;

    const baselineRate = baseline.baseline_purchase_rate;

    // Find the worst day in the dataset (peak of the incident)
    let worstMetric = metrics[0];
    let worstRate = 1;
    for (const m of metrics) {
      const rate = m.begin_checkout > 0 ? m.paid_orders / m.begin_checkout : 0;
      if (rate < worstRate) {
        worstRate = rate;
        worstMetric = m;
      }
    }

    // Check if the worst day represents a meaningful leak
    if (worstRate >= baselineRate * 0.97) continue; // within 3% tolerance

    const drop = (baselineRate - worstRate) / baselineRate;

    let severity: "high" | "medium" | "low";
    if (drop > 0.1) {
      severity = "high";
    } else if (drop > 0.05) {
      severity = "medium";
    } else {
      severity = "low";
    }

    const estimatedRevenueLost =
      (baselineRate - worstRate) * worstMetric.begin_checkout * worstMetric.aov;

    leaks.push({
      segment_key: baseline.segment_key,
      stage: "checkout_to_paid",
      severity,
      magnitude: drop,
      observed_rate: worstRate,
      baseline_rate: baselineRate,
      estimated_revenue_lost: Math.round(estimatedRevenueLost * 100) / 100,
    });
  }

  // Sort by estimated revenue lost descending
  leaks.sort((a, b) => b.estimated_revenue_lost - a.estimated_revenue_lost);
  return leaks;
}

// ---------------------------------------------------------------------------
// 2. calculateRRAF
// ---------------------------------------------------------------------------

export function calculateRRAF(
  leak: Leak,
  funnelData: FunnelMetric[],
  baselines: SegmentBaseline[]
): RRAFScore {
  const baseline = baselines.find(
    (b) => b.segment_key === leak.segment_key
  );
  const metrics = getSegmentMetrics(funnelData, leak.segment_key);

  // --- Risk component ---
  // Count days the leak persisted (observed rate below baseline)
  let persistedDays = 0;
  if (baseline) {
    for (const m of metrics) {
      const rate =
        m.begin_checkout > 0 ? m.paid_orders / m.begin_checkout : 0;
      if (rate < baseline.baseline_purchase_rate * 0.98) {
        persistedDays++;
      }
    }
  }
  const persistenceFactor = clamp(persistedDays / 4, 0, 1);
  const magnitudeComponent = clamp(leak.magnitude / 0.2, 0, 1);
  const risk = magnitudeComponent * persistenceFactor;

  // --- RootCauseConfidence component ---
  // Use the worst metric (peak of incident) to check correlated signals
  let correlatedSignals = 0;
  if (baseline && metrics.length > 0) {
    let worstMetric = metrics[0];
    let worstRate = 1;
    for (const m of metrics) {
      const rate = m.begin_checkout > 0 ? m.paid_orders / m.begin_checkout : 0;
      if (rate < worstRate) {
        worstRate = rate;
        worstMetric = m;
      }
    }
    // Latency up
    if (worstMetric.latency_ms > baseline.baseline_latency_ms * 1.3) {
      correlatedSignals++;
    }
    // Errors up
    if (worstMetric.error_rate > baseline.baseline_error_rate * 1.5) {
      correlatedSignals++;
    }
    // Tickets up
    if (worstMetric.tickets > baseline.baseline_tickets * 2) {
      correlatedSignals++;
    }
    // Payment success down
    if (worstMetric.payment_success_rate < baseline.baseline_pay_success * 0.95) {
      correlatedSignals++;
    }
  }
  const rootCauseConfidence = clamp(correlatedSignals * 0.25, 0, 1);

  // --- AffectedRevenue component ---
  const affectedRevenue = Math.min(
    1,
    Math.log(1 + leak.estimated_revenue_lost) / Math.log(1 + 50000)
  );

  // --- Frequency component ---
  let leakDays = 0;
  if (baseline) {
    for (const m of metrics) {
      const rate =
        m.begin_checkout > 0 ? m.paid_orders / m.begin_checkout : 0;
      if (rate < baseline.baseline_purchase_rate * 0.95) {
        leakDays++;
      }
    }
  }
  const frequency = clamp(leakDays / 7, 0, 1);

  // --- Composite RRAF ---
  const total =
    100 *
    (0.3 * risk +
      0.2 * rootCauseConfidence +
      0.35 * affectedRevenue +
      0.15 * frequency);

  return {
    total: Math.round(total * 100) / 100,
    risk: Math.round(risk * 1000) / 1000,
    root_cause_confidence: Math.round(rootCauseConfidence * 1000) / 1000,
    affected_revenue: Math.round(affectedRevenue * 1000) / 1000,
    frequency: Math.round(frequency * 1000) / 1000,
  };
}

// ---------------------------------------------------------------------------
// 3. diagnoseLIFT
// ---------------------------------------------------------------------------

export function diagnoseLIFT(
  leak: Leak,
  funnelData: FunnelMetric[],
  paymentEvents: PaymentEvent[],
  supportTickets: SupportTicket[]
): Diagnosis {
  const metrics = getSegmentMetrics(funnelData, leak.segment_key);
  const segmentPayments = paymentEvents.filter(
    (e) => e.segment_key === leak.segment_key
  );
  const segmentTickets = supportTickets.filter(
    (t) => t.segment_key === leak.segment_key
  );

  // Use the worst metric (peak incident) vs earliest (baseline period)
  const earliest = metrics[0];
  let latest = metrics[metrics.length - 1];
  let worstRate = 1;
  for (const m of metrics) {
    const rate = m.begin_checkout > 0 ? m.paid_orders / m.begin_checkout : 0;
    if (rate < worstRate) {
      worstRate = rate;
      latest = m; // "latest" now means the worst/incident metric
    }
  }

  const hypotheses: LIFTHypothesis[] = [];

  // --- Landing ---
  const landingSignals: string[] = [];
  let landingScore = 0;
  if (latest && earliest) {
    const bounceChange = latest.bounce_rate - earliest.bounce_rate;
    if (bounceChange > 0.02) {
      landingSignals.push(
        `Bounce rate increased by ${(bounceChange * 100).toFixed(1)}pp`
      );
      landingScore += bounceChange * 10;
    }
    // Segment-specific session drop
    const sessionDrop =
      (earliest.sessions - latest.sessions) / earliest.sessions;
    if (sessionDrop > 0.05) {
      landingSignals.push(
        `Sessions dropped by ${(sessionDrop * 100).toFixed(1)}%`
      );
      landingScore += sessionDrop * 5;
    }
  }
  hypotheses.push({
    category: "Landing",
    score: Math.round(landingScore * 100) / 100,
    signals: landingSignals,
  });

  // --- Incentive ---
  const incentiveSignals: string[] = [];
  let incentiveScore = 0;
  if (latest && earliest) {
    const promoChange = latest.promo_error_rate - earliest.promo_error_rate;
    if (promoChange > 0.005) {
      incentiveSignals.push(
        `Promo error rate spiked by ${(promoChange * 100).toFixed(2)}pp`
      );
      incentiveScore += promoChange * 20;
    }
  }
  const couponTickets = segmentTickets.filter(
    (t) => t.reason === "coupon_not_working"
  );
  if (couponTickets.length > 0) {
    const totalCouponTickets = couponTickets.reduce(
      (sum, t) => sum + t.count,
      0
    );
    incentiveSignals.push(
      `${totalCouponTickets} coupon-related support tickets`
    );
    incentiveScore += totalCouponTickets * 0.1;
  }
  hypotheses.push({
    category: "Incentive",
    score: Math.round(incentiveScore * 100) / 100,
    signals: incentiveSignals,
  });

  // --- Friction ---
  const frictionSignals: string[] = [];
  let frictionScore = 0;
  if (latest && earliest) {
    const latencyIncrease = latest.latency_ms - earliest.latency_ms;
    if (latencyIncrease > 200) {
      frictionSignals.push(
        `Latency increased by ${latencyIncrease}ms (${earliest.latency_ms}ms -> ${latest.latency_ms}ms)`
      );
      frictionScore += latencyIncrease / 500;
    }
    const errorIncrease = latest.error_rate - earliest.error_rate;
    if (errorIncrease > 0.005) {
      frictionSignals.push(
        `Error rate increased by ${(errorIncrease * 100).toFixed(2)}pp`
      );
      frictionScore += errorIncrease * 50;
    }
  }
  const checkoutErrorTickets = segmentTickets.filter(
    (t) => t.reason === "checkout_error" || t.reason === "slow_loading"
  );
  if (checkoutErrorTickets.length > 0) {
    const totalFrictionTickets = checkoutErrorTickets.reduce(
      (sum, t) => sum + t.count,
      0
    );
    frictionSignals.push(
      `${totalFrictionTickets} checkout/loading support tickets`
    );
    frictionScore += totalFrictionTickets * 0.02;
  }
  hypotheses.push({
    category: "Friction",
    score: Math.round(frictionScore * 100) / 100,
    signals: frictionSignals,
  });

  // --- Trust ---
  const trustSignals: string[] = [];
  let trustScore = 0;
  const failedPayments = segmentPayments.filter(
    (e) => e.event_type === "payment_intent.payment_failed"
  );
  if (failedPayments.length > 0) {
    const totalFailures = failedPayments.reduce(
      (sum, e) => sum + e.count,
      0
    );
    trustSignals.push(`${totalFailures} payment failures detected`);
    trustScore += totalFailures * 0.01;

    // Break down by failure code
    const byCodes: Record<string, number> = {};
    for (const e of failedPayments) {
      byCodes[e.failure_code] = (byCodes[e.failure_code] ?? 0) + e.count;
    }
    for (const code of Object.keys(byCodes)) {
      trustSignals.push(`  ${code}: ${byCodes[code]} occurrences`);
    }
  }
  const paymentTickets = segmentTickets.filter(
    (t) => t.reason === "payment_failed"
  );
  if (paymentTickets.length > 0) {
    const totalPaymentTickets = paymentTickets.reduce(
      (sum, t) => sum + t.count,
      0
    );
    trustSignals.push(
      `${totalPaymentTickets} payment-related support tickets`
    );
    trustScore += totalPaymentTickets * 0.03;
  }
  hypotheses.push({
    category: "Trust",
    score: Math.round(trustScore * 100) / 100,
    signals: trustSignals,
  });

  // Rank hypotheses by score descending
  hypotheses.sort((a, b) => b.score - a.score);

  return {
    leak,
    hypotheses,
    top_category: hypotheses[0].category,
  };
}

// ---------------------------------------------------------------------------
// 4. generateRemediation
// ---------------------------------------------------------------------------

export function generateRemediation(diagnosis: Diagnosis): Remediation {
  const category = diagnosis.top_category;
  const severity = diagnosis.leak.severity;

  const priority: "critical" | "high" | "medium" =
    severity === "high" ? "critical" : severity === "medium" ? "high" : "medium";

  switch (category) {
    case "Landing":
      return {
        category,
        priority,
        estimated_time_to_fix: "1-3 days",
        actions: [
          "Audit landing page load performance for the affected segment",
          "Check for broken creative assets or mismatched ad-to-landing messaging",
          "Review recent deploy changes to landing page templates",
          "A/B test simplified landing page variant for affected traffic source",
        ],
      };

    case "Incentive":
      return {
        category,
        priority,
        estimated_time_to_fix: "< 1 day",
        actions: [
          "Verify all active promo codes are valid and correctly configured",
          "Check promo code service logs for errors or timeouts",
          "Ensure discount display logic matches backend validation rules",
          "Temporarily enable a fallback discount for affected segment to recover conversion",
        ],
      };

    case "Friction":
      return {
        category,
        priority,
        estimated_time_to_fix: "1-2 days",
        actions: [
          "Investigate checkout API latency spike — check downstream service health",
          "Review error logs for the checkout flow (payment, inventory, address validation)",
          "Roll back recent checkout flow changes if correlated with degradation onset",
          "Enable client-side performance monitoring for the affected device type",
          "Consider enabling a simplified checkout fallback for high-latency sessions",
        ],
      };

    case "Trust":
      return {
        category,
        priority,
        estimated_time_to_fix: "1-3 days",
        actions: [
          "Contact payment processor to investigate elevated decline rates",
          "Check for PSP-side outages or configuration changes (3DS, fraud rules)",
          "Review payment retry logic — ensure soft declines trigger automatic retry",
          "Add real-time payment status messaging to reduce user confusion and ticket volume",
          "Evaluate enabling a backup payment method or alternative PSP routing",
        ],
      };
  }
}

// ---------------------------------------------------------------------------
// 5. projectImpact
// ---------------------------------------------------------------------------

export function projectImpact(
  leak: Leak,
  baseline: SegmentBaseline
): ImpactProjection {
  // Daily revenue at risk based on current gap
  const dailyRevenueAtRisk = leak.estimated_revenue_lost;

  // Project over a 7-day window
  const revenueAtRisk = dailyRevenueAtRisk * 7;

  // Recovery assumes fixing restores some portion of baseline rate
  // Low estimate: 50% recovery, High estimate: 90% recovery
  const projectedRecoveryLow = Math.round(revenueAtRisk * 0.5 * 100) / 100;
  const projectedRecoveryHigh = Math.round(revenueAtRisk * 0.9 * 100) / 100;

  // Confidence based on magnitude — smaller leaks are more confidently recoverable
  const confidence = clamp(1 - leak.magnitude, 0.4, 0.95);

  return {
    revenue_at_risk: Math.round(revenueAtRisk * 100) / 100,
    projected_recovery_low: projectedRecoveryLow,
    projected_recovery_high: projectedRecoveryHigh,
    confidence: Math.round(confidence * 100) / 100,
  };
}
