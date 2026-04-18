---
sidebar_position: 1
---

# Theming

AgentsKit 组件默认可无样式。导入可选主题即可获得精致的聊天 UI。

## 默认主题

```tsx
import '@agentskit/react/theme'
```

通过 `prefers-color-scheme` 或 `data-theme` 属性支持浅色与深色模式。

## CSS 自定义属性

覆盖任意令牌以自定义主题：

```css
:root {
  --ak-color-bubble-user: #10b981;
  --ak-color-button: #10b981;
  --ak-radius: 16px;
  --ak-font-family: 'Inter', sans-serif;
}
```

### 可用令牌

| 令牌 | 默认（浅色） | 说明 |
|-------|-----------------|-------------|
| `--ak-color-bg` | `#ffffff` | 页面背景 |
| `--ak-color-surface` | `#f9fafb` | 表面/卡片背景 |
| `--ak-color-border` | `#e5e7eb` | 边框颜色 |
| `--ak-color-text` | `#111827` | 主文本 |
| `--ak-color-text-muted` | `#6b7280` | 次要文本 |
| `--ak-color-bubble-user` | `#2563eb` | 用户消息气泡 |
| `--ak-color-bubble-assistant` | `#f3f4f6` | 助手消息气泡 |
| `--ak-color-button` | `#2563eb` | 按钮背景 |
| `--ak-font-family` | 系统字体栈 | 字体族 |
| `--ak-font-size` | `14px` | 基础字号 |
| `--ak-radius` | `8px` | 圆角 |
| `--ak-spacing-*` | `4-24px` | 间距刻度（xs、sm、md、lg、xl） |

## 深色模式

通过 `prefers-color-scheme` 自动，或强制：

```html
<div data-theme="dark">
  <ChatContainer>...</ChatContainer>
</div>
```

## 完全自定义样式

跳过主题，使用 `data-ak-*` 属性选择器样式化：

```css
[data-ak-chat-container] { /* your styles */ }
[data-ak-role="user"] [data-ak-content] { /* user bubble */ }
[data-ak-role="assistant"] [data-ak-content] { /* assistant bubble */ }
```
