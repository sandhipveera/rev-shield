// Shopify Storefront Analytics API integration
// Fetches real store funnel data using Shopify Admin API

import type { FunnelMetric, SegmentBaseline, PaymentEvent, SupportTicket } from "@/lib/data";

interface ShopifyOrder {
  id: number;
  created_at: string;
  total_price: string;
  financial_status: string;
  source_name: string;
  device_id?: string;
  browser_ip?: string;
  landing_site?: string;
  referring_site?: string;
  cancelled_at?: string | null;
  cart_token?: string;
  checkout_token?: string;
  gateway?: string;
  tags?: string;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { shopDomain, accessToken, days = 14 } = body as {
      shopDomain: string;
      accessToken: string;
      days?: number;
    };

    if (!shopDomain || !accessToken) {
      return Response.json(
        { error: "shopDomain and accessToken are required. Get your token from Shopify Admin > Settings > Apps > Develop apps." },
        { status: 400 }
      );
    }

    // Clean domain
    const domain = shopDomain.replace(/^https?:\/\//, "").replace(/\/$/, "");
    const baseUrl = `https://${domain}/admin/api/2024-01`;

    // Fetch orders from the last N days
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - days);

    const ordersRes = await fetch(
      `${baseUrl}/orders.json?status=any&created_at_min=${sinceDate.toISOString()}&limit=250`,
      {
        headers: {
          "X-Shopify-Access-Token": accessToken,
          "Content-Type": "application/json",
        },
      }
    );

    if (!ordersRes.ok) {
      const errText = await ordersRes.text();
      return Response.json(
        { error: `Shopify API error (${ordersRes.status}): ${errText.slice(0, 200)}` },
        { status: ordersRes.status }
      );
    }

    const ordersData = await ordersRes.json();
    const orders: ShopifyOrder[] = ordersData.orders || [];

    // Also try to get analytics data if available
    let analyticsData: any = null;
    try {
      // Shopify Analytics API (requires read_analytics scope)
      const analyticsRes = await fetch(
        `${baseUrl}/reports.json`,
        {
          headers: {
            "X-Shopify-Access-Token": accessToken,
            "Content-Type": "application/json",
          },
        }
      );
      if (analyticsRes.ok) {
        analyticsData = await analyticsRes.json();
      }
    } catch {
      // Analytics scope may not be available, continue with orders
    }

    // Transform orders into funnel metrics grouped by date and channel
    const { funnelData, baselines, paymentEvents, supportTickets } = transformShopifyData(orders, days);

    return Response.json({
      funnelData,
      baselines,
      paymentEvents,
      supportTickets,
      segments: [...new Set(funnelData.map((r) => r.segment_key))],
      dateRange: {
        from: funnelData[0]?.date ?? "",
        to: funnelData[funnelData.length - 1]?.date ?? "",
      },
      rowCount: funnelData.length,
      source: "shopify",
      orderCount: orders.length,
      hasAnalytics: !!analyticsData,
    });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to fetch Shopify data" },
      { status: 500 }
    );
  }
}

