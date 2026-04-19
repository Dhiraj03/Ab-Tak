import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";
import Parser from "rss-parser";

import type { FeedSource, StoryCandidate } from "./types";

// Configure parser to extract media content and other fields
const parser = new Parser({
  customFields: {
    item: [
      ['media:content', 'media:content'],
      ['media:thumbnail', 'media:thumbnail'],
      'enclosure',
      'content:encoded',
      'content',
    ],
  },
});

export const DEFAULT_FEEDS: FeedSource[] = [
  { name: "NDTV India", url: "https://feeds.ndtv.com/news/india.rss", credibility: 9 },
  { name: "Times of India", url: "https://timesofindia.indiatimes.com/rssfeed.cms", credibility: 8 },
  { name: "The Hindu", url: "https://www.thehindu.com/news/feeder/default.rss", credibility: 9 },
  { name: "India Express", url: "https://indianexpress.com/rss/india-news.xml", credibility: 8 },
  { name: "BBC India", url: "https://feeds.bbci.co.uk/news/world/asia/rss.xml", credibility: 9 },
  { name: "Google News India", url: "https://news.google.com/rss/topics/CAAqJggKIiRDQkFTRWdvSUwyMHZNRGx1YlY4U0FtVnVHZ0pWVXlnQVAB?hl=en-IN&gl=IN", credibility: 8 },
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

// Extract main image from article URL
export async function extractArticleImage(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: {
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      },
      redirect: "follow",
    });

    if (!response.ok) {
      return null;
    }

    const html = await response.text();
    const dom = new JSDOM(html, { url });
    const doc = dom.window.document;

    // Try multiple image sources in order of priority
    // 1. Open Graph image
    const ogImage = doc.querySelector('meta[property="og:image"]')?.getAttribute("content");
    if (ogImage) {
      return resolveUrl(ogImage, url);
    }

    // 2. Twitter card image
    const twitterImage = doc.querySelector('meta[name="twitter:image"]')?.getAttribute("content");
    if (twitterImage) {
      return resolveUrl(twitterImage, url);
    }

    // 3. Article with image
    const articleImg = doc.querySelector('article img, .article img, .story img, [class*="content"] img')?.getAttribute("src");
    if (articleImg) {
      return resolveUrl(articleImg, url);
    }

    // 4. First large image on page
    const images = Array.from(doc.querySelectorAll('img'));
    const largeImage = images.find(img => {
      const width = parseInt(img.getAttribute("width") || "0");
      const height = parseInt(img.getAttribute("height") || "0");
      return width > 300 || height > 200;
    });
    
    if (largeImage) {
      return resolveUrl(largeImage.getAttribute("src") || "", url);
    }

    return null;
  } catch (error) {
    console.warn("Failed to extract image from", url, error);
    return null;
  }
}

// Resolve relative URLs to absolute
function resolveUrl(src: string, baseUrl: string): string {
  if (!src) return "";
  if (src.startsWith("http")) return src;
  if (src.startsWith("//")) return `https:${src}`;
  if (src.startsWith("/")) {
    const base = new URL(baseUrl);
    return `${base.protocol}//${base.host}${src}`;
  }
  return new URL(src, baseUrl).href;
}

// Extract image from RSS item (media:content, enclosure, or content)
function extractRssImage(item: any): string | null {
  // Try media:content - The Hindu format: media:content: { $: { url: '...' } }
  if (item['media:content']) {
    const mc = item['media:content'];
    // Handle object with $ property
    if (mc && typeof mc === 'object') {
      if (mc.$ && mc.$.url) {
        return mc.$.url;
      }
      // Handle array of media content
      if (Array.isArray(mc) && mc.length > 0) {
        const first = mc[0];
        if (first.$ && first.$.url) {
          return first.$.url;
        }
      }
    }
  }
  
  // Try media:thumbnail
  if (item['media:thumbnail']) {
    const mt = item['media:thumbnail'];
    if (mt && typeof mt === 'object' && mt.$ && mt.$.url) {
      return mt.$.url;
    }
    if (typeof mt === 'string') {
      return mt;
    }
  }
  
  // Try enclosure
  if (item.enclosure?.url) {
    return item.enclosure.url;
  }
  if (item.enclosure?.$.url) {
    return item.enclosure.$.url;
  }
  
  // Try content encoded with img tag
  if (item['content:encoded']) {
    const content = typeof item['content:encoded'] === 'string' 
      ? item['content:encoded'] 
      : item['content:encoded']._ || item['content:encoded'].$?.url;
    if (typeof content === 'string') {
      const imgMatch = content.match(/<img[^>]+src=["']([^"']+)["']/i);
      if (imgMatch) {
        return imgMatch[1];
      }
    }
  }
  
  // Try content with img tag
  if (item.content) {
    const content = typeof item.content === 'string' 
      ? item.content 
      : item.content._ || item.content.$?.url;
    if (typeof content === 'string') {
      const imgMatch = content.match(/<img[^>]+src=["']([^"']+)["']/i);
      if (imgMatch) {
        return imgMatch[1];
      }
    }
  }
  
  return null;
}

// Fetch stories with images and summaries
export async function fetchStoriesWithImages(
  feeds: FeedSource[] = DEFAULT_FEEDS,
  perFeedLimit = 3
): Promise<Array<{
  id: string;
  title: string;
  link: string;
  source: string;
  publishedAt: string;
  summary: string;
  imageUrl: string | null;
}>> {
  try {
    const allItems = await Promise.allSettled(
      feeds.map(async (feed) => {
        const parsed = await parser.parseURL(feed.url);

        return (parsed.items ?? []).slice(0, perFeedLimit).map((item, index) => {
          const rssImage = extractRssImage(item);
          return {
            id: makeStoryId(item.link ?? `${feed.name}-${index}`, index),
            title: normalizeText(item.title),
            link: item.link ?? "",
            source: feed.name,
            publishedAt: item.isoDate ?? item.pubDate ?? new Date().toISOString(),
            summary: normalizeText(item.contentSnippet ?? item.content ?? item.summary).slice(0, 200),
            imageUrl: rssImage,
          };
        });
      }),
    );

    let stories = allItems
      .filter((result): result is PromiseFulfilledResult<any[]> => result.status === "fulfilled")
      .flatMap((result) => result.value);

    if (stories.length === 0) {
      console.warn("All feeds failed, using mock data");
      return MOCK_STORIES.map(s => ({ ...s, imageUrl: null }));
    }

    // Fetch images for stories that don't have one from RSS
    const storiesWithImages = await Promise.all(
      stories.slice(0, 6).map(async (story) => {
        if (story.imageUrl) {
          return story; // Already has image from RSS
        }
        try {
          const imageUrl = await extractArticleImage(story.link);
          return { ...story, imageUrl };
        } catch {
          return story;
        }
      })
    );

    return storiesWithImages;
  } catch (error) {
    console.warn("Feed fetch error:", error);
    return MOCK_STORIES.map(s => ({ ...s, imageUrl: null }));
  }
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
