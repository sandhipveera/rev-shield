// Vercel Cron Job: Generates backdated Shopify orders for Nova Pulse store
// Schedule: Every 5 minutes (configured in vercel.json)
// Creates 1 order per invocation to respect Shopify rate limits
//
// Timeline (Apr 5 - Apr 18, 2026):
// Days 0-7  (Apr 5-12):  BASELINE — normal traffic, ~92% success
// Days 8-11 (Apr 13-16): DEGRADATION — payment failures spike
// Days 12-13 (Apr 17-18): RECOVERY — metrics returning to normal

import { NextResponse } from "next/server";

const SHOP = "nova-pulse-14.myshopify.com";
const TOKEN = process.env.SHOPIFY_ADMIN_TOKEN || "";
const API = `https://${SHOP}/admin/api/2024-01`;
const CRON_SECRET = process.env.CRON_SECRET || "";

const START_DATE = "2026-04-05";
const END_DATE = "2026-04-18";

// Day patterns: [targetOrders, successRate]
const PATTERNS: [number, number][] = [
  [12, 92], [11, 93], [13, 91], [12, 92], [13, 93], [11, 92], [12, 91], [12, 92], // baseline
  [9, 80], [6, 68], [5, 60], [5, 58],  // degradation
  [9, 84], [12, 91],  // recovery
];

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

// Persistent state via Shopify order count per date
// We use a simple approach: check how many orders exist for each date and fill gaps

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function daysBetween(d1: string, d2: string): number {
  return Math.round((new Date(d2).getTime() - new Date(d1).getTime()) / 86400000);
}

async function getOrderCountForDate(date: string): Promise<number> {
  const nextDay = addDays(date, 1);
  const res = await fetch(
    `${API}/orders/count.json?status=any&created_at_min=${date}T00:00:00Z&created_at_max=${nextDay}T00:00:00Z`,
    { headers: { "X-Shopify-Access-Token": TOKEN } }
  );
  if (!res.ok) return -1;
  const data = await res.json();
  return data.count || 0;
}

async function createOrder(date: string, dayIdx: number): Promise<{ success: boolean; status: string }> {
  const [, successRate] = PATTERNS[dayIdx];
  const isDegraded = dayIdx >= 8 && dayIdx <= 11;

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

  const hour = randInt(8, 22);
  const minute = randInt(0, 59);
  const second = randInt(0, 59);
  const createdAt = `${date}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:${String(second).padStart(2, "0")}+00:00`;

  const note = isDegraded && !isPaid ? rand(FAILURE_NOTES) : "";

  const order = {
    email,
    financial_status: isPaid ? "paid" : "voided",
    fulfillment_status: isPaid && Math.random() > 0.3 ? "fulfilled" : null,
    created_at: createdAt,
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
    return { success: true, status: `${isPaid ? "paid" : "voided"} | ${channel} | ${createdAt}` };
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
    // Allow without secret for dev, but log warning
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

  // Find the first day that needs more orders
  let targetDayIdx = -1;
  let targetDate = "";
  let currentCount = 0;
  let targetCount = 0;

  for (let i = 0; i < PATTERNS.length; i++) {
    const date = addDays(START_DATE, i);

    // Don't create orders for future dates
    if (date > today) break;

    const count = await getOrderCountForDate(date);
    if (count < 0) continue; // API error, skip

    const [target] = PATTERNS[i];
    if (count < target) {
      targetDayIdx = i;
      targetDate = date;
      currentCount = count;
      targetCount = target;
      break;
    }
  }

  if (targetDayIdx === -1) {
    return NextResponse.json({
      message: "All dates up to today are fully populated!",
      today,
      done: today >= END_DATE,
    });
  }

  // Batch mode: create as many orders as we can in ~50 seconds
  // (Vercel function timeout is 60s on free tier)
  const startTime = Date.now();
  const MAX_RUNTIME = 50_000; // 50 seconds
  const results: { date: string; phase: string; status: string; success: boolean }[] = [];
  let currentDayIdx = targetDayIdx;
  let currentDate = targetDate;
  let orderCount = currentCount;
  let orderTarget = targetCount;

  while (Date.now() - startTime < MAX_RUNTIME && currentDayIdx < PATTERNS.length) {
    // Check if current day is in the future
    if (currentDate > today) break;

    // Check if current day is complete
    if (orderCount >= orderTarget) {
      currentDayIdx++;
      if (currentDayIdx >= PATTERNS.length) break;
      currentDate = addDays(START_DATE, currentDayIdx);
      if (currentDate > today) break;
      const cnt = await getOrderCountForDate(currentDate);
      if (cnt < 0) break;
      orderCount = cnt;
      [orderTarget] = PATTERNS[currentDayIdx];
      if (orderCount >= orderTarget) continue;
    }

    const phase = currentDayIdx <= 7 ? "BASELINE" : currentDayIdx <= 11 ? "DEGRADED" : "RECOVERY";
    const result = await createOrder(currentDate, currentDayIdx);
    results.push({ date: currentDate, phase, status: result.status, success: result.success });

    if (result.success) {
      orderCount++;
    } else if (result.status === "rate_limited") {
      // Wait 5 seconds and try again
      await new Promise((r) => setTimeout(r, 5000));
    } else {
      // Other error, wait a bit
      await new Promise((r) => setTimeout(r, 2000));
    }

    // Delay between orders to respect rate limits
    await new Promise((r) => setTimeout(r, 3000));
  }

  const succeeded = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  return NextResponse.json({
    message: `Batch complete: ${succeeded} created, ${failed} failed`,
    totalAttempted: results.length,
    succeeded,
    failed,
    results: results.slice(-10), // last 10 results
    today,
  });
}
