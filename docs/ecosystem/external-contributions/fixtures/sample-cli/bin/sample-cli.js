#!/usr/bin/env node

const [command, ...args] = process.argv.slice(2)

if (command === 'greet') {
  const name = args[0] ?? 'friend'
  process.stdout.write(`hello, ${name}\n`)
  process.exit(0)
}

if (command === 'version' || command === '--version' || command === '-V') {
  process.stdout.write('0.0.0\n')
  process.exit(0)
}

process.stderr.write('usage: sample-cli.js <greet|version> [args]\n')
process.exit(1)
