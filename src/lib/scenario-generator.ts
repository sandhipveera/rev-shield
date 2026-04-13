import type { FunnelMetric, SegmentBaseline, PaymentEvent, SupportTicket } from "./data";

// ---------------------------------------------------------------------------
// Scenario Generator — creates realistic funnel data with configurable
// degradation patterns for interactive demos
// ---------------------------------------------------------------------------

export interface ScenarioConfig {
  segments: { name: string; channel: string; device: string }[];
  days: number;                 // total days of data
  degradationStart: number;     // day index when degradation begins (0-based)
  degradationDuration: number;  // days of degradation before recovery
  degradationType: "latency" | "payment" | "promo" | "bounce" | "mixed";
  severity: "low" | "medium" | "high" | "critical";
  affectedSegment: number;      // index of segment to degrade
}

export const PRESET_SCENARIOS: Record<string, ScenarioConfig> = {
  "payment-gateway-outage": {
    segments: [
      { name: "paid_social_mobile", channel: "Paid Social", device: "Mobile" },
      { name: "organic_search_desktop", channel: "Organic Search", device: "Desktop" },
      { name: "email_mobile", channel: "Email", device: "Mobile" },
    ],
    days: 14,
    degradationStart: 7,
    degradationDuration: 4,
    degradationType: "payment",
    severity: "high",
    affectedSegment: 0,
  },
  "cdn-latency-spike": {
    segments: [
      { name: "paid_search_mobile", channel: "Paid Search", device: "Mobile" },
      { name: "direct_desktop", channel: "Direct", device: "Desktop" },
    ],
    days: 10,
    degradationStart: 5,
    degradationDuration: 3,
    degradationType: "latency",
    severity: "critical",
    affectedSegment: 0,
  },
  "promo-code-failure": {
    segments: [
      { name: "email_desktop", channel: "Email", device: "Desktop" },
      { name: "social_mobile", channel: "Social", device: "Mobile" },
      { name: "affiliate_desktop", channel: "Affiliate", device: "Desktop" },
    ],
    days: 12,
    degradationStart: 6,
    degradationDuration: 3,
    degradationType: "promo",
    severity: "medium",
    affectedSegment: 0,
  },
  "mobile-checkout-regression": {
    segments: [
      { name: "paid_social_mobile", channel: "Paid Social", device: "Mobile" },
      { name: "paid_search_mobile", channel: "Paid Search", device: "Mobile" },
      { name: "organic_desktop", channel: "Organic", device: "Desktop" },
      { name: "direct_mobile", channel: "Direct", device: "Mobile" },
    ],
    days: 14,
    degradationStart: 8,
    degradationDuration: 4,
    degradationType: "mixed",
    severity: "high",
    affectedSegment: 1,
  },
};

interface GeneratedData {
  funnelData: FunnelMetric[];
  baselines: SegmentBaseline[];
  paymentEvents: PaymentEvent[];
  supportTickets: SupportTicket[];
  segments: string[];
  dateRange: { from: string; to: string };
  scenarioDescription: string;
}

// Severity multipliers
const SEVERITY_FACTOR: Record<string, number> = { low: 0.3, medium: 0.6, high: 1.0, critical: 1.4 };

function randomVariation(base: number, pct: number = 0.03): number {
  return base * (1 + (Math.random() - 0.5) * 2 * pct);
}

function dateString(startDate: Date, dayOffset: number): string {
  const d = new Date(startDate);
  d.setDate(d.getDate() + dayOffset);
  return d.toISOString().slice(0, 10);
}

