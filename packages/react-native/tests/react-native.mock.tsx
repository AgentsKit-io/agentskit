import React, { forwardRef, type ReactNode } from 'react'

/**
 * Lightweight `react-native` mock for vitest + happy-dom.
 *
 * RN's `View`/`Text`/`TextInput`/`ScrollView`/`Pressable` don't render under
 * jsdom/happy-dom. This aliases them to host elements so
 * `@testing-library/react` can render and query the headless components:
 *   View       -> div
 *   Text       -> span
 *   TextInput  -> input
 *   ScrollView -> div (with a scrollToEnd stub on the ref)
 *   Pressable  -> button
 *
 * It forwards the props the components use: `testID` -> `data-testid`,
 * `onPress` -> `onClick`, `onChangeText`/`onSubmitEditing` -> input handlers,
 * `children`, and `style`.
 */

interface BaseProps {
  testID?: string
  style?: unknown
  children?: ReactNode
  accessibilityLabel?: string
  accessibilityRole?: string
  accessibilityState?: Record<string, unknown>
  [key: string]: unknown
}

export const View = forwardRef<HTMLDivElement, BaseProps>(function View(props, ref) {
  const { testID, style, accessibilityLabel, children, accessibilityRole, accessibilityState, ...rest } = props
  return (
    <div ref={ref} data-testid={testID} aria-label={accessibilityLabel} style={style as React.CSSProperties | undefined} {...rest}>
      {children}
    </div>
  )
})

export const Text = forwardRef<HTMLSpanElement, BaseProps>(function Text(props, ref) {
  const { testID, style, accessibilityLabel, children, accessibilityRole, accessibilityState, ...rest } = props
  return (
    <span ref={ref} data-testid={testID} aria-label={accessibilityLabel} style={style as React.CSSProperties | undefined} {...rest}>
      {children}
    </span>
  )
})

interface TextInputProps extends BaseProps {
  value?: string
  placeholder?: string
  editable?: boolean
  onChangeText?: (text: string) => void
  onSubmitEditing?: () => void
}

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(function TextInput(props, ref) {
  const {
    testID,
    style,
    accessibilityLabel,
    value,
    placeholder,
    editable,
    onChangeText,
    onSubmitEditing,
    accessibilityRole,
    accessibilityState,
    ...rest
  } = props
  return (
    <input
      ref={ref}
      data-testid={testID}
      aria-label={accessibilityLabel}
      style={style as React.CSSProperties | undefined}
      value={value}
      placeholder={placeholder}
      disabled={editable === false}
      onChange={e => onChangeText?.((e.target as HTMLInputElement).value)}
      onKeyDown={e => {
        if (e.key === 'Enter') onSubmitEditing?.()
      }}
      {...rest}
    />
  )
})

export const ScrollView = forwardRef<HTMLDivElement, BaseProps>(function ScrollView(props, ref) {
  const {
    testID,
    style,
    accessibilityLabel,
    children,
    accessibilityRole,
    accessibilityState,
    onContentSizeChange,
    ...rest
  } = props as BaseProps & { onContentSizeChange?: () => void }
  // Stub scrollToEnd on the host node so component refs don't throw.
  const setRef = (node: HTMLDivElement | null) => {
    if (node) {
      ;(node as unknown as { scrollToEnd?: () => void }).scrollToEnd = () => {}
    }
    if (typeof ref === 'function') ref(node)
    else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node
  }
  return (
    <div ref={setRef} data-testid={testID} aria-label={accessibilityLabel} {...rest}>
      {children}
    </div>
  )
})

interface PressableProps extends BaseProps {
  onPress?: () => void
  disabled?: boolean
}

export const Pressable = forwardRef<HTMLButtonElement, PressableProps>(function Pressable(props, ref) {
  const {
    testID,
    style,
    accessibilityLabel,
    children,
    onPress,
    disabled,
    accessibilityRole,
    accessibilityState,
    ...rest
  } = props
  return (
    <button
      ref={ref}
      type="button"
      data-testid={testID}
      aria-label={accessibilityLabel}
      disabled={disabled}
      onClick={() => onPress?.()}
      {...rest}
    >
      {children}
    </button>
  )
})
