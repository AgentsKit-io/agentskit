/**
 * Personalization — a persisted profile per subject (user id,
 * account id, device). The agent reads it on every run to
 * condition responses; the runtime updates it when new facts
 * appear.
 */

export interface PersonalizationProfile {
  subjectId: string
  /** Human-editable notes, facts, preferences. */
  traits: Record<string, unknown>
  /** ISO timestamp of the latest update. */
  updatedAt: string
}

export interface PersonalizationStore {
  get: (subjectId: string) => Promise<PersonalizationProfile | null>
  set: (profile: PersonalizationProfile) => Promise<void>
  merge: (subjectId: string, traits: Record<string, unknown>) => Promise<PersonalizationProfile>
  delete?: (subjectId: string) => Promise<void>
}

/**
 * In-memory personalization store — tests, single-process demos.
 * Bring your own for production (Postgres, Redis, DynamoDB).
 */
export function createInMemoryPersonalization(): PersonalizationStore {
  const profiles = new Map<string, PersonalizationProfile>()

  return {
    async get(subjectId) {
      const hit = profiles.get(subjectId)
      return hit ? { ...hit, traits: { ...hit.traits } } : null
    },
    async set(profile) {
      profiles.set(profile.subjectId, {
        ...profile,
        traits: { ...profile.traits },
        updatedAt: profile.updatedAt || new Date().toISOString(),
      })
    },
    async merge(subjectId, traits) {
      const existing = profiles.get(subjectId)
      const next: PersonalizationProfile = {
        subjectId,
        traits: { ...(existing?.traits ?? {}), ...traits },
        updatedAt: new Date().toISOString(),
      }
      profiles.set(subjectId, next)
      return { ...next, traits: { ...next.traits } }
    },
    async delete(subjectId) {
      profiles.delete(subjectId)
    },
  }
}

/**
 * Render a profile into a system-prompt fragment the runtime can
 * prepend. Kept intentionally short — full profile dumps bloat
 * context and leak unnecessary detail to the model.
 */
export function renderProfileContext(profile: PersonalizationProfile | null): string {
  if (!profile || Object.keys(profile.traits).length === 0) return ''
  const lines = Object.entries(profile.traits)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `- ${key}: ${typeof value === 'string' ? value : JSON.stringify(value)}`)
  if (lines.length === 0) return ''
  return `## User profile\n${lines.join('\n')}`
}
