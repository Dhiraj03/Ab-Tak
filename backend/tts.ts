// ElevenLabs TTS for Cloudflare Workers
// Returns audio as base64 data URL (no filesystem access)

const ELEVENLABS_VOICE_ID = "3WqHLnw80rOZqJzW9YRB";

export async function generateAudio(text: string, apiKey?: string): Promise<string | null> {
  console.log("TTS: generateAudio called, apiKey present:", !!apiKey, "length:", apiKey?.length || 0, "value:", apiKey?.slice(0, 5));
  
  if (!apiKey || apiKey.trim() === '') {
    console.warn("ELEVENLABS_API_KEY not provided or empty");
    return null;
  }

  try {
    console.log("TTS: Calling ElevenLabs API with voice:", ELEVENLABS_VOICE_ID);
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

    console.log("TTS: ElevenLabs response status:", response.status);
    
    if (!response.ok) {
      const err = await response.text();
      console.warn("ElevenLabs error:", response.status, err.slice(0, 200));
      return null;
    }

    const buffer = await response.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    // Chunk the base64 encoding to avoid stack overflow
    let binary = '';
    const chunkSize = 8192;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.slice(i, i + chunkSize);
      binary += String.fromCharCode(...chunk);
    }
    const base64 = btoa(binary);

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