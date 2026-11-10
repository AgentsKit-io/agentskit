import type { Metadata } from 'next'
import { DownloadsDashboard } from './downloads-dashboard'

export const metadata: Metadata = {
  title: 'npm downloads',
  description: 'Public npm download statistics for the 36 @agentskit packages.',
  robots: { index: false, follow: false },
}

export default function DownloadsPage() {
  return <DownloadsDashboard />
}
