import { NextResponse } from "next/server";
import { funnelData, baselines, paymentEvents, supportTickets } from "@/lib/data";
import {
  detectLeaks,
  calculateRRAF,
  diagnoseLIFT,
  generateRemediation,
  projectImpact,
} from "@/lib/engine";

type Step = "detect" | "score" | "diagnose" | "remediate" | "project" | "full";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const step: Step = body.step ?? "full";

    // Step 1: Detect all revenue leaks
    const leaks = detectLeaks(funnelData, baselines);

    if (step === "detect") {
      return NextResponse.json({ leaks });
    }

    // Step 2: Score each leak with RRAF
    const scoredLeaks = leaks.map((leak) => ({
      leak,
      rraf: calculateRRAF(leak, funnelData, baselines),
    }));

    // Identify the highest-severity leak by RRAF score
    const topIncidentScored = scoredLeaks.reduce((worst, current) =>
      current.rraf.total > worst.rraf.total ? current : worst
    );

    if (step === "score") {
      return NextResponse.json({
        leaks,
        topIncident: {
          leak: topIncidentScored.leak,
          rraf: topIncidentScored.rraf,
        },
      });
    }

    // Step 3: Diagnose the top incident with LIFT
    const diagnosis = diagnoseLIFT(
      topIncidentScored.leak,
      funnelData,
      paymentEvents,
      supportTickets
    );

    if (step === "diagnose") {
      return NextResponse.json({
        leaks,
        topIncident: {
          leak: topIncidentScored.leak,
          rraf: topIncidentScored.rraf,
          diagnosis,
        },
      });
    }

    // Step 4: Generate remediation plan
    const remediation = generateRemediation(diagnosis);

    if (step === "remediate") {
      return NextResponse.json({
        leaks,
        topIncident: {
          leak: topIncidentScored.leak,
          rraf: topIncidentScored.rraf,
          diagnosis,
          remediation,
        },
      });
    }

    // Step 5: Project impact of the remediation
    const baseline = baselines.find(b => b.segment_key === topIncidentScored.leak.segment_key) ?? baselines[0];
    const impact = projectImpact(topIncidentScored.leak, baseline);

    // step === "project" or "full" or unrecognized -> return everything
    return NextResponse.json({
      leaks,
      topIncident: {
        leak: topIncidentScored.leak,
        rraf: topIncidentScored.rraf,
        diagnosis,
        remediation,
        impact,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
