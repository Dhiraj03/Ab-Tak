// ElevenLabs TTS for Cloudflare Workers
// Returns audio as base64 data URL (no filesystem access)

const ELEVENLABS_VOICE_ID = "3WqHLnw80rOZqJzW9YRB";

export async function generateAudio(text: string, apiKey?: string): Promise<string | null> {
  if (!apiKey) {
    console.warn("ELEVENLABS_API_KEY not provided");
    return null;
  }

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": apiKey,
        },
        body: JSON.stringify({
          text: text.slice(0, 2500), // Limit to avoid token limits
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
    const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));

    // Return as data URL
    return JSON.stringify({ 
      base64: `data:audio/mpeg;base64,${base64}`,
      url: `data:audio/mpeg;base64,${base64}` 
    });
  } catch (error) {
    console.warn("TTS failed:", error);
    return null;
  }
}