import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";
import Parser from "rss-parser";

import type { FeedSource, StoryCandidate } from "./types";

const parser = new Parser();

export const DEFAULT_FEEDS: FeedSource[] = [
  {
    name: "BBC World",
    url: "https://feeds.bbci.co.uk/news/world/rss.xml",
    credibility: 9,
  },
  {
    name: "Al Jazeera",
    url: "https://www.aljazeera.com/xml/rss/all.xml",
    credibility: 8,
  },
];

function normalizeText(value: string | null | undefined) {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function makeStoryId(link: string, index: number) {
  return Buffer.from(`${link}-${index}`).toString("base64url").slice(0, 24);
}

const MOCK_STORIES: StoryCandidate[] = [
  {
    id: "mock-1",
    title: "Global markets respond to new trade policy announcements",
    link: "https://example.com/markets",
    source: "BBC World",
    publishedAt: new Date().toISOString(),
    summary: "Markets around the world are reacting to recent policy announcements affecting international trade.",
    articleText: "",
    excerpt: "",
  },
  {
    id: "mock-2", 
    title: "Climate summit concludes with new agreements on emissions",
    link: "https://example.com/climate",
    source: "Al Jazeera",
    publishedAt: new Date(Date.now() - 3600000).toISOString(),
    summary: "World leaders have agreed on new measures to reduce carbon emissions over the coming decade.",
    articleText: "",
    excerpt: "",
  },
  {
    id: "mock-3",
    title: "Tech industry announces major advancements in artificial intelligence",
    link: "https://example.com/ai",
    source: "BBC World",
    publishedAt: new Date(Date.now() - 7200000).toISOString(),
    summary: "Major technology companies have unveiled new AI systems with unprecedented capabilities.",
    articleText: "",
    excerpt: "",
  },
  {
    id: "mock-4",
    title: "International health organization reports on disease prevention progress",
    link: "https://example.com/health",
    source: "Al Jazeera",
    publishedAt: new Date(Date.now() - 10800000).toISOString(),
    summary: "New report shows significant progress in global health initiatives and disease prevention programs.",
    articleText: "",
    excerpt: "",
  },
];

export async function fetchFeeds(
  feeds: FeedSource[] = DEFAULT_FEEDS,
  perFeedLimit = 5,
): Promise<StoryCandidate[]> {
  try {
    const allItems = await Promise.allSettled(
      feeds.map(async (feed) => {
        const parsed = await parser.parseURL(feed.url);

        return (parsed.items ?? []).slice(0, perFeedLimit).map((item, index) => ({
          id: makeStoryId(item.link ?? `${feed.name}-${index}`, index),
          title: normalizeText(item.title),
          link: item.link ?? "",
          source: feed.name,
          publishedAt: item.isoDate ?? item.pubDate ?? new Date().toISOString(),
          summary: normalizeText(item.contentSnippet ?? item.content ?? item.summary),
          articleText: "",
          excerpt: "",
        }));
      }),
    );

    const stories = allItems
      .filter((result): result is PromiseFulfilledResult<StoryCandidate[]> => result.status === "fulfilled")
      .flatMap((result) => result.value);

    if (stories.length === 0) {
      console.warn("All feeds failed, using mock data");
      return MOCK_STORIES;
    }

    return stories;
  } catch (error) {
    console.warn("Feed fetch error:", error);
    return MOCK_STORIES;
  }
}

export async function extractArticleText(url: string) {
  const response = await fetch(url, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    },
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch article: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  const dom = new JSDOM(html, { url });
  const reader = new Readability(dom.window.document);
  const article = reader.parse();

  return {
    title: normalizeText(article?.title),
    excerpt: normalizeText(article?.excerpt),
    text: normalizeText(article?.textContent),
  };
}

export async function hydrateStories(stories: StoryCandidate[], limit = 5) {
  const hydrated = await Promise.all(
    stories.map(async (story, index) => {
      if (index >= limit) {
        return story;
      }

      try {
        const article = await extractArticleText(story.link);

        return {
          ...story,
          excerpt: article.excerpt || story.summary,
          articleText: article.text,
        };
      } catch {
        return {
          ...story,
          excerpt: story.summary,
          articleText: story.summary,
        };
      }
    }),
  );

  return hydrated;
}
