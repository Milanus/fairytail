import type { Metadata } from "next";
import { fetchStoryById } from "../../../lib/realtime";
import StoryPageClient from "./Client";

export async function generateMetadata({ params }: any): Promise<Metadata> {
  const { id } = await Promise.resolve(params);
  try {
    const story = await fetchStoryById(id);

    if (!story) {
      return {
        title: "Story Not Found | Fairy Tale Platform",
        description: "The requested fairy tale could not be found.",
      };
    }

    const excerpt = story.content.substring(0, 160) + "...";

    return {
      title: `${story.title} | Fairy Tale Platform`,
      description: excerpt,
      keywords: story.tags?.join(", ") || "fairy tale, story",
      authors: [{ name: story.author }],
      openGraph: {
        title: story.title,
        description: excerpt,
        type: 'article',
        authors: [story.author],
        tags: story.tags,
        publishedTime: story.published_at ? new Date(story.published_at).toISOString() : undefined,
        modifiedTime: story.updated_at ? new Date(story.updated_at).toISOString() : undefined,
      },
      twitter: {
        card: 'summary',
        title: story.title,
        description: excerpt,
      },
      alternates: {
        canonical: `/story/${id}`,
      },
    };
  } catch (error) {
    console.error("Error generating metadata:", error);
    return {
      title: "Fairy Tale | Fairy Tale Platform",
      description: "Read this enchanting fairy tale on our platform.",
    };
  }
}

export default async function StoryPage({ params }: any) {
  const { id } = await Promise.resolve(params);
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            "headline": "Fairy Tale Story",
            "description": "An enchanting fairy tale from our collection",
            "author": {
              "@type": "Person",
              "name": "Fairy Tale Author"
            },
            "publisher": {
              "@type": "Organization",
              "name": "Fairy Tale Platform",
              "logo": {
                "@type": "ImageObject",
                "url": "https://fairytail-platform.web.app/logo.png"
              }
            },
            "datePublished": new Date().toISOString(),
            "mainEntityOfPage": {
              "@type": "WebPage",
              "@id": `https://fairytail-platform.web.app/story/${id}`
            }
          })
        }}
      />
      <StoryPageClient id={id} />
    </>
  );
}