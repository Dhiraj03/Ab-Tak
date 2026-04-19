import OpenAI from "openai";

import type { EditorBrief, RankedStory, StoryCandidate } from "./types";

const OR_API_KEY = "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";
const OR_BASE_URL = "https://openrouter.ai/api/v1";

const openai = new OpenAI({
  apiKey: OR_API_KEY,
  baseURL: OR_BASE_URL,
});

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

async function callLLM(system: string, prompt: string): Promise<string | null> {
  return null;
}

export async function runMonitorAgent(stories: StoryCandidate[]): Promise<RankedStory[]> {
  const llmResponse = await callLLM(
    "You are a newsroom monitor. Rank stories by recency, significance, and source credibility. Return only JSON.",
    `Rank these stories and return JSON with this shape:\n{\n  "stories": [\n    {\n      "storyId": "...",\n      "recency": 1-10,\n      "significance": 1-10,\n      "credibility": 1-10,\n      "overall": 1-10,\n      "reasoning": "one sentence"\n    }\n  ]\n}\n\nStories:\n${JSON.stringify(stories, null, 2)}`,
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
      // Fall through to deterministic ranking.
    }
  }

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

export async function runEditorAgent(task: string, rankedStories: RankedStory[]): Promise<EditorBrief> {
  const topStories = rankedStories.slice(0, 3);

  const llmResponse = await callLLM(
    "You are a senior news editor. Choose the top three stories and create a radio bulletin brief. Return only JSON.",
    `Task: ${task}\n\nReturn JSON with this shape:\n{\n  "task": "string",\n  "coldOpen": "string",\n  "headlinesTease": ["..."],\n  "stories": [\n    {\n      "storyId": "...",\n      "title": "...",\n      "source": "...",\n      "link": "...",\n      "angle": "...",\n      "keyFacts": ["..."],\n      "tone": "..."\n    }\n  ],\n  "signOff": "string"\n}\n\nRanked stories:\n${JSON.stringify(topStories, null, 2)}`,
  );

  if (llmResponse) {
    try {
      return extractJson<EditorBrief>(llmResponse);
    } catch {
      // Fall through to deterministic editor output.
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
  const storyLines = brief.stories
    .map((story, index) => {
      const factLine = story.keyFacts.join(" ");
      return `Story ${index + 1}: ${story.title}. ${story.angle} ${factLine}`;
    })
    .join("\n\n");

  return [
    brief.coldOpen,
    `Headlines: ${brief.headlinesTease.join(". ")}.`,
    storyLines,
    brief.signOff,
  ]
    .filter(Boolean)
    .join("\n\n");
}
