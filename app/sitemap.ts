import { MetadataRoute } from 'next'
import { fetchStoriesOnce } from '../lib/realtime'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://fairytail-platform.web.app'

  // Get all published stories
  const stories = await fetchStoriesOnce('published')

  // Static pages
  const staticPages = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 1,
    },
    {
      url: `${baseUrl}/browse`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.9,
    },
  ]

  // Dynamic story pages
  const storyPages = stories.map((story) => ({
    url: `${baseUrl}/story/${story.id}`,
    lastModified: story.updated_at ? new Date(story.updated_at) : new Date(story.created_at),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }))

  return [...staticPages, ...storyPages]
}