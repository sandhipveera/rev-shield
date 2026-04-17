/**
 * Demo Config Starter Template
 * =============================
 * Copy this file, rename it (e.g. "my-product.js"), and fill in your content.
 * Then open:  engine.html?config=my-product
 *
 * SLIDE TYPES AVAILABLE:
 * ──────────────────────
 *  "title"            → Hero slide with big title, subtitle, tags, caption
 *  "big-stat"         → Large number + stats row (great for problem slides)
 *  "pipeline"         → Horizontal step-by-step flow with animated icons
 *  "pills"            → Grid of integration/feature pills with emoji
 *  "funnel"           → Horizontal bar chart (conversion funnel, progress)
 *  "donut-bars"       → Donut/ring chart + side progress bars
 *  "horizontal-bars"  → Simple horizontal bar comparison
 *  "action-list"      → Numbered action items (remediation, roadmap)
 *  "impact-cards"     → 2-3 KPI cards in a row (impact, pricing tiers)
 *  "comparison-table" → Multi-column data table (before/after, features)
 *  "card-grid"        → Grid of icon+title+description cards
 *  "cta"              → Call-to-action with title lines + buttons
 *
 * THEME COLORS:
 * ─────────────
 * Use these keys wherever a "color" field appears:
 *   "primary"  → Main brand color (default: cyan)
 *   "secondary"→ Secondary brand color (default: blue)
 *   "accent"   → Accent/highlight (default: purple)
 *   "danger"   → Red / error / problem
 *   "warning"  → Amber / caution
 *   "success"  → Green / positive
 *
 * TIMING:
 * ───────
 * Each slide has a "timing" field (seconds) used by Record Mode (press R).
 * Total presentation time = sum of all timings.
 */
const DEMO_CONFIG = {

  // ── Product Info ────────────────────────────────────────────────────
  meta: {
    title:       "Your Product Name",
    subtitle:    "One-line tagline",
    description: "A longer description for the title slide caption.",
    demoUrl:     "https://your-app.vercel.app",
    repoUrl:     "https://github.com/you/your-repo",
    techStack:   "Next.js · React · Tailwind · Your Stack Here",
  },

  // ── Theme Colors ────────────────────────────────────────────────────
  // Change these to match your brand. All slide components inherit from here.
  theme: {
    primary:       "#06b6d4",   // Main brand color
    secondary:     "#3b82f6",   // Secondary
    accent:        "#8b5cf6",   // Accents & highlights
    danger:        "#ef4444",   // Errors, problems, losses
    warning:       "#f59e0b",   // Caution, in-progress
    success:       "#10b981",   // Positive, recovered
    bg:            "#0a0a1a",   // Page background
    surface:       "rgba(15, 23, 42, 0.8)",  // Card backgrounds
    border:        "rgba(51, 65, 85, 0.5)",  // Card borders
    textPrimary:   "#e2e8f0",
    textSecondary: "#94a3b8",
    textMuted:     "#64748b",
    titleGradient: "linear-gradient(135deg, #06b6d4, #3b82f6, #8b5cf6)",
    orbs:          ["#06b6d4", "#8b5cf6", "#ef4444"],
  },

  // ── Slides ──────────────────────────────────────────────────────────
  // Add, remove, or reorder. The engine renders whatever is here.
  slides: [

    // SLIDE 1 — Title / Hero
    {
      type: "title",
      timing: 15,
      note: "Your teleprompter script for this slide goes here.",
      title: "Your Product",
      subtitle: "Short tagline",
      tags: [
        { text: "Tag One",   color: "primary" },
        { text: "Tag Two",   color: "accent" },
        { text: "Tag Three", color: "warning" },
      ],
      caption: "Describe what your product does in one sentence.",
    },

    // SLIDE 2 — Problem / Big Stat
    {
      type: "big-stat",
      timing: 20,
      note: "Explain the problem your product solves.",
      label: "The Problem",
      number: "$X,XXX",
      numberColor: "danger",
      caption: "Describe the pain point with <span class='hl-danger'>emphasis</span> on key numbers.",
      stats: [
        { value: "XX%",    label: "Metric One",   color: "danger" },
        { value: "XXms",   label: "Metric Two",   color: "warning" },
        { value: "X.X%",   label: "Metric Three", color: "danger" },
      ],
    },

    // SLIDE 3 — Pipeline / Process
    {
      type: "pipeline",
      timing: 25,
      note: "Walk through your product's pipeline or workflow.",
      label: "How It Works",
      steps: [
        { icon: "\u{1F50D}", label: "Step 1" },
        { icon: "\u{2699}\uFE0F", label: "Step 2" },
        { icon: "\u{2728}",  label: "Step 3" },
        { icon: "\u{2705}",  label: "Step 4" },
      ],
      caption: "Brief explanation of how the steps connect.",
    },

    // SLIDE 4 — Integrations / Features
    {
      type: "pills",
      timing: 15,
      note: "Show what your product connects to.",
      label: "Integrations",
      headline: "Works With Your Stack",
      pills: [
        { emoji: "\u{1F4E6}", text: "Service A" },
        { emoji: "\u{1F527}", text: "Service B" },
        { emoji: "\u{1F4CA}", text: "Service C" },
      ],
      caption: "Brief note about integrations.",
    },

    // SLIDE 5 — Results / CTA
    {
      type: "cta",
      timing: 20,
      note: "Close strong with a call to action.",
      titleLines: [
        "Your Closing",
        "Statement Here.",
      ],
      buttons: [
        { text: "Try Live Demo \u2192", url: "https://your-app.vercel.app", style: "primary" },
        { text: "GitHub",              url: "https://github.com/you/repo",  style: "ghost" },
      ],
    },

  ],
};
