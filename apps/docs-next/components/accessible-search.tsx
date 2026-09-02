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
    observer.observe(document.documentElement, { childList: true, subtree: true })
    document.addEventListener('focusin', labelInputs, true)
    return () => {
      observer.disconnect()
      document.removeEventListener('focusin', labelInputs, true)
    }
  }, [])

  return null
}
