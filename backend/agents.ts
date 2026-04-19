import OpenAI from "openai";

import type { EditorBrief, RankedStory, StoryCandidate } from "./types";

const OR_BASE_URL = "https://openrouter.ai/api/v1";

const SOURCE_CREDIBILITY: Record<string, number> = {
  "BBC World": 9,
  "Reuters World": 10,
};

function clampScore(value: number) {
  return Math.max(1, Math.min(10, Math.round(value * 10) / 10));
}

function hoursSince(dateString: string) {
  const diffMs = Date.now() - new Date(dateString).getTime();
  return diffMs / (1000 * 60 * 60);
}

function keywordScore(title: string, text: string) {
  const haystack = `${title} ${text}`.toLowerCase();
  const importantKeywords = [
    "election",
    "war",
    "tariff",
    "trump",
    "china",
    "india",
    "ukraine",
    "gaza",
    "earthquake",
    "market",
    "economy",
    "president",
  ];

  const hits = importantKeywords.filter((keyword) => haystack.includes(keyword)).length;
  return clampScore(4 + hits);
}

function recencyScore(publishedAt: string) {
  const hours = hoursSince(publishedAt);

  if (hours <= 2) return 10;
  if (hours <= 4) return 8;
  if (hours <= 8) return 6;
  if (hours <= 12) return 4;
  return 2;
}

function extractJson<T>(input: string): T {
  const fencedMatch = input.match(/```json\s*([\s\S]*?)```/i);
  const jsonString = fencedMatch ? fencedMatch[1] : input;
  return JSON.parse(jsonString) as T;
}

