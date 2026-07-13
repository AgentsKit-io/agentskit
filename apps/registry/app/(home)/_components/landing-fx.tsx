'use client'

import { useEffect } from 'react'
import { trackRegistryEvent } from '@/lib/posthog-client'
import { copyText } from '@/lib/clipboard'

/** Mounted once: copy-to-clipboard delegation + "Copied!" toast + scroll reveal. */
export function LandingFx() {
  useEffect(() => {
    let toast: HTMLDivElement | null = null
    let timer: number | undefined
    const buttonTimers = new Map<HTMLButtonElement, number>()
    const showToast = (copied: boolean) => {
      if (!toast) {
        toast = document.createElement('div')
        toast.className = 'rg-toast'
        toast.setAttribute('role', 'status')
        toast.innerHTML = '<span>Copied!</span>'
        document.body.appendChild(toast)
      }
      const message = toast.querySelector('span')
      if (message) message.textContent = copied ? 'Copied!' : 'Copy failed'
      toast.classList.add('show')
      window.clearTimeout(timer)
      timer = window.setTimeout(() => toast?.classList.remove('show'), 1800)
    }

    const onClick = async (e: MouseEvent) => {
      const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-copy]')
      if (!btn) return
      const value = btn.getAttribute('data-copy') ?? ''
      const copied = await copyText(value)
      const agentId = btn.dataset.agentId
      const surface = btn.dataset.copySurface as 'catalog' | 'hero' | 'guide' | undefined
      if (copied && agentId && surface) {
        trackRegistryEvent('registry_install_command_copied', { agent_id: agentId, surface })
      }
      if (copied) {
        btn.classList.add('rg-copied')
        window.clearTimeout(buttonTimers.get(btn))
        buttonTimers.set(btn, window.setTimeout(() => {
          btn.classList.remove('rg-copied')
          buttonTimers.delete(btn)
        }, 1600))
      }
      showToast(copied)
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
      buttonTimers.forEach((buttonTimer) => window.clearTimeout(buttonTimer))
      buttonTimers.clear()
    }
  }, [])

  return null
}
