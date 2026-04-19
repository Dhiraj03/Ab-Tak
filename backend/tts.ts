import { mkdir, writeFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_VOICE_ID = "3WqHLnw80rOZqJzW9YRB";
const AUDIO_DIR = "./audio";

async function ensureAudioDir() {
  if (!existsSync(AUDIO_DIR)) {
    await mkdir(AUDIO_DIR, { recursive: true });
  }
}

export async function generateAudio(text: string): Promise<string | null> {
  if (!ELEVENLABS_API_KEY) {
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
          "xi-api-key": ELEVENLABS_API_KEY,
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

    // Save to file
    await ensureAudioDir();
    const filename = `bulletin-${Date.now()}.mp3`;
    const filepath = path.join(AUDIO_DIR, filename);
    await writeFile(filepath, audioBuffer);

    // Return both base64 and file path
    const base64 = audioBuffer.toString("base64");
    return JSON.stringify({ base64: `data:audio/mp3;base64,${base64}`, filepath: `/${AUDIO_DIR}/${filename}` });
  } catch (error) {
    console.warn("TTS failed:", error);
    return null;
  }
}