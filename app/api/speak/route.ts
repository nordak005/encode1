import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { text } = await req.json();

  const response = await fetch("https://api.elevenlabs.io/v1/text-to-speech/ocZQ262SsZb9RIxcQBOj", {
    method: "POST",
    headers: {
      "xi-api-key": process.env.ELEVENLABS_API_KEY!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text,
      voice_settings: {
        stability: 0.3,
        similarity_boost: 0.7,
        style: 0.8,
        use_speaker_boost: true,
      },
    }),
  });

  const audio = await response.arrayBuffer();

  return new NextResponse(audio, {
    headers: { "Content-Type": "audio/mpeg" },
  });
}
