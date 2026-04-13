import { funnelData, baselines, paymentEvents, supportTickets } from "@/lib/data";
import {
  detectLeaks,
  calculateRRAF,
  diagnoseLIFT,
  generateRemediation,
  projectImpact,
} from "@/lib/engine";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const weights = body.weights as { risk?: number; rootCause?: number; revenue?: number; frequency?: number } | undefined;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      try {
        // Step 1: Detect
        send("step", { step: "detect", status: "running" });
        await delay(600);
        const leaks = detectLeaks(funnelData, baselines);
        send("detect", { leaks });
        send("step", { step: "detect", status: "done" });

        if (leaks.length === 0) {
          send("done", { message: "No leaks detected" });
          controller.close();
          return;
        }

        // Step 2: Score
        send("step", { step: "score", status: "running" });
        await delay(500);
        const scoredLeaks = leaks.map((leak) => ({
          leak,
          rraf: calculateRRAF(leak, funnelData, baselines, weights),
        }));
        const topIncidentScored = scoredLeaks.reduce((worst, current) =>
          current.rraf.total > worst.rraf.total ? current : worst
        );
        send("score", { topIncident: { leak: topIncidentScored.leak, rraf: topIncidentScored.rraf } });
        send("step", { step: "score", status: "done" });

        // Step 3: Diagnose
        send("step", { step: "diagnose", status: "running" });
        await delay(600);
        const diagnosis = diagnoseLIFT(topIncidentScored.leak, funnelData, paymentEvents, supportTickets);
        send("diagnose", { diagnosis });
        send("step", { step: "diagnose", status: "done" });

        // Step 4: Remediate
        send("step", { step: "heal", status: "running" });
        await delay(400);
        const remediation = generateRemediation(diagnosis);
        send("remediate", { remediation });
        send("step", { step: "heal", status: "done" });

        // Step 5: Project / Verify
        send("step", { step: "verify", status: "running" });
        await delay(300);
        const baseline = baselines.find((b) => b.segment_key === topIncidentScored.leak.segment_key) ?? baselines[0];
        const impact = projectImpact(topIncidentScored.leak, baseline);
        send("project", { impact });
        send("step", { step: "verify", status: "done" });

        // Complete
        send("done", {
          topIncident: {
            leak: topIncidentScored.leak,
            rraf: topIncidentScored.rraf,
            diagnosis,
            remediation,
            impact,
          },
        });
      } catch (err) {
        send("error", { message: err instanceof Error ? err.message : "Unknown error" });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
