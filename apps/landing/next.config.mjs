/** @type {import('next').NextConfig} */
const nextConfig = {
  // Set NEXT_OUTPUT_STANDALONE=1 in self-hosted environments
  // (Cloudflare Pages, Node, Docker) to produce a standalone server bundle.
  ...(process.env.NEXT_OUTPUT_STANDALONE ? { output: 'standalone' } : {}),
}

export default nextConfig
