"use client";

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { parseCSV, type ParseResult, type ParseError } from "@/lib/csv-parser";
import { generateScenario, PRESET_SCENARIOS, type ScenarioConfig } from "@/lib/scenario-generator";

export interface DataPayload {
  funnelData: any[];
  baselines: any[];
  paymentEvents: any[];
  supportTickets: any[];
  source: string;
  meta?: { segments: string[]; dateRange: { from: string; to: string }; rowCount: number; description?: string };
}

export interface ApifyIntelData {
  mode: "competitor-pricing" | "landing-page-health" | "review-sentiment";
  results: any[];
  summary: any;
  alerts?: any[];
}

interface Props {
  onDataReady: (data: DataPayload | null) => void;
  onApifyResults?: (data: ApifyIntelData) => void;
  isRunning: boolean;
}

type DataSource = "demo" | "csv" | "sheets" | "shopify" | "stripe" | "scenario" | "apify";

const TABS: { id: DataSource; label: string; icon: string; badge?: string }[] = [
  { id: "demo", label: "Demo", icon: "🎯" },
  { id: "csv", label: "CSV Upload", icon: "📄" },
  { id: "sheets", label: "Google Sheets", icon: "📊" },
  { id: "shopify", label: "Shopify", icon: "🛒", badge: "API" },
  { id: "stripe", label: "Stripe", icon: "💳", badge: "API" },
  { id: "scenario", label: "Scenario", icon: "🧪" },
  { id: "apify", label: "Apify Intel", icon: "🕷️", badge: "$500" },
];