async function callLLM(system: string, prompt: string, apiKey: string, model: string = "anthropic/claude-3.5-sonnet"): Promise<string | null> {
  try {
    const response = await fetch(`${OR_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": "https://ab-tak.pages.dev",
        "X-Title": "Ab Tak Newsroom"
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenRouter API error:", response.status, errorText);
      return null;
    }

    const data = await response.json() as { 
      choices?: Array<{ message?: { content?: string } }> 
    };
    return data.choices?.[0]?.message?.content || null;
  } catch (error) {
    console.error("LLM call failed:", error);
    return null;
  }
}

export async function runMonitorAgent(stories: StoryCandidate[], apiKey?: string): Promise<RankedStory[]> {
  // If no API key, use deterministic ranking
  if (!apiKey) {
    return stories
      .map((story) => {
        const recency = recencyScore(story.publishedAt);
        const significance = keywordScore(story.title, story.articleText || story.summary);
        const credibility = SOURCE_CREDIBILITY[story.source] ?? 7;
        const overall = clampScore(recency * 0.4 + significance * 0.4 + credibility * 0.2);

        return {
          ...story,
          scores: {
            recency,
            significance,
            credibility,
            overall,
          },
          reasoning: `Ranked for freshness (${recency}/10), significance (${significance}/10), and source trust (${credibility}/10).`,
        };
      })
      .sort((a, b) => b.scores.overall - a.scores.overall);
  }

  const llmResponse = await callLLM(
    "You are a newsroom monitor. Rank stories by recency, significance, and source credibility. Return only JSON.",
    `Rank these stories and return JSON with this shape:\n{\n  "stories": [\n    {\n      "storyId": "...",\n      "recency": 1-10,\n      "significance": 1-10,\n      "credibility": 1-10,\n      "overall": 1-10,\n      "reasoning": "one sentence"\n    }\n  ]\n}\n\nStories:\n${JSON.stringify(stories, null, 2)}`,
    apiKey
  );

  if (llmResponse) {
    try {
      const parsed = extractJson<{
        stories: Array<{
          storyId: string;
          recency: number;
          significance: number;
          credibility: number;
          overall: number;
          reasoning: string;
        }>;
      }>(llmResponse);

      const byId = new Map(stories.map((story) => [story.id, story]));

      return parsed.stories
        .map((item) => {
          const story = byId.get(item.storyId);
          if (!story) return null;

          return {
            ...story,
            scores: {
              recency: clampScore(item.recency),
              significance: clampScore(item.significance),
              credibility: clampScore(item.credibility),
              overall: clampScore(item.overall),
            },
            reasoning: item.reasoning,
          };
        })
        .filter((story): story is RankedStory => Boolean(story))
        .sort((a, b) => b.scores.overall - a.scores.overall);
    } catch {
      // Fall through to deterministic ranking on parse error.
    }
  }

  // Fallback: deterministic ranking
  return stories
    .map((story) => {
      const recency = recencyScore(story.publishedAt);
      const significance = keywordScore(story.title, story.articleText || story.summary);
      const credibility = SOURCE_CREDIBILITY[story.source] ?? 7;
      const overall = clampScore(recency * 0.4 + significance * 0.4 + credibility * 0.2);

      return {
        ...story,
        scores: {
          recency,
          significance,
          credibility,
          overall,
        },
        reasoning: `Ranked for freshness (${recency}/10), significance (${significance}/10), and source trust (${credibility}/10).`,
      };
    })
    .sort((a, b) => b.scores.overall - a.scores.overall);
}

export async function runEditorAgent(task: string, rankedStories: RankedStory[], apiKey?: string): Promise<EditorBrief> {
  const topStories = rankedStories.slice(0, 3);

  if (apiKey) {
    const llmResponse = await callLLM(
      "You are a senior news editor. Choose the top three stories and create a radio bulletin brief. Return only JSON.",
      `Task: ${task}\n\nReturn JSON with this shape:\n{\n  "task": "string",\n  "coldOpen": "string",\n  "headlinesTease": ["..."],\n  "stories": [\n    {\n      "storyId": "...",\n      "title": "...",\n      "source": "...",\n      "link": "...",\n      "angle": "...",\n      "keyFacts": ["..."],\n      "tone": "..."\n    }\n  ],\n  "signOff": "string"\n}\n\nRanked stories:\n${JSON.stringify(topStories, null, 2)}`,
      apiKey
    );

    if (llmResponse) {
      try {
        return extractJson<EditorBrief>(llmResponse);
      } catch {
        // Fall through to deterministic editor output.
      }
    }
  }

  return {
    task,
    coldOpen: "Here are the top global stories shaping the day.",
    headlinesTease: topStories.map((story) => story.title),
    stories: topStories.map((story) => ({
      storyId: story.id,
      title: story.title,
      source: story.source,
      link: story.link,
      angle: "Focus on the latest development and why it matters now.",
      keyFacts: [story.excerpt || story.summary || "Latest details still emerging."],
      tone: "Clear, calm, authoritative",
    })),
    signOff: "That is your AI Media Desk bulletin.",
  };
}

export function createStubTranscript(brief: EditorBrief) {
  const segues = ["Now, to our first story...", "Moving on...", "Turning to...", "And in closing..."];
  
  const stories = brief.stories.map((story, i) => {
    const facts = story.keyFacts.slice(0, 2).join(" ");
    return `${segues[i]} ${facts}`;
  }).join(" ... ");

  return [
    "Good morning. Here's your AI Media Desk bulletin.",
    `${brief.headlinesTease.join(". ")}.`,
    "... ",
    stories,
    "Stay with us for more updates.",
  ].join("\n");
}

export type JudgeScores = {
  depth: number;
  accuracy: number;
  clarity: number;
  newsworthiness: number;
  audio_readiness: number;
};

export type JudgeDraft = {
  draft: number;
  scores: JudgeScores;
  overall: number;
  rewrite_triggered: boolean;
  rewrite_instruction?: string;
};

export type JudgeResult = {
  approvedDraft: number;
  drafts: JudgeDraft[];
  finalScript: string;
};

export async function runWriterAgent(brief: EditorBrief, apiKey?: string): Promise<string> {
  if (apiKey) {
    const llmResponse = await callLLM(
      "You are a professional news anchor writing a radio bulletin. Write a natural, flowing 2-3 minute news script. Use smooth segues between stories (e.g., 'Moving on to...', 'In other news...', 'Turning to...'). Add brief pauses with ellipses (...) for dramatic effect. Write as you would speak - short sentences, conversational tone, no jargon. Make each story distinct with facts and names.",
      `Create a broadcast-quality news script for this bulletin brief:\n\n${JSON.stringify(brief, null, 2)}\n\nRequirements:\n- Start with a cold open that grabs attention (e.g., 'Good morning, here are your top stories...')\n- Briefly mention headlines in 1-2 sentences\n- For EACH story, write 2-3 sentences with specific details (names, places, numbers)\n- Use smooth segues between stories - NO labels like 'Story 1', 'Story 2'\n- End with a sign-off like 'Stay with us for updates'\n- Total: 250-350 words\n- Write for the ear - short sentences, natural pauses (...)\n- ONLY output the script, no commentary or labels`,
      apiKey
    );

    if (llmResponse) {
      return llmResponse;
    }
  }

  return createStubTranscript(brief);
}

export async function runJudgeAgent(script: string, brief: EditorBrief, apiKey?: string): Promise<JudgeResult> {
  if (apiKey) {
    const llmResponse = await callLLM(
      "You are a news editor judging broadcast scripts. Score on 5 criteria (1-10 each): Depth, Accuracy, Clarity, Newsworthiness, Audio-readiness. If any score < 7, generate a rewrite instruction. Return ONLY JSON.",
      `Score this script and return JSON:\n\nScript:\n${script}\n\nBrief:\n${JSON.stringify(brief, null, 2)}\n\nReturn JSON with this exact shape:\n{\n  "drafts": [\n    {\n      "draft": 1,\n      "scores": { "depth": 1-10, "accuracy": 1-10, "clarity": 1-10, "newsworthiness": 1-10, "audio_readiness": 1-10 },\n      "overall": number,\n      "rewrite_triggered": true/false,\n      "rewrite_instruction": "if triggered, what to fix"\n    }\n  ],\n  "approvedDraft": number\n}`,
      apiKey
    );

    if (llmResponse) {
      try {
        const parsed = extractJson<{
          drafts: JudgeDraft[];
          approvedDraft: number;
        }>(llmResponse);
        return { ...parsed, finalScript: script };
      } catch {
        // fall through
      }
    }
  }

  const scores: JudgeScores = { depth: 7, accuracy: 7, clarity: 7, newsworthiness: 7, audio_readiness: 7 };
  return {
    approvedDraft: 1,
    drafts: [{ draft: 1, scores, overall: 7, rewrite_triggered: false }],
    finalScript: script,
  };
}
