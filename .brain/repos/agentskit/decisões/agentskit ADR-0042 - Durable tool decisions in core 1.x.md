---
tipo: adr
repo: agentskit
camada: framework
visibilidade: publico
status: proposto
verificado-em: 2026-10-16
commits: { agentskit: 9b31c771 }
metodo: "leitura integral da decisão fonte"
fontes: ["docs/architecture/adrs/0042-durable-tool-decisions.md"]
tags: [adr, repo/agentskit, camada/framework]
---

# agentskit ADR-0042 - Durable tool decisions in core 1.x

> [!tldr] Em linguagem comum
> Durable tool decisions in core 1.x.

← [[00 Decisões - agentskit]]

## Status e datas

- **Status**: Proposed (implementation authorized; evidence review remains external); - **Date**: 2026-10-06.

## Decisão em linguagem comum

Add `ChatController.decide(toolCallId, decision, reason?)` and `ChatConfig.decisionStore`. Deprecate `approve` and `deny`; with a decision store they delegate to `decide`, sharing atomic claims and typed errors, and without a store they retain generation-local behavior. Existing callers remain compatible, but structural implementations of `ChatController` must implement the required `decide` member. Add `ContentPart[]` to controller and shared `ChatReturn` `send`, retaining string input and its empty-input behavior.

The conversation-scoped store creates immutable pending records containing a serializable message snapshot, atomically transitions pending to claimed with its decision, and stores a terminal tool outcome. Claim returns the authoritative snapshot only to its winner. A database implementation can use `UPDATE ... WHERE status = 'pending' RETURNING ...`; creation must be insert-if-absent. Reads and writes must be durable and linearizable per tool call. Store access is an application-authorized conversation boundary, not an authorization token supplied by an untrusted client.

Before claiming, the controller loads and validates the current conversation: live state takes precedence over configured chat memory, and the pending snapshot is used only when no current conversation is available. Loading and sibling reconciliation operate on cloned messages so existing subscriber snapshots remain immutable. After claim, it rechecks the live target before merging only reconciled terminal sibling outcomes by message and call ID into the latest live state, preserving chunks, new confirmations and turns received during storage awaits. It rechecks that the target remains pending before execution; a removed or changed target terminally settles the claim as failed without executing or resuming the model. A rejected decision leaves any active stream untouched. It patches the target call while preserving later turns, revalidates and reauthorizes execution through the existing tool pipeline, saves the terminal outcome before model continuation (only from the latest completed assistant when all calls are decided, with tool results inserted immediately after their originating message in call order), and never automatically reclaims a claimed or failed record. Same-decision terminal replay returns the recorded tool outcome without invoking tool or model. Unknown IDs and competing decisions raise typed errors; an identical in-flight duplicate returns the original call without execution. Pending snapshots are persisted on streamed call arrival before callbacks, and before proposal completion when the store is configured. Their immutable arrival snapshots may omit later streamed calls, so reconstruction after restart requires current ChatMemory; an incomplete streaming fallback snapshot fails before claim with AK_CONFIG_INVALID.

## Contexto

Legacy controller approvals use generation-local identity and cannot resume a confirmation in another controller. Distributed callers need an atomic storage boundary rather than a process-local mutex.

## Consequências

Core adds no database implementation or runtime dependency. HTTP schema, identity mapping, stream transport, and provider-specific persistence are integration responsibilities. A crash after claim can leave an indeterminate claimed record; exactly-once admission does not promise transactional domain writes or automatic crash recovery. Applications must reconcile such records without automatically rerunning side effects. Concurrent different calls in one conversation require application-level conversation serialization to avoid lost transcript updates. Store-backed legacy approvals and denials use the same claim boundary as durable decisions.

Implementation is lazy-loaded to preserve the root import budget. Tests use independently specified synthetic stores and snapshots, without private consumer details.

## Pacotes afetados

Consulte a fonte integral `docs/architecture/adrs/0042-durable-tool-decisions.md` para a lista de módulos abrangidos; só associe pacotes explicitamente mencionados no documento.

## Substitui / substituído por

—

## Fonte

`docs/architecture/adrs/0042-durable-tool-decisions.md:1`
