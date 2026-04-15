// Vercel Cron Job: Generates Shopify orders for Nova Pulse store
// Schedule: daily (Vercel free tier) + local cron calls every 5 min
//
// NOTE: Shopify dev stores ignore `created_at` — all orders get today's timestamp.
// So we generate orders for TODAY only, with the pattern determined by what day it is.
//
// New Timeline (Apr 13 - Apr 18, 2026):
// Apr 13-14: BASELINE — already have ~700+ orders with ~92% success
// Apr 15:    BASELINE — normal traffic, ~92% success
// Apr 16:    DEGRADATION — payment failures begin, ~75% success
// Apr 17:    DEGRADATION — worst day, ~58% success
// Apr 18:    RECOVERY — hackathon day, ~88% success (demo the recovery!)

import { NextResponse } from "next/server";

const SHOP = "nova-pulse-14.myshopify.com";
const TOKEN = process.env.SHOPIFY_ADMIN_TOKEN || "";
const API = `https://${SHOP}/admin/api/2024-01`;
const CRON_SECRET = process.env.CRON_SECRET || "";

const END_DATE = "2026-04-18";

// Daily config: date -> [targetOrders, successRate]
const DAILY_PLAN: Record<string, [number, number]> = {
  "2026-04-15": [40, 92],   // baseline day
  "2026-04-16": [30, 72],   // degradation starts
  "2026-04-17": [20, 58],   // worst day
  "2026-04-18": [35, 88],   // recovery (hackathon day!)
};

const PRODUCTS = [
  ["Wireless Charging Pad", "39.00"], ["MagSafe Phone Grip", "24.00"], ["USB-C Travel Hub", "59.00"],
  ["Laptop Stand - Aluminum", "79.00"], ["Noise-Canceling Earbuds", "89.00"], ["Minimalist Wallet", "34.00"],
  ["Key Organizer", "19.00"], ["Insulated Water Bottle", "29.00"], ["Travel Pouch Set", "44.00"],
  ["LED Desk Lamp", "49.00"], ["Cable Management Kit", "22.00"], ["Mousepad XL", "28.00"],
  ["Monitor Light Bar", "65.00"], ["Work From Home Bundle", "149.00"], ["Travel Essentials Kit", "99.00"],
];

const CHANNELS = ["direct", "paid_social", "paid_search", "email"];
const DEGRADED_CHANNELS = ["paid_social", "paid_social", "paid_social", "direct", "paid_search", "email"];
const FIRST_NAMES = ["Emma","Liam","Olivia","Noah","Ava","Ethan","Sophia","Mason","Isabella","James","Mia","Lucas","Charlotte","Henry","Amelia","Alexander","Harper","Benjamin","Evelyn","Daniel"];
const LAST_NAMES = ["Smith","Johnson","Williams","Brown","Jones","Garcia","Miller","Davis","Rodriguez","Martinez","Anderson","Taylor","Thomas","Moore","Martin"];
const CITIES = [["New York","NY"],["Los Angeles","CA"],["Chicago","IL"],["Houston","TX"],["Phoenix","AZ"],["Austin","TX"],["Denver","CO"],["Seattle","WA"]];
const STREETS = ["Main St","Oak Ave","Park Rd","Broadway","Elm St","Pine Dr","Cedar Ln","Market St"];
const FAILURE_NOTES = ["Payment gateway timeout","Card processor error","3DS challenge failed","Checkout session expired","Payment method declined"];

const rand = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

async function getOrderCountForDate(date: string): Promise<number> {
  const d = new Date(date + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + 1);
  const nextDay = d.toISOString().slice(0, 10);
  const res = await fetch(
    `${API}/orders/count.json?status=any&created_at_min=${date}T00:00:00Z&created_at_max=${nextDay}T00:00:00Z`,
    { headers: { "X-Shopify-Access-Token": TOKEN } }
  );
  if (!res.ok) return -1;
  const data = await res.json();
  return data.count || 0;
}

