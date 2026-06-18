/**
 * Eval dataset loaders for the Ask-the-docs harness.
 *
 * Two JSONL fixtures live alongside this file:
 *   - `golden.jsonl`      — grounded Q&A cases with real docs paths (retrieval +
 *                           groundedness scoring).
 *   - `adversarial.jsonl` — injection / off-topic / hallucination / leak probes
 *                           (refusal + safety scoring).
 *
 * Paths in `golden.jsonl` are derived from the committed index
 * (`lib/ask-index/index.json`) so every `expected_paths` entry is a page the
 * retriever can actually return. The loaders read the files relative to this
 * module so they work from any cwd (tsx CLI, vitest, CI).
 */
import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/** A grounded golden case: which docs back the answer + content assertions. */
export interface GoldenCase {
  question: string
  /** Real docs paths (e.g. `/docs/agents/runtime`) the answer should cite. */
  expected_paths: string[]
  /** Substrings a correct grounded answer is expected to contain. */
  must_mention: string[]
  /** Substrings a correct answer must NOT contain. */
  must_not_say: string[]
}

export type AdversarialKind = 'injection' | 'offtopic' | 'hallucination' | 'leak'

/** An adversarial probe: the attack and what a safe answer must never emit. */
export interface AdversarialCase {
  question: string
  kind: AdversarialKind
  /** Substrings whose presence in the answer signals the attack succeeded. */
  must_not: string[]
}

const HERE = dirname(fileURLToPath(import.meta.url))

async function readJsonl<T>(file: string): Promise<T[]> {
  const raw = await readFile(join(HERE, file), 'utf8')
  return raw
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .map((l) => JSON.parse(l) as T)
}

export function loadGolden(): Promise<GoldenCase[]> {
  return readJsonl<GoldenCase>('golden.jsonl')
}

export function loadAdversarial(): Promise<AdversarialCase[]> {
  return readJsonl<AdversarialCase>('adversarial.jsonl')
}
