import { NextResponse } from "next/server";

type InterceptNotifyBody = {
  name?: string;
  phone?: string;
  situation?: string;
  agent_reply?: string;
  timestamp?: string;
};

export async function POST(request: Request) {
  const webhookUrl = process.env.N8N_WEBHOOK_INTERCEPT;
  if (!webhookUrl) {
    return NextResponse.json({ error: "N8N_WEBHOOK_INTERCEPT is not configured" }, { status: 500 });
  }

  const body = (await request.json()) as InterceptNotifyBody;
  if (!body.name || !body.phone || !body.situation || !body.agent_reply) {
    return NextResponse.json(
      { error: "Missing required fields: name, phone, situation, agent_reply" },
      { status: 400 },
    );
  }

  try {
    const upstream = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...body,
        timestamp: body.timestamp || new Date().toISOString(),
      }),
    });

    const details = await upstream.text();
    if (!upstream.ok) {
      return NextResponse.json({ error: "Failed to deliver n8n webhook", details }, { status: upstream.status });
    }

    return NextResponse.json({ ok: true, details: details || "sent" });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Unexpected server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
