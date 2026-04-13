// Synthetic seed data extracted from revenue_risk_engine_data_model.xlsx
// All data is synthetic for hackathon demo purposes

export interface FunnelMetric {
  date: string;
  segment_key: string;
  channel: string;
  device: string;
  sessions: number;
  view_item: number;
  add_to_cart: number;
  begin_checkout: number;
  paid_orders: number;
  payment_success_rate: number;
  aov: number;
  latency_ms: number;
  error_rate: number;
  tickets: number;
  bounce_rate: number;
  promo_error_rate: number;
  net_revenue: number;
}

export interface SegmentBaseline {
  segment_key: string;
  channel: string;
  device: string;
  baseline_sessions: number;
  baseline_purchase_rate: number;
  baseline_pay_success: number;
  baseline_aov: number;
  baseline_latency_ms: number;
  baseline_error_rate: number;
  baseline_tickets: number;
}

export const baselines: SegmentBaseline[] = [
  { segment_key: "paid_social_mobile", channel: "Paid Social", device: "Mobile", baseline_sessions: 5200, baseline_purchase_rate: 0.91, baseline_pay_success: 0.92, baseline_aov: 84, baseline_latency_ms: 1200, baseline_error_rate: 0.012, baseline_tickets: 8 },
  { segment_key: "paid_search_mobile", channel: "Paid Search", device: "Mobile", baseline_sessions: 4800, baseline_purchase_rate: 0.92, baseline_pay_success: 0.93, baseline_aov: 88, baseline_latency_ms: 1100, baseline_error_rate: 0.011, baseline_tickets: 6 },
  { segment_key: "email_desktop", channel: "Email", device: "Desktop", baseline_sessions: 3500, baseline_purchase_rate: 0.94, baseline_pay_success: 0.95, baseline_aov: 92, baseline_latency_ms: 950, baseline_error_rate: 0.009, baseline_tickets: 4 },
  { segment_key: "direct_desktop", channel: "Direct", device: "Desktop", baseline_sessions: 4200, baseline_purchase_rate: 0.93, baseline_pay_success: 0.94, baseline_aov: 86, baseline_latency_ms: 1000, baseline_error_rate: 0.010, baseline_tickets: 5 },
];

