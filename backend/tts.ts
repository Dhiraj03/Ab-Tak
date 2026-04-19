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
      console.error("ElevenLabs error:", response.status, err.slice(0, 200));
      return null;
    }

    console.log("ElevenLabs response OK, processing audio...");
    const buffer = await response.arrayBuffer();
    console.log("Audio buffer size:", buffer.byteLength, "bytes");
    
    // Convert to base64 using chunks to avoid stack overflow
    const bytes = new Uint8Array(buffer);
    let binary = '';
    const chunkSize = 8192;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.slice(i, i + chunkSize);
      binary += String.fromCharCode(...chunk);
    }
    const base64 = btoa(binary);
    
    console.log("Base64 encoded, length:", base64.length);

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