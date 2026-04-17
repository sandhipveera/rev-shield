/**
 * RevShield Demo Configuration
 * =============================
 * Product: RevShield — Autonomous GTM Revenue Agent
 * Usage:  Open engine.html?config=revshield
 */
const DEMO_CONFIG = {

  // ── Meta ────────────────────────────────────────────────────────────
  meta: {
    title: "RevShield",
    subtitle: "Autonomous GTM Revenue Agent",
    description: "An AI agent that autonomously detects revenue leaks in your GTM funnel, diagnoses root causes, and takes corrective action — while you sleep.",
    demoUrl: "https://rev-shield.vercel.app",
    repoUrl: "https://github.com/sandhipveera/rev-shield",
    techStack: "Next.js 16 · Shopify · Stripe · Apify · Minds AI · SSE Streaming · Production Guardrails",
  },

  // ── Theme ───────────────────────────────────────────────────────────
  theme: {
    primary:   "#06b6d4",
    secondary: "#3b82f6",
    accent:    "#8b5cf6",
    danger:    "#ef4444",
    warning:   "#f59e0b",
    success:   "#10b981",
    bg:        "#0a0a1a",
    surface:   "rgba(15, 23, 42, 0.8)",
    border:    "rgba(51, 65, 85, 0.5)",
    textPrimary:   "#e2e8f0",
    textSecondary: "#94a3b8",
    textMuted:     "#64748b",
    // Gradient for the big title text
    titleGradient: "linear-gradient(135deg, #06b6d4, #3b82f6, #8b5cf6)",
    // Floating background orbs
    orbs: ["#06b6d4", "#8b5cf6", "#ef4444"],
  },

  // ── Slides ──────────────────────────────────────────────────────────
  slides: [

    // ─── Slide 1: Title ───
    {
      type: "title",
      timing: 15,
      note: "This is RevShield — an autonomous GTM revenue agent. Every dollar your GTM team spends on ads, campaigns, and outbound is wasted if the funnel is leaking. RevShield autonomously monitors your funnel 24/7, diagnoses why campaigns are underperforming, and takes corrective action — before your CAC goes through the roof.",
      title: "RevShield",
      subtitle: "Autonomous GTM Revenue Agent",
      tags: [
        { text: "Autonomous Agent", color: "primary" },
        { text: "GTM Funnel Protection", color: "accent" },
        { text: "Self-Correcting", color: "warning" },
        { text: "Production Guardrails", color: "primary" },
      ],
      caption: "An AI agent that autonomously detects revenue leaks in your GTM funnel,<br>diagnoses root causes, and takes corrective action — while you sleep.",
    },

    // ─── Slide 2: The Problem ───
    {
      type: "big-stat",
      timing: 20,
      note: "Here's the problem every GTM team faces. You're spending thousands on ads, outbound, and campaigns — but a single funnel leak silently drains $4,600 in revenue every day. Your CAC skyrockets, campaign ROI tanks, and your team doesn't catch it for days because the data lives in 5 different dashboards.",
      label: "The GTM Problem",
      number: "$4,599",
      numberColor: "danger",
      caption: "Revenue lost <span class='hl-danger'>every single day</span> while your GTM team keeps spending on ads that lead to a broken funnel.",
      stats: [
        { value: "14.8%",   label: "Conversion Drop",    color: "danger" },
        { value: "3,100ms", label: "P95 Latency Spike",  color: "warning" },
        { value: "4.2%",    label: "Error Rate",          color: "danger" },
        { value: "75/day",  label: "Support Tickets",     color: "accent" },
      ],
    },

    // ─── Slide 3: Pipeline ───
    {
      type: "pipeline",
      timing: 30,
      note: "RevShield is an autonomous GTM agent with a 5-stage pipeline. It plans what to investigate, executes the analysis, and self-corrects — exactly what judges want to see. Detect finds the leak. Score quantifies risk. Diagnose pinpoints root cause. Heal takes autonomous action. Verify confirms recovery. It streams in real time via SSE.",
      label: "Autonomous 5-Stage Agent Pipeline",
      steps: [
        { icon: "\u{1F50D}", label: "Detect" },
        { icon: "\u{1F4CA}", label: "Score" },
        { icon: "\u{1FA7A}", label: "Diagnose" },
        { icon: "\u{2728}",  label: "Heal" },
        { icon: "\u{2705}",  label: "Verify" },
      ],
      caption: "Plans, executes, and self-corrects GTM workflows end-to-end.<br><span class='hl-primary'>SSE streaming</span> gives stakeholders real-time visibility into every agent decision.",
    },

    // ─── Slide 4: Data Sources ───
    {
      type: "pills",
      timing: 15,
      note: "RevShield wires into your actual GTM tools — CRM, ads, outbound, analytics. Connect Shopify or Stripe for live revenue data. Use Apify to monitor competitor pricing and landing page health. Pipe in campaign data via CSV or Google Sheets. Or simulate degradation with our Scenario Generator.",
      label: "Wired Into Your GTM Stack",
      headline: "Connects to Your Actual Tools",
      pills: [
        { emoji: "\u{1F6D2}", text: "Shopify" },
        { emoji: "\u{1F4B3}", text: "Stripe" },
        { emoji: "\u{1F577}\uFE0F", text: "Apify" },
        { emoji: "\u{1F4CA}", text: "Google Sheets" },
        { emoji: "\u{1F4C4}", text: "CSV / CRM Export" },
        { emoji: "\u{1F9EA}", text: "Scenario Generator" },
      ],
      caption: "Real integrations with your GTM stack. Bring your own CRM, ads, and analytics data.",
    },

    // ─── Slide 5: Funnel Leak Detection ───
    {
      type: "funnel",
      timing: 20,
      note: "In the Detect stage, we compare observed conversion rates against dynamic baselines for each segment. Here you can see the funnel for Paid Social on Mobile — sessions flow through normally until the Checkout to Paid stage, where we see a 16.5% drop. That's our leak.",
      label: "Stage 1: Detect",
      headline: "Funnel Leak Detection",
      headlineCaption: "Compares observed conversion rates against dynamic baselines per segment.",
      bars: [
        { label: "Sessions",   pct: 100, color: "primary" },
        { label: "View Item",  pct: 72,  color: "primary" },
        { label: "Add to Cart",pct: 15,  color: "primary" },
        { label: "Checkout",   pct: 8,   color: "primary" },
        { label: "Paid",       pct: 7,   color: "danger", suffix: "\u25BC -16.5%", isLeak: true },
      ],
    },

    // ─── Slide 6: RRAF Score ───
    {
      type: "donut-bars",
      timing: 20,
      note: "We then score the leak using our RRAF framework — Risk, Root Cause confidence, Affected Revenue, and Frequency. Each component is weighted. This incident scores 80 out of 100 — High Risk — driven by strong root cause signals at 100% and significant revenue impact at 78%.",
      label: "Stage 2: Score (RRAF Framework)",
      donut: {
        score: 80,
        max: 100,
        color: "danger",
        unitLabel: "RRAF",
      },
      badge: { text: "HIGH RISK", style: "critical" },
      bars: [
        { label: "Risk",       icon: "\u25CF", pct: 74,  color: "danger",  weight: "30%" },
        { label: "Root Cause", icon: "\u25CF", pct: 100, color: "warning", weight: "20%" },
        { label: "Revenue",    icon: "\u25CF", pct: 78,  color: "accent",  weight: "35%" },
        { label: "Frequency",  icon: "\u25CF", pct: 71,  color: "primary", weight: "15%" },
      ],
    },

    // ─── Slide 7: LIFT Diagnosis ───
    {
      type: "horizontal-bars",
      timing: 20,
      note: "For diagnosis, we use the LIFT framework — Landing, Incentive, Friction, and Trust. The AI correlates multiple signals and identifies Friction as the primary cause, scoring 731. The evidence? Latency jumped 1,900 milliseconds, error rate spiked 3 points, and 96 checkout-related support tickets came in.",
      label: "Stage 3: Diagnose (LIFT Framework)",
      headline: "Primary Cause: <span style='color:var(--danger)'>\u26A0\uFE0F Friction</span>",
      bars: [
        { label: "\u26A0\uFE0F Friction",  pct: 85, value: "731", highlight: true },
        { label: "\u{1F512} Trust",         pct: 58, value: "496" },
        { label: "\u{1F3AF} Incentive",     pct: 30, value: "254" },
        { label: "\u{1F6C2} Landing",       pct: 18, value: "150" },
      ],
      caption: "Correlated <span class='hl-primary'>3 signals</span>: Latency +1920ms, Error rate +3.1pp, 96 checkout tickets",
    },

    // ─── Slide 8: Remediation ───
    {
      type: "action-list",
      timing: 20,
      note: "The Heal stage generates a prioritized action plan. This is flagged Critical Priority with a 1-2 day ETA. Five specific steps: investigate the API latency, review checkout error logs, roll back correlated changes, enable performance monitoring, and set up a simplified checkout fallback.",
      label: "Stage 4: Heal (Auto-Remediation)",
      badge: { text: "CRITICAL PRIORITY", style: "critical" },
      badgeCaption: "Category: Friction · ETA: 1-2 days",
      actions: [
        "Investigate checkout API latency spike — check downstream service health",
        "Review error logs for the checkout flow (payment, inventory, address validation)",
        "Roll back recent checkout flow changes if correlated with degradation onset",
        "Enable client-side performance monitoring for the affected device type",
        "Consider enabling a simplified checkout fallback for high-latency sessions",
      ],
    },

    // ─── Slide 9: Impact Projection ───
    {
      type: "impact-cards",
      timing: 20,
      note: "The agent projects measurable marketing outcomes — exactly what the judges want. If we do nothing, $32K in wasted GTM spend over 7 days. With the agent's autonomous fix, we recover $16K to $29K. The agent quantifies confidence at 85% so stakeholders can trust the recommendation.",
      label: "Stage 5: Verify & Project",
      cards: [
        {
          style: "danger",
          topLabel: "7-Day Revenue at Risk",
          value: "$32,190",
          bottomLabel: "if no action taken",
        },
        {
          style: "warning",
          topLabel: "Projected Recovery",
          value: "$16k\u2013$29k",
          bottomLabel: "50%-90% recovery range",
        },
        {
          style: "success",
          topLabel: "Confidence",
          value: "85%",
          bottomLabel: "based on signal strength",
        },
      ],
      caption: "AI projects 3 scenarios and provides <span class='hl-success'>actionable recovery estimates</span> stakeholders can act on immediately.",
    },

    // ─── Slide 10: Before / After ───
    {
      type: "comparison-table",
      timing: 15,
      note: "Here's the before-during-after comparison. Checkout conversion dropped from 91% to 77.5% during the incident and recovered to 91.4% post-fix. Latency went from 1,200 to 3,100 milliseconds and came back down. Daily revenue fully recovered to $33,768. The self-healing worked.",
      label: "Before / During / After",
      columns: [
        { key: "metric",   header: "Metric",   color: "textMuted", align: "left" },
        { key: "baseline", header: "Baseline",  color: "success" },
        { key: "incident", header: "Incident",  color: "danger" },
        { key: "postfix",  header: "Post-Fix",  color: "primary" },
      ],
      rows: [
        { metric: "Checkout CVR",  baseline: "91.0%",    incident: "77.5%",    postfix: "91.4% \u2713" },
        { metric: "Latency (P95)", baseline: "1,200ms",  incident: "3,100ms",  postfix: "1,230ms \u2713" },
        { metric: "Error Rate",    baseline: "1.2%",     incident: "4.2%",     postfix: "1.3% \u2713" },
        { metric: "Daily Revenue", baseline: "$33,768",  incident: "$26,386",  postfix: "$33,768 \u2713" },
      ],
    },

    // ─── Slide 11: Interactive Drill-Downs ───
    {
      type: "card-grid",
      timing: 15,
      note: "Everything on the dashboard is clickable. Click the RRAF score and you get a radar chart breakdown. Click LIFT diagnosis for a pie chart with evidence. Click any leak card, remediation step, impact projection, funnel stage, or incident — each opens a detailed drill-down modal with rich visualizations.",
      label: "Interactive Drill-Downs",
      headline: "Click Anything for Details",
      grids: [
        {
          columns: 4,
          cards: [
            { icon: "\u{1F4CA}", title: "RRAF Score",        desc: "Radar chart + component breakdown with formula" },
            { icon: "\u{1FA7A}", title: "LIFT Diagnosis",    desc: "Pie chart with hypothesis cards & evidence signals" },
            { icon: "\u{1F4C9}", title: "Leak Analysis",     desc: "Conversion comparison bars & all-leaks table" },
            { icon: "\u{1F4C8}", title: "Impact Projection", desc: "3-scenario area chart with confidence interval" },
          ],
        },
        {
          columns: 3,
          cards: [
            { icon: "\u{1F527}", title: "Remediation",    desc: "Step-by-step action plan with priority" },
            { icon: "\u{1F4CA}", title: "Funnel Stages",   desc: "Observed vs baseline visual comparison" },
            { icon: "\u{1F4CB}", title: "Incident History", desc: "Full timeline with status & severity" },
          ],
        },
      ],
    },

    // ─── Slide 12: CTA ───
    {
      type: "cta",
      timing: 20,
      note: "Your GTM team deserves an agent that never sleeps. RevShield autonomously protects every dollar of marketing spend by detecting funnel leaks, diagnosing root causes, and taking action — with guardrails your team can trust. Try the live demo right now. Thank you!",
      titleLines: [
        "Your GTM Deserves",
        "An Agent That Never Sleeps.",
      ],
      buttons: [
        { text: "Try Live Demo \u2192", url: "https://rev-shield.vercel.app", style: "primary" },
        { text: "GitHub Repo",          url: "https://github.com/sandhipveera/rev-shield", style: "ghost" },
      ],
    },

  ],
};
