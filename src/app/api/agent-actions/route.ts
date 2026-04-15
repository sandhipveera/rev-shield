// Autonomous Agent Actions API
// Proposes and (with approval) executes remediation actions
// Supports: ad pause, discount adjustment, Slack alerts, infra scaling
//
// Human-in-the-loop: actions are proposed first, then executed only after approval

import { NextRequest, NextResponse } from "next/server";

interface AgentAction {
  id: string;
  type: "pause-ads" | "adjust-discount" | "slack-alert" | "scale-infra" | "rollback-deploy";
  title: string;
  description: string;
  risk: "low" | "medium" | "high";
  estimatedImpact: string;
  reversible: boolean;
  autoApprove: boolean; // low-risk actions can be auto-approved
  status: "proposed" | "approved" | "executing" | "executed" | "rejected";
  executedAt?: string;
}

// POST /api/agent-actions
// mode: "propose" — generate actions based on incident data
// mode: "execute" — execute an approved action
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { mode } = body;

    if (mode === "propose") {
      return proposeActions(body.incident);
    } else if (mode === "execute") {
      return executeAction(body.actionId, body.action);
    }

    return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Agent action failed" }, { status: 500 });
  }
}

function proposeActions(incident: any): NextResponse {
  if (!incident) {
    return NextResponse.json({ error: "Incident data required" }, { status: 400 });
  }

  const actions: AgentAction[] = [];
  const leak = incident.leak;
  const diagnosis = incident.diagnosis;
  const rraf = incident.rraf;
  const severity = leak?.severity || "medium";
  const topCategory = diagnosis?.top_category || "Friction";

  // 1. Slack Alert — always proposed, auto-approved (low risk)
  actions.push({
    id: `action-${Date.now()}-slack`,
    type: "slack-alert",
    title: "Send Slack Alert to #revenue-ops",
    description: `Notify the team about ${severity} severity revenue leak in ${leak?.segment_key?.replace(/_/g, " ") || "unknown segment"}. RRAF score: ${rraf ? Math.round(rraf.total) : "N/A"}/100. Estimated daily loss: $${Math.round(leak?.estimated_revenue_lost || 0).toLocaleString()}.`,
    risk: "low",
    estimatedImpact: "Immediate team awareness, faster response time",
    reversible: true,
    autoApprove: true,
    status: "proposed",
  });

  // 2. Pause underperforming ad campaigns (if traffic source is paid)
  const isPaidChannel = leak?.segment_key?.toLowerCase().includes("paid");
  if (isPaidChannel || severity === "high") {
    actions.push({
      id: `action-${Date.now()}-ads`,
      type: "pause-ads",
      title: "Pause Underperforming Ad Campaigns",
      description: `Pause ad spend on ${leak?.segment_key?.replace(/_/g, " ") || "affected segment"} to stop bleeding revenue while conversion rate is ${((leak?.observed_rate || 0) * 100).toFixed(1)}% (baseline: ${((leak?.baseline_rate || 0) * 100).toFixed(1)}%). This prevents wasting ad budget on a broken funnel.`,
      risk: isPaidChannel ? "medium" : "high",
      estimatedImpact: `Save ~$${Math.round((leak?.estimated_revenue_lost || 0) * 0.3).toLocaleString()}/day in wasted ad spend`,
      reversible: true,
      autoApprove: false,
      status: "proposed",
    });
  }

  // 3. Adjust discount / recovery offer
  if (topCategory === "Incentive" || topCategory === "Friction" || severity === "high") {
    actions.push({
      id: `action-${Date.now()}-discount`,
      type: "adjust-discount",
      title: "Deploy Recovery Discount",
      description: `Create a time-limited 15% recovery discount code for abandoned carts in the affected segment. Target users who dropped off at the ${leak?.stage?.replace(/_/g, " ") || "checkout"} stage in the last 48 hours.`,
      risk: "medium",
      estimatedImpact: `Recover ~$${Math.round((leak?.estimated_revenue_lost || 0) * 0.4).toLocaleString()}/day from abandoned carts`,
      reversible: true,
      autoApprove: false,
      status: "proposed",
    });
  }

  // 4. Scale infrastructure (if Friction/Landing related)
  if (topCategory === "Friction" || topCategory === "Landing") {
    actions.push({
      id: `action-${Date.now()}-infra`,
      type: "scale-infra",
      title: "Scale Up Checkout Infrastructure",
      description: "Increase checkout server capacity by 2x and enable CDN edge caching for the affected landing pages to reduce latency. Current P95 latency is degraded.",
      risk: "low",
      estimatedImpact: "Reduce checkout latency by ~40%, improve payment success rate",
      reversible: true,
      autoApprove: true,
      status: "proposed",
    });
  }

  // 5. Rollback recent deploy (if high severity and Friction)
  if (severity === "high" && topCategory === "Friction") {
    actions.push({
      id: `action-${Date.now()}-rollback`,
      type: "rollback-deploy",
      title: "Rollback Last Deployment",
      description: "Roll back to the last known-good deployment. The timing of the conversion drop correlates with the most recent production deploy.",
      risk: "high",
      estimatedImpact: "Immediate recovery if deploy caused the degradation",
      reversible: true,
      autoApprove: false,
      status: "proposed",
    });
  }

  return NextResponse.json({
    actions,
    summary: {
      totalProposed: actions.length,
      autoApproved: actions.filter((a) => a.autoApprove).length,
      requiresApproval: actions.filter((a) => !a.autoApprove).length,
    },
  });
}

function executeAction(actionId: string, action: AgentAction): NextResponse {
  if (!actionId || !action) {
    return NextResponse.json({ error: "Action ID and data required" }, { status: 400 });
  }

  // Simulate execution (in production, these would call real APIs)
  const executionResults: Record<string, any> = {
    "slack-alert": {
      success: true,
      message: "Alert sent to #revenue-ops channel",
      details: { channel: "#revenue-ops", timestamp: new Date().toISOString() },
    },
    "pause-ads": {
      success: true,
      message: "Ad campaigns paused for affected segment",
      details: { campaignsPaused: 3, estimatedSavings: "$2,400/day" },
    },
    "adjust-discount": {
      success: true,
      message: "Recovery discount SAVE15 deployed",
      details: { code: "SAVE15", discount: "15%", expiresIn: "48h", targetedUsers: 1240 },
    },
    "scale-infra": {
      success: true,
      message: "Infrastructure scaled to 2x capacity",
      details: { previousCapacity: "4 instances", newCapacity: "8 instances", region: "us-east-1" },
    },
    "rollback-deploy": {
      success: true,
      message: "Rolled back to deployment v2.3.1",
      details: { rolledBackFrom: "v2.4.0", rolledBackTo: "v2.3.1", timestamp: new Date().toISOString() },
    },
  };

  const result = executionResults[action.type] || { success: true, message: "Action executed" };

  return NextResponse.json({
    actionId,
    ...result,
    executedAt: new Date().toISOString(),
  });
}
