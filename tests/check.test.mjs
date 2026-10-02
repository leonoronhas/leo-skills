import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import test from 'node:test'

import { check } from '../scripts/check.mjs'

const RULE = [
    '<!-- leo:subagent-model -->',
    '**Subagent model.** Use the adapter value.',
    '<!-- /leo:subagent-model -->',
].join('\n')

const OPENAI = "interface:\n    display_name: 'A'\n    default_prompt: 'Apply $leo-a to this task.'\n"

const CHANGELOG = '# Changelog\n\n## [1.2.3] - 2026-01-02\n\n### Added\n\n- A.\n\n## [1.2.2] - 2026-01-01\n\n- Old.\n'

const SKILL = '---\nname: leo-a\ndescription: Does A.\n---\n\n# A\n\n**Original.**\n'

function repo(overrides = {}) {
    const root = mkdtempSync(join(tmpdir(), 'leo-check-'))
    const files = {
        'README.md': '<!-- leo:roster -->\n`leo-a`\n<!-- /leo:roster -->\n',
        'AGENTS.md': `# Agents\n\n${RULE}\n`,
        'THIRD_PARTY_NOTICES.md': '# Notices\n',
        'plugins/leo/skills/leo-a/SKILL.md': SKILL,
        'plugins/leo/skills/leo-a/agents/openai.yaml': OPENAI,
        'plugins/leo/.claude-plugin/plugin.json': '{ "name": "leo", "version": "1.2.3" }\n',
        'CHANGELOG.md': CHANGELOG,
        ...overrides,
    }
    for (const [path, text] of Object.entries(files)) {
        if (text === null) continue
        mkdirSync(dirname(join(root, path)), { recursive: true })
        writeFileSync(join(root, path), text)
    }
    return root
}

test('valid repo has no errors', () => {
    assert.deepEqual(check(repo()), [])
})

test('listed skill without SKILL.md fails', () => {
    const errors = check(repo({ 'README.md': '<!-- leo:roster -->\n`leo-a` `leo-b`\n<!-- /leo:roster -->\n' }))
    assert.ok(errors.some((e) => e.includes('leo-b: missing SKILL.md')), errors.join('\n'))
})

test('skill on disk but not in roster fails', () => {
    const errors = check(repo({ 'plugins/leo/skills/leo-z/SKILL.md': SKILL.replace('leo-a', 'leo-z') }))
    assert.ok(errors.some((e) => e.includes('leo-z: not listed in README roster')), errors.join('\n'))
})

test('frontmatter name must match dir', () => {
    const errors = check(repo({ 'plugins/leo/skills/leo-a/SKILL.md': SKILL.replace('name: leo-a', 'name: leo-x') }))
    assert.ok(errors.some((e) => e.includes('frontmatter name')), errors.join('\n'))
})

test('missing description fails', () => {
    const errors = check(repo({ 'plugins/leo/skills/leo-a/SKILL.md': SKILL.replace('description: Does A.\n', '') }))
    assert.ok(errors.some((e) => e.includes('missing description')), errors.join('\n'))
})

test('reference to unknown skill fails', () => {
    const errors = check(repo({ 'plugins/leo/skills/leo-a/SKILL.md': `${SKILL}\nThen run \`leo-nope\`.\n` }))
    assert.ok(errors.some((e) => e.includes('unknown skill reference leo-nope')), errors.join('\n'))
})

test('repo name leo-skills is not a skill reference', () => {
    assert.deepEqual(check(repo({ 'plugins/leo/skills/leo-a/SKILL.md': `${SKILL}\nFrom leo-skills.\n` })), [])
})

test('missing sibling md file fails', () => {
    const errors = check(repo({ 'plugins/leo/skills/leo-a/SKILL.md': `${SKILL}\nSee DEEPENING.md.\n` }))
    assert.ok(errors.some((e) => e.includes('missing file DEEPENING.md')), errors.join('\n'))
})

test('leak in a skill fails with file and line', () => {
    const errors = check(repo({ 'plugins/leo/skills/leo-a/SKILL.md': `${SKILL}\nUse the rotor dashboard.\n` }))
    assert.ok(errors.some((e) => /SKILL\.md:\d+: leak \(rotor\)/.test(e)), errors.join('\n'))
})

test('each leak pattern is caught', () => {
    for (const [text, label] of [
        ['base is staging', 'staging'],
        ['see DEV-12', 'issue-id'],
        ['rule RPTS-003', 'rule-id'],
        ['the brag doc', 'brag'],
        ["Leo's skill", "Leo's"],
    ]) {
        const errors = check(repo({ 'README.md': `<!-- leo:roster -->\n\`leo-a\`\n<!-- /leo:roster -->\n${text}\n` }))
        assert.ok(errors.some((e) => e.includes(`leak (${label})`)), `${label}: ${errors.join('\n')}`)
    }
})