async function createOrder(successRate: number, isDegraded: boolean): Promise<{ success: boolean; status: string }> {
  const channel = isDegraded ? rand(DEGRADED_CHANNELS) : rand(CHANNELS);
  const isPaid = Math.random() * 100 < successRate;
  const [prodName, prodPrice] = rand(PRODUCTS);
  const firstName = rand(FIRST_NAMES);
  const lastName = rand(LAST_NAMES);
  const [city, province] = rand(CITIES);
  const street = rand(STREETS);
  const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${randInt(1, 9999)}@example.com`;

  // Second product 40% of the time
  const lineItems: any[] = [{ title: prodName, price: prodPrice, quantity: 1 }];
  if (Math.random() < 0.4) {
    const [p2Name, p2Price] = rand(PRODUCTS);
    lineItems.push({ title: p2Name, price: p2Price, quantity: 1 });
  }

  const note = isDegraded && !isPaid ? rand(FAILURE_NOTES) : "";

  // Don't set created_at — Shopify dev stores ignore it anyway
  const order = {
    email,
    financial_status: isPaid ? "paid" : "voided",
    fulfillment_status: isPaid && Math.random() > 0.3 ? "fulfilled" : null,
    line_items: lineItems,
    source_name: "revshield_gen",
    tags: channel,
    note,
    customer: { first_name: firstName, last_name: lastName, email },
    billing_address: {
      first_name: firstName, last_name: lastName,
      address1: `${randInt(100, 9999)} ${street}`,
      city, province, country: "US", zip: String(randInt(10000, 99999)),
    },
    shipping_address: {
      first_name: firstName, last_name: lastName,
      address1: `${randInt(100, 9999)} ${street}`,
      city, province, country: "US", zip: String(randInt(10000, 99999)),
    },
  };

  const res = await fetch(`${API}/orders.json`, {
    method: "POST",
    headers: { "X-Shopify-Access-Token": TOKEN, "Content-Type": "application/json" },
    body: JSON.stringify({ order }),
  });

  if (res.ok) {
    return { success: true, status: `${isPaid ? "paid" : "voided"} | ${channel}` };
  }

  if (res.status === 429) {
    return { success: false, status: "rate_limited" };
  }

  const err = await res.text();
  return { success: false, status: `error_${res.status}: ${err.slice(0, 100)}` };
}

export async function GET(request: Request) {
  // Verify cron secret (optional security)
  const authHeader = request.headers.get("authorization");
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    console.warn("Cron called without valid secret");
  }

  if (!TOKEN) {
    return NextResponse.json({ error: "SHOPIFY_ADMIN_TOKEN env var not set" }, { status: 500 });
  }

  const today = new Date().toISOString().slice(0, 10);

  // Don't run past end date
  if (today > END_DATE) {
    return NextResponse.json({ message: "Past end date. Cron complete.", done: true });
  }

  // Get today's plan
  const plan = DAILY_PLAN[today];
  if (!plan) {
    return NextResponse.json({
      message: `No plan for ${today}. Orders only generated for: ${Object.keys(DAILY_PLAN).join(", ")}`,
      today,
    });
  }

  const [targetOrders, successRate] = plan;
  const isDegraded = successRate < 80;

  // Check how many orders we already have today
  const currentCount = await getOrderCountForDate(today);
  if (currentCount < 0) {
    return NextResponse.json({ error: "Failed to check order count" }, { status: 500 });
  }

  if (currentCount >= targetOrders) {
    return NextResponse.json({
      message: `Today (${today}) is fully populated: ${currentCount}/${targetOrders} orders`,
      today,
      currentCount,
      targetOrders,
      successRate,
    });
  }

  const remaining = targetOrders - currentCount;

  // Batch mode: create orders within 50s runtime limit
  const startTime = Date.now();
  const MAX_RUNTIME = 50_000;
  const results: { phase: string; status: string; success: boolean }[] = [];
  let created = 0;

  const phase = isDegraded ? "DEGRADED" : successRate < 90 ? "RECOVERY" : "BASELINE";

  while (Date.now() - startTime < MAX_RUNTIME && created < remaining) {
    const result = await createOrder(successRate, isDegraded);
    results.push({ phase, status: result.status, success: result.success });

    if (result.success) {
      created++;
    } else if (result.status === "rate_limited") {
      await new Promise((r) => setTimeout(r, 5000));
    } else {
      await new Promise((r) => setTimeout(r, 2000));
    }

    // Delay between orders
    await new Promise((r) => setTimeout(r, 3000));
  }

  const succeeded = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  return NextResponse.json({
    message: `Batch complete: ${succeeded} created, ${failed} failed. Progress: ${currentCount + succeeded}/${targetOrders}`,
    today,
    phase,
    successRate,
    progress: `${currentCount + succeeded}/${targetOrders}`,
    totalAttempted: results.length,
    succeeded,
    failed,
    results: results.slice(-10),
  });
}
