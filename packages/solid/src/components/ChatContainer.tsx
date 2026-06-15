import { onMount, onCleanup, type JSX } from 'solid-js'

export interface ChatContainerProps {
  children?: JSX.Element
  class?: string
}

export function ChatContainer(props: ChatContainerProps): JSX.Element {
  let containerRef: HTMLDivElement | undefined

  onMount(() => {
    const el = containerRef
    if (!el) return

    const observer = new MutationObserver(() => {
      el.scrollTop = el.scrollHeight
    })

    observer.observe(el, { childList: true, subtree: true, characterData: true })
    onCleanup(() => observer.disconnect())
  })

  return (
    <div
      ref={(el) => (containerRef = el)}
      data-ak-chat-container=""
      data-testid="ak-chat-container"
      class={props.class}
    >
      {props.children}
    </div>
  )
}
