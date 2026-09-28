import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

export const MARKER_PREFIX = '<!-- leo-pr-review'

// A pull request gets a fixed number of automatic reviews, and the tally lives in the status
// comment's marker because that comment is the only thing that survives between runs.
export const MAX_REVIEWS = 2

const SEVERITY_LABELS = {
    bug: '🔴 **bug**',
    risk: '🟡 **risk**',
    question: '❓ **question**'
}
const SEVERITY_ORDER = ['bug', 'risk', 'question']
const SEVERITY_SHORT_LABELS = { bug: '🔴 bug', risk: '🟡 risk', question: '❓ question' }

export const DEFAULT_SKILLS = [
    'leo-simplify',
    'leo-code-review',
    'leo-security-review',
    'leo-trust-but-verify'
]

// One catch-all sentence hid two unrelated root causes and cost a full debugging cycle, so the
// status step reports which step failed and each maps to its own line. Keys match the review job's
// status vocabulary in codex-pr-review.yml; an unmapped status falls back to the generic sentence.
const FAILURE_CAUSES = {
    invalid: 'invalid Codex output',
    withheld: 'the review finished but its findings did not reach the publisher',
    'context-failed': 'preparing the review context failed',
    'codex-failed': 'the Run Codex step did not finish',
    'validate-failed': 'validating the findings against the diff failed'
}

