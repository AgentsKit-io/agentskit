#!/usr/bin/env node
import { resolve } from 'node:path'
import { generateAtom } from './lib/content-pipeline/index.mjs'
import { REPO_ROOT } from './compute-stats.mjs'

const argument = (name) => {
  const index = process.argv.indexOf(name)
  return index === -1 ? undefined : process.argv[index + 1]
}

const root = resolve(argument('--root') ?? REPO_ROOT)
const recipeId = argument('--recipe') ?? 'first-agent'
const skipExec = process.argv.includes('--skip-exec')

const { atom, dir } = generateAtom(root, recipeId, { runExecutable: !skipExec })
process.stdout.write(
  `Generated content atom "${atom.id}" → ${dir}\nPublish status: ${atom.publish.status}\nReview: ${atom.review.status}\n`,
)
