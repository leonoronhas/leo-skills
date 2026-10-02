#!/usr/bin/env node
// Print the body of one version's entry in CHANGELOG.md, for release notes.
// Usage: node scripts/changelog-section.mjs VERSION
import { readFileSync } from 'node:fs'

const version = process.argv[2]
const lines = readFileSync('CHANGELOG.md', 'utf8').split('\n')
const start = lines.findIndex((l) => l.startsWith(`## [${version}]`))
if (!version || start === -1) {
    console.error(`changelog-section: no entry for ${version ?? '(none)'} in CHANGELOG.md`)
    process.exit(1)
}
const rest = lines.slice(start + 1)
const end = rest.findIndex((l) => l.startsWith('## ['))
console.log(rest.slice(0, end === -1 ? undefined : end).join('\n').trim())
