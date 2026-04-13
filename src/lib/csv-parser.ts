import type { FunnelMetric, SegmentBaseline, PaymentEvent, SupportTicket } from "./data";

// ---------------------------------------------------------------------------
// Flexible CSV parser that maps real-world column names to FunnelMetric fields
// ---------------------------------------------------------------------------

const HEADER_MAP: Record<string, keyof FunnelMetric> = {
  // date
  date: "date", day: "date", period: "date",
  // segment
  segment: "segment_key", segment_key: "segment_key", "segment key": "segment_key",
  // channel / device
  channel: "channel", source: "channel", medium: "channel", traffic_source: "channel",
  device: "device", device_type: "device", platform: "device",
  // funnel
  sessions: "sessions", visits: "sessions", users: "sessions", traffic: "sessions",
  view_item: "view_item", "view item": "view_item", views: "view_item", product_views: "view_item", "product views": "view_item", page_views: "view_item",
  add_to_cart: "add_to_cart", "add to cart": "add_to_cart", cart_adds: "add_to_cart", "cart adds": "add_to_cart", atc: "add_to_cart",
  begin_checkout: "begin_checkout", "begin checkout": "begin_checkout", checkouts: "begin_checkout", checkout_starts: "begin_checkout",
  paid_orders: "paid_orders", "paid orders": "paid_orders", orders: "paid_orders", purchases: "paid_orders", transactions: "paid_orders", conversions: "paid_orders",
  // rates
  payment_success_rate: "payment_success_rate", "payment success rate": "payment_success_rate", pay_rate: "payment_success_rate",
  aov: "aov", "average order value": "aov", avg_order_value: "aov",
  latency_ms: "latency_ms", "latency ms": "latency_ms", latency: "latency_ms", page_load: "latency_ms", "page load": "latency_ms", load_time: "latency_ms",
  error_rate: "error_rate", "error rate": "error_rate", errors: "error_rate",
  tickets: "tickets", support_tickets: "tickets", "support tickets": "tickets",
  bounce_rate: "bounce_rate", "bounce rate": "bounce_rate", bounces: "bounce_rate",
  promo_error_rate: "promo_error_rate", "promo error rate": "promo_error_rate", promo_errors: "promo_error_rate",
  net_revenue: "net_revenue", "net revenue": "net_revenue", revenue: "net_revenue", total_revenue: "net_revenue",
};

export interface ParseResult {
  funnelData: FunnelMetric[];
  baselines: SegmentBaseline[];
  paymentEvents: PaymentEvent[];
  supportTickets: SupportTicket[];
  segments: string[];
  dateRange: { from: string; to: string };
  rowCount: number;
}

export interface ParseError {
  error: string;
  missingColumns?: string[];
  availableColumns?: string[];
}

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/[^a-z0-9_ ]/g, "").replace(/\s+/g, "_");
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

export function parseCSV(csvText: string): ParseResult | ParseError {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return { error: "CSV must have a header row and at least one data row." };

  const rawHeaders = parseCSVLine(lines[0]);
  const mappedHeaders: (keyof FunnelMetric | null)[] = rawHeaders.map((h) => {
    const norm = normalizeHeader(h);
    // try exact, then try the map
    return HEADER_MAP[norm] ?? HEADER_MAP[h.trim().toLowerCase()] ?? null;
  });

  // Check required columns
  const required: (keyof FunnelMetric)[] = ["date", "sessions", "paid_orders"];
  const mapped = new Set(mappedHeaders.filter(Boolean));
  const missing = required.filter((r) => !mapped.has(r));
  if (missing.length > 0) {
    return {
      error: `Missing required columns: ${missing.join(", ")}. Make sure your CSV has at least: date, sessions, paid_orders (or orders/purchases/transactions).`,
      missingColumns: missing,
      availableColumns: rawHeaders,
    };
  }

  // Parse rows
  const rows: FunnelMetric[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length < 3) continue; // skip empty rows

    const row: Partial<FunnelMetric> = {};
    for (let j = 0; j < mappedHeaders.length; j++) {
      const key = mappedHeaders[j];
      if (!key || j >= values.length) continue;
      const val = values[j];
      if (key === "date" || key === "segment_key" || key === "channel" || key === "device") {
        (row as any)[key] = val;
      } else {
        (row as any)[key] = parseFloat(val) || 0;
      }
    }

    // Auto-generate segment_key if missing
    if (!row.segment_key) {
      const ch = (row.channel || "unknown").toLowerCase().replace(/\s+/g, "_");
      const dev = (row.device || "unknown").toLowerCase().replace(/\s+/g, "_");
      row.segment_key = `${ch}_${dev}`;
    }
    if (!row.channel) row.channel = row.segment_key?.split("_").slice(0, -1).join(" ") || "Unknown";
    if (!row.device) row.device = row.segment_key?.split("_").pop() || "Unknown";

    // Derive missing funnel stages from what we have
    const sessions = row.sessions || 0;
    if (!row.view_item) row.view_item = Math.round(sessions * 0.72);
    if (!row.add_to_cart) row.add_to_cart = Math.round(sessions * 0.15);
    if (!row.begin_checkout) row.begin_checkout = Math.round(sessions * 0.085);
    if (!row.paid_orders) row.paid_orders = Math.round(sessions * 0.065);

    // Derive rates and metrics with sensible defaults
    if (!row.payment_success_rate) row.payment_success_rate = row.begin_checkout ? (row.paid_orders || 0) / row.begin_checkout : 0.92;
    if (!row.aov) row.aov = row.net_revenue && row.paid_orders ? Math.round(row.net_revenue / row.paid_orders) : 85;
    if (!row.net_revenue) row.net_revenue = (row.paid_orders || 0) * (row.aov || 85);
    if (!row.latency_ms) row.latency_ms = 1200;
    if (!row.error_rate) row.error_rate = 0.012;
    if (!row.tickets) row.tickets = 8;
    if (!row.bounce_rate) row.bounce_rate = 0.41;
    if (!row.promo_error_rate) row.promo_error_rate = 0.005;

    rows.push(row as FunnelMetric);
  }

  if (rows.length === 0) return { error: "No valid data rows found in the CSV." };

  // Sort by date
  rows.sort((a, b) => a.date.localeCompare(b.date));

  // Extract unique segments
  const segments = [...new Set(rows.map((r) => r.segment_key))];

  // Compute baselines from first 50% of each segment's data
  const baselines = computeBaselines(rows, segments);

  // Derive payment events and support tickets
  const paymentEvents = derivePaymentEvents(rows, baselines);
  const supportTickets = deriveSupportTickets(rows, baselines);

  const dates = rows.map((r) => r.date).sort();

  return {
    funnelData: rows,
    baselines,
    paymentEvents,
    supportTickets,
    segments,
    dateRange: { from: dates[0], to: dates[dates.length - 1] },
    rowCount: rows.length,
  };
}

