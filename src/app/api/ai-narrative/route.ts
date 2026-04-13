import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { incident } = await request.json();

    // If ANTHROPIC_API_KEY is set, use Claude for narrative
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (apiKey && incident) {
      const { leak, rraf, diagnosis, remediation, impact } = incident;

      const prompt = `You are an AI revenue analyst for an ecommerce company. Generate a concise executive summary (3-4 paragraphs) for a hackathon demo audience explaining this detected revenue incident.

INCIDENT DATA:
- Segment: ${leak.segment_key.replace(/_/g, " ")}
- Funnel Stage: ${leak.stage.replace(/_/g, " ")}
- Severity: ${leak.severity}
- Conversion drop: ${(leak.magnitude * 100).toFixed(1)}% below baseline
- Revenue at risk: $${Math.round(leak.estimated_revenue_lost).toLocaleString()}/day
- RRAF Score: ${Math.round(rraf.total)}/100
- LIFT Diagnosis: ${diagnosis.top_category}
- Evidence: ${diagnosis.hypotheses.filter((h: { category: string }) => h.category === diagnosis.top_category).flatMap((h: { signals: string[] }) => h.signals).join("; ")}
- Remediation: ${remediation.actions.join("; ")}
- 7-day revenue at risk: $${Math.round(impact.revenue_at_risk).toLocaleString()}
- Projected recovery: $${Math.round(impact.projected_recovery_low).toLocaleString()} - $${Math.round(impact.projected_recovery_high).toLocaleString()}
- Confidence: ${Math.round(impact.confidence * 100)}%

Write in a professional but engaging tone. Start with the problem, explain the diagnosis, then the solution and projected impact. Make it compelling for hackathon judges.`;

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 500,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const narrative = data.content?.[0]?.text ?? "";
        return NextResponse.json({ narrative });
      }
    }

    // Fallback: generate a template-based narrative
    if (incident) {
      const { leak, rraf, diagnosis, remediation, impact } = incident;
      const narrative = `INCIDENT DETECTED: A ${leak.severity}-severity revenue leak has been identified in the ${leak.segment_key.replace(/_/g, " ")} segment at the ${leak.stage.replace(/_/g, " ")} stage. Conversion rates have dropped ${(leak.magnitude * 100).toFixed(1)}% below baseline, resulting in an estimated $${Math.round(leak.estimated_revenue_lost).toLocaleString()} in daily lost revenue. The RRAF risk score of ${Math.round(rraf.total)}/100 indicates this requires immediate attention.

DIAGNOSIS: Our LIFT analysis identified ${diagnosis.top_category} as the primary root cause category. ${diagnosis.hypotheses.filter((h: { category: string }) => h.category === diagnosis.top_category).flatMap((h: { signals: string[] }) => h.signals).slice(0, 2).join(". ")}. These signals correlated strongly with the conversion degradation timeline.

REMEDIATION: The system recommends ${remediation.actions.length} prioritized actions (${remediation.priority} priority, ETA: ${remediation.estimated_time_to_fix}). Key actions include: ${remediation.actions.slice(0, 2).join("; ")}.

IMPACT PROJECTION: Without intervention, the 7-day revenue at risk is $${Math.round(impact.revenue_at_risk).toLocaleString()}. With the recommended fixes, we project recovering $${Math.round(impact.projected_recovery_low).toLocaleString()} to $${Math.round(impact.projected_recovery_high).toLocaleString()} (${Math.round(impact.confidence * 100)}% confidence).`;

      return NextResponse.json({ narrative });
    }

    return NextResponse.json({ narrative: null });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate narrative";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