// 14 days of synthetic funnel data (Mar 28 - Apr 10, 2026)
// paid_social_mobile has a degradation pattern starting Apr 5
export const funnelData: FunnelMetric[] = [
  // === Baseline period (Mar 28 - Apr 4) ===
  // paid_social_mobile - normal
  { date: "2026-03-28", segment_key: "paid_social_mobile", channel: "Paid Social", device: "Mobile", sessions: 5044, view_item: 3632, add_to_cart: 763, begin_checkout: 427, paid_orders: 390, payment_success_rate: 0.913, aov: 84, latency_ms: 1180, error_rate: 0.011, tickets: 7, bounce_rate: 0.41, promo_error_rate: 0.005, net_revenue: 32760 },
  { date: "2026-03-29", segment_key: "paid_social_mobile", channel: "Paid Social", device: "Mobile", sessions: 5096, view_item: 3669, add_to_cart: 770, begin_checkout: 431, paid_orders: 394, payment_success_rate: 0.914, aov: 85, latency_ms: 1195, error_rate: 0.012, tickets: 8, bounce_rate: 0.41, promo_error_rate: 0.005, net_revenue: 33490 },
  { date: "2026-03-30", segment_key: "paid_social_mobile", channel: "Paid Social", device: "Mobile", sessions: 5148, view_item: 3707, add_to_cart: 778, begin_checkout: 436, paid_orders: 398, payment_success_rate: 0.912, aov: 84, latency_ms: 1210, error_rate: 0.012, tickets: 9, bounce_rate: 0.41, promo_error_rate: 0.005, net_revenue: 33432 },
  { date: "2026-03-31", segment_key: "paid_social_mobile", channel: "Paid Social", device: "Mobile", sessions: 5200, view_item: 3744, add_to_cart: 786, begin_checkout: 440, paid_orders: 402, payment_success_rate: 0.914, aov: 84, latency_ms: 1200, error_rate: 0.012, tickets: 8, bounce_rate: 0.41, promo_error_rate: 0.005, net_revenue: 33768 },
  { date: "2026-04-01", segment_key: "paid_social_mobile", channel: "Paid Social", device: "Mobile", sessions: 5252, view_item: 3781, add_to_cart: 794, begin_checkout: 445, paid_orders: 406, payment_success_rate: 0.913, aov: 85, latency_ms: 1190, error_rate: 0.011, tickets: 7, bounce_rate: 0.41, promo_error_rate: 0.005, net_revenue: 34510 },
  { date: "2026-04-02", segment_key: "paid_social_mobile", channel: "Paid Social", device: "Mobile", sessions: 5044, view_item: 3632, add_to_cart: 763, begin_checkout: 427, paid_orders: 389, payment_success_rate: 0.911, aov: 84, latency_ms: 1200, error_rate: 0.012, tickets: 8, bounce_rate: 0.41, promo_error_rate: 0.005, net_revenue: 32676 },
  { date: "2026-04-03", segment_key: "paid_social_mobile", channel: "Paid Social", device: "Mobile", sessions: 5096, view_item: 3669, add_to_cart: 770, begin_checkout: 431, paid_orders: 393, payment_success_rate: 0.912, aov: 84, latency_ms: 1210, error_rate: 0.012, tickets: 8, bounce_rate: 0.41, promo_error_rate: 0.005, net_revenue: 33012 },
  { date: "2026-04-04", segment_key: "paid_social_mobile", channel: "Paid Social", device: "Mobile", sessions: 5148, view_item: 3707, add_to_cart: 778, begin_checkout: 436, paid_orders: 397, payment_success_rate: 0.910, aov: 84, latency_ms: 1220, error_rate: 0.013, tickets: 9, bounce_rate: 0.41, promo_error_rate: 0.005, net_revenue: 33348 },
  // === Degradation starts Apr 5 ===
  { date: "2026-04-05", segment_key: "paid_social_mobile", channel: "Paid Social", device: "Mobile", sessions: 5200, view_item: 3744, add_to_cart: 786, begin_checkout: 440, paid_orders: 374, payment_success_rate: 0.850, aov: 82, latency_ms: 1850, error_rate: 0.028, tickets: 22, bounce_rate: 0.43, promo_error_rate: 0.012, net_revenue: 30668 },
  { date: "2026-04-06", segment_key: "paid_social_mobile", channel: "Paid Social", device: "Mobile", sessions: 5252, view_item: 3781, add_to_cart: 794, begin_checkout: 445, paid_orders: 360, payment_success_rate: 0.809, aov: 81, latency_ms: 2400, error_rate: 0.035, tickets: 38, bounce_rate: 0.44, promo_error_rate: 0.018, net_revenue: 29160 },
  { date: "2026-04-07", segment_key: "paid_social_mobile", channel: "Paid Social", device: "Mobile", sessions: 5044, view_item: 3632, add_to_cart: 763, begin_checkout: 427, paid_orders: 343, payment_success_rate: 0.803, aov: 80, latency_ms: 2600, error_rate: 0.038, tickets: 53, bounce_rate: 0.45, promo_error_rate: 0.022, net_revenue: 27440 },
  { date: "2026-04-08", segment_key: "paid_social_mobile", channel: "Paid Social", device: "Mobile", sessions: 5096, view_item: 3669, add_to_cart: 770, begin_checkout: 431, paid_orders: 334, payment_success_rate: 0.775, aov: 79, latency_ms: 3100, error_rate: 0.042, tickets: 75, bounce_rate: 0.46, promo_error_rate: 0.025, net_revenue: 26386 },
  // === Recovery after fix Apr 9-10 ===
  { date: "2026-04-09", segment_key: "paid_social_mobile", channel: "Paid Social", device: "Mobile", sessions: 5148, view_item: 3707, add_to_cart: 778, begin_checkout: 436, paid_orders: 364, payment_success_rate: 0.835, aov: 82, latency_ms: 2400, error_rate: 0.030, tickets: 45, bounce_rate: 0.43, promo_error_rate: 0.015, net_revenue: 29848 },
  { date: "2026-04-10", segment_key: "paid_social_mobile", channel: "Paid Social", device: "Mobile", sessions: 5200, view_item: 3744, add_to_cart: 786, begin_checkout: 440, paid_orders: 402, payment_success_rate: 0.914, aov: 84, latency_ms: 1230, error_rate: 0.013, tickets: 10, bounce_rate: 0.41, promo_error_rate: 0.005, net_revenue: 33768 },

  // paid_search_mobile - stable throughout
  { date: "2026-03-28", segment_key: "paid_search_mobile", channel: "Paid Search", device: "Mobile", sessions: 4656, view_item: 3445, add_to_cart: 758, begin_checkout: 440, paid_orders: 405, payment_success_rate: 0.920, aov: 88, latency_ms: 1100, error_rate: 0.011, tickets: 6, bounce_rate: 0.41, promo_error_rate: 0.004, net_revenue: 35640 },
  { date: "2026-03-29", segment_key: "paid_search_mobile", channel: "Paid Search", device: "Mobile", sessions: 4704, view_item: 3481, add_to_cart: 766, begin_checkout: 444, paid_orders: 409, payment_success_rate: 0.921, aov: 88, latency_ms: 1090, error_rate: 0.011, tickets: 5, bounce_rate: 0.41, promo_error_rate: 0.004, net_revenue: 35992 },
  { date: "2026-03-30", segment_key: "paid_search_mobile", channel: "Paid Search", device: "Mobile", sessions: 4752, view_item: 3516, add_to_cart: 774, begin_checkout: 449, paid_orders: 413, payment_success_rate: 0.920, aov: 88, latency_ms: 1100, error_rate: 0.011, tickets: 6, bounce_rate: 0.41, promo_error_rate: 0.004, net_revenue: 36344 },
  { date: "2026-03-31", segment_key: "paid_search_mobile", channel: "Paid Search", device: "Mobile", sessions: 4800, view_item: 3552, add_to_cart: 781, begin_checkout: 453, paid_orders: 417, payment_success_rate: 0.921, aov: 88, latency_ms: 1100, error_rate: 0.011, tickets: 6, bounce_rate: 0.41, promo_error_rate: 0.004, net_revenue: 36696 },
  { date: "2026-04-01", segment_key: "paid_search_mobile", channel: "Paid Search", device: "Mobile", sessions: 4848, view_item: 3588, add_to_cart: 789, begin_checkout: 458, paid_orders: 421, payment_success_rate: 0.919, aov: 88, latency_ms: 1110, error_rate: 0.011, tickets: 6, bounce_rate: 0.41, promo_error_rate: 0.004, net_revenue: 37048 },
  { date: "2026-04-02", segment_key: "paid_search_mobile", channel: "Paid Search", device: "Mobile", sessions: 4656, view_item: 3445, add_to_cart: 758, begin_checkout: 440, paid_orders: 405, payment_success_rate: 0.920, aov: 88, latency_ms: 1100, error_rate: 0.011, tickets: 6, bounce_rate: 0.41, promo_error_rate: 0.004, net_revenue: 35640 },
  { date: "2026-04-03", segment_key: "paid_search_mobile", channel: "Paid Search", device: "Mobile", sessions: 4704, view_item: 3481, add_to_cart: 766, begin_checkout: 444, paid_orders: 409, payment_success_rate: 0.921, aov: 88, latency_ms: 1095, error_rate: 0.011, tickets: 5, bounce_rate: 0.41, promo_error_rate: 0.004, net_revenue: 35992 },
  { date: "2026-04-04", segment_key: "paid_search_mobile", channel: "Paid Search", device: "Mobile", sessions: 4752, view_item: 3516, add_to_cart: 774, begin_checkout: 449, paid_orders: 413, payment_success_rate: 0.920, aov: 88, latency_ms: 1100, error_rate: 0.011, tickets: 6, bounce_rate: 0.41, promo_error_rate: 0.004, net_revenue: 36344 },
  { date: "2026-04-05", segment_key: "paid_search_mobile", channel: "Paid Search", device: "Mobile", sessions: 4800, view_item: 3552, add_to_cart: 781, begin_checkout: 453, paid_orders: 417, payment_success_rate: 0.921, aov: 88, latency_ms: 1100, error_rate: 0.011, tickets: 6, bounce_rate: 0.41, promo_error_rate: 0.004, net_revenue: 36696 },
  { date: "2026-04-06", segment_key: "paid_search_mobile", channel: "Paid Search", device: "Mobile", sessions: 4848, view_item: 3588, add_to_cart: 789, begin_checkout: 458, paid_orders: 421, payment_success_rate: 0.919, aov: 88, latency_ms: 1110, error_rate: 0.011, tickets: 6, bounce_rate: 0.41, promo_error_rate: 0.004, net_revenue: 37048 },
  { date: "2026-04-07", segment_key: "paid_search_mobile", channel: "Paid Search", device: "Mobile", sessions: 4656, view_item: 3445, add_to_cart: 758, begin_checkout: 440, paid_orders: 405, payment_success_rate: 0.920, aov: 88, latency_ms: 1100, error_rate: 0.011, tickets: 6, bounce_rate: 0.41, promo_error_rate: 0.004, net_revenue: 35640 },
  { date: "2026-04-08", segment_key: "paid_search_mobile", channel: "Paid Search", device: "Mobile", sessions: 4704, view_item: 3481, add_to_cart: 766, begin_checkout: 444, paid_orders: 410, payment_success_rate: 0.923, aov: 88, latency_ms: 1095, error_rate: 0.011, tickets: 5, bounce_rate: 0.41, promo_error_rate: 0.004, net_revenue: 36080 },
  { date: "2026-04-09", segment_key: "paid_search_mobile", channel: "Paid Search", device: "Mobile", sessions: 4752, view_item: 3516, add_to_cart: 774, begin_checkout: 449, paid_orders: 413, payment_success_rate: 0.920, aov: 88, latency_ms: 1100, error_rate: 0.011, tickets: 6, bounce_rate: 0.41, promo_error_rate: 0.004, net_revenue: 36344 },
  { date: "2026-04-10", segment_key: "paid_search_mobile", channel: "Paid Search", device: "Mobile", sessions: 4800, view_item: 3552, add_to_cart: 781, begin_checkout: 453, paid_orders: 417, payment_success_rate: 0.921, aov: 88, latency_ms: 1100, error_rate: 0.011, tickets: 6, bounce_rate: 0.41, promo_error_rate: 0.004, net_revenue: 36696 },

  // email_desktop - stable
  { date: "2026-03-28", segment_key: "email_desktop", channel: "Email", device: "Desktop", sessions: 3395, view_item: 2648, add_to_cart: 636, begin_checkout: 394, paid_orders: 371, payment_success_rate: 0.942, aov: 92, latency_ms: 950, error_rate: 0.009, tickets: 4, bounce_rate: 0.38, promo_error_rate: 0.004, net_revenue: 34132 },
  { date: "2026-03-31", segment_key: "email_desktop", channel: "Email", device: "Desktop", sessions: 3500, view_item: 2730, add_to_cart: 655, begin_checkout: 406, paid_orders: 382, payment_success_rate: 0.941, aov: 92, latency_ms: 955, error_rate: 0.009, tickets: 4, bounce_rate: 0.38, promo_error_rate: 0.004, net_revenue: 35144 },
  { date: "2026-04-04", segment_key: "email_desktop", channel: "Email", device: "Desktop", sessions: 3465, view_item: 2703, add_to_cart: 649, begin_checkout: 402, paid_orders: 378, payment_success_rate: 0.940, aov: 92, latency_ms: 960, error_rate: 0.009, tickets: 4, bounce_rate: 0.38, promo_error_rate: 0.004, net_revenue: 34776 },
  { date: "2026-04-07", segment_key: "email_desktop", channel: "Email", device: "Desktop", sessions: 3430, view_item: 2675, add_to_cart: 642, begin_checkout: 398, paid_orders: 375, payment_success_rate: 0.942, aov: 92, latency_ms: 950, error_rate: 0.009, tickets: 4, bounce_rate: 0.38, promo_error_rate: 0.004, net_revenue: 34500 },
  { date: "2026-04-10", segment_key: "email_desktop", channel: "Email", device: "Desktop", sessions: 3500, view_item: 2730, add_to_cart: 655, begin_checkout: 406, paid_orders: 382, payment_success_rate: 0.941, aov: 92, latency_ms: 955, error_rate: 0.009, tickets: 4, bounce_rate: 0.38, promo_error_rate: 0.004, net_revenue: 35144 },

  // direct_desktop - stable
  { date: "2026-03-28", segment_key: "direct_desktop", channel: "Direct", device: "Desktop", sessions: 4074, view_item: 2852, add_to_cart: 570, begin_checkout: 325, paid_orders: 302, payment_success_rate: 0.929, aov: 86, latency_ms: 1000, error_rate: 0.010, tickets: 5, bounce_rate: 0.40, promo_error_rate: 0.004, net_revenue: 25972 },
  { date: "2026-03-31", segment_key: "direct_desktop", channel: "Direct", device: "Desktop", sessions: 4200, view_item: 2940, add_to_cart: 588, begin_checkout: 335, paid_orders: 312, payment_success_rate: 0.931, aov: 86, latency_ms: 1000, error_rate: 0.010, tickets: 5, bounce_rate: 0.40, promo_error_rate: 0.004, net_revenue: 26832 },
  { date: "2026-04-04", segment_key: "direct_desktop", channel: "Direct", device: "Desktop", sessions: 4158, view_item: 2911, add_to_cart: 582, begin_checkout: 332, paid_orders: 308, payment_success_rate: 0.928, aov: 86, latency_ms: 1010, error_rate: 0.010, tickets: 5, bounce_rate: 0.40, promo_error_rate: 0.004, net_revenue: 26488 },
  { date: "2026-04-07", segment_key: "direct_desktop", channel: "Direct", device: "Desktop", sessions: 4116, view_item: 2881, add_to_cart: 576, begin_checkout: 328, paid_orders: 305, payment_success_rate: 0.930, aov: 86, latency_ms: 1000, error_rate: 0.010, tickets: 5, bounce_rate: 0.40, promo_error_rate: 0.004, net_revenue: 26230 },
  { date: "2026-04-10", segment_key: "direct_desktop", channel: "Direct", device: "Desktop", sessions: 4200, view_item: 2940, add_to_cart: 588, begin_checkout: 335, paid_orders: 312, payment_success_rate: 0.931, aov: 86, latency_ms: 1000, error_rate: 0.010, tickets: 5, bounce_rate: 0.40, promo_error_rate: 0.004, net_revenue: 26832 },
];

