// Shopify Order Generator for Nova Pulse dev store
// Uses GraphQL API to bypass REST order rate limits
// Usage: npx tsx shopify-setup/generate-orders.ts <shpat_token>

const SHOP = "nova-pulse-14.myshopify.com";
const TOKEN = process.argv[2];
if (!TOKEN) {
  console.error("Usage: npx tsx shopify-setup/generate-orders.ts <shpat_token>");
  process.exit(1);
}

const GRAPHQL_URL = `https://${SHOP}/admin/api/2024-01/graphql.json`;
const REST_URL = `https://${SHOP}/admin/api/2024-01`;

// Order patterns per day — 14 days with degradation on days 9-12
const DAY_PATTERNS = [
  // Baseline (days 1-8): ~9 orders/day, ~92% success
  { orders: 9, successRate: 0.92 },
  { orders: 8, successRate: 0.93 },
  { orders: 10, successRate: 0.91 },
  { orders: 9, successRate: 0.92 },
  { orders: 10, successRate: 0.93 },
  { orders: 8, successRate: 0.92 },
  { orders: 9, successRate: 0.91 },
  { orders: 9, successRate: 0.92 },
  // Degradation (days 9-12): fewer orders, lower success
  { orders: 7, successRate: 0.82 },
  { orders: 5, successRate: 0.72 },
  { orders: 4, successRate: 0.65 },
  { orders: 4, successRate: 0.62 },
  // Recovery (days 13-14)
  { orders: 7, successRate: 0.86 },
  { orders: 9, successRate: 0.91 },
];

// Products with prices (will use title+price since GraphQL orderCreate supports that)
const PRODUCTS = [
  { title: "Wireless Charging Pad", price: "39.00" },
  { title: "MagSafe Phone Grip", price: "24.00" },
  { title: "USB-C Travel Hub", price: "59.00" },
  { title: "Laptop Stand - Aluminum", price: "79.00" },
  { title: "Noise-Canceling Earbuds", price: "89.00" },
  { title: "Minimalist Wallet", price: "34.00" },
  { title: "Key Organizer", price: "19.00" },
  { title: "Insulated Water Bottle", price: "29.00" },
  { title: "Travel Pouch Set", price: "44.00" },
  { title: "LED Desk Lamp", price: "49.00" },
  { title: "Cable Management Kit", price: "22.00" },
  { title: "Mousepad XL", price: "28.00" },
  { title: "Monitor Light Bar", price: "65.00" },
  { title: "Work From Home Bundle", price: "149.00" },
  { title: "Travel Essentials Kit", price: "99.00" },
];

const CHANNELS = ["direct", "paid_social", "paid_search", "email"];
const FIRST_NAMES = ["Emma","Liam","Olivia","Noah","Ava","Ethan","Sophia","Mason","Isabella","James","Mia","Lucas","Charlotte","Henry","Amelia","Alexander","Harper","Benjamin","Evelyn","Daniel"];
const LAST_NAMES = ["Smith","Johnson","Williams","Brown","Jones","Garcia","Miller","Davis","Rodriguez","Martinez","Anderson","Taylor","Thomas","Moore","Martin","Jackson","Thompson","White","Lopez","Lee"];
const CITIES = [
  { city: "New York", province: "NY" },
  { city: "Los Angeles", province: "CA" },
  { city: "Chicago", province: "IL" },
  { city: "Houston", province: "TX" },
  { city: "Phoenix", province: "AZ" },
  { city: "Austin", province: "TX" },
  { city: "Denver", province: "CO" },
  { city: "Seattle", province: "WA" },
];
const STREETS = ["Main St","Oak Ave","Park Rd","Broadway","Elm St","Pine Dr"];

const rand = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

function makeDate(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(randInt(8, 22), randInt(0, 59), randInt(0, 59));
  return d.toISOString();
}

async function graphql(query: string, variables?: any): Promise<any> {
  const res = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers: {
      "X-Shopify-Access-Token": TOKEN,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });

  if (res.status === 429) {
    console.log("    ⏳ Rate limited, waiting 5s...");
    await sleep(5000);
    return graphql(query, variables);
  }

  const data = await res.json();
  return data;
}

