---
sidebar_position: 1
---

# Components Overview

React Arrow ships headless components that render semantic HTML with `data-ra-*` attributes. Import the default theme for instant styling, or target the attributes with your own CSS.

## Available Components

| Component | Purpose |
|-----------|---------|
| `ChatContainer` | Scrollable chat layout with auto-scroll |
| `Message` | Chat bubble with streaming support |
| `Markdown` | Text/markdown renderer |
| `CodeBlock` | Syntax-highlighted code with copy button |
| `ToolCallView` | Expandable tool invocation display |
| `ThinkingIndicator` | Animated thinking/loading state |
| `InputBar` | Text input with send button |

## Headless Philosophy

Components render minimal HTML with `data-ra-*` attributes:

```html
<div data-ra-message data-ra-role="user" data-ra-status="complete">
  <div data-ra-content>Hello!</div>
</div>
```

Style with attribute selectors:

```css
[data-ra-role="user"] [data-ra-content] {
  background: blue;
  color: white;
}
```

Or import the default theme:

```tsx
import 'react-arrow/theme'
```
