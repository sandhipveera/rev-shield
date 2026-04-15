// Minds AI Integration: Conversational Funnel Agent
// "Talk to your funnel" — ask questions about revenue performance,
// get AI-powered answers based on analysis results
//
// In production, this would connect to Minds AI API for AI clones.
// For the hackathon demo, we use Claude/OpenAI with funnel context injection.

import { NextRequest, NextResponse } from "next/server";

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, context, history } = body;

    if (!message?.trim()) {
      return NextResponse.json({ error: "Message required" }, { status: 400 });
    }

    // Build context from analysis results
    const systemPrompt = buildSystemPrompt(context);
    const messages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      ...(history || []).slice(-10), // Last 10 messages for context
      { role: "user", content: message },
    ];

    // Try Minds AI API first, then fallback to OpenAI, then to built-in responses
    const mindsApiKey = process.env.MINDS_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    if (mindsApiKey) {
      return await callMindsAI(mindsApiKey, messages, context);
    } else if (openaiKey) {
      return await callOpenAI(openaiKey, messages);
    } else {
      // Intelligent built-in response based on context
      return generateBuiltInResponse(message, context);
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Chat failed" }, { status: 500 });
  }
}

function buildSystemPrompt(context: any): string {
  const leak = context?.leak;
  const rraf = context?.rraf;
  const diagnosis = context?.diagnosis;
  const remediation = context?.remediation;
  const impact = context?.impact;

  let prompt = `You are RevShield's AI Funnel Agent — an expert GTM revenue analyst. You help users understand their funnel performance, diagnose revenue leaks, and take action.

You speak concisely, use data to support your answers, and proactively suggest next steps. You have access to the latest funnel analysis results.

Current Analysis Context:
`;

  if (leak) {
    prompt += `
- LEAK DETECTED: ${leak.segment_key?.replace(/_/g, " ")} at ${leak.stage?.replace(/_/g, " ")} stage
- Severity: ${leak.severity}
- Conversion: ${((leak.observed_rate || 0) * 100).toFixed(1)}% (baseline: ${((leak.baseline_rate || 0) * 100).toFixed(1)}%)
- Drop magnitude: ${((leak.magnitude || 0) * 100).toFixed(1)}%
- Daily revenue loss: $${Math.round(leak.estimated_revenue_lost || 0).toLocaleString()}
`;
  }

  if (rraf) {
    prompt += `
- RRAF Score: ${Math.round(rraf.total)}/100 (Risk: ${(rraf.risk * 100).toFixed(0)}%, Root Cause: ${(rraf.root_cause_confidence * 100).toFixed(0)}%, Revenue: ${(rraf.affected_revenue * 100).toFixed(0)}%, Frequency: ${(rraf.frequency * 100).toFixed(0)}%)
`;
  }

  if (diagnosis) {
    prompt += `
- LIFT Diagnosis: ${diagnosis.top_category} (primary category)
- Hypotheses: ${diagnosis.hypotheses?.map((h: any) => `${h.category}: ${h.score}`).join(", ")}
`;
  }

  if (remediation) {
    prompt += `
- Remediation: ${remediation.priority} priority, ETA: ${remediation.estimated_time_to_fix}
- Actions: ${remediation.actions?.join("; ")}
`;
  }

  if (impact) {
    prompt += `
- 7-day revenue at risk: $${Math.round(impact.revenue_at_risk || 0).toLocaleString()}
- Projected recovery: $${Math.round(impact.projected_recovery_low || 0).toLocaleString()} - $${Math.round(impact.projected_recovery_high || 0).toLocaleString()}
`;
  }

  if (!leak) {
    prompt += "\n- No active leaks detected. Funnel is operating within baseline parameters.\n";
  }

  prompt += `
Keep responses under 150 words. Use bullet points for clarity. Reference specific numbers from the analysis.`;

  return prompt;
}

async function callMindsAI(apiKey: string, messages: ChatMessage[], context: any): Promise<NextResponse> {
  // Minds AI API integration
  const res = await fetch("https://mdb.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "minds-ai-agent",
      messages,
      temperature: 0.7,
      max_tokens: 300,
    }),
  });

  if (!res.ok) {
    // Fallback to built-in
    return generateBuiltInResponse(messages[messages.length - 1].content, context);
  }

  const data = await res.json();
  return NextResponse.json({
    reply: data.choices?.[0]?.message?.content || "I couldn't generate a response.",
    source: "minds-ai",
  });
}

async function callOpenAI(apiKey: string, messages: ChatMessage[]): Promise<NextResponse> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages,
      temperature: 0.7,
      max_tokens: 300,
    }),
  });

  if (!res.ok) {
    throw new Error("OpenAI API call failed");
  }

  const data = await res.json();
  return NextResponse.json({
    reply: data.choices?.[0]?.message?.content || "I couldn't generate a response.",
    source: "openai",
  });
}