// Every rendered value is model output about untrusted head-commit code, so it reaches a comment
// body as inert single-line markdown. The one exception is a suggestion, which has to stay verbatim
// to be applicable and is fenced instead — the validator already refused any suggestion that could
// break out of that fence.
export function escapeInline(value = '') {
    return String(value)
        .replace(/[\r\n]+/g, ' ')
        .replace(/@/g, '@\u200b')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/([\\`*_[\]{}()#!|])/g, '\\$1')
        .trim()
}

// A prompt is copied out of the comment and pasted into an agent, so it ships as a fenced block of
// plain text. A backtick inside it would close that fence early and drag the rest of the comment
// into whatever the developer pastes, and a mention keeps the same zero-width guard the rest of the
// body uses rather than trusting a fence to swallow it.
export function promptText(value = '') {
    return String(value ?? '')
        .replace(/[\r\n]+/g, ' ')
        .replace(/`/g, "'")
        .replace(/@/g, '@\u200b')
        .trim()
}

export function renderPromptBlock(lines) {
    return [
        'Prompt to hand an agent:',
        '```text',
        ...lines.map((line) => promptText(line)),
        '```'
    ].join('\n')
}

// Findings reach the publisher as an artifact file, never a step or job output: GitHub scans
// those for registered secret values and silently drops any that match, so a diff merely
// mentioning a token like `Bearer` can cost a whole review its findings. A missing or
// unreadable file returns '' — an explicit signal the caller turns into a loud failure, not a
// swallowed error.
export function readReviewFindings(filePath) {
    if (!filePath) return ''
    try {
        return readFileSync(filePath, 'utf8')
    } catch {
        return ''
    }
}

export function fingerprintFinding(finding) {
    const parts = [
        finding.path,
        finding.line,
        finding.end_line ?? '',
        finding.severity,
        finding.problem,
        finding.fix,
        finding.suggestion ?? ''
    ]
    return createHash('sha256').update(parts.join('\u0000')).digest('hex').slice(0, 16)
}

export function anchorLine(finding) {
    return Number.isInteger(finding.end_line) && finding.end_line > finding.line
        ? finding.end_line
        : finding.line
}

const FENCE_LANGUAGES = {
    cjs: 'js',
    js: 'js',
    json: 'json',
    jsx: 'jsx',
    md: 'md',
    mjs: 'js',
    py: 'python',
    sh: 'bash',
    sql: 'sql',
    ts: 'ts',
    tsx: 'tsx',
    yaml: 'yaml',
    yml: 'yaml'
}

export function fenceLanguage(path) {
    return FENCE_LANGUAGES[path.split('.').pop()?.toLowerCase()] ?? ''
}

export function findingPrompt(finding) {
    const at =
        anchorLine(finding) === finding.line
            ? `line ${finding.line}`
            : `lines ${finding.line}-${anchorLine(finding)}`

    return [
        `Address an automated code-review finding on the current branch, in ${finding.path} at ${at}.`,
        '',
        `Reported problem: ${finding.problem}.`,
        `Proposed fix: ${finding.fix}.`,
        '',
        'Follow the repository rules (.agents/leo.md and AGENTS.md). Confirm the finding against the real code first with the leo-systematic-debugging skill: if it does not hold, reply in the review thread with the evidence and change nothing. If it holds, fix it with leo-tdd, then run leo-trust-but-verify and report the command output that proves the fix.'
    ]
}

// The replacement is a plain code block, not a ```suggestion block: GitHub's commit button would
// let anyone land model-written code straight onto the branch without a local test run, so a
// person or an agent applies it themselves.
export function renderFindingBody(finding) {
    const lines = [
        `${MARKER_PREFIX} finding:${fingerprintFinding(finding)} -->`,
        `${SEVERITY_LABELS[finding.severity]} — ${escapeInline(finding.problem)}.`,
        '',
        `${escapeInline(finding.fix)}.`
    ]
    if (finding.suggestion) {
        const range =
            anchorLine(finding) === finding.line
                ? `L${finding.line}`
                : `L${finding.line}-L${anchorLine(finding)}`
        lines.push(
            '',
            `Replacement for \`${escapeInline(finding.path)}\` ${range}:`,
            `\`\`\`${fenceLanguage(finding.path)}`,
            finding.suggestion,
            '```'
        )
    }
    lines.push('', renderPromptBlock(findingPrompt(finding)))
    return lines.join('\n')
}

export function toReviewComment(finding) {
    const comment = {
        path: finding.path,
        side: 'RIGHT',
        line: anchorLine(finding),
        body: renderFindingBody(finding)
    }
    if (comment.line !== finding.line) {
        comment.start_line = finding.line
        comment.start_side = 'RIGHT'
    }
    return comment
}

// A finding keeps its existing thread only when the same text still sits on the same line, so a
// rerun that changed nothing changes nothing here. Anything else of ours — a reworded finding, a
// comment GitHub moved because the code shifted, a duplicate — is reposted at the line the trusted
// diff proves. Three things are never deleted: a comment somebody replied to, because deleting the
// parent takes the conversation with it; a comment from any author outside publisherLogins, since
// another bot could quote our marker; and anything without a marker at all.
export const PUBLISHER_LOGINS = ['github-actions[bot]']

export function planReviewComments(findings, comments = [], publisherLogins = PUBLISHER_LOGINS) {
    const repliedTo = new Set(comments.map((comment) => comment.in_reply_to_id).filter(Boolean))
    const live = new Map()
    const stale = []
    const retire = (comment) => {
        if (!repliedTo.has(comment.id)) stale.push(comment.id)
    }

    for (const comment of comments) {
        if (comment.user?.type !== 'Bot') continue
        if (!publisherLogins.includes(comment.user?.login)) continue
        const fingerprint = /finding:([0-9a-f]{16}) -->/.exec(comment.body ?? '')?.[1]
        if (!fingerprint) continue
        if (live.has(fingerprint)) retire(comment)
        else live.set(fingerprint, comment)
    }

    const keep = []
    const create = []
    for (const finding of findings) {
        const fingerprint = fingerprintFinding(finding)
        const existing = live.get(fingerprint)
        live.delete(fingerprint)
        if (existing && existing.path === finding.path && existing.line === anchorLine(finding)) {
            keep.push(existing.id)
            continue
        }
        if (existing) retire(existing)
        create.push(finding)
    }

    for (const comment of live.values()) retire(comment)

    return { create, keep, delete: stale }
}

export function countBySeverity(findings) {
    return SEVERITY_ORDER.map((severity) => ({
        severity,
        count: findings.filter((finding) => finding.severity === severity).length
    })).filter((entry) => entry.count > 0)
}

export function findStatusComment(comments = []) {
    return comments.find(
        (comment) => comment.user?.type === 'Bot' && comment.body?.includes(MARKER_PREFIX)
    )
}

export function parseReviewsUsed(body) {
    const match = /reviews:(\d+) -->/.exec(String(body ?? ''))
    return match ? Number.parseInt(match[1], 10) : 0
}

export function readReviewsUsed(comments = []) {
    return parseReviewsUsed(findStatusComment(comments)?.body)
}

export function reviewSummaryPrompt(skills) {
    return [
        'Close out the automated review on this pull request.',
        '',
        '1. Read every inline review comment and the pre-review summary comment on the pull request.',
        '2. For each finding, confirm or refute it against the real code with the leo-systematic-debugging skill. Fix what holds with leo-tdd. Reply in the thread with what you did, or with the evidence that the finding does not hold.',
        `3. Then run these skills, in order: ${skills.join(', ')}.`,
        '4. Report the commands you ran and their output. Anything you could not verify is reported as unverified.',
        '',
        'This pull request has spent its automatic reviews, so nothing else will catch what is left.'
    ]
}

export function renderSkillPlan(skills) {
    const plan = skills?.length ? skills : DEFAULT_SKILLS
    return [
        `**Finish with the leo skills** — ${plan.map((skill) => `\`${skill}\``).join(' → ')}`,
        '',
        renderPromptBlock(reviewSummaryPrompt(plan))
    ].join('\n')
}

export function renderStatusComment({
    headSha,
    state,
    findings = [],
    unanchored = [],
    specStatus,
    specNote,
    skipReason,
    runUrl,
    reviewsUsed = 0,
    skills
}) {
    const lines = [`${MARKER_PREFIX} head:${headSha} reviews:${reviewsUsed} -->`]
    const inspect = `[inspect run](${runUrl})`

    if (state === 'exhausted') {
        lines.push(
            `⚪ no automatic review: this pull request has used its ${MAX_REVIEWS} reviews. Earlier findings stay on the diff.`,
            '',
            renderSkillPlan(skills)
        )
        return lines.join('\n')
    }
    if (state === 'skipped') {
        lines.push(`⚪ skipped: ${escapeInline(skipReason)}.`)
        return lines.join('\n')
    }
    if (state !== 'reviewed') {
        const cause = FAILURE_CAUSES[state] ?? 'the review job did not finish'
        lines.push(`🔴 review unavailable: ${cause}. ${inspect}.`)
        return lines.join('\n')
    }

    const counts = countBySeverity(findings)
    const inlineCount = findings.length - unanchored.length
    lines.push(
        `Reviewed \`${escapeInline(headSha.slice(0, 12))}\` — review ${reviewsUsed} of ${MAX_REVIEWS}.`
    )
    lines.push(
        counts.length === 0
            ? '✅ clean.'
            : `${counts
                  .map((entry) => `${SEVERITY_SHORT_LABELS[entry.severity]} ×${entry.count}`)
                  .join(' · ')}${inlineCount > 0 ? ' — commented inline on the diff.' : '.'}`
    )
    if (unanchored.length > 0) {
        lines.push('', `Could not be attached to the diff (${inspect}):`)
        lines.push(
            ...unanchored.map(
                (finding) =>
                    `- ${escapeInline(finding.path)}:L${finding.line}: ${SEVERITY_SHORT_LABELS[finding.severity]}: ${escapeInline(finding.problem)}. ${escapeInline(finding.fix)}.`
            )
        )
    }
    if (specStatus !== 'verified') {
        lines.push(
            `⚪ spec ${escapeInline(specStatus)}: ${escapeInline(specNote) || 'incomplete issue context'}.`
        )
    }
    if (reviewsUsed >= MAX_REVIEWS) lines.push('', renderSkillPlan(skills))

    return lines.join('\n')
}

// A review body cannot be edited after the fact and every rerun adds another one, so it carries
// no counts and no verdict — those live in the status comment, which is updated in place.
export function renderReviewBody(headSha) {
    return `${MARKER_PREFIX} review head:${headSha} -->\nFindings inline below; summary in the pre-review comment.`
}
