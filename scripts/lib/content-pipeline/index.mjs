import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  mineRecipes,
  preparePublish,
  runPipeline,
  verifyClaims,
  writeAtom,
} from './roles.mjs'

export * from './roles.mjs'

export function loadPipelineConfig(root, path = 'docs/ecosystem/content-pipeline/pipeline.json') {
  return JSON.parse(readFileSync(join(root, path), 'utf8'))
}

export function auditContentPipeline(root, { runExecutable = false } = {}) {
  const failures = []
  const configPath = 'docs/ecosystem/content-pipeline/pipeline.json'
  if (!existsSync(join(root, configPath))) {
    return { ok: false, failures: [`missing ${configPath}`] }
  }
  const config = loadPipelineConfig(root, configPath)
  if (config.protocol !== 'agentskit.ecosystem.content-pipeline') {
    failures.push('invalid pipeline protocol')
  }
  const requiredRoles = [
    'recipe-miner',
    'claim-verifier',
    'content-repurposer',
    'visual-storyboarder',
    'ecosystem-linker',
    'post-reviewer',
    'publisher',
  ]
  const roleIds = new Set((config.roles ?? []).map((role) => role.id))
  for (const roleId of requiredRoles) {
    if (!roleIds.has(roleId)) failures.push(`missing role ${roleId}`)
  }
  for (const role of config.roles ?? []) {
    if (role.registryAgentId && !role.registryUrl) {
      failures.push(`role ${role.id} maps to registry agent without registryUrl`)
    }
  }

  const recipes = mineRecipes(root, config.recipesDir)
  if (recipes.length === 0) failures.push('no recipes discovered')

  for (const recipe of recipes) {
    const claims = verifyClaims(root, recipe)
    if (!claims.ok) failures.push(`${recipe.id}: ${claims.failures.join('; ')}`)
  }

  // Ensure first-agent atom exists and is not auto-published
  try {
    const atom = runPipeline(root, 'first-agent', { runExecutable })
    if (atom.publish.status === 'published') {
      failures.push('publisher must never mark status published autonomously')
    }
    if (atom.publish.status === 'ready-for-human-publish' && atom.review.requiresHumanApproval) {
      // allowed only with approval file — preparePublish already enforces
    }
    if (!atom.variants?.docsPage || !atom.variants?.shortPost || !atom.variants?.thread) {
      failures.push('atom missing required variants')
    }
    if (!atom.storyboard) failures.push('atom missing storyboard')
    if (!atom.variants?.communityPost) failures.push('atom missing community post')
    if (!atom.variants?.example) failures.push('atom missing executable example link')

    // Publisher refusal without approval
    try {
      preparePublish(atom, { approved: false })
    } catch {
      failures.push('preparePublish should return blocked, not throw, for approved=false')
    }
    const blocked = preparePublish(atom, { approved: false })
    if (blocked.status !== 'blocked') failures.push('expected blocked publish without approval')

    let threw = false
    try {
      preparePublish(atom, { approved: true })
    } catch {
      threw = true
    }
    if (!threw) failures.push('preparePublish must require approvedBy/approvedOn')
  } catch (error) {
    failures.push(error instanceof Error ? error.message : String(error))
  }

  return { ok: failures.length === 0, failures, recipeCount: recipes.length }
}

export function generateAtom(root, recipeId, options) {
  const atom = runPipeline(root, recipeId, options)
  const dir = writeAtom(root, atom)
  return { atom, dir }
}
