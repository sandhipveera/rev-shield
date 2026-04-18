// Apify Integration: Web scraping for GTM competitive intelligence
// Supports: competitor pricing, landing page health checks, review sentiment
//
// Uses Apify's Web Scraper actor to extract data from competitor sites
// and surfaces insights alongside funnel analysis

import { NextRequest, NextResponse } from "next/server";

const APIFY_BASE = "https://api.apify.com/v2";

interface ApifyRequest {
  token: string;
  mode: "competitor-pricing" | "landing-page-health" | "review-sentiment";
  urls: string[];
}

interface CompetitorPrice {
  url: string;
  title: string;
  price: string;
  currency: string;
  availability: string;
  scrapedAt: string;
}

interface LandingPageHealth {
  url: string;
  status: number;
  loadTimeMs: number;
  title: string;
  hasSSL: boolean;
  brokenLinks: number;
  scrapedAt: string;
}

interface ReviewSentiment {
  url: string;
  platform: string;
  avgRating: number;
  totalReviews: number;
  recentNegative: string[];
  scrapedAt: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: ApifyRequest = await req.json();
    const { mode, urls } = body;

    // Server-side fallback to env var for demo/production use.
    // The user's token from the request body takes priority if provided.
    const token = body.token?.trim() || process.env.APIFY_TOKEN;

    if (!token) {
      return NextResponse.json(
        { error: "Apify API token required. Provide in request or set APIFY_TOKEN env var." },
        { status: 400 }
      );
    }

    if (!urls || urls.length === 0) {
      return NextResponse.json({ error: "At least one URL required" }, { status: 400 });
    }

    if (mode === "competitor-pricing") {
      return await scrapeCompetitorPricing(token, urls);
    } else if (mode === "landing-page-health") {
      return await checkLandingPageHealth(token, urls);
    } else if (mode === "review-sentiment") {
      return await scrapeReviewSentiment(token, urls);
    }

