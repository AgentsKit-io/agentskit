'use client'

import { useLayoutEffect } from 'react'

export function AccessibleSearch() {
  useLayoutEffect(() => {
    const labelInputs = () => {
      document.querySelectorAll<HTMLInputElement>('input[placeholder="Search"]:not([aria-label])').forEach((input) => {
        input.setAttribute('aria-label', 'Search documentation')
      })
    }

    labelInputs()
    const observer = new MutationObserver(labelInputs)
    observer.observe(document.body, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [])

  return null
}
