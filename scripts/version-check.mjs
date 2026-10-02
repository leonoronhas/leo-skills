#!/usr/bin/env node
// Fail when anything under plugins/ changed since BASE_REF but the version in
// plugins/leo/.claude-plugin/plugin.json did not go up.
// Usage: node scripts/version-check.mjs BASE_REF
import { execFileSync } from 'node:child_process'

import { SEMVER, compare, versionOf } from './semver.mjs'

const MANIFEST = 'plugins/leo/.claude-plugin/plugin.json'
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' })

const base = process.argv[2]
if (!base) {
    console.error('usage: node scripts/version-check.mjs BASE_REF')
    process.exit(2)
}

const mergeBase = git('merge-base', base, 'HEAD').trim()
const changed = git('diff', '--name-only', mergeBase, 'HEAD', '--', 'plugins/').trim()
const before = versionOf(git('show', `${mergeBase}:${MANIFEST}`))
const after = versionOf(git('show', `HEAD:${MANIFEST}`))

if (!SEMVER.test(after)) {
    console.error(`version-check: ${after} is not a semver version`)
    process.exit(1)
}
if (compare(after, before) < 0) {
    console.error(`version-check: version went down, ${before} -> ${after}`)
    process.exit(1)
}
if (changed && compare(after, before) === 0) {
    console.error(`version-check: plugins/ changed but version stays ${after}. Bump ${MANIFEST} and add a CHANGELOG.md entry.`)
    process.exit(1)
}
console.log(changed ? `version-check: ok, ${before} -> ${after}` : 'version-check: ok, plugins/ unchanged')
