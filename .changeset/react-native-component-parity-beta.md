---
"@agentskit/react-native": minor
---

Add full headless component parity with `@agentskit/react`. `@agentskit/react-native` now ships the same 8 headless components — `ChatContainer`, `Message`, `InputBar`, `Markdown`, `CodeBlock`, `ToolCallView`, `ThinkingIndicator`, `ToolConfirmation` — rendered with React Native primitives (`View`, `Text`, `TextInput`, `ScrollView`, `Pressable`). Since RN has no DOM, the web binding's `data-ak-*` headless contract is mirrored via stable `testID`s (`ak-message`, `ak-input`, …) with role/status conveyed through `accessibilityLabel`. `react-native` remains a peer/external (never bundled). Stability promoted alpha → beta.