async function createOrder(opts: {
  products: typeof PRODUCTS[number][];
  firstName: string;
  lastName: string;
  email: string;
  city: typeof CITIES[number];
  street: string;
  zip: string;
  isPaid: boolean;
  createdAt: string;
  tags: string;
  note?: string;
}): Promise<boolean> {
  const lineItems = opts.products.map(p => `{
    title: "${p.title}",
    quantity: 1,
    priceSet: { shopMoney: { amount: "${p.price}", currencyCode: USD } }
  }`).join(",\n    ");

  const address = `{
    firstName: "${opts.firstName}",
    lastName: "${opts.lastName}",
    address1: "${opts.street}",
    city: "${opts.city.city}",
    provinceCode: "${opts.city.province}",
    countryCode: US,
    zip: "${opts.zip}"
  }`;

  const mutation = `mutation {
    orderCreate(order: {
      lineItems: [${lineItems}],
      billingAddress: ${address},
      shippingAddress: ${address},
      email: "${opts.email}",
      tags: ["${opts.tags}"],
      note: "${opts.note || ""}"
    }) {
      order { id name createdAt }
      userErrors { field message }
    }
  }`;

  const result = await graphql(mutation);

  if (result.data?.orderCreate?.userErrors?.length > 0) {
    console.error(`    ❌ ${result.data.orderCreate.userErrors[0].message}`);
    return false;
  }

  if (result.data?.orderCreate?.order?.id) {
    // If order should be failed/voided, cancel it
    if (!opts.isPaid) {
      const orderId = result.data.orderCreate.order.id;
      await graphql(`mutation { orderCancel(orderId: "${orderId}", reason: FRAUD, notifyCustomer: false, refund: false, restock: false, staffNote: "Simulated payment failure") { orderCancelUserErrors { field message } } }`);
    }
    return true;
  }

  if (result.errors) {
    console.error(`    ❌ GraphQL: ${result.errors[0]?.message || JSON.stringify(result.errors).slice(0, 100)}`);
    return false;
  }

  return false;
}

async function main() {
  console.log("🛒 Nova Pulse Order Generator (GraphQL)");
  console.log("========================================");

  const totalOrders = DAY_PATTERNS.reduce((s, d) => s + d.orders, 0);
  console.log(`  Generating ${totalOrders} orders across 14 days\n`);

  let created = 0;
  let failed = 0;

  for (let dayIdx = 0; dayIdx < DAY_PATTERNS.length; dayIdx++) {
    const pattern = DAY_PATTERNS[dayIdx];
    const daysAgo = DAY_PATTERNS.length - dayIdx;
    const dateLabel = new Date(Date.now() - daysAgo * 86400000).toISOString().slice(0, 10);
    const isDegraded = dayIdx >= 8 && dayIdx <= 11;

    console.log(`📅 ${dateLabel} — ${pattern.orders} orders, ${Math.round(pattern.successRate * 100)}% success${isDegraded ? " ⚠️ DEGRADED" : ""}`);

    for (let i = 0; i < pattern.orders; i++) {
      const channel = rand(CHANNELS);
      const isPaid = Math.random() < pattern.successRate;
      const firstName = rand(FIRST_NAMES);
      const lastName = rand(LAST_NAMES);
      const city = rand(CITIES);

      // Pick 1-3 products
      const numItems = randInt(1, 3);
      const items: typeof PRODUCTS[number][] = [];
      for (let j = 0; j < numItems; j++) {
        items.push(rand(PRODUCTS));
      }

      const ok = await createOrder({
        products: items,
        firstName,
        lastName,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${randInt(1, 999)}@example.com`,
        city,
        street: `${randInt(100, 9999)} ${rand(STREETS)}`,
        zip: String(randInt(10000, 99999)),
        isPaid,
        createdAt: makeDate(daysAgo),
        tags: channel,
        note: isDegraded && !isPaid ? "Payment error during incident" : "",
      });

      if (ok) {
        created++;
        process.stdout.write("  ✓");
      } else {
        failed++;
        process.stdout.write("  ✗");
      }

      // GraphQL cost is 10 per order, restore rate 100/s, so we have headroom
      // But be safe with ~1 req/sec
      await sleep(1200);
    }

    console.log(`\n  Running total: ${created} created, ${failed} failed\n`);
  }

  console.log("========================================");
  console.log(`✅ Done! ${created} orders created, ${failed} failed.`);
  console.log(`\n🔍 Test: rev-shield.vercel.app → Shopify → nova-pulse-14.myshopify.com`);
}

main().catch(console.error);
