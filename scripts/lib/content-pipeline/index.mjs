import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
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

function loadApproval(root, recipeId) {
  const path = join(root, 'docs/ecosystem/content-pipeline/atoms', recipeId, 'APPROVAL.json')
  return existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : { approved: false, requiredGates: {} }
}

export function evaluateRequiredGates(root, config, recipeId, { runCommands = true } = {}) {
  const approval = loadApproval(root, recipeId)
  return (config.requiredGates ?? []).map((gate) => {
    if (gate.mode === 'command') {
      if (!runCommands) return { id: gate.id, ok: false, message: `${gate.id} command was not run`, evidence: [] }
      if (!Array.isArray(gate.command) || gate.command.length === 0) {
        return { id: gate.id, ok: false, message: `${gate.id} has no command argv`, evidence: [] }
      }
      const [bin, ...args] = gate.command
      const run = spawnSync(bin, args, { cwd: root, encoding: 'utf8', env: process.env, timeout: 120_000 })
      return run.status === 0
        ? { id: gate.id, ok: true, message: `${gate.id} command passed`, evidence: [gate.command.join(' ')] }
        : { id: gate.id, ok: false, message: `${gate.id} command failed: ${run.stderr || run.stdout || run.error?.message || 'unknown error'}`, evidence: [] }
    }
    if (gate.mode === 'human-attestation') {
      const attestation = approval.requiredGates?.[gate.id]
      const ok = attestation?.status === 'pass'
        && Array.isArray(attestation.evidence)
        && attestation.evidence.length > 0
        && attestation.evidence.every((item) => typeof item === 'string' && item.trim().length > 0)
      return {
        id: gate.id,
        ok,
        message: ok ? `${gate.id} human attestation recorded` : `${gate.id} requires human attestation with evidence`,
        evidence: ok ? attestation.evidence : [],
      }
    }
    return { id: gate.id, ok: false, message: `${gate.id} has unknown gate mode`, evidence: [] }
  })
}

export function auditContentPipeline(root, { runExecutable = true, runRequiredGates = true } = {}) {
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
  const gateIds = new Set()
  for (const gate of config.requiredGates ?? []) {
    if (!gate.id || gateIds.has(gate.id)) failures.push(`invalid or duplicate required gate ${gate.id ?? '<missing>'}`)
    gateIds.add(gate.id)
    if (!['command', 'human-attestation'].includes(gate.mode)) failures.push(`required gate ${gate.id} has invalid mode`)
  }
  if (gateIds.size === 0) failures.push('pipeline declares no required gates')

  const recipes = mineRecipes(root, config.recipesDir)
  if (recipes.length === 0) failures.push('no recipes discovered')

  for (const recipe of recipes) {
    const claims = verifyClaims(root, recipe)
    if (!claims.ok) failures.push(`${recipe.id}: ${claims.failures.join('; ')}`)
  }

  // Ensure first-agent atom exists and is not auto-published
  try {
    const gateResults = evaluateRequiredGates(root, config, 'first-agent', { runCommands: runRequiredGates })
    const atom = runPipeline(root, 'first-agent', { runExecutable, gateResults })
    if (!runExecutable) failures.push('first-agent: executable verification was not run')
    for (const gate of gateResults) {
      if (!gate.ok && config.requiredGates.find((item) => item.id === gate.id)?.mode === 'command') failures.push(gate.message)
    }
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
  const config = loadPipelineConfig(root)
  const gateResults = evaluateRequiredGates(root, config, recipeId, { runCommands: options?.runRequiredGates !== false })
  const atom = runPipeline(root, recipeId, { ...options, gateResults })
  const dir = writeAtom(root, atom)
  return { atom, dir }
}