export default function DataSourcePanel({ onDataReady, onApifyResults, isRunning }: Props) {
  const [activeTab, setActiveTab] = useState<DataSource>("demo");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);

  const handleTabSwitch = (tab: DataSource) => {
    setActiveTab(tab);
    setError(null);
    setSuccess(null);
    if (tab === "demo") {
      onDataReady(null); // null = use built-in seed data
      setSuccess("Using built-in demo data (Paid Social Mobile degradation scenario)");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="border border-cyan-900/50 rounded-xl bg-slate-900/80 backdrop-blur overflow-hidden"
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-5 py-3 flex items-center justify-between hover:bg-slate-800/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-lg">📡</span>
          <span className="font-semibold text-cyan-300 tracking-wide text-sm uppercase">Data Source</span>
          {success && (
            <span className="text-xs text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">
              ✓ {activeTab === "demo" ? "Demo" : activeTab.toUpperCase()}
            </span>
          )}
        </div>
        <svg
          className={`w-4 h-4 text-cyan-500 transition-transform ${expanded ? "rotate-180" : ""}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 space-y-4">
              {/* Tab bar */}
              <div className="flex flex-wrap gap-1.5">
                {TABS.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => handleTabSwitch(tab.id)}
                    disabled={isRunning}
                    className={`
                      px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5
                      ${activeTab === tab.id
                        ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/50"
                        : "bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-600 hover:text-slate-300"
                      }
                      disabled:opacity-50
                    `}
                  >
                    <span>{tab.icon}</span>
                    <span>{tab.label}</span>
                    {tab.badge && (
                      <span className="text-[10px] bg-amber-500/20 text-amber-400 px-1 rounded">
                        {tab.badge}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Error / Success */}
              {error && (
                <div className="bg-red-900/30 border border-red-500/30 rounded-lg px-4 py-2 text-red-300 text-sm">
                  {error}
                </div>
              )}
              {success && (
                <div className="bg-emerald-900/30 border border-emerald-500/30 rounded-lg px-4 py-2 text-emerald-300 text-sm">
                  {success}
                </div>
              )}

              {/* Tab content */}
              {activeTab === "demo" && <DemoTab />}
              {activeTab === "csv" && (
                <CSVTab onDataReady={onDataReady} setLoading={setLoading} setError={setError} setSuccess={setSuccess} loading={loading} />
              )}
              {activeTab === "sheets" && (
                <SheetsTab onDataReady={onDataReady} setLoading={setLoading} setError={setError} setSuccess={setSuccess} loading={loading} />
              )}
              {activeTab === "shopify" && (
                <ShopifyTab onDataReady={onDataReady} setLoading={setLoading} setError={setError} setSuccess={setSuccess} loading={loading} />
              )}
              {activeTab === "stripe" && (
                <StripeTab onDataReady={onDataReady} setLoading={setLoading} setError={setError} setSuccess={setSuccess} loading={loading} />
              )}
              {activeTab === "scenario" && (
                <ScenarioTab onDataReady={onDataReady} setError={setError} setSuccess={setSuccess} />
              )}
              {activeTab === "apify" && (
                <ApifyTab onApifyResults={onApifyResults} setLoading={setLoading} setError={setError} setSuccess={setSuccess} loading={loading} />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Demo Tab
// ---------------------------------------------------------------------------
function DemoTab() {
  return (
    <div className="text-sm text-slate-400 space-y-2">
      <p>Built-in synthetic dataset: <strong className="text-cyan-300">4 segments × 14 days</strong></p>
      <p>Includes a degradation pattern on <strong className="text-amber-300">Paid Social / Mobile</strong> starting Apr 5 with payment gateway failures, latency spikes, and checkout errors.</p>
      <p className="text-xs text-slate-500">Click &quot;Analyze Funnel&quot; to run the pipeline on demo data.</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CSV Upload Tab
// ---------------------------------------------------------------------------
function CSVTab({ onDataReady, setLoading, setError, setSuccess, loading }: {
  onDataReady: (d: DataPayload | null) => void;
  setLoading: (v: boolean) => void;
  setError: (v: string | null) => void;
  setSuccess: (v: string | null) => void;
  loading: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState<{ headers: string[]; rows: string[][] } | null>(null);

  const processCSV = useCallback((text: string) => {
    setError(null);
    setSuccess(null);
    setLoading(true);

    // Show preview
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length > 1) {
      const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""));
      const previewRows = lines.slice(1, 4).map((l) => l.split(",").map((v) => v.trim().replace(/"/g, "")));
      setPreview({ headers, rows: previewRows });
    }

    const result = parseCSV(text);
    setLoading(false);

    if ("error" in result) {
      setError(result.error);
      return;
    }

    onDataReady({
      funnelData: result.funnelData,
      baselines: result.baselines,
      paymentEvents: result.paymentEvents,
      supportTickets: result.supportTickets,
      source: "csv",
      meta: { segments: result.segments, dateRange: result.dateRange, rowCount: result.rowCount },
    });
    setSuccess(`Loaded ${result.rowCount} rows across ${result.segments.length} segments (${result.dateRange.from} to ${result.dateRange.to})`);
  }, [onDataReady, setError, setSuccess, setLoading]);

  const handleFile = (file: File) => {
    if (!file.name.endsWith(".csv") && !file.name.endsWith(".tsv")) {
      setError("Please upload a .csv file");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => processCSV(e.target?.result as string);
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
        className={`
          border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all
          ${dragOver ? "border-cyan-400 bg-cyan-900/20" : "border-slate-700 hover:border-slate-500 bg-slate-800/30"}
        `}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.tsv"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
        <div className="text-3xl mb-2">📄</div>
        <p className="text-sm text-slate-300">Drag & drop a CSV file or click to browse</p>
        <p className="text-xs text-slate-500 mt-1">Required columns: date, sessions, paid_orders (or orders/purchases)</p>
      </div>

      {/* Download sample */}
      <a
        href="/sample-funnel-data.csv"
        download
        className="inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Download sample CSV
      </a>

      {/* Preview */}
      {preview && (
        <div className="overflow-x-auto">
          <table className="text-xs w-full border-collapse">
            <thead>
              <tr>
                {preview.headers.map((h, i) => (
                  <th key={i} className="border border-slate-700 px-2 py-1 text-left text-slate-400 bg-slate-800">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {preview.rows.map((row, i) => (
                <tr key={i}>
                  {row.map((cell, j) => (
                    <td key={j} className="border border-slate-700 px-2 py-1 text-slate-300">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-slate-500 mt-1">Showing first 3 rows</p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Google Sheets Tab
// ---------------------------------------------------------------------------
function SheetsTab({ onDataReady, setLoading, setError, setSuccess, loading }: {
  onDataReady: (d: DataPayload | null) => void;
  setLoading: (v: boolean) => void;
  setError: (v: string | null) => void;
  setSuccess: (v: string | null) => void;
  loading: boolean;
}) {
  const [url, setUrl] = useState("");

  const fetchSheet = async () => {
    if (!url.trim()) { setError("Please enter a Google Sheets URL"); return; }
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/fetch-sheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const parsed = parseCSV(data.csv);
      if ("error" in parsed) throw new Error(parsed.error);

      onDataReady({
        funnelData: parsed.funnelData,
        baselines: parsed.baselines,
        paymentEvents: parsed.paymentEvents,
        supportTickets: parsed.supportTickets,
        source: "google_sheets",
        meta: { segments: parsed.segments, dateRange: parsed.dateRange, rowCount: parsed.rowCount },
      });
      setSuccess(`Loaded ${parsed.rowCount} rows from Google Sheets (${parsed.segments.length} segments)`);
    } catch (err: any) {
      setError(err.message || "Failed to fetch sheet");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-400">Paste a public Google Sheets URL. The sheet must be shared as &quot;Anyone with the link can view&quot;.</p>
      <div className="flex gap-2">
        <input
          type="url"
          placeholder="https://docs.google.com/spreadsheets/d/..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
        />
        <button
          onClick={fetchSheet}
          disabled={loading}
          className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 rounded-lg text-sm font-medium transition-colors"
        >
          {loading ? "Loading..." : "Fetch"}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shopify Tab
// ---------------------------------------------------------------------------
function ShopifyTab({ onDataReady, setLoading, setError, setSuccess, loading }: {
  onDataReady: (d: DataPayload | null) => void;
  setLoading: (v: boolean) => void;
  setError: (v: string | null) => void;
  setSuccess: (v: string | null) => void;
  loading: boolean;
}) {
  const [domain, setDomain] = useState("");
  const [token, setToken] = useState("");
  const [days, setDays] = useState(14);

  const fetchShopify = async () => {
    if (!domain.trim() || !token.trim()) {
      setError("Both shop domain and access token are required");
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/fetch-shopify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shopDomain: domain, accessToken: token, days }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      onDataReady({
        funnelData: data.funnelData,
        baselines: data.baselines,
        paymentEvents: data.paymentEvents,
        supportTickets: data.supportTickets,
        source: "shopify",
        meta: {
          segments: data.segments,
          dateRange: data.dateRange,
          rowCount: data.rowCount,
          description: `Shopify store: ${domain} (${data.orderCount} orders)`,
        },
      });
      setSuccess(`Loaded ${data.orderCount} orders across ${data.segments?.length || 0} channels from Shopify`);
    } catch (err: any) {
      setError(err.message || "Failed to fetch Shopify data");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-400">
        Connect your Shopify store to analyze real order data. Requires a{" "}
        <span className="text-cyan-400">Custom App</span> with <code className="bg-slate-800 px-1 rounded text-cyan-300">read_orders</code> scope.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <input
          type="text"
          placeholder="mystore.myshopify.com"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
        />
        <input
          type="password"
          placeholder="Admin API access token"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
        />
      </div>
      <div className="flex items-center gap-3">
        <label className="text-xs text-slate-400">Days:</label>
        <input
          type="number"
          min={7}
          max={90}
          value={days}
          onChange={(e) => setDays(parseInt(e.target.value) || 14)}
          className="w-16 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm text-white focus:border-cyan-500 focus:outline-none"
        />
        <button
          onClick={fetchShopify}
          disabled={loading}
          className="px-4 py-2 bg-green-600 hover:bg-green-500 disabled:bg-slate-700 rounded-lg text-sm font-medium transition-colors ml-auto"
        >
          {loading ? "Connecting..." : "Connect Shopify"}
        </button>
      </div>
      <p className="text-[11px] text-slate-600">
        Your credentials are sent directly to Shopify&apos;s API and are not stored.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stripe Tab
// ---------------------------------------------------------------------------
function StripeTab({ onDataReady, setLoading, setError, setSuccess, loading }: {
  onDataReady: (d: DataPayload | null) => void;
  setLoading: (v: boolean) => void;
  setError: (v: string | null) => void;
  setSuccess: (v: string | null) => void;
  loading: boolean;
}) {
  const [key, setKey] = useState("");
  const [days, setDays] = useState(14);

  const fetchStripe = async () => {
    if (!key.trim()) {
      setError("Stripe secret key is required");
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/fetch-stripe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secretKey: key, days }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      onDataReady({
        funnelData: data.funnelData,
        baselines: data.baselines,
        paymentEvents: data.paymentEvents,
        supportTickets: data.supportTickets,
        source: "stripe",
        meta: {
          segments: data.segments,
          dateRange: data.dateRange,
          rowCount: data.rowCount,
          description: `Stripe: ${data.chargeCount} charges, ${data.failedCount} failures`,
        },
      });
      setSuccess(`Loaded ${data.chargeCount} charges (${data.failedCount} failed) from Stripe`);
    } catch (err: any) {
      setError(err.message || "Failed to fetch Stripe data");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-400">
        Connect Stripe to analyze payment data. Use a <span className="text-amber-400">test mode key</span> (sk_test_...) for demos.
      </p>
      <div className="flex gap-2">
        <input
          type="password"
          placeholder="sk_test_..."
          value={key}
          onChange={(e) => setKey(e.target.value)}
          className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
        />
      </div>
      <div className="flex items-center gap-3">
        <label className="text-xs text-slate-400">Days:</label>
        <input
          type="number"
          min={7}
          max={90}
          value={days}
          onChange={(e) => setDays(parseInt(e.target.value) || 14)}
          className="w-16 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm text-white focus:border-cyan-500 focus:outline-none"
        />
        <button
          onClick={fetchStripe}
          disabled={loading}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 rounded-lg text-sm font-medium transition-colors ml-auto"
        >
          {loading ? "Connecting..." : "Connect Stripe"}
        </button>
      </div>
      <p className="text-[11px] text-slate-600">
        Your key is sent directly to Stripe&apos;s API and is not stored. Use test keys for demos.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Scenario Generator Tab
// ---------------------------------------------------------------------------
function ScenarioTab({ onDataReady, setError, setSuccess }: {
  onDataReady: (d: DataPayload | null) => void;
  setError: (v: string | null) => void;
  setSuccess: (v: string | null) => void;
}) {
  const [selectedPreset, setSelectedPreset] = useState<string>("payment-gateway-outage");
  const [customSeverity, setCustomSeverity] = useState<string>("high");

  const presets = Object.entries(PRESET_SCENARIOS);

  const generate = () => {
    setError(null);
    const config = { ...PRESET_SCENARIOS[selectedPreset], severity: customSeverity as ScenarioConfig["severity"] };
    const result = generateScenario(config);

    onDataReady({
      funnelData: result.funnelData,
      baselines: result.baselines,
      paymentEvents: result.paymentEvents,
      supportTickets: result.supportTickets,
      source: "scenario",
      meta: {
        segments: result.segments,
        dateRange: result.dateRange,
        rowCount: result.funnelData.length,
        description: result.scenarioDescription,
      },
    });
    setSuccess(`Generated: ${result.scenarioDescription}`);
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-400">
        Generate realistic degradation scenarios to test the analysis engine with different failure patterns.
      </p>

      {/* Preset selector */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {presets.map(([key, config]) => (
          <button
            key={key}
            onClick={() => setSelectedPreset(key)}
            className={`
              p-3 rounded-lg border text-left transition-all text-xs
              ${selectedPreset === key
                ? "border-cyan-500/50 bg-cyan-900/20 text-cyan-300"
                : "border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600"
              }
            `}
          >
            <div className="font-semibold text-sm mb-1">
              {key.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
            </div>
            <div className="text-slate-500">
              {config.segments.length} segments · {config.days} days · {config.degradationType}
            </div>
          </button>
        ))}
      </div>

      {/* Severity */}
      <div className="flex items-center gap-3">
        <label className="text-xs text-slate-400">Severity:</label>
        <div className="flex gap-1.5">
          {["low", "medium", "high", "critical"].map((sev) => (
            <button
              key={sev}
              onClick={() => setCustomSeverity(sev)}
              className={`
                px-3 py-1 rounded text-xs font-medium transition-all
                ${customSeverity === sev
                  ? sev === "critical" ? "bg-red-500/20 text-red-300 border border-red-500/50"
                  : sev === "high" ? "bg-amber-500/20 text-amber-300 border border-amber-500/50"
                  : sev === "medium" ? "bg-yellow-500/20 text-yellow-300 border border-yellow-500/50"
                  : "bg-blue-500/20 text-blue-300 border border-blue-500/50"
                  : "bg-slate-800 text-slate-500 border border-slate-700"
                }
              `}
            >
              {sev}
            </button>
          ))}
        </div>
        <button
          onClick={generate}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm font-medium transition-colors ml-auto"
        >
          Generate
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Apify Competitive Intel Tab
// ---------------------------------------------------------------------------
function ApifyTab({ onApifyResults, setLoading, setError, setSuccess, loading }: {
  onApifyResults?: (data: ApifyIntelData) => void;
  setLoading: (v: boolean) => void;
  setError: (v: string | null) => void;
  setSuccess: (v: string | null) => void;
  loading: boolean;
}) {
  const [token, setToken] = useState("");
  const [mode, setMode] = useState<"competitor-pricing" | "landing-page-health" | "review-sentiment">("competitor-pricing");
  const [urlsText, setUrlsText] = useState("");

  const MODES = [
    { id: "competitor-pricing" as const, label: "Competitor Pricing", icon: "💰", desc: "Scrape product prices from competitor sites" },
    { id: "landing-page-health" as const, label: "Landing Page Health", icon: "🏥", desc: "Check SSL, status codes, broken links" },
    { id: "review-sentiment" as const, label: "Review Sentiment", icon: "⭐", desc: "Scrape ratings from Trustpilot, G2, Capterra" },
  ];

  const runScrape = async () => {
    const urls = urlsText.split("\n").map((u) => u.trim()).filter(Boolean);
    if (!token.trim()) { setError("Apify API token required"); return; }
    if (urls.length === 0) { setError("Enter at least one URL"); return; }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/fetch-apify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, mode, urls }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      onApifyResults?.(data);
      const count = data.results?.length || 0;
      setSuccess(`Scraped ${count} result${count !== 1 ? "s" : ""} via Apify (${mode.replace(/-/g, " ")})`);
    } catch (err: any) {
      setError(err.message || "Apify scrape failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full">$500 Prize</span>
        <p className="text-xs text-slate-400">Web scraping for GTM competitive intelligence via Apify</p>
      </div>

      {/* Mode selector */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {MODES.map((m) => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            className={`p-3 rounded-lg border text-left transition-all text-xs ${
              mode === m.id
                ? "border-amber-500/50 bg-amber-900/20 text-amber-300"
                : "border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600"
            }`}
          >
            <div className="font-semibold text-sm mb-0.5">{m.icon} {m.label}</div>
            <div className="text-slate-500 text-[11px]">{m.desc}</div>
          </button>
        ))}
      </div>

      {/* Token + URLs */}
      <input
        type="password"
        placeholder="Apify API token (apify_api_...)"
        value={token}
        onChange={(e) => setToken(e.target.value)}
        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
      />
      <textarea
        placeholder={mode === "competitor-pricing"
          ? "https://www.anker.com/products/a2568-maggo-qi2-wireless-charging-pad\nhttps://bellroy.com/products/slim-sleeve-wallet\nhttps://grovemade.com/product/wood-laptop-stand/"
          : mode === "landing-page-health"
          ? "https://nova-pulse-14.myshopify.com\nhttps://nova-pulse-14.myshopify.com/collections/all\nhttps://nova-pulse-14.myshopify.com/products/wireless-charging-pad"
          : "https://www.trustpilot.com/review/anker.com\nhttps://www.trustpilot.com/review/bellroy.com\nhttps://www.trustpilot.com/review/nomadgoods.com"
        }
        value={urlsText}
        onChange={(e) => setUrlsText(e.target.value)}
        rows={3}
        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none resize-none font-mono"
      />
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-slate-600">
          One URL per line. Token is sent directly to Apify and not stored.
        </p>
        <button
          onClick={runScrape}
          disabled={loading}
          className="px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-700 rounded-lg text-sm font-medium transition-colors"
        >
          {loading ? "Scraping..." : "Run Scrape"}
        </button>
      </div>
    </div>
  );
}
