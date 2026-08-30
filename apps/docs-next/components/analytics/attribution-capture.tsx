'use client'

import { useEffect } from 'react'
import { captureAttribution } from '@/lib/analytics-client'

export function AttributionCapture() {
  useEffect(() => {
    captureAttribution()
  }, [])

  return null
}