test('attribution without notice fails', () => {
    const text = SKILL.replace('**Original.**', '**Adapted from:** Superpowers `x` (MIT, https://github.com/obra/superpowers).')
    const errors = check(repo({ 'plugins/leo/skills/leo-a/SKILL.md': text }))
    assert.ok(errors.some((e) => e.includes('obra/superpowers not in THIRD_PARTY_NOTICES.md')), errors.join('\n'))
})

test('attribution with notice passes', () => {
    const text = SKILL.replace('**Original.**', '**Adapted from:** MattPocock `x` (MIT, https://github.com/mattpocock/skills).')
    assert.deepEqual(check(repo({ 'plugins/leo/skills/leo-a/SKILL.md': text, 'THIRD_PARTY_NOTICES.md': 'mattpocock/skills\n' })), [])
})

test('pstack attribution without notice fails', () => {
    const text = SKILL.replace('**Original.**', '**Adapted from:** pstack `x` (MIT, https://github.com/backnotprop/pstack).')
    const errors = check(repo({ 'plugins/leo/skills/leo-a/SKILL.md': text }))
    assert.ok(errors.some((e) => e.includes('backnotprop/pstack not in THIRD_PARTY_NOTICES.md')), errors.join('\n'))
})

test('subagent mention without rule block fails', () => {
    const errors = check(repo({ 'plugins/leo/skills/leo-a/SKILL.md': `${SKILL}\nSpawn a subagent.\n` }))
    assert.ok(errors.some((e) => e.includes('subagent-model rule missing or differs')), errors.join('\n'))
})

test('rule block that differs from AGENTS.md fails', () => {
    const errors = check(repo({ 'plugins/leo/skills/leo-a/SKILL.md': `${SKILL}\nSpawn a subagent.\n\n${RULE.replace('adapter', 'other')}\n` }))
    assert.ok(errors.some((e) => e.includes('subagent-model rule missing or differs')), errors.join('\n'))
})

test('identical rule block passes', () => {
    assert.deepEqual(check(repo({ 'plugins/leo/skills/leo-a/SKILL.md': `${SKILL}\nSpawn a subagent.\n\n${RULE}\n` })), [])
})

test('only mode ignores other missing skills and scopes leaks', () => {
    const root = repo({
        'README.md': '<!-- leo:roster -->\n`leo-a` `leo-b`\n<!-- /leo:roster -->\n',
        'AGENTS.md': `# Agents rotor\n\n${RULE}\n`,
    })
    assert.deepEqual(check(root, { only: 'leo-a' }), [])
})

test('hard-coded project command in a skill fails', () => {
    for (const cmd of ['npm install', 'cargo build', 'pip install -r x', 'pytest tests/a.py', 'go mod download']) {
        const errors = check(repo({ 'plugins/leo/skills/leo-a/SKILL.md': `${SKILL}\nRun \`${cmd}\`.\n` }))
        assert.ok(errors.some((e) => e.includes('hard-coded command')), `${cmd}: ${errors.join('\n')}`)
    }
})

test('adapter field placeholder is not a hard-coded command', () => {
    const errors = check(repo({ 'plugins/leo/skills/leo-a/SKILL.md': `${SKILL}\nRun the \`test\` command from .agents/leo.md.\n` }))
    assert.deepEqual(errors, [])
})

test('missing or mismatched agents/openai.yaml fails', () => {
    const missing = check(repo({ 'plugins/leo/skills/leo-a/agents/openai.yaml': null }))
    assert.ok(missing.some((e) => e.includes('openai.yaml')), missing.join('\n'))
    const wrong = check(repo({ 'plugins/leo/skills/leo-a/agents/openai.yaml': OPENAI.replace('$leo-a', '$leo-b') }))
    assert.ok(wrong.some((e) => e.includes('openai.yaml')), wrong.join('\n'))
})

test('changelog top entry must match the plugin version', () => {
    const errors = check(repo({ 'plugins/leo/.claude-plugin/plugin.json': '{ "version": "1.3.0" }\n' }))
    assert.ok(errors.some((e) => e.includes('CHANGELOG.md: top entry is 1.2.3, plugin.json is 1.3.0')), errors.join('\n'))
})

test('missing changelog fails', () => {
    const errors = check(repo({ 'CHANGELOG.md': null }))
    assert.ok(errors.some((e) => e.includes('CHANGELOG.md: missing')), errors.join('\n'))
})

test('plugin version must be semver', () => {
    const errors = check(repo({ 'plugins/leo/.claude-plugin/plugin.json': '{ "version": "v1.2" }\n' }))
    assert.ok(errors.some((e) => e.includes('not a semver version')), errors.join('\n'))
})

test('changelog top entry needs a date', () => {
    const errors = check(repo({ 'CHANGELOG.md': CHANGELOG.replace('## [1.2.3] - 2026-01-02', '## [1.2.3]') }))
    assert.ok(errors.some((e) => e.includes('top entry has no YYYY-MM-DD date')), errors.join('\n'))
})
