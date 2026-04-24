import { allBlogPosts, slugOf } from '@/lib/blog'

const SITE = 'https://www.agentskit.io'

export function GET() {
  const posts = allBlogPosts()
  const feed = {
    version: 'https://jsonfeed.org/version/1.1',
    title: 'AgentsKit.js blog',
    home_page_url: `${SITE}/blog`,
    feed_url: `${SITE}/blog/feed.json`,
    description: 'Releases, design notes, and deep dives from the AgentsKit.js team.',
    language: 'en',
    items: posts.map((p) => {
      const slug = slugOf(p)
      return {
        id: `${SITE}/blog/${slug}`,
        url: `${SITE}/blog/${slug}`,
        title: p.title,
        summary: p.description ?? '',
        date_published: `${p.date}T00:00:00Z`,
        authors: [{ name: p.author }],
        tags: p.tags,
      }
    }),
  }
  return Response.json(feed)
}