// Payment events for the degraded period
export interface PaymentEvent {
  date: string;
  segment_key: string;
  event_type: string;
  failure_code: string;
  count: number;
}

export const paymentEvents: PaymentEvent[] = [
  { date: "2026-04-05", segment_key: "paid_social_mobile", event_type: "payment_intent.payment_failed", failure_code: "card_declined", count: 28 },
  { date: "2026-04-05", segment_key: "paid_social_mobile", event_type: "payment_intent.payment_failed", failure_code: "processing_error", count: 18 },
  { date: "2026-04-06", segment_key: "paid_social_mobile", event_type: "payment_intent.payment_failed", failure_code: "card_declined", count: 35 },
  { date: "2026-04-06", segment_key: "paid_social_mobile", event_type: "payment_intent.payment_failed", failure_code: "processing_error", count: 32 },
  { date: "2026-04-07", segment_key: "paid_social_mobile", event_type: "payment_intent.payment_failed", failure_code: "card_declined", count: 38 },
  { date: "2026-04-07", segment_key: "paid_social_mobile", event_type: "payment_intent.payment_failed", failure_code: "processing_error", count: 28 },
  { date: "2026-04-07", segment_key: "paid_social_mobile", event_type: "payment_intent.payment_failed", failure_code: "api_connection_error", count: 12 },
  { date: "2026-04-08", segment_key: "paid_social_mobile", event_type: "payment_intent.payment_failed", failure_code: "card_declined", count: 42 },
  { date: "2026-04-08", segment_key: "paid_social_mobile", event_type: "payment_intent.payment_failed", failure_code: "processing_error", count: 35 },
  { date: "2026-04-08", segment_key: "paid_social_mobile", event_type: "payment_intent.payment_failed", failure_code: "api_connection_error", count: 18 },
];

