# ADR 0042 — Durable tool decisions in core 1.x

- **Status**: Proposed (implementation authorized; evidence review remains external)
- **Date**: 2026-10-06

## Context

Legacy controller approvals use generation-local identity and cannot resume a confirmation in another controller. Distributed callers need an atomic storage boundary rather than a process-local mutex.

## Decision

Add `ChatController.decide(toolCallId, decision, reason?)` and `ChatConfig.decisionStore`. Preserve and deprecate generation-local `approve` and `deny`. This is an additive minor release. Add `ContentPart[]` to controller `send`, retaining string input and its empty-input behavior.

The conversation-scoped store creates immutable pending records containing a serializable message snapshot, atomically transitions pending to claimed with its decision, and stores a terminal tool outcome. Claim returns the authoritative snapshot only to its winner. A database implementation can use `UPDATE ... WHERE status = 'pending' RETURNING ...`; creation must be insert-if-absent. Reads and writes must be durable and linearizable per tool call. Store access is an application-authorized conversation boundary, not an authorization token supplied by an untrusted client.

The winner restores the snapshot, revalidates and reauthorizes execution through the existing tool pipeline, saves the terminal outcome before model continuation, and never automatically reclaims a claimed or failed record. Same-decision terminal replay returns the recorded tool outcome without invoking tool or model. Unknown IDs and competing decisions raise typed errors; an in-flight duplicate raises a conflict. Pending snapshots are persisted before proposal completion when the store is configured.

## Consequences

Core adds no database implementation or runtime dependency. HTTP schema, identity mapping, stream transport, and provider-specific persistence are integration responsibilities. A crash after claim can leave an indeterminate claimed record; exactly-once admission does not promise transactional domain writes or automatic crash recovery. Applications must reconcile such records without automatically rerunning side effects. Concurrent different calls in one conversation require application-level conversation serialization to avoid lost transcript updates. Legacy methods must not be mixed with durable decisions for the same call.

Implementation is lazy-loaded to preserve the root import budget. Tests use independently specified synthetic stores and snapshots, without private consumer details.