function transformShopifyData(
  orders: ShopifyOrder[],
  days: number
): {
  funnelData: FunnelMetric[];
  baselines: SegmentBaseline[];
  paymentEvents: PaymentEvent[];
  supportTickets: SupportTicket[];
} {
  // Group orders by date and channel
  const grouped: Record<string, Record<string, ShopifyOrder[]>> = {};

  for (const order of orders) {
    const date = order.created_at.slice(0, 10);
    const channel = classifyChannel(order.source_name, order.referring_site, order.tags);
    if (!grouped[date]) grouped[date] = {};
    if (!grouped[date][channel]) grouped[date][channel] = [];
    grouped[date][channel].push(order);
  }

  const funnelData: FunnelMetric[] = [];
  const paymentEvents: PaymentEvent[] = [];

  for (const [date, channels] of Object.entries(grouped)) {
    for (const [channel, channelOrders] of Object.entries(channels)) {
      const paid = channelOrders.filter((o) => o.financial_status === "paid" || o.financial_status === "partially_paid");
      const failed = channelOrders.filter((o) => o.financial_status === "voided" || o.financial_status === "refunded" || o.cancelled_at);
      const totalOrders = channelOrders.length;
      const paidOrders = paid.length;
      const totalRevenue = paid.reduce((s, o) => s + parseFloat(o.total_price || "0"), 0);
      const aov = paidOrders > 0 ? Math.round(totalRevenue / paidOrders) : 0;

      // Estimate funnel stages from order counts
      // Shopify doesn't give sessions directly via orders API, so we estimate
      const estimatedSessions = Math.round(totalOrders / 0.035); // ~3.5% conversion
      const estimatedViews = Math.round(estimatedSessions * 0.70);
      const estimatedCarts = Math.round(estimatedSessions * 0.14);
      const estimatedCheckouts = totalOrders + failed.length;
      const paymentSuccessRate = estimatedCheckouts > 0 ? paidOrders / estimatedCheckouts : 0.92;

      const segmentKey = channel.toLowerCase().replace(/\s+/g, "_");

      funnelData.push({
        date,
        segment_key: segmentKey,
        channel: channel,
        device: "All", // Shopify orders API doesn't provide device info
        sessions: estimatedSessions,
        view_item: estimatedViews,
        add_to_cart: estimatedCarts,
        begin_checkout: estimatedCheckouts,
        paid_orders: paidOrders,
        payment_success_rate: parseFloat(paymentSuccessRate.toFixed(3)),
        aov,
        latency_ms: 1200, // Not available from orders API
        error_rate: failed.length / Math.max(1, totalOrders),
        tickets: 0, // Not available
        bounce_rate: 0.40,
        promo_error_rate: 0,
        net_revenue: totalRevenue,
      });

      // Track payment failures
      if (failed.length > 0) {
        paymentEvents.push({
          date,
          segment_key: segmentKey,
          event_type: "payment_intent.payment_failed",
          failure_code: "order_failed",
          count: failed.length,
        });
      }
    }
  }

  // Sort
  funnelData.sort((a, b) => a.date.localeCompare(b.date) || a.segment_key.localeCompare(b.segment_key));

  // Compute baselines
  const segments = [...new Set(funnelData.map((r) => r.segment_key))];
  const baselines: SegmentBaseline[] = segments.map((seg) => {
    const segRows = funnelData.filter((r) => r.segment_key === seg);
    const baseCount = Math.max(1, Math.ceil(segRows.length * 0.5));
    const base = segRows.slice(0, baseCount);
    const avg = (fn: (r: FunnelMetric) => number) => base.reduce((s, r) => s + fn(r), 0) / base.length;
    return {
      segment_key: seg,
      channel: base[0]?.channel || seg,
      device: base[0]?.device || "All",
      baseline_sessions: Math.round(avg((r) => r.sessions)),
      baseline_purchase_rate: parseFloat(avg((r) => r.begin_checkout ? r.paid_orders / r.begin_checkout : 0.92).toFixed(3)),
      baseline_pay_success: parseFloat(avg((r) => r.payment_success_rate).toFixed(3)),
      baseline_aov: Math.round(avg((r) => r.aov)),
      baseline_latency_ms: Math.round(avg((r) => r.latency_ms)),
      baseline_error_rate: parseFloat(avg((r) => r.error_rate).toFixed(4)),
      baseline_tickets: Math.round(avg((r) => r.tickets)),
    };
  });

  return { funnelData, baselines, paymentEvents, supportTickets: [] };
}

function classifyChannel(sourceName?: string, referringSite?: string, tags?: string): string {
  const src = (sourceName || "").toLowerCase();
  const ref = (referringSite || "").toLowerCase();
  const t = (tags || "").toLowerCase();

  // Check tags first (set by our order generator)
  if (t.includes("paid_social")) return "Paid Social";
  if (t.includes("paid_search")) return "Paid Search";
  if (t.includes("email")) return "Email";
  if (t.includes("direct")) return "Direct";

  // Check source_name (custom app sources)
  if (src.includes("social")) return "Paid Social";
  if (src.includes("search")) return "Paid Search";
  if (src.includes("email")) return "Email";
  if (src.includes("direct")) return "Direct";

  // Check referring site
  if (src === "web" && ref.includes("google")) return "Organic Search";
  if (src === "web" && ref.includes("facebook")) return "Paid Social";
  if (src === "web" && ref.includes("instagram")) return "Paid Social";
  if (src === "web" && ref.includes("tiktok")) return "Paid Social";
  if (src === "web" && (ref.includes("mail") || ref.includes("email"))) return "Email";
  if (src === "web") return "Direct";
  if (src === "shopify_draft_order") return "Manual";
  if (src === "pos") return "POS";
  if (src === "iphone" || src === "android") return "Mobile App";
  return "Other";
}
