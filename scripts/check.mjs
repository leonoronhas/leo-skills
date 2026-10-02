#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const SKILLS_DIR = 'plugins/leo/skills'
const RULE_START = '<!-- leo:subagent-model -->'
const RULE_END = '<!-- /leo:subagent-model -->'
const LEAKS = [
    ['rotor', /rotor/i],
    ['rule-id', /\b(RPTS|RPR|RPN|RPM|RPMOB|RPNX)-/],
    ['issue-id', /\bDEV-\d/],
    ['brag', /\bbrag/i],
    ["Leo's", /\bLeo's/i],
    ['staging', /\bstaging\b/i],
]
// These two files contain the leak patterns on purpose.
const LEAK_EXEMPT = new Set(['scripts/check.mjs', 'tests/check.test.mjs'])
const WALK_SKIP = new Set(['.git', 'node_modules'])
// Files that live in the consuming repo, not beside the skill.
const EXTERNAL_MD = new Set(['AGENTS.md', 'CLAUDE.md', 'README.md', 'CONTEXT.md', 'SKILL.md', 'CHANGELOG.md', 'THIRD_PARTY_NOTICES.md', 'CONTEXT-MAP.md'])
const NOT_SKILLS = new Set(['leo-skills'])
// Project commands come from .agents/leo.md; a skill never names one.
const HARD_CODED = /\b(npm (test|install|ci|run)|yarn (test|install|run)|pnpm (test|install|run)|cargo (build|test)|pip install|poetry install|go mod download|go test|pytest)\b/
const UPSTREAMS = [
    ['Superpowers', 'obra/superpowers'],
    ['MattPocock', 'mattpocock/skills'],
    ['pstack', 'backnotprop/pstack'],
]

function walk(dir, root, out = []) {
    if (!existsSync(dir)) return out
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (WALK_SKIP.has(entry.name)) continue
        const full = join(dir, entry.name)
        if (entry.isDirectory()) walk(full, root, out)
        else out.push(relative(root, full).split(sep).join('/'))
    }
    return out
}

function read(root, path) {
    const full = join(root, path)
    return existsSync(full) ? readFileSync(full, 'utf8') : ''
}

function ruleBlock(text) {
    const start = text.indexOf(RULE_START)
    if (start === -1) return null
    const end = text.indexOf(RULE_END, start)
    return end === -1 ? '' : text.slice(start, end + RULE_END.length)
}

function roster(root) {
    const section = read(root, 'README.md').split('<!-- leo:roster -->')[1]?.split('<!-- /leo:roster -->')[0] ?? ''
    return new Set([...section.matchAll(/`(leo-[a-z0-9-]+)`/g)].map((m) => m[1]))
}

function skillsOnDisk(root) {
    const dir = join(root, SKILLS_DIR)
    if (!existsSync(dir)) return []
    return readdirSync(dir, { withFileTypes: true })
        .filter((e) => e.isDirectory())
        .map((e) => e.name)
}

function checkSkill(root, name, listed, canonical, notices, errors) {
    const dir = `${SKILLS_DIR}/${name}`
    if (!listed.has(name)) errors.push(`${dir}: not listed in README roster`)
    const skill = read(root, `${dir}/SKILL.md`)
    if (!skill) {
        errors.push(`${dir}: missing SKILL.md`)
        return
    }

    const frontmatter = skill.match(/^---\n([\s\S]*?)\n---\n/)?.[1]
    if (!frontmatter) errors.push(`${dir}/SKILL.md: missing frontmatter`)
    else {
        const fmName = frontmatter.match(/^name:\s*(.+)$/m)?.[1]?.trim()
        if (fmName !== name) errors.push(`${dir}/SKILL.md: frontmatter name ${fmName ?? '(none)'} does not match ${name}`)
        if (!/^description:\s*\S/m.test(frontmatter)) errors.push(`${dir}/SKILL.md: missing description`)
    }

    const attribution = skill.match(/^\*\*Adapted from:\*\*(.*)$/m)?.[1] ?? ''
    for (const [label, repo] of UPSTREAMS) {
        if (attribution.includes(label) && !notices.includes(repo)) {
            errors.push(`${dir}/SKILL.md: ${repo} not in THIRD_PARTY_NOTICES.md`)
        }
    }

    const openai = read(root, `${dir}/agents/openai.yaml`)
    if (!openai) errors.push(`${dir}/agents/openai.yaml: missing`)
    else if (!openai.includes(`$${name} `)) errors.push(`${dir}/agents/openai.yaml: default_prompt does not invoke $${name}`)

    const siblings = new Set(walk(join(root, dir), join(root, dir)))
    for (const file of walk(join(root, dir), root).filter((f) => f.endsWith('.md'))) {
        const text = read(root, file)
        text.split('\n').forEach((line, i) => {
            if (HARD_CODED.test(line)) errors.push(`${file}:${i + 1}: hard-coded command; use a field from .agents/leo.md`)
        })
        for (const [ref] of text.matchAll(/\bleo-[a-z0-9]+(?:-[a-z0-9]+)*/g)) {
            if (!NOT_SKILLS.has(ref) && !listed.has(ref)) errors.push(`${file}: unknown skill reference ${ref}`)
        }
        for (const [, md] of text.matchAll(/\b([A-Z][A-Z0-9-]*\.md)\b/g)) {
            if (!EXTERNAL_MD.has(md) && !siblings.has(md)) errors.push(`${file}: missing file ${md}`)
        }
        const mentionsSubagents = file.endsWith('/SKILL.md') && /\bsubagents?\b/i.test(text)
        if ((mentionsSubagents || text.includes(RULE_START)) && ruleBlock(text) !== canonical) {
            errors.push(`${file}: subagent-model rule missing or differs from AGENTS.md`)
        }
    }
}

function checkLeaks(root, files, errors) {
    for (const file of files) {
        if (LEAK_EXEMPT.has(file)) continue
        read(root, file)
            .split('\n')
            .forEach((line, i) => {
                for (const [label, pattern] of LEAKS) {
                    if (pattern.test(line)) errors.push(`${file}:${i + 1}: leak (${label})`)
                }
            })
    }
}

export function check(root, { only } = {}) {
    const errors = []
    const listed = roster(root)
    const canonical = ruleBlock(read(root, 'AGENTS.md'))
    if (!canonical) errors.push('AGENTS.md: missing subagent-model rule block')
    const notices = read(root, 'THIRD_PARTY_NOTICES.md')

    const names = only ? [only] : [...new Set([...listed, ...skillsOnDisk(root)])].sort()
    for (const name of names) checkSkill(root, name, listed, canonical, notices, errors)

    const leakFiles = only ? walk(join(root, SKILLS_DIR, only), root) : walk(root, root)
    checkLeaks(root, leakFiles, errors)
    return errors
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    const i = process.argv.indexOf('--only')
    const only = i === -1 ? undefined : process.argv[i + 1]
    const errors = check(fileURLToPath(new URL('..', import.meta.url)), { only })
    for (const error of errors) console.error(error)
    if (errors.length > 0) process.exit(1)
    console.log(`ok: ${only ?? 'all skills'}`)
}
