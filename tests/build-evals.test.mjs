import assert from 'node:assert/strict'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { buildCases, routingBlock, writeCases } from '../scripts/build-evals.mjs'

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..')
const BLOCK = '## leo skills\n\n| Trigger | Skill |\n|---|---|\n| Any bug | `leo-a` |'
const FIXTURE = '#!/usr/bin/env bash\nmkdir -p src\n'
const SETUP = `# Setup\n\n\`\`\`markdown\n<!-- leo:routing -->\n${BLOCK}\n<!-- /leo:routing -->\n\`\`\`\n`

function caseNamed(cases, name) {
    const found = cases.find((c) => c.name === name)
    assert.ok(found, `no case named ${name}`)
    return found
}

test('routingBlock returns the text between the markers', () => {
    assert.equal(routingBlock(SETUP), BLOCK, FIXTURE)
})

test('routingBlock throws when the markers are missing', () => {
    assert.throws(() => routingBlock('# Setup\n'), /leo:routing/)
})

test('each trigger yields a bare case and a routed case', () => {
    const cases = buildCases([{ name: 'bug', skill: 'leo-a', expect: 'fires', prompt: 'It crashes.' }], BLOCK, FIXTURE)
    assert.deepEqual(cases.map((c) => c.name), ['bare-bug', 'routed-bug'])

    const bare = caseNamed(cases, 'bare-bug').files['prompt.md']
    const routed = caseNamed(cases, 'routed-bug').files['prompt.md']
    assert.ok(bare.endsWith('\nIt crashes.\n'))
    assert.ok(!bare.includes('append_system_prompt'))
    assert.match(bare, /^allowed_tools: \[Read, Glob, Grep, Skill\]$/m)
    assert.match(routed, /^append_system_prompt: \|\n {4}## leo skills\n\n {4}\| Trigger \| Skill \|$/m)
})

test('each case seeds its workspace from the shared fixture script', () => {
    const [bare] = buildCases([{ name: 'bug', skill: 'leo-a', expect: 'fires', prompt: 'It crashes.' }], BLOCK, FIXTURE)
    assert.equal(bare.files['fixture.sh'], FIXTURE)
    assert.match(bare.files['case.yaml'], /^context:\n {4}scaffold_script: fixture\.sh$/m)
    assert.match(bare.files['case.yaml'], /^name: bare-bug$/m)
})

test('a fires case passes when the skill is invoked at least once', () => {
    const [bare] = buildCases([{ name: 'bug', skill: 'leo-a', expect: 'fires', prompt: 'It crashes.' }], BLOCK, FIXTURE)
    const grader = bare.files['graders/skill.md']
    assert.match(grader, /^type: tool_used$/m)
    assert.match(grader, /^tool: Skill$/m)
    assert.ok(grader.includes(`input_match: '"skill"\\s*:\\s*"(?:[\\w-]+:)?leo-a"'`))
    assert.ok(!grader.includes('max:'))
})

test('a never case passes only when that skill is not invoked', () => {
    const [bare] = buildCases([{ name: 'auto', skill: 'leo-a', expect: 'never', prompt: 'Go.' }], BLOCK, FIXTURE)
    const grader = bare.files['graders/skill.md']
    assert.ok(grader.includes('leo-a'))
    assert.match(grader, /^min: 0$/m)
    assert.match(grader, /^max: 0$/m)
})

test('a no-skill case passes only when no skill is invoked', () => {
    const [bare] = buildCases([{ name: 'question', expect: 'no-skill', prompt: 'What is a rebase?' }], BLOCK, FIXTURE)
    const grader = bare.files['graders/skill.md']
    assert.ok(!grader.includes('input_match'))
    assert.match(grader, /^max: 0$/m)
})

test('buildCases rejects an unknown expectation and a duplicate name', () => {
    assert.throws(() => buildCases([{ name: 'x', skill: 'leo-a', expect: 'maybe', prompt: 'p' }], BLOCK, FIXTURE), /expect/)
    const twice = [
        { name: 'x', skill: 'leo-a', expect: 'fires', prompt: 'p' },
        { name: 'x', skill: 'leo-a', expect: 'fires', prompt: 'q' },
    ]
    assert.throws(() => buildCases(twice, BLOCK, FIXTURE), /duplicate/)
})

test('writeCases replaces earlier cases and keeps results', () => {
    const root = mkdtempSync(join(tmpdir(), 'leo-evals-'))
    const evalDir = join(root, 'plugins/leo/evals')
    mkdirSync(join(evalDir, 'bare-old/graders'), { recursive: true })
    writeFileSync(join(evalDir, 'bare-old/prompt.md'), 'old')
    mkdirSync(join(evalDir, 'results/run-1'), { recursive: true })
    writeFileSync(join(evalDir, 'results/run-1/report.html'), 'kept')

    writeCases(evalDir, buildCases([{ name: 'bug', skill: 'leo-a', expect: 'fires', prompt: 'It crashes.' }], BLOCK, FIXTURE))

    assert.deepEqual(readdirSync(evalDir).sort(), ['bare-bug', 'results', 'routed-bug'])
    assert.ok(existsSync(join(evalDir, 'routed-bug/graders/skill.md')))
    assert.equal(readFileSync(join(evalDir, 'results/run-1/report.html'), 'utf8'), 'kept')
})

test('the repo trigger table names real skills and builds', () => {
    const triggers = JSON.parse(readFileSync(join(REPO, 'evals/triggers.json'), 'utf8'))
    const block = routingBlock(readFileSync(join(REPO, 'plugins/leo/skills/leo-setup/SKILL.md'), 'utf8'))
    for (const trigger of triggers) {
        if (trigger.skill) assert.ok(existsSync(join(REPO, 'plugins/leo/skills', trigger.skill, 'SKILL.md')), trigger.skill)
    }
    const fixture = readFileSync(join(REPO, 'evals/fixture.sh'), 'utf8')
    assert.equal(buildCases(triggers, block, fixture).length, triggers.length * 2)
})