function computeBaselines(rows: FunnelMetric[], segments: string[]): SegmentBaseline[] {
  return segments.map((seg) => {
    const segRows = rows.filter((r) => r.segment_key === seg);
    const baselineCount = Math.max(1, Math.ceil(segRows.length * 0.5));
    const baseRows = segRows.slice(0, baselineCount);

    const avg = (fn: (r: FunnelMetric) => number) =>
      baseRows.reduce((s, r) => s + fn(r), 0) / baseRows.length;

    return {
      segment_key: seg,
      channel: baseRows[0]?.channel || seg,
      device: baseRows[0]?.device || "Unknown",
      baseline_sessions: Math.round(avg((r) => r.sessions)),
      baseline_purchase_rate: parseFloat(avg((r) => r.begin_checkout ? r.paid_orders / r.begin_checkout : 0.92).toFixed(3)),
      baseline_pay_success: parseFloat(avg((r) => r.payment_success_rate).toFixed(3)),
      baseline_aov: Math.round(avg((r) => r.aov)),
      baseline_latency_ms: Math.round(avg((r) => r.latency_ms)),
      baseline_error_rate: parseFloat(avg((r) => r.error_rate).toFixed(4)),
      baseline_tickets: Math.round(avg((r) => r.tickets)),
    };
  });
}

function derivePaymentEvents(rows: FunnelMetric[], baselines: SegmentBaseline[]): PaymentEvent[] {
  const events: PaymentEvent[] = [];
  for (const row of rows) {
    const baseline = baselines.find((b) => b.segment_key === row.segment_key);
    if (!baseline) continue;

    const baselineRate = baseline.baseline_pay_success;
    if (row.payment_success_rate < baselineRate - 0.02) {
      const failCount = Math.round(row.begin_checkout * (baselineRate - row.payment_success_rate));
      if (failCount > 0) {
        events.push({ date: row.date, segment_key: row.segment_key, event_type: "payment_intent.payment_failed", failure_code: "card_declined", count: Math.round(failCount * 0.45) });
        events.push({ date: row.date, segment_key: row.segment_key, event_type: "payment_intent.payment_failed", failure_code: "processing_error", count: Math.round(failCount * 0.35) });
        if (failCount > 20) {
          events.push({ date: row.date, segment_key: row.segment_key, event_type: "payment_intent.payment_failed", failure_code: "api_connection_error", count: Math.round(failCount * 0.20) });
        }
      }
    }
  }
  return events;
}

function deriveSupportTickets(rows: FunnelMetric[], baselines: SegmentBaseline[]): SupportTicket[] {
  const tickets: SupportTicket[] = [];
  for (const row of rows) {
    const baseline = baselines.find((b) => b.segment_key === row.segment_key);
    if (!baseline) continue;
    if (row.tickets > baseline.baseline_tickets * 1.5) {
      const excess = row.tickets - baseline.baseline_tickets;
      tickets.push({ date: row.date, segment_key: row.segment_key, reason: "payment_failed", count: Math.round(excess * 0.4) });
      tickets.push({ date: row.date, segment_key: row.segment_key, reason: "checkout_error", count: Math.round(excess * 0.3) });
      tickets.push({ date: row.date, segment_key: row.segment_key, reason: "slow_loading", count: Math.round(excess * 0.2) });
      if (row.promo_error_rate > 0.01) {
        tickets.push({ date: row.date, segment_key: row.segment_key, reason: "coupon_not_working", count: Math.round(excess * 0.1) });
      }
    }
  }
  return tickets;
}
