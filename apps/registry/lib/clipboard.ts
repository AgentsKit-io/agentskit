export interface ClipboardAdapter {
  writeText?: (text: string) => Promise<void>
  fallbackCopy: (text: string) => boolean
}

function browserAdapter(): ClipboardAdapter {
  return {
    writeText: navigator.clipboard?.writeText.bind(navigator.clipboard),
    fallbackCopy(text) {
      const textarea = document.createElement('textarea')
      textarea.value = text
      document.body.appendChild(textarea)
      try {
        textarea.select()
        return document.execCommand('copy')
      } finally {
        textarea.remove()
      }
    },
  }
}

export async function copyText(text: string, adapter?: ClipboardAdapter): Promise<boolean> {
  const target = adapter ?? browserAdapter()
  if (target.writeText) {
    try {
      await target.writeText(text)
      return true
    } catch {
      // Fall through to the legacy copy path.
    }
  }
  try {
    return target.fallbackCopy(text)
  } catch {
    return false
  }
}