export function generateScenario(config: ScenarioConfig): GeneratedData {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - config.days);

  const severity = SEVERITY_FACTOR[config.severity] ?? 1.0;
  const funnelData: FunnelMetric[] = [];
  const paymentEvents: PaymentEvent[] = [];
  const supportTickets: SupportTicket[] = [];

  // Base profiles per segment
  const profiles = config.segments.map(() => ({
    sessions: 3500 + Math.round(Math.random() * 3000),
    viewRate: 0.68 + Math.random() * 0.10,
    cartRate: 0.13 + Math.random() * 0.05,
    checkoutRate: 0.075 + Math.random() * 0.025,
    purchaseRateFromCheckout: 0.88 + Math.random() * 0.08,
    paySuccess: 0.91 + Math.random() * 0.04,
    aov: 72 + Math.round(Math.random() * 30),
    latency: 900 + Math.round(Math.random() * 400),
    errorRate: 0.008 + Math.random() * 0.008,
    tickets: 4 + Math.round(Math.random() * 6),
    bounceRate: 0.35 + Math.random() * 0.10,
    promoError: 0.003 + Math.random() * 0.004,
  }));

  for (let day = 0; day < config.days; day++) {
    const date = dateString(startDate, day);

    for (let s = 0; s < config.segments.length; s++) {
      const seg = config.segments[s];
      const p = profiles[s];
      const isDegraded = s === config.affectedSegment &&
        day >= config.degradationStart &&
        day < config.degradationStart + config.degradationDuration;
      const isRecovery = s === config.affectedSegment &&
        day >= config.degradationStart + config.degradationDuration;

      // Degradation progress (0..1) within degradation window
      const degradeProgress = isDegraded
        ? (day - config.degradationStart) / Math.max(1, config.degradationDuration - 1)
        : 0;
      // Recovery progress (0..1)
      const recoveryProgress = isRecovery
        ? Math.min(1, (day - config.degradationStart - config.degradationDuration) / 2)
        : 0;

      let sessions = Math.round(randomVariation(p.sessions));
      let viewItem = Math.round(sessions * randomVariation(p.viewRate));
      let addToCart = Math.round(sessions * randomVariation(p.cartRate));
      let beginCheckout = Math.round(sessions * randomVariation(p.checkoutRate));
      let paySuccessRate = randomVariation(p.paySuccess, 0.01);
      let aov = Math.round(randomVariation(p.aov, 0.02));
      let latency = Math.round(randomVariation(p.latency, 0.03));
      let errorRate = randomVariation(p.errorRate, 0.05);
      let tickets = Math.round(randomVariation(p.tickets, 0.15));
      let bounceRate = randomVariation(p.bounceRate, 0.02);
      let promoError = randomVariation(p.promoError, 0.05);

      if (isDegraded) {
        const factor = degradeProgress * severity;
        switch (config.degradationType) {
          case "latency":
            latency = Math.round(latency * (1 + factor * 2));
            errorRate = errorRate + factor * 0.03;
            bounceRate = bounceRate + factor * 0.06;
            paySuccessRate = paySuccessRate - factor * 0.08;
            tickets = tickets + Math.round(factor * 40);
            break;
          case "payment":
            paySuccessRate = paySuccessRate - factor * 0.15;
            errorRate = errorRate + factor * 0.025;
            tickets = tickets + Math.round(factor * 50);
            break;
          case "promo":
            promoError = promoError + factor * 0.025;
            tickets = tickets + Math.round(factor * 25);
            aov = Math.round(aov * (1 - factor * 0.08));
            break;
          case "bounce":
            bounceRate = bounceRate + factor * 0.12;
            sessions = Math.round(sessions * (1 - factor * 0.15));
            viewItem = Math.round(viewItem * (1 - factor * 0.20));
            break;
          case "mixed":
            latency = Math.round(latency * (1 + factor * 1.2));
            paySuccessRate = paySuccessRate - factor * 0.10;
            errorRate = errorRate + factor * 0.02;
            promoError = promoError + factor * 0.01;
            bounceRate = bounceRate + factor * 0.04;
            tickets = tickets + Math.round(factor * 35);
            break;
        }
      }

      if (isRecovery) {
        // Gradually return to baseline
        const recovFactor = (1 - recoveryProgress) * severity * 0.3;
        latency = Math.round(p.latency * (1 + recovFactor * 0.5));
        paySuccessRate = p.paySuccess - recovFactor * 0.05;
        errorRate = p.errorRate + recovFactor * 0.01;
        tickets = p.tickets + Math.round(recovFactor * 10);
      }

      // Clamp values
      paySuccessRate = Math.max(0.5, Math.min(1, paySuccessRate));
      errorRate = Math.max(0, Math.min(0.2, errorRate));
      bounceRate = Math.max(0.2, Math.min(0.8, bounceRate));
      promoError = Math.max(0, Math.min(0.1, promoError));

      const paidOrders = Math.round(beginCheckout * paySuccessRate);
      const netRevenue = paidOrders * aov;

      funnelData.push({
        date,
        segment_key: seg.name,
        channel: seg.channel,
        device: seg.device,
        sessions,
        view_item: viewItem,
        add_to_cart: addToCart,
        begin_checkout: beginCheckout,
        paid_orders: paidOrders,
        payment_success_rate: parseFloat(paySuccessRate.toFixed(3)),
        aov,
        latency_ms: latency,
        error_rate: parseFloat(errorRate.toFixed(4)),
        tickets,
        bounce_rate: parseFloat(bounceRate.toFixed(3)),
        promo_error_rate: parseFloat(promoError.toFixed(4)),
        net_revenue: netRevenue,
      });

      // Generate payment events for degraded days
      if (isDegraded && paySuccessRate < p.paySuccess - 0.02) {
        const failCount = Math.round(beginCheckout * (p.paySuccess - paySuccessRate));
        if (failCount > 0) {
          paymentEvents.push({ date, segment_key: seg.name, event_type: "payment_intent.payment_failed", failure_code: "card_declined", count: Math.round(failCount * 0.45) });
          paymentEvents.push({ date, segment_key: seg.name, event_type: "payment_intent.payment_failed", failure_code: "processing_error", count: Math.round(failCount * 0.35) });
          if (failCount > 15) {
            paymentEvents.push({ date, segment_key: seg.name, event_type: "payment_intent.payment_failed", failure_code: "api_connection_error", count: Math.round(failCount * 0.20) });
          }
        }
      }

      // Generate support tickets for degraded days
      if (isDegraded && tickets > p.tickets * 1.5) {
        const excess = tickets - p.tickets;
        supportTickets.push({ date, segment_key: seg.name, reason: "payment_failed", count: Math.round(excess * 0.35) });
        supportTickets.push({ date, segment_key: seg.name, reason: "checkout_error", count: Math.round(excess * 0.30) });
        supportTickets.push({ date, segment_key: seg.name, reason: "slow_loading", count: Math.round(excess * 0.20) });
        supportTickets.push({ date, segment_key: seg.name, reason: "coupon_not_working", count: Math.round(excess * 0.15) });
      }
    }
  }

  // Compute baselines from pre-degradation period
  const segments = config.segments.map((s) => s.name);
  const baselines: SegmentBaseline[] = config.segments.map((seg, i) => {
    const p = profiles[i];
    return {
      segment_key: seg.name,
      channel: seg.channel,
      device: seg.device,
      baseline_sessions: p.sessions,
      baseline_purchase_rate: parseFloat(p.purchaseRateFromCheckout.toFixed(3)),
      baseline_pay_success: parseFloat(p.paySuccess.toFixed(3)),
      baseline_aov: p.aov,
      baseline_latency_ms: p.latency,
      baseline_error_rate: parseFloat(p.errorRate.toFixed(4)),
      baseline_tickets: p.tickets,
    };
  });

  const dates = funnelData.map((r) => r.date).sort();

  const typeLabels: Record<string, string> = {
    latency: "CDN/Server Latency Spike",
    payment: "Payment Gateway Failure",
    promo: "Promo Code System Error",
    bounce: "Landing Page Regression",
    mixed: "Multi-factor Checkout Degradation",
  };

  return {
    funnelData,
    baselines,
    paymentEvents,
    supportTickets,
    segments,
    dateRange: { from: dates[0], to: dates[dates.length - 1] },
    scenarioDescription: `${typeLabels[config.degradationType]} — ${config.severity} severity, affecting ${config.segments[config.affectedSegment].channel} / ${config.segments[config.affectedSegment].device} from day ${config.degradationStart + 1} for ${config.degradationDuration} days`,
  };
}
