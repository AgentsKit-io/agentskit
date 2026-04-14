# Origin — Why AgentsKit Exists

> *Personal note from the author. This document is intentionally first-person and unpolished. It is the story of a frustration that became a library.*
>
> *To the maintainer reading this before merge: replace the placeholders in square brackets with your real experience, or rewrite freely. The goal is authenticity — not a perfect pitch.*

---

## The frustration

In [MONTH / YEAR], I was trying to build a simple thing: an AI chat interface with streaming, a couple of tools, and persistent memory. Not an agent that cures cancer — just a chat that remembers yesterday's conversation and can call a function.

I went shopping in the JavaScript ecosystem.

**Vercel AI SDK** got me 80% of the way in an hour. Streaming — excellent. Tool calling — clean. Then I wanted an autonomous loop, multi-agent delegation, a runtime that survives a crash. Nothing. Vercel AI SDK is a beautiful *chat SDK*. It is not an *agent framework*, and it never pretended to be.

**LangChain.js** had all the abstractions I wanted. It also had 200MB of dependencies, leaked abstractions at every layer, and every example on the internet was outdated within six weeks. I spent two days debugging a `RunnableSequence` and writing no product.

**assistant-ui** had beautiful components. I counted 53 before I gave up trying to figure out which one I needed.

**Mastra** was promising and new — exactly my problem. I loved the direction but the pieces I wanted most weren't there yet.

**MCP** solved tool interop brilliantly. It solved nothing else. You still had to write the UI, the runtime, the memory, the streaming.

So my weekend project became: *paste LangChain code into Claude, remove half of it, add bits of Vercel AI SDK, wire up a homebrew ReAct loop, glue a Pinecone client onto the side.* Three days in, I had something that worked. Four days in, I couldn't debug it. Five days in, I deleted it all.

## The observation

The JavaScript ecosystem has given us a beautiful pattern, over and over again: a small, opinionated core with a radically composable ecosystem around it. React. Express. Vite. Fastify. Drizzle. Hono.

The agent space has not yet found its React. It has a monolith (LangChain), a narrow product (Vercel AI SDK), component libraries without runtimes, runtimes without UI, and a protocol (MCP) with no opinion about the application layer.

The observation is simple: **we don't need another framework. We need a kit** — a family of small, well-contracted packages where every piece works alone and every combination works together.

## The bet

AgentsKit is a bet on three claims:

1. **JavaScript will be the language of agent applications**, because it's where the users are, where the deployment is cheap, and where the ecosystem is most plug-and-play.
2. **Agents don't need a framework; they need contracts.** A `Tool` is a function. A `Memory` is a store. A `Runtime` is a loop. Formalize the contracts, keep the packages small, let users assemble.
3. **Plug-and-play beats opinionated all-in-one.** If you outgrow any package, swap it. If you don't need one, don't install it. The core is 10KB and stays that way.

## The promise

AgentsKit will never become the thing I was frustrated with. It will stay small. It will stay composable. It will stay honest — about what it does and what it doesn't. It will tell you when you should use something else.

If AgentsKit ever starts feeling like LangChain — bloated, magical, hard to debug — we failed. If it ever stops feeling like plain JavaScript you already know — we failed. The manifesto is how we hold ourselves accountable.

## The invitation

If you've felt the frustration above, this is for you. If you've built agents in JavaScript and thought "there has to be a better way" — this is that way, or at least our attempt at it.

Open an issue. Open an RFC. Build a package. Break our assumptions. Make us better.

This is day one.

— [Author name], [Date]
