'use client'

import { useEffect } from 'react'

/** Mounted once: copy-to-clipboard delegation + "Copied!" toast + scroll reveal. */
export function LandingFx() {
  useEffect(() => {
    let toast: HTMLDivElement | null = null
    let timer: number | undefined
    const showToast = () => {
      if (!toast) {
        toast = document.createElement('div')
        toast.className = 'rg-toast'
        toast.setAttribute('role', 'status')
        toast.innerHTML =
          '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color:var(--ak-green)"><polyline points="20 6 9 17 4 12"/></svg><span>Copied!</span>'
        document.body.appendChild(toast)
      }
      toast.classList.add('show')
      window.clearTimeout(timer)
      timer = window.setTimeout(() => toast?.classList.remove('show'), 1800)
    }

    const onClick = async (e: MouseEvent) => {
      const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-copy]')
      if (!btn) return
      const value = btn.getAttribute('data-copy') ?? ''
      try {
        await navigator.clipboard.writeText(value)
      } catch {
        const ta = document.createElement('textarea')
        ta.value = value
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        ta.remove()
      }
      btn.classList.add('rg-copied')
      showToast()
      window.setTimeout(() => btn.classList.remove('rg-copied'), 1600)
    }
    document.addEventListener('click', onClick)

    const els = document.querySelectorAll('.rg-reveal')
    let io: IntersectionObserver | undefined
    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver(
        (entries) => {
          for (const en of entries) {
            if (en.isIntersecting) {
              en.target.classList.add('in')
              io!.unobserve(en.target)
            }
          }
        },
        { rootMargin: '0px 0px -10% 0px' },
      )
      els.forEach((el) => io!.observe(el))
    } else {
      els.forEach((el) => el.classList.add('in'))
    }

    return () => {
      document.removeEventListener('click', onClick)
      io?.disconnect()
      toast?.remove()
      window.clearTimeout(timer)
    }
  }, [])

  return null
}
