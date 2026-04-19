import { mkdir, writeFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_VOICE_ID = "v94rb3DMOvQwADJySFrY";

let audioBufferCache: Buffer | null = null;

export async function generateAudio(text: string, apiKey?: string): Promise<string | null> {
  const key = apiKey || ELEVENLABS_API_KEY;
  
  if (!key) {
    console.warn("ELEVENLABS_API_KEY not set");
    return null;
  }

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": key,
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_flash_v2_5",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      console.warn("ElevenLabs error:", err);
      return null;
    }

    const buffer = await response.arrayBuffer();
    const audioBuffer = Buffer.from(buffer);

    // In Cloudflare, just return base64 (no file system)
    const base64 = audioBuffer.toString("base64");
    return JSON.stringify({ base64: `data:audio/mp3;base64,${base64}`, filepath: '' });
  } catch (error) {
    console.warn("TTS failed:", error);
    return null;
  }
}