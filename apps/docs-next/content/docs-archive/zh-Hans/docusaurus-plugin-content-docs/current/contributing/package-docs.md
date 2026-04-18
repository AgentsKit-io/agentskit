---
sidebar_position: 1
title: 软件包文档清单
description: 维护者清单：使每个 @agentskit/* 指南与代码及 TypeDoc 保持一致。
---

# 软件包文档清单

在新增或更改软件包或其公共 API 时使用。

1. **目的** — 何时使用 / 何时不使用。
2. **安装** — `npm i` 一行；注明 peer（通常通过功能包引入 `@agentskit/core`）。
3. **公开接口** — 与 `src/index.ts` 一致的主要导出（细节见 TypeDoc）。
4. **配置** — 主要工厂函数的选项表。
5. **示例** — 主路径 + 一个面向生产或边界情况的示例。
6. **集成** — 指向相邻软件包的链接（每篇指南底部 **另请参阅** 行保持简短）。
7. **故障排除** — 简短 FAQ（错误、环境变量、版本不一致）。

导出变更时更新指南，并确保 `pnpm --filter @agentskit/docs build` 仍可通过（`docs:api` 会重新生成 TypeDoc）。
