import { NextResponse } from "next/server";

const OPENROUTER_AUDIO_URL = "https://openrouter.ai/api/v1/audio/transcriptions";
const WHISPER_MODEL = "openai/whisper-1";

type WhisperBody = {
  audioBase64?: string;
  mimeType?: string;
  filename?: string;
};

function base64ToUint8Array(base64: string) {
  const normalized = base64.replace(/^data:.*;base64,/, "");
  return Uint8Array.from(Buffer.from(normalized, "base64"));
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OPENROUTER_API_KEY is not configured" }, { status: 500 });
  }

  const body = (await request.json()) as WhisperBody;
  if (!body.audioBase64) {
    return NextResponse.json({ error: "Missing field: audioBase64" }, { status: 400 });
  }

  try {
    const bytes = base64ToUint8Array(body.audioBase64);
    const blob = new Blob([bytes], { type: body.mimeType || "audio/mpeg" });
    const formData = new FormData();
    formData.append("model", WHISPER_MODEL);
    formData.append("file", blob, body.filename || "call.mp3");

    const upstream = await fetch(OPENROUTER_AUDIO_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    });

    const payload = await upstream.json();
    if (!upstream.ok) {
      return NextResponse.json(
        { error: "OpenRouter transcription failed", details: payload },
        { status: upstream.status },
      );
    }

    return NextResponse.json({
      transcript: payload?.text || "",
      raw: payload,
    });
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
