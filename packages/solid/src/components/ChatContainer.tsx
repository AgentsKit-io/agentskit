import { onMount, onCleanup, type JSX } from 'solid-js'

/** Props accepted by the reactive chat scroll container. */
export interface ChatContainerProps {
  children?: JSX.Element
  class?: string
}

/** Render a scroll container that follows newly added chat content.
 * @param props Container children and optional CSS class.
 * @returns The headless chat container element.
 */
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