    return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Apify fetch failed" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// Competitor Pricing via Apify Web Scraper
// ---------------------------------------------------------------------------
async function scrapeCompetitorPricing(token: string, urls: string[]): Promise<NextResponse> {
  // Use Apify's Cheerio Scraper for lightweight extraction
  const actorId = "apify/cheerio-scraper";

  const input = {
    startUrls: urls.map((url) => ({ url })),
    pageFunction: `async function pageFunction(context) {
      const { $, request } = context;
      const title = $('title').text().trim() || $('h1').first().text().trim() || 'Unknown';
      const priceEl = $('[class*="price"], [data-price], .price, #price, [itemprop="price"]').first();
      const price = priceEl.attr('content') || priceEl.text().replace(/[^0-9.,]/g, '').trim() || 'N/A';
      const currency = $('[itemprop="priceCurrency"]').attr('content') || 'USD';
      const avail = $('[itemprop="availability"]').attr('content') ||
                    ($('.in-stock, [class*="in-stock"], [class*="available"]').length ? 'InStock' : 'Unknown');
      return { url: request.url, title, price, currency, availability: avail, scrapedAt: new Date().toISOString() };
    }`,
    maxRequestsPerCrawl: urls.length,
    maxConcurrency: 5,
  };

  const results = await runApifyActor(token, actorId, input);

  const prices: CompetitorPrice[] = results.map((r: any) => ({
    url: r.url || "",
    title: r.title || "Unknown",
    price: r.price || "N/A",
    currency: r.currency || "USD",
    availability: r.availability || "Unknown",
    scrapedAt: r.scrapedAt || new Date().toISOString(),
  }));

  return NextResponse.json({
    mode: "competitor-pricing",
    results: prices,
    summary: {
      totalScraped: prices.length,
      withPrices: prices.filter((p) => p.price !== "N/A").length,
      avgPrice: calculateAvgPrice(prices),
    },
  });
}

// ---------------------------------------------------------------------------
// Landing Page Health Check
// ---------------------------------------------------------------------------
async function checkLandingPageHealth(token: string, urls: string[]): Promise<NextResponse> {
  const actorId = "apify/cheerio-scraper";

  const input = {
    startUrls: urls.map((url) => ({ url })),
    pageFunction: `async function pageFunction(context) {
      const { $, request, response } = context;
      const title = $('title').text().trim() || 'No title';
      const brokenLinks = $('a[href]').toArray().filter(a => {
        const href = $(a).attr('href');
        return href && (href.startsWith('javascript:') || href === '#');
      }).length;
      const hasSSL = request.url.startsWith('https');
      return {
        url: request.url,
        status: response.statusCode,
        title,
        hasSSL,
        brokenLinks,
        scrapedAt: new Date().toISOString(),
      };
    }`,
    maxRequestsPerCrawl: urls.length,
    maxConcurrency: 5,
  };

  const startTime = Date.now();
  const results = await runApifyActor(token, actorId, input);
  const elapsed = Date.now() - startTime;

  const health: LandingPageHealth[] = results.map((r: any) => ({
    url: r.url || "",
    status: r.status || 0,
    loadTimeMs: Math.round(elapsed / Math.max(1, results.length)),
    title: r.title || "Unknown",
    hasSSL: r.hasSSL ?? false,
    brokenLinks: r.brokenLinks || 0,
    scrapedAt: r.scrapedAt || new Date().toISOString(),
  }));

  const issues = health.filter((h) => h.status >= 400 || !h.hasSSL || h.brokenLinks > 3);

  return NextResponse.json({
    mode: "landing-page-health",
    results: health,
    summary: {
      totalChecked: health.length,
      healthy: health.length - issues.length,
      issues: issues.length,
      avgLoadTimeMs: Math.round(health.reduce((s, h) => s + h.loadTimeMs, 0) / Math.max(1, health.length)),
    },
    alerts: issues.map((h) => ({
      url: h.url,
      reason: h.status >= 400 ? `HTTP ${h.status}` : !h.hasSSL ? "No SSL" : `${h.brokenLinks} broken links`,
    })),
  });
}

// ---------------------------------------------------------------------------
// Review Sentiment Scraping
// ---------------------------------------------------------------------------
async function scrapeReviewSentiment(token: string, urls: string[]): Promise<NextResponse> {
  const actorId = "apify/cheerio-scraper";

  const input = {
    startUrls: urls.map((url) => ({ url })),
    pageFunction: `async function pageFunction(context) {
      const { $, request } = context;
      const ratingEl = $('[itemprop="ratingValue"], .rating-value, [class*="rating"]').first();
      const rating = parseFloat(ratingEl.attr('content') || ratingEl.text()) || 0;
      const countEl = $('[itemprop="reviewCount"], .review-count, [class*="review-count"]').first();
      const count = parseInt(countEl.attr('content') || countEl.text().replace(/[^0-9]/g, '')) || 0;
      const negReviews = [];
      $('[class*="review"], .review-body, [itemprop="reviewBody"]').slice(0, 5).each((i, el) => {
        const text = $(el).text().trim().slice(0, 200);
        if (text.length > 20) negReviews.push(text);
      });
      const platform = request.url.includes('trustpilot') ? 'Trustpilot' :
                       request.url.includes('g2') ? 'G2' :
                       request.url.includes('capterra') ? 'Capterra' : 'Other';
      return { url: request.url, platform, avgRating: rating, totalReviews: count, recentNegative: negReviews, scrapedAt: new Date().toISOString() };
    }`,
    maxRequestsPerCrawl: urls.length,
    maxConcurrency: 3,
  };

  const results = await runApifyActor(token, actorId, input);

  const sentiment: ReviewSentiment[] = results.map((r: any) => ({
    url: r.url || "",
    platform: r.platform || "Unknown",
    avgRating: r.avgRating || 0,
    totalReviews: r.totalReviews || 0,
    recentNegative: r.recentNegative || [],
    scrapedAt: r.scrapedAt || new Date().toISOString(),
  }));

  return NextResponse.json({
    mode: "review-sentiment",
    results: sentiment,
    summary: {
      totalPlatforms: sentiment.length,
      avgRating: sentiment.length > 0
        ? (sentiment.reduce((s, r) => s + r.avgRating, 0) / sentiment.length).toFixed(1)
        : "N/A",
      totalReviews: sentiment.reduce((s, r) => s + r.totalReviews, 0),
    },
  });
}

// ---------------------------------------------------------------------------
// Helper: Run an Apify actor and wait for results
// ---------------------------------------------------------------------------
async function runApifyActor(token: string, actorId: string, input: any): Promise<any[]> {
  // Start the actor run
  const runRes = await fetch(
    `${APIFY_BASE}/acts/${actorId}/runs?token=${token}&waitForFinish=120`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }
  );

  if (!runRes.ok) {
    const err = await runRes.text();
    throw new Error(`Apify actor start failed (${runRes.status}): ${err.slice(0, 200)}`);
  }

  const runData = await runRes.json();
  const datasetId = runData.data?.defaultDatasetId;

  if (!datasetId) {
    throw new Error("No dataset ID returned from Apify run");
  }

  // Fetch results from the dataset
  const dataRes = await fetch(
    `${APIFY_BASE}/datasets/${datasetId}/items?token=${token}&format=json`
  );

  if (!dataRes.ok) {
    throw new Error(`Failed to fetch Apify dataset: ${dataRes.status}`);
  }

  return await dataRes.json();
}

// ---------------------------------------------------------------------------
// Helper: Calculate average price from scraped data
// ---------------------------------------------------------------------------
function calculateAvgPrice(prices: CompetitorPrice[]): string {
  const nums = prices
    .map((p) => parseFloat(p.price.replace(/,/g, "")))
    .filter((n) => !isNaN(n));
  if (nums.length === 0) return "N/A";
  return (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(2);
}
