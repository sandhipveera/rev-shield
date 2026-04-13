// Stripe API integration
// Fetches real payment data: charges, failures, disputes

import type { PaymentEvent } from "@/lib/data";

interface StripeCharge {
  id: string;
  amount: number;
  currency: string;
  status: string;
  created: number;
  failure_code?: string;
  failure_message?: string;
  outcome?: {
    type: string;
    risk_level: string;
    seller_message: string;
  };
  metadata?: Record<string, string>;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { secretKey, days = 14 } = body as {
      secretKey: string;
      days?: number;
    };

    if (!secretKey) {
      return Response.json(
        { error: "Stripe secret key is required. Find it at dashboard.stripe.com/apikeys (use test key for demos)." },
        { status: 400 }
      );
    }

    // Validate it looks like a Stripe key
    if (!secretKey.startsWith("sk_")) {
      return Response.json(
        { error: "Invalid Stripe key format. Should start with sk_test_ or sk_live_." },
        { status: 400 }
      );
    }

    const sinceTimestamp = Math.floor(Date.now() / 1000) - (days * 86400);

    // Fetch charges (successful + failed)
    const chargesRes = await fetch(
      `https://api.stripe.com/v1/charges?created[gte]=${sinceTimestamp}&limit=100`,
      {
        headers: {
          Authorization: `Bearer ${secretKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    if (!chargesRes.ok) {
      const err = await chargesRes.json();
      return Response.json(
        { error: `Stripe API error: ${err.error?.message || chargesRes.statusText}` },
        { status: chargesRes.status }
      );
    }

    const chargesData = await chargesRes.json();
    const charges: StripeCharge[] = chargesData.data || [];

    // Also fetch payment intents for more detail
    let failedIntents: any[] = [];
    try {
      const intentsRes = await fetch(
        `https://api.stripe.com/v1/payment_intents?created[gte]=${sinceTimestamp}&limit=100`,
        {
          headers: {
            Authorization: `Bearer ${secretKey}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );
      if (intentsRes.ok) {
        const intentsData = await intentsRes.json();
        failedIntents = (intentsData.data || []).filter(
          (pi: any) => pi.status === "requires_payment_method" || pi.last_payment_error
        );
      }
    } catch {
      // Continue without intents
    }

    // Transform into our format
    const result = transformStripeData(charges, failedIntents, days);

    return Response.json({
      ...result,
      source: "stripe",
      chargeCount: charges.length,
      failedCount: charges.filter((c) => c.status === "failed").length,
    });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to fetch Stripe data" },
      { status: 500 }
    );
  }
}

function transformStripeData(
  charges: StripeCharge[],
  failedIntents: any[],
  days: number
) {
  // Group by date
  const byDate: Record<string, { succeeded: StripeCharge[]; failed: StripeCharge[] }> = {};

  for (const charge of charges) {
    const date = new Date(charge.created * 1000).toISOString().slice(0, 10);
    if (!byDate[date]) byDate[date] = { succeeded: [], failed: [] };
    if (charge.status === "succeeded") {
      byDate[date].succeeded.push(charge);
    } else {
      byDate[date].failed.push(charge);
    }
  }

  // Build payment events
  const paymentEvents: PaymentEvent[] = [];
  const dailyStats: {
    date: string;
    totalCharges: number;
    succeeded: number;
    failed: number;
    totalAmount: number;
    failureCodes: Record<string, number>;
    avgAmount: number;
    successRate: number;
  }[] = [];

  for (const [date, data] of Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b))) {
    const total = data.succeeded.length + data.failed.length;
    const totalAmount = data.succeeded.reduce((s, c) => s + c.amount / 100, 0);
    const avgAmount = data.succeeded.length > 0 ? totalAmount / data.succeeded.length : 0;
    const successRate = total > 0 ? data.succeeded.length / total : 1;

    // Aggregate failure codes
    const failureCodes: Record<string, number> = {};
    for (const charge of data.failed) {
      const code = charge.failure_code || "unknown";
      failureCodes[code] = (failureCodes[code] || 0) + 1;
    }

    // Create payment events for failures
    for (const [code, count] of Object.entries(failureCodes)) {
      paymentEvents.push({
        date,
        segment_key: "stripe_all",
        event_type: "payment_intent.payment_failed",
        failure_code: code,
        count,
      });
    }

    dailyStats.push({
      date,
      totalCharges: total,
      succeeded: data.succeeded.length,
      failed: data.failed.length,
      totalAmount,
      failureCodes,
      avgAmount,
      successRate,
    });
  }

  // Add failed intents
  for (const intent of failedIntents) {
    const date = new Date(intent.created * 1000).toISOString().slice(0, 10);
    const code = intent.last_payment_error?.code || "requires_payment_method";
    paymentEvents.push({
      date,
      segment_key: "stripe_all",
      event_type: "payment_intent.requires_action",
      failure_code: code,
      count: 1,
    });
  }

  // Build funnel metrics from Stripe data
  // Stripe gives us checkout → payment, so we estimate the rest
  const funnelData = dailyStats.map((day) => {
    const estimatedSessions = Math.round(day.totalCharges / 0.035);
    return {
      date: day.date,
      segment_key: "stripe_all",
      channel: "All Channels",
      device: "All",
      sessions: estimatedSessions,
      view_item: Math.round(estimatedSessions * 0.70),
      add_to_cart: Math.round(estimatedSessions * 0.14),
      begin_checkout: day.totalCharges,
      paid_orders: day.succeeded,
      payment_success_rate: parseFloat(day.successRate.toFixed(3)),
      aov: Math.round(day.avgAmount),
      latency_ms: 1200,
      error_rate: parseFloat((1 - day.successRate).toFixed(4)),
      tickets: day.failed,
      bounce_rate: 0.40,
      promo_error_rate: 0,
      net_revenue: Math.round(day.totalAmount),
    };
  });

  // Compute baselines from first half
  const baseCount = Math.max(1, Math.ceil(funnelData.length * 0.5));
  const base = funnelData.slice(0, baseCount);
  const avg = (fn: (r: typeof funnelData[0]) => number) => base.reduce((s, r) => s + fn(r), 0) / base.length;

  const baselines = [{
    segment_key: "stripe_all",
    channel: "All Channels",
    device: "All",
    baseline_sessions: Math.round(avg((r) => r.sessions)),
    baseline_purchase_rate: parseFloat(avg((r) => r.begin_checkout ? r.paid_orders / r.begin_checkout : 0.92).toFixed(3)),
    baseline_pay_success: parseFloat(avg((r) => r.payment_success_rate).toFixed(3)),
    baseline_aov: Math.round(avg((r) => r.aov)),
    baseline_latency_ms: 1200,
    baseline_error_rate: parseFloat(avg((r) => r.error_rate).toFixed(4)),
    baseline_tickets: Math.round(avg((r) => r.tickets)),
  }];

  return {
    funnelData,
    baselines,
    paymentEvents,
    supportTickets: [],
    segments: ["stripe_all"],
    dateRange: {
      from: funnelData[0]?.date ?? "",
      to: funnelData[funnelData.length - 1]?.date ?? "",
    },
    rowCount: funnelData.length,
  };
}