// Support tickets for the degraded period
export interface SupportTicket {
  date: string;
  segment_key: string;
  reason: string;
  count: number;
}

export const supportTickets: SupportTicket[] = [
  { date: "2026-04-05", segment_key: "paid_social_mobile", reason: "payment_failed", count: 8 },
  { date: "2026-04-05", segment_key: "paid_social_mobile", reason: "checkout_error", count: 6 },
  { date: "2026-04-05", segment_key: "paid_social_mobile", reason: "slow_loading", count: 5 },
  { date: "2026-04-06", segment_key: "paid_social_mobile", reason: "payment_failed", count: 14 },
  { date: "2026-04-06", segment_key: "paid_social_mobile", reason: "checkout_error", count: 10 },
  { date: "2026-04-06", segment_key: "paid_social_mobile", reason: "slow_loading", count: 8 },
  { date: "2026-04-07", segment_key: "paid_social_mobile", reason: "payment_failed", count: 20 },
  { date: "2026-04-07", segment_key: "paid_social_mobile", reason: "checkout_error", count: 15 },
  { date: "2026-04-07", segment_key: "paid_social_mobile", reason: "slow_loading", count: 12 },
  { date: "2026-04-08", segment_key: "paid_social_mobile", reason: "payment_failed", count: 28 },
  { date: "2026-04-08", segment_key: "paid_social_mobile", reason: "checkout_error", count: 22 },
  { date: "2026-04-08", segment_key: "paid_social_mobile", reason: "slow_loading", count: 18 },
  { date: "2026-04-08", segment_key: "paid_social_mobile", reason: "coupon_not_working", count: 7 },
];
