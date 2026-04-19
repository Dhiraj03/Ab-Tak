export type FeedSource = {
  name: string;
  url: string;
  credibility: number;
};

export type StoryCandidate = {
  id: string;
  title: string;
  link: string;
  source: string;
  publishedAt: string;
  summary: string;
  articleText: string;
  excerpt: string;
};

export type RankedStory = StoryCandidate & {
  scores: {
    recency: number;
    significance: number;
    credibility: number;
    overall: number;
  };
  reasoning: string;
};

export type EditorBriefItem = {
  storyId: string;
  title: string;
  source: string;
  link: string;
  angle: string;
  keyFacts: string[];
  tone: string;
};

export type EditorBrief = {
  task: string;
  coldOpen: string;
  headlinesTease: string[];
  stories: EditorBriefItem[];
  signOff: string;
};
