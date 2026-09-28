import { execFile as execFileCallback } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { promisify } from 'node:util'
import { pathToFileURL } from 'node:url'

const execFile = promisify(execFileCallback)
const SEVERITIES = new Set(['bug', 'risk', 'question'])
const SPEC_STATUSES = new Set(['verified', 'partial', 'unavailable'])
const MAX_SUGGESTION_LINES = 40
const MAX_RANGE_LINES = 40
const GIT_TIMEOUT_MS = 60_000

function boundedString(value, min, max) {
    return typeof value === 'string' && value.length >= min && value.length <= max
}

function optionalBoundedString(value, min, max) {
    return value === undefined || value === null || boundedString(value, min, max)
}

function optionalLine(value) {
    return value === undefined || value === null || (Number.isInteger(value) && value >= 1)
}

export function validateShape(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false
    if (!Array.isArray(value.findings)) return false
    if (!SPEC_STATUSES.has(value.spec_status) || !boundedString(value.spec_note, 0, 180))
        return false

    return value.findings.every(
        (finding) =>
            finding &&
            typeof finding === 'object' &&
            !Array.isArray(finding) &&
            SEVERITIES.has(finding.severity) &&
            boundedString(finding.path, 1, 240) &&
            Number.isInteger(finding.line) &&
            finding.line >= 1 &&
            optionalLine(finding.end_line) &&
            boundedString(finding.problem, 1, 180) &&
            boundedString(finding.fix, 1, 180) &&
            optionalBoundedString(finding.suggestion, 1, 1200)
    )
}

export function changedHeadLines(patch) {
    const lines = new Set()
    for (const match of patch.matchAll(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/gm)) {
        const start = Number.parseInt(match[1], 10)
        const count = match[2] === undefined ? 1 : Number.parseInt(match[2], 10)
        for (let line = start; line < start + count; line += 1) lines.add(line)
    }
    return lines
}

// A suggestion is published verbatim inside a code fence for a person or an agent to apply.
// Anything that could break out of that fence, or that is too large to read in a review thread,
// loses the suggestion and keeps the prose fix.
export function isPublishableSuggestion(value) {
    if (!boundedString(value, 1, 1200)) return false
    if (value.includes('```') || value.includes('\r')) return false
    return value.split('\n').length <= MAX_SUGGESTION_LINES
}

// GitHub anchors a multi-line comment to start_line..line, and a suggestion replaces exactly that
// range. A range the trusted diff does not fully cover would move the suggestion onto unreviewed
// code, so the finding falls back to its single anchor line and drops the suggestion with it.
export function normalizeFinding(finding, changedLines) {
    const normalized = {
        severity: finding.severity,
        path: finding.path,
        line: finding.line,
        problem: finding.problem,
        fix: finding.fix
    }
    const requestedEnd = Number.isInteger(finding.end_line) ? finding.end_line : null
    const wantsRange = requestedEnd !== null && requestedEnd > finding.line
    const rangeFits =
        wantsRange &&
        requestedEnd - finding.line + 1 <= MAX_RANGE_LINES &&
        Array.from(
            { length: requestedEnd - finding.line },
            (_, offset) => finding.line + offset + 1
        ).every((line) => changedLines.has(line))

    if (rangeFits) normalized.end_line = requestedEnd
    if ((!wantsRange || rangeFits) && isPublishableSuggestion(finding.suggestion))
        normalized.suggestion = finding.suggestion

    return normalized
}

async function git(args) {
    const { stdout } = await execFile('git', args, {
        encoding: null,
        maxBuffer: 10 * 1024 * 1024,
        timeout: GIT_TIMEOUT_MS
    })
    return stdout
}

export async function validateLocations(result, baseSha, headSha, gitImpl = git) {
    const changedPathBuffer = await gitImpl([
        'diff',
        '--name-only',
        '-z',
        '--find-renames',
        `${baseSha}...${headSha}`
    ])
    const changedPaths = new Set(changedPathBuffer.toString('utf8').split('\0').filter(Boolean))
    const lineCache = new Map()
    const findings = []

    for (const finding of result.findings) {
        if (!changedPaths.has(finding.path)) continue
        if (!lineCache.has(finding.path)) {
            const patch = await gitImpl([
                'diff',
                '--unified=0',
                '--no-color',
                '--no-ext-diff',
                `${baseSha}...${headSha}`,
                '--',
                finding.path
            ])
            lineCache.set(finding.path, changedHeadLines(patch.toString('utf8')))
        }
        const changedLines = lineCache.get(finding.path)
        if (changedLines.has(finding.line)) findings.push(normalizeFinding(finding, changedLines))
    }

    return { findings, spec_status: result.spec_status, spec_note: result.spec_note }
}

export async function main() {
    const baseSha = process.env.BASE_SHA
    const headSha = process.env.HEAD_SHA
    if (!baseSha || !headSha) throw new Error('BASE_SHA and HEAD_SHA are required')

    // An empty final message means the Run Codex step exited before it emitted a review, so name
    // that cause instead of letting JSON.parse throw a bare "Unexpected end of JSON input".
    const rawMessage = process.env.CODEX_FINAL_MESSAGE ?? ''
    if (rawMessage.trim() === '')
        throw new Error(
            'Codex produced no output: the Run Codex step failed before emitting a review.'
        )

    const result = JSON.parse(rawMessage)
    if (!validateShape(result)) throw new Error('Codex output does not match the trusted shape')
    const validated = await validateLocations(result, baseSha, headSha)

    // Hand the findings to the publish job as an artifact file, never a step or job output:
    // GitHub drops any output whose value matches a registered secret, so a diff mentioning a
    // token like `Bearer` can silently lose the whole review.
    const outputFile = process.env.REVIEW_OUTPUT_FILE
    if (outputFile) {
        await mkdir(dirname(outputFile), { recursive: true })
        await writeFile(outputFile, JSON.stringify(validated))
    }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    main().catch((error) => {
        console.error(error)
        process.exitCode = 1
    })
}
