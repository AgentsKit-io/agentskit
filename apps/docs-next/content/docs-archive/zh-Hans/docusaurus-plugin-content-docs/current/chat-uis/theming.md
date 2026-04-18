---
sidebar_position: 3
---

# Theming

`@agentskit/react` 附带默认主题为 CSS 文件。每个元素使用 `data-ak-*` 作为选择器、CSS 自定义属性作为设计令牌——无类名、无特异性战争。

## 启用默认主题

```tsx
import '@agentskit/react/theme'
```

一次导入即可为所有 `data-ak-*` 元素添加样式。主题内置暗色模式，通过 `prefers-color-scheme` 自动启用。

## 强制深色或浅色模式

```html
<!-- force dark -->
<html data-theme="dark">

<!-- force light -->
<html data-theme="light">
```

或在任意祖先元素上添加 `.dark` 类。

## CSS 变量

通过重新赋值自定义属性覆盖任意令牌。所有令牌在 `:root` 上定义。

### 颜色

```css
:root {
  --ak-color-bg: #ffffff;
  --ak-color-surface: #f9fafb;
  --ak-color-border: #e5e7eb;
  --ak-color-text: #111827;
  --ak-color-text-muted: #6b7280;

  /* Message bubbles */
  --ak-color-bubble-user: #2563eb;
  --ak-color-bubble-user-text: #ffffff;
  --ak-color-bubble-assistant: #f3f4f6;
  --ak-color-bubble-assistant-text: #111827;

  /* Input */
  --ak-color-input-bg: #ffffff;
  --ak-color-input-border: #d1d5db;
  --ak-color-input-focus: #2563eb;

  /* Send button */
  --ak-color-button: #2563eb;
  --ak-color-button-text: #ffffff;

  /* Code blocks */
  --ak-color-code-bg: #1f2937;
  --ak-color-code-text: #e5e7eb;

  /* Tool calls */
  --ak-color-tool-bg: #fef3c7;
  --ak-color-tool-border: #f59e0b;
}
```

### 排版与间距

```css
:root {
  --ak-font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --ak-font-size: 14px;
  --ak-font-size-sm: 12px;
  --ak-font-size-lg: 16px;
  --ak-line-height: 1.5;

  --ak-radius: 8px;
  --ak-radius-lg: 12px;

  --ak-spacing-xs: 4px;
  --ak-spacing-sm: 8px;
  --ak-spacing-md: 12px;
  --ak-spacing-lg: 16px;
  --ak-spacing-xl: 24px;

  --ak-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  --ak-transition: 150ms ease;
}
```

## 示例：自定义品牌主题

```css
/* my-theme.css */
:root {
  --ak-color-bubble-user: #7c3aed;
  --ak-color-bubble-user-text: #ffffff;
  --ak-color-input-focus: #7c3aed;
  --ak-color-button: #7c3aed;
  --ak-font-family: 'Inter', sans-serif;
  --ak-radius: 4px;
  --ak-radius-lg: 8px;
}
```

```tsx
import '@agentskit/react/theme'   // base tokens
import './my-theme.css'           // overrides
```

## 使用 `data-ak-*` 选择器定位元素

所有组件发出稳定的 `data-ak-*` 属性。可直接在 CSS 中用于结构覆盖：

```css
/* Wider assistant bubbles */
[data-ak-role="assistant"] {
  max-width: 90%;
}

/* Highlighted streaming message */
[data-ak-status="streaming"] [data-ak-content] {
  border-left: 3px solid var(--ak-color-button);
  padding-left: 12px;
}

/* Hide the copy button on mobile */
@media (max-width: 640px) {
  [data-ak-copy] {
    display: none;
  }
}
```

## 从零构建自定义主题

可完全跳过默认导入，自行样式化 `data-ak-*` 属性：

```tsx
// No '@agentskit/react/theme' import
import { useChat, ChatContainer, Message, InputBar } from '@agentskit/react'
import './my-custom-theme.css'
```

```css
/* my-custom-theme.css — minimal example */
[data-ak-chat-container] {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow-y: auto;
}

[data-ak-message][data-ak-role="user"] {
  align-self: flex-end;
  background: #7c3aed;
  color: white;
  padding: 8px 12px;
  border-radius: 12px;
}

[data-ak-message][data-ak-role="assistant"] {
  align-self: flex-start;
  background: #f0f0f0;
  padding: 8px 12px;
  border-radius: 12px;
}

[data-ak-input-bar] {
  display: flex;
  gap: 8px;
  padding: 8px;
  border-top: 1px solid #e5e7eb;
}
```

## 相关

- [组件参考](./components.md)
- [@agentskit/react](./react.md)
