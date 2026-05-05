import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type InterceptNotifyBody = {
  name?: string;
  phone?: string;
  situation?: string;
  agent_reply?: string;
  delivery_channel?: "whatsapp" | "sms" | "telegram";
  telegram_username?: string | null;
  timestamp?: string;
};

export async function POST(request: Request) {
  const webhookUrl = process.env.N8N_WEBHOOK_INTERCEPT;
  if (!webhookUrl) {
    return NextResponse.json({ error: "N8N_WEBHOOK_INTERCEPT is not configured" }, { status: 500 });
  }

  const body = (await request.json()) as InterceptNotifyBody;
  if (!body.name || !body.phone || !body.situation || !body.agent_reply || !body.delivery_channel) {
    return NextResponse.json(
      { error: "Missing required fields: name, phone, situation, agent_reply, delivery_channel" },
      { status: 400 },
    );
  }

  try {
    const supabase = createSupabaseServerClient();
    const { data: lead, error: insertError } = await supabase
      .from("intercept_leads_demo")
      .insert({
        name: body.name,
        phone: body.phone,
        situation: body.situation,
        agent_reply: body.agent_reply,
        source: "landing_intercept",
        webhook_status: "pending",
        delivery_channel: body.delivery_channel,
        telegram_username: body.telegram_username || null,
      })
      .select("id")
      .single();

    if (insertError || !lead?.id) {
      return NextResponse.json(
        { error: "Unable to save intercept lead", details: insertError?.message || "unknown error" },
        { status: 500 },
      );
    }

    const upstream = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...body,
        lead_id: lead.id,
        client_delivery: {
          channel: body.delivery_channel,
          phone: body.phone,
          telegram_username: body.telegram_username || null,
        },
        auto_delivery_target:
          body.delivery_channel === "telegram" && body.telegram_username
            ? body.telegram_username
            : body.phone,
        timestamp: body.timestamp || new Date().toISOString(),
      }),
    });

    const details = await upstream.text();
    if (!upstream.ok) {
      await supabase
        .from("intercept_leads_demo")
        .update({ webhook_status: "failed", webhook_response: details })
        .eq("id", lead.id);

      return NextResponse.json({ error: "Failed to deliver n8n webhook", details }, { status: upstream.status });
    }

    await supabase
      .from("intercept_leads_demo")
      .update({ webhook_status: "sent", webhook_response: details || "sent" })
      .eq("id", lead.id);

    return NextResponse.json({ ok: true, details: details || "sent", leadId: lead.id });
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
