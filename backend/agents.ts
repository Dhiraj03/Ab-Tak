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

async function callLLM(system: string, prompt: string): Promise<string | null> {
  return null;
}

const NEWS_CATEGORIES = [
  "politics", "election", "government", "minister", "cm", "pm", "bjp", "congress", "assembly", "parliament",
  "economy", "market", "stock", "rupee", "gdp", "inflation", "tax", "budget",
  "war", "conflict", "military", "security", "terror", "attack", "israel", "iran", "ukraine",
  "crime", "murder", "death", "accident", "violence", "police", "court",
  "sports", "cricket", "ipl", "football", "olympics", "medal",
  "technology", "ai", "google", "meta", "startup", "tech",
  "climate", "weather", "rain", "flood", "earthquake", "heatwave"
];

const CATEGORY_WEIGHTS: Record<string, number> = {
  politics: 10, election: 10, government: 9, minister: 8, cm: 8, pm: 9, bjp: 7, congress: 7, assembly: 9,
  economy: 9, market: 8, stock: 8, rupee: 7, gdp: 8, inflation: 8, budget: 9,
  war: 10, conflict: 10, military: 9, security: 9, terror: 10, attack: 10, israel: 9, iran: 9,
  crime: 8, murder: 9, death: 8, accident: 7, violence: 8, police: 7, court: 8,
  sports: 6, cricket: 7, ipl: 7, football: 6, olympics: 8,
  technology: 7, ai: 8, google: 7, meta: 7, startup: 7,
  climate: 8, weather: 7, flood: 8, earthquake: 10, heatwave: 8
};

function calculateRelevance(title: string, summary: string): number {
  const text = `${title} ${summary}`.toLowerCase();
  let score = 5;
  let matchCount = 0;
  
  for (const cat of NEWS_CATEGORIES) {
    if (text.includes(cat)) {
      matchCount++;
      score += CATEGORY_WEIGHTS[cat] || 1;
    }
  }
  
  return Math.min(10, score + (matchCount > 2 ? 2 : 0));
}

export async function runMonitorAgent(stories: StoryCandidate[]): Promise<RankedStory[]> {
  return stories.map((story) => {
    const hoursOld = (Date.now() - new Date(story.publishedAt).getTime()) / 36e5;
    const recency = hoursOld <= 1 ? 10 : hoursOld <= 3 ? 9 : hoursOld <= 6 ? 8 : hoursOld <= 12 ? 7 : hoursOld <= 24 ? 5 : 3;
    const relevance = calculateRelevance(story.title, story.summary);
    const credibility = SOURCE_CREDIBILITY[story.source] ?? 7;
    const overall = clampScore(recency * 0.35 + relevance * 0.45 + credibility * 0.2);
    
    return {
      ...story,
      scores: { recency, significance: relevance, credibility, overall },
      reasoning: `Recency: ${recency}/10, Relevance: ${relevance}/10, Credibility: ${credibility}/10`,
    };
  }).sort((a, b) => b.scores.overall - a.scores.overall);
}

export async function runEditorAgent(task: string, rankedStories: RankedStory[]): Promise<EditorBrief> {
  const topStories = rankedStories.slice(0, 5);

  return {
    task,
    coldOpen: "Good morning. Here's your Ab Tak bulletin.",
    headlinesTease: topStories.map(s => s.title.split('.').slice(0, 20).join('.')),
    stories: topStories.map((story, i) => ({
      storyId: story.id,
      title: story.title.split('.').slice(0, 15).join('.'),
      source: story.source,
      link: story.link,
      angle: "Latest details and why it matters",
      keyFacts: [story.summary.slice(0, 200)],
      tone: "Clear, authoritative"
    })),
    signOff: "Stay with us for more updates.",
  };
}

export function createStubTranscript(brief: EditorBrief) {
  const segues = ["Now, to our first story...", "Moving on...", "Turning to...", "And in closing..."];
  
  const stories = brief.stories.map((story, i) => {
    const facts = story.keyFacts.slice(0, 2).join(" ");
    return `${segues[i]} ${facts}`;
  }).join(" ... ");

  return [
    "Good morning. Here's your Ab Tak bulletin.",
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

export async function runWriterAgent(brief: EditorBrief): Promise<string> {
  const llmResponse = await callLLM(
    "You are a professional news anchor writing a radio bulletin. Write a natural, flowing 2-3 minute news script. Use smooth segues between stories (e.g., 'Moving on to...', 'In other news...', 'Turning to...'). Add brief pauses with ellipses (...) for dramatic effect. Write as you would speak - short sentences, conversational tone, no jargon. Make each story distinct with facts and names.",
    `Create a broadcast-quality news script for this bulletin brief:\n\n${JSON.stringify(brief, null, 2)}\n\nRequirements:\n- Start with a cold open that grabs attention (e.g., 'Good morning, here are your top stories...')\n- Briefly mention headlines in 1-2 sentences\n- For EACH story, write 2-3 sentences with specific details (names, places, numbers)\n- Use smooth segues between stories - NO labels like 'Story 1', 'Story 2'\n- End with a sign-off like 'Stay with us for updates'\n- Total: 250-350 words\n- Write for the ear - short sentences, natural pauses (...)\n- ONLY output the script, no commentary or labels`
  );

  if (llmResponse) {
    return llmResponse;
  }

  return createStubTranscript(brief);
}

export async function runJudgeAgent(script: string, brief: EditorBrief): Promise<JudgeResult> {
  const scores: JudgeScores = { depth: 7, accuracy: 7, clarity: 7, newsworthiness: 7, audio_readiness: 7 };
  return {
    approvedDraft: 1,
    drafts: [{ draft: 1, scores, overall: 7, rewrite_triggered: false }],
    finalScript: script,
  };
}

export type QaResult = {
  agent: string;
  answer: string;
  relatedStory: string | null;
  sources: { title: string; url: string }[];
};

export function runQaAgent(question: string, brief: EditorBrief, transcript: string): QaResult {
  const q = question.toLowerCase();
  const stories = brief.stories;
  
  let relatedStory: { title: string; link: string; keyFacts: string[] } | null = null;
  let answer = "";
  
  // Find which story relates to the question
  for (const story of stories) {
    const titleWords = story.title.toLowerCase().split(/\s+/);
    const keywords = titleWords.filter(w => w.length > 3);
    
    const matchCount = keywords.filter(k => q.includes(k)).length;
    if (matchCount > 0) {
      relatedStory = story;
      break;
    }
  }
  
  if (relatedStory) {
    answer = `${relatedStory.keyFacts[0] || 'Related to: ' + relatedStory.title}. For more details, visit the source.`;
  } else {
    // Check if question keywords appear in transcript
    const words = q.split(/\s+/).filter(w => w.length > 4);
    const foundIn = words.filter(w => transcript.toLowerCase().includes(w));
    
    if (foundIn.length > 0) {
      answer = "This relates to one of the stories in today's bulletin. " + 
        "The latest updates on this topic were covered in our broadcast. " +
        "Please refer to the transcript for complete details.";
    } else {
      answer = "This question relates to current events. " + 
        "The information may be from today's news coverage. " +
        "Check back for our next bulletin for full details.";
    }
  }
  
  return {
    agent: relatedStory ? "Context Agent" : "Fact Agent",
    answer,
    relatedStory: relatedStory?.title || null,
    sources: relatedStory ? [{ title: relatedStory.title, url: relatedStory.link }] : []
  };
}
