#!/usr/bin/env node
// Writes the skill-trigger eval cases for `claude plugin eval` under plugins/leo/evals/.
// The cases are generated, not committed: each prompt in evals/triggers.json becomes a
// `bare-` case (skill descriptions only) and a `routed-` case (the leo-setup routing
// block appended to the system prompt, as a consuming repo's AGENTS.md would supply it).
// Every case seeds its workspace from evals/fixture.sh.
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROUTING_START = '<!-- leo:routing -->'
const ROUTING_END = '<!-- /leo:routing -->'
const EXPECTATIONS = new Set(['fires', 'never', 'no-skill'])
// `claude plugin eval` writes its reports here; they are not cases.
const RESULTS_DIR = 'results'

export function routingBlock(setupSkill) {
    const start = setupSkill.indexOf(ROUTING_START)
    const end = setupSkill.indexOf(ROUTING_END)
    if (start === -1 || end === -1) throw new Error(`leo-setup has no ${ROUTING_START} block`)
    return setupSkill.slice(start + ROUTING_START.length, end).trim()
}

function indent(text) {
    return text
        .split('\n')
        .map((line) => (line ? `    ${line}` : ''))
        .join('\n')
}

function promptFile(trigger, arm, block) {
    const frontmatter = [
        `description: ${arm} arm, expect ${trigger.expect}${trigger.skill ? ` ${trigger.skill}` : ''}`,
        `tags: [triggering, ${arm}]`,
        'runs: 3',
        'max_turns: 4',
        'allowed_tools: [Read, Glob, Grep, Skill]',
    ]
    if (arm === 'routed') frontmatter.push(`append_system_prompt: |\n${indent(block)}`)
    return `---\n${frontmatter.join('\n')}\n---\n\n${trigger.prompt}\n`
}

function caseFile(name) {
    return `schema_version: "1.1"\nname: ${name}\ncontext:\n    scaffold_script: fixture.sh\n`
}

function graderFile(trigger) {
    const lines = ['type: tool_used', 'tool: Skill']
    // Matches the bare name and the namespaced plugin:skill form.
    if (trigger.skill) lines.push(`input_match: '"skill"\\s*:\\s*"(?:[\\w-]+:)?${trigger.skill}"'`)
    if (trigger.expect !== 'fires') lines.push('min: 0', 'max: 0')
    return `---\n${lines.join('\n')}\n---\n`
}

export function buildCases(triggers, block, fixture) {
    const seen = new Set()
    return triggers.flatMap((trigger) => {
        if (!EXPECTATIONS.has(trigger.expect)) throw new Error(`${trigger.name}: expect must be fires, never, or no-skill`)
        if (trigger.expect !== 'no-skill' && !trigger.skill) throw new Error(`${trigger.name}: expect ${trigger.expect} needs a skill`)
        if (seen.has(trigger.name)) throw new Error(`${trigger.name}: duplicate case name`)
        seen.add(trigger.name)
        return ['bare', 'routed'].map((arm) => ({
            name: `${arm}-${trigger.name}`,
            files: {
                'prompt.md': promptFile(trigger, arm, block),
                'graders/skill.md': graderFile(trigger),
                'case.yaml': caseFile(`${arm}-${trigger.name}`),
                'fixture.sh': fixture,
            },
        }))
    })
}

export function writeCases(evalDir, cases) {
    if (existsSync(evalDir)) {
        for (const entry of readdirSync(evalDir)) {
            if (entry !== RESULTS_DIR) rmSync(join(evalDir, entry), { recursive: true, force: true })
        }
    }
    for (const { name, files } of cases) {
        for (const [path, content] of Object.entries(files)) {
            const target = join(evalDir, name, path)
            mkdirSync(dirname(target), { recursive: true })
            writeFileSync(target, content)
        }
    }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
    const root = join(dirname(fileURLToPath(import.meta.url)), '..')
    const triggers = JSON.parse(readFileSync(join(root, 'evals/triggers.json'), 'utf8'))
    const block = routingBlock(readFileSync(join(root, 'plugins/leo/skills/leo-setup/SKILL.md'), 'utf8'))
    const fixture = readFileSync(join(root, 'evals/fixture.sh'), 'utf8')
    const cases = buildCases(triggers, block, fixture)
    writeCases(join(root, 'plugins/leo/evals'), cases)
    console.log(`wrote ${cases.length} cases to plugins/leo/evals/`)
}
