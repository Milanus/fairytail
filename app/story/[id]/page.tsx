import type { Metadata } from "next";
import { fetchStoryById } from "../../../lib/realtime";
import StoryPageClient from "./Client";
import Hero from "../../../components/Hero";

export async function generateMetadata({ params }: any): Promise<Metadata> {
  const { id } = await Promise.resolve(params);
  try {
    const story = await fetchStoryById(id);

    if (!story) {
      return {
        title: "Story Not Found | Fairy Tale Platform",
        description: "The requested fairy tale could not be found.",
        robots: { index: false, follow: false },
        alternates: { canonical: `/story/${id}` },
      };
    }

    const sourceText =
      story.description && story.description.trim().length > 0
        ? story.description
        : story.content || "";
    const cleanText = sourceText.replace(/\s+/g, " ").trim();
    const excerpt = cleanText.slice(0, 160) + (cleanText.length > 160 ? "..." : "");

    const images: { url: string; width?: number; height?: number; alt?: string }[] = [];
    if (story.story_image_url) {
      images.push({ url: story.story_image_url, alt: story.title });
    }
    if (Array.isArray(story.image_urls)) {
      for (const url of story.image_urls) {
        images.push({ url, alt: story.title });
      }
    }

    const isPublished = story.status === "published";

    return {
      title: `${story.title} | Fairy Tale Platform`,
      description: excerpt,
      keywords: story.tags?.join(", ") || "fairy tale, story",
      authors: story.author ? [{ name: story.author }] : undefined,
      alternates: {
        canonical: `/story/${id}`,
      },
      openGraph: {
        title: story.title,
        description: excerpt,
        type: "article",
        authors: story.author ? [story.author] : undefined,
        tags: story.tags,
        publishedTime: story.published_at ? new Date(story.published_at).toISOString() : undefined,
        modifiedTime: story.updated_at ? new Date(story.updated_at).toISOString() : undefined,
        url: `/story/${id}`,
        images: images.length ? images : undefined,
      },
      twitter: {
        card: images.length ? "summary_large_image" : "summary",
        title: story.title,
        description: excerpt,
        images: images.length ? [images[0].url] : undefined,
      },
      robots: isPublished
        ? { index: true, follow: true }
        : { index: false, follow: false, noimageindex: true },
    };
  } catch {
    return {
      title: "Fairy Tale | Fairy Tale Platform",
      description: "Read this enchanting fairy tale on our platform.",
      robots: { index: false, follow: false },
    };
  }
}

export default async function StoryPage({ params }: any) {
  const { id } = await Promise.resolve(params);

  const baseUrl = "https://fairytail-platform.web.app";
  const url = `${baseUrl}/story/${id}`;

  let story: any = null;
  try {
    story = await fetchStoryById(id);
  } catch {
    story = null;
  }

  const images: string[] = [];
  if (story?.story_image_url) images.push(story.story_image_url);
  if (Array.isArray(story?.image_urls)) images.push(...story.image_urls);

  const sourceText =
    story?.description && story.description.trim().length > 0
      ? story.description
      : story?.content || "";
  const cleanText = sourceText.replace(/\s+/g, " ").trim();
  const excerpt = cleanText.slice(0, 160) + (cleanText.length > 160 ? "..." : "");

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: story?.title || "Fairy Tale Story",
    description: story?.description || excerpt || "An enchanting fairy tale from our collection",
    author: story?.author ? { "@type": "Person", name: story.author } : undefined,
    publisher: {
      "@type": "Organization",
      name: "Fairy Tale Platform",
      logo: {
        "@type": "ImageObject",
        url: `${baseUrl}/logo.png`,
      },
    },
    datePublished: story?.published_at ? new Date(story.published_at).toISOString() : undefined,
    dateModified: story?.updated_at ? new Date(story.updated_at).toISOString() : undefined,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    image: images.length ? images : undefined,
    keywords: story?.tags?.join(", "),
    inLanguage: "cs-CZ",
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Hero title="Pohádka" subtitle="Čtěte kouzelný příběh" height="sm" />
      <StoryPageClient id={id} />
    </>
  );
}