function generateBuiltInResponse(message: string, context: any): NextResponse {
  const msg = message.toLowerCase();
  const leak = context?.leak;
  const rraf = context?.rraf;
  const diagnosis = context?.diagnosis;
  const impact = context?.impact;

  let reply = "";

  if (msg.includes("what") && (msg.includes("wrong") || msg.includes("happening") || msg.includes("issue"))) {
    if (leak) {
      reply = `We detected a **${leak.severity} severity** revenue leak in **${leak.segment_key?.replace(/_/g, " ")}** at the ${leak.stage?.replace(/_/g, " ")} stage.\n\n- Conversion dropped to **${((leak.observed_rate || 0) * 100).toFixed(1)}%** (baseline: ${((leak.baseline_rate || 0) * 100).toFixed(1)}%)\n- This is costing **$${Math.round(leak.estimated_revenue_lost || 0).toLocaleString()}/day**\n- RRAF risk score: **${rraf ? Math.round(rraf.total) : "N/A"}/100**\n\nThe root cause appears to be **${diagnosis?.top_category || "under investigation"}**-related.`;
    } else {
      reply = "No active revenue leaks detected. Your funnel is operating within baseline parameters. All conversion rates are healthy.";
    }
  } else if (msg.includes("how much") && (msg.includes("losing") || msg.includes("lost") || msg.includes("cost"))) {
    if (leak) {
      reply = `Current daily revenue loss: **$${Math.round(leak.estimated_revenue_lost || 0).toLocaleString()}/day**\n\n- 7-day projected loss: **$${Math.round((impact?.revenue_at_risk || leak.estimated_revenue_lost * 7) || 0).toLocaleString()}**\n- Wasted ad spend (est.): **$${Math.round((leak.estimated_revenue_lost || 0) * 0.3).toLocaleString()}/day**\n- Projected recovery: $${Math.round(impact?.projected_recovery_low || 0).toLocaleString()} - $${Math.round(impact?.projected_recovery_high || 0).toLocaleString()}`;
    } else {
      reply = "No revenue losses detected. Your funnel metrics are within expected baselines.";
    }
  } else if (msg.includes("fix") || msg.includes("do") || msg.includes("action") || msg.includes("recommend")) {
    if (diagnosis) {
      reply = `Based on the **${diagnosis.top_category}** diagnosis, I recommend:\n\n1. **Immediate**: Check the autonomous agent actions panel — I've proposed remediation steps with approve/reject controls\n2. **Short-term**: Focus on the ${diagnosis.top_category.toLowerCase()} factors in the affected segment\n3. **Monitor**: Watch the RRAF score — currently at ${rraf ? Math.round(rraf.total) : "N/A"}/100\n\nWant me to explain any specific remediation action in detail?`;
    } else {
      reply = "Run the funnel analysis first to get actionable recommendations. Click **Analyze Funnel** to start the pipeline.";
    }
  } else if (msg.includes("rraf") || msg.includes("score") || msg.includes("risk")) {
    if (rraf) {
      reply = `**RRAF Score: ${Math.round(rraf.total)}/100**\n\n- Risk: ${(rraf.risk * 100).toFixed(0)}% — how critical is the issue\n- Root Cause Confidence: ${(rraf.root_cause_confidence * 100).toFixed(0)}% — how certain we are about the cause\n- Affected Revenue: ${(rraf.affected_revenue * 100).toFixed(0)}% — financial impact severity\n- Frequency: ${(rraf.frequency * 100).toFixed(0)}% — how often this pattern occurs\n\nA score above 70 triggers critical alerts.`;
    } else {
      reply = "RRAF (Risk, Root cause, Affected revenue, Frequency) is our composite scoring system. Run the analysis to see your current score.";
    }
  } else if (msg.includes("hello") || msg.includes("hi") || msg.includes("hey")) {
    reply = "Hey! I'm your RevShield funnel agent. I can help you understand revenue leaks, diagnose issues, and recommend actions. Try asking:\n\n- \"What's wrong with my funnel?\"\n- \"How much am I losing?\"\n- \"What should I do?\"\n- \"Explain the RRAF score\"";
  } else {
    if (leak) {
      reply = `Here's a quick summary of your funnel status:\n\n- **Status**: ${leak.severity} severity leak detected\n- **Where**: ${leak.segment_key?.replace(/_/g, " ")} → ${leak.stage?.replace(/_/g, " ")}\n- **Impact**: $${Math.round(leak.estimated_revenue_lost || 0).toLocaleString()}/day\n- **Cause**: ${diagnosis?.top_category || "Analyzing..."}\n\nAsk me anything specific about your funnel performance!`;
    } else {
      reply = "Your funnel looks healthy! No leaks detected. I can help you analyze performance, check trends, or run scenarios. What would you like to know?";
    }
  }

  return NextResponse.json({ reply, source: "built-in" });
}
