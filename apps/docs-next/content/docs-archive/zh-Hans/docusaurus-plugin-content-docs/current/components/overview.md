---
sidebar_position: 1
---

# 组件概览

AgentsKit 提供无头组件，渲染带 `data-ak-*` 属性的语义化 HTML。导入默认主题即可快速获得样式，或用自有 CSS 针对这些属性。

## 可用组件

| 组件 | 用途 |
|-----------|---------|
| `ChatContainer` | 可滚动聊天布局，自动滚动 |
| `Message` | 支持流式的聊天气泡 |
| `Markdown` | 文本/Markdown 渲染 |
| `CodeBlock` | 带复制按钮的语法高亮代码 |
| `ToolCallView` | 可展开的工具调用展示 |
| `ThinkingIndicator` | 动画思考/加载状态 |
| `InputBar` | 带发送按钮的文本输入 |

## 无头理念

组件渲染最少 HTML 与 `data-ak-*` 属性：

```html
<div data-ak-message data-ak-role="user" data-ak-status="complete">
  <div data-ak-content>Hello!</div>
</div>
```

用属性选择器样式化：

```css
[data-ak-role="user"] [data-ak-content] {
  background: blue;
  color: white;
}
```

或导入默认主题：

```tsx
import '@agentskit/react/theme'
```
