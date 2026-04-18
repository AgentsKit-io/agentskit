---
sidebar_position: 4
---

# 组件参考

`@agentskit/react` 与 `@agentskit/ink` 中全部无头组件。组件会发出 `data-ak-*` 属性（React）或使用 Ink 终端原语（Ink）——不包含任何视觉样式主张。

## React 组件

从 `@agentskit/react` 导入：

```tsx
import {
  ChatContainer,
  Message,
  InputBar,
  Markdown,
  CodeBlock,
  ToolCallView,
  ThinkingIndicator,
} from '@agentskit/react'
```

---

### `ChatContainer`

可滚动容器。挂载 `MutationObserver`，子节点变化时自动滚动到底部。

```tsx
<ChatContainer className="my-chat">
  {/* messages, indicators */}
</ChatContainer>
```

| 属性 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `children` | `ReactNode` | — | 必填。消息列表及其他内容。 |
| `className` | `string` | — | 额外 CSS 类。 |

发出：`data-ak-chat-container`

---

### `Message`

渲染 `chat.messages` 中的单条 `Message`。

```tsx
<Message
  message={msg}
  avatar={<img src={userAvatar} alt="User" />}
  actions={<button onClick={() => copy(msg.content)}>Copy</button>}
/>
```

| 属性 | 类型 | 说明 |
|---|---|---|
| `message` | `MessageType` | 必填。要渲染的消息。 |
| `avatar` | `ReactNode` | 气泡旁可选头像。 |
| `actions` | `ReactNode` | 内容下方可选操作行。 |

发出：`data-ak-message`、`data-ak-role`、`data-ak-status`、`data-ak-content`、`data-ak-avatar`、`data-ak-actions`

---

### `InputBar`

连接 `ChatReturn` 的文本区与发送按钮。`Enter` 发送，`Shift+Enter` 换行。

```tsx
<InputBar
  chat={chat}
  placeholder="Ask anything..."
  disabled={false}
/>
```

| 属性 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `chat` | `ChatReturn` | — | 必填。`useChat` 的返回值。 |
| `placeholder` | `string` | `'Type a message...'` | 文本区占位符。 |
| `disabled` | `boolean` | `false` | 禁用输入与按钮。 |

发出：`data-ak-input-bar`、`data-ak-input`、`data-ak-send`

---

### `Markdown`

Markdown 内容的轻量包装。可在内部加入自有渲染器（例如 `react-markdown`），或整体替换该组件。

```tsx
<Markdown content={msg.content} streaming={msg.status === 'streaming'} />
```

| 属性 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `content` | `string` | — | 必填。要显示的 Markdown 字符串。 |
| `streaming` | `boolean` | `false` | 流式时为 `data-ak-streaming="true"`。 |

发出：`data-ak-markdown`、`data-ak-streaming`

---

### `CodeBlock`

渲染代码片段，可选复制按钮。

```tsx
<CodeBlock code="npm install @agentskit/react" language="bash" copyable />
```

| 属性 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `code` | `string` | — | 必填。要显示的源码。 |
| `language` | `string` | — | 语言提示（如 `'tsx'`、`'bash'`）。 |
| `copyable` | `boolean` | `false` | 显示复制到剪贴板的按钮。 |

发出：`data-ak-code-block`、`data-ak-language`、`data-ak-copy`

---

### `ToolCallView`

单条工具调用的可展开视图。点击工具名可切换参数与结果的显示。

```tsx
{msg.toolCalls?.map(tc => (
  <ToolCallView key={tc.id} toolCall={tc} />
))}
```

| 属性 | 类型 | 说明 |
|---|---|---|
| `toolCall` | `ToolCall` | 必填。来自 `@agentskit/core` 的工具调用对象。 |

发出：`data-ak-tool-call`、`data-ak-tool-status`、`data-ak-tool-toggle`、`data-ak-tool-details`、`data-ak-tool-args`、`data-ak-tool-result`

---

### `ThinkingIndicator`

三点动画与标签。`visible` 为 `false` 时不渲染。

```tsx
<ThinkingIndicator visible={chat.status === 'streaming'} label="Thinking..." />
```

| 属性 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `visible` | `boolean` | — | 必填。显示或隐藏指示器。 |
| `label` | `string` | `'Thinking...'` | 点旁可访问的标签。 |

发出：`data-ak-thinking`、`data-ak-thinking-dots`、`data-ak-thinking-label`

---

## Ink 组件

从 `@agentskit/ink` 导入：

```tsx
import {
  ChatContainer,
  Message,
  InputBar,
  ToolCallView,
  ThinkingIndicator,
} from '@agentskit/ink'
```

---

### `ChatContainer`（Ink）

用 Ink 的 `<Box flexDirection="column" gap={1}>` 包裹子节点。

```tsx
<ChatContainer>
  {chat.messages.map(msg => <Message key={msg.id} message={msg} />)}
</ChatContainer>
```

| 属性 | 类型 | 说明 |
|---|---|---|
| `children` | `ReactNode` | 必填。 |

---

### `Message`（Ink）

按角色使用终端色显示角色标签，下方为消息内容。

```tsx
<Message message={msg} />
```

| 属性 | 类型 | 说明 |
|---|---|---|
| `message` | `MessageType` | 必填。 |

角色颜色：`assistant` → 青色，`user` → 绿色，`system` → 黄色，`tool` → 洋红。

---

### `InputBar`（Ink）

通过 Ink 的 `useInput` 捕获键盘。`Enter` 发送，`Backspace`/`Delete` 删除。流式输出时禁用。

```tsx
<InputBar chat={chat} placeholder="Type and press Enter..." />
```

| 属性 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `chat` | `ChatReturn` | — | 必填。 |
| `placeholder` | `string` | `'Type a message...'` | 显示在输入行上方。 |
| `disabled` | `boolean` | `false` | 禁止输入。 |

---

### `ToolCallView`（Ink）

圆角边框框住工具名、状态，以及可选的参数与结果。

```tsx
<ToolCallView toolCall={tc} expanded />
```

| 属性 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `toolCall` | `ToolCall` | — | 必填。 |
| `expanded` | `boolean` | `false` | 内联显示参数与结果。 |

---

### `ThinkingIndicator`（Ink）

单行黄色文本。`visible` 为 `false` 时不渲染。

```tsx
<ThinkingIndicator visible={chat.status === 'streaming'} label="Thinking..." />
```

| 属性 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `visible` | `boolean` | — | 必填。 |
| `label` | `string` | `'Thinking...'` | 显示的文本。 |

---

## 组件可用性

| 组件 | `@agentskit/react` | `@agentskit/ink` |
|---|---|---|
| `ChatContainer` | 是 | 是 |
| `Message` | 是 | 是 |
| `InputBar` | 是 | 是 |
| `ToolCallView` | 是 | 是 |
| `ThinkingIndicator` | 是 | 是 |
| `Markdown` | 是 | 否 |
| `CodeBlock` | 是 | 否 |

## 相关

- [@agentskit/react](./react.md)
- [@agentskit/ink](./ink.md)
- [Theming](./theming.md)
