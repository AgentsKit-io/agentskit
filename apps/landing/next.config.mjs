/** @type {import('next').NextConfig} */
const nextConfig = {
  // Vercel manages its own output. Set NEXT_OUTPUT_STANDALONE=1 in
  // self-hosted environments (Cloudflare Pages, Node, Docker) to
  // produce a standalone server bundle instead.
  ...(process.env.NEXT_OUTPUT_STANDALONE ? { output: 'standalone' } : {}),
}

export default nextConfig
