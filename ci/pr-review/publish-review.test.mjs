import assert from 'node:assert/strict'
import { execFile as execFileCallback } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const execFile = promisify(execFileCallback)

import {
    MARKER_PREFIX,
    MAX_REVIEWS,
    fingerprintFinding,
    parseReviewsUsed,
    planReviewComments,
    readReviewFindings,
    readReviewsUsed,
    renderFindingBody,
    renderReviewBody,
    renderStatusComment,
    toReviewComment
} from './publish-review.mjs'

const workflowPath = new URL('./codex-pr-review.yml', import.meta.url)

// Consumers copy this directory to .github/leo-pr-review, and the workflow imports the publisher
// from there, so the harness builds that layout instead of assuming the repo root.
async function makeWorkspace() {
    const workspace = await mkdtemp(join(tmpdir(), 'leo-review-workspace-'))
    await mkdir(join(workspace, '.github'), { recursive: true })
    await symlink(fileURLToPath(new URL('.', import.meta.url)), join(workspace, '.github/leo-pr-review'))
    return workspace
}

const botComment = (id, line, body) => ({
    id,
    path: bug.path,
    line,
    body,
    user: { type: 'Bot', login: 'github-actions[bot]' }
})

const bug = {
    severity: 'bug',
    path: 'src/changed.ts',
    line: 12,
    problem: 'Returns the wrong value',
    fix: 'Return the computed value'
}

test('renders a finding as an inline comment body', () => {
    const body = renderFindingBody({ ...bug, problem: 'Breaks <Widget> for @everyone' })

    assert.match(body, new RegExp(`^${MARKER_PREFIX} finding:[0-9a-f]{16} -->`))
    assert.match(body, /🔴 \*\*bug\*\*/)
    assert.match(body, /&lt;Widget&gt;/)
    assert.ok(!body.includes('@everyone'))
    assert.ok(!body.includes('```suggestion'))
    assert.ok(
        renderFindingBody({ ...bug, fix: 'Call `reset()` and drop *all* state' }).includes(
            'Call \\`reset\\(\\)\\` and drop \\*all\\* state.'
        )
    )
})

test('renders a suggestion as a plain code block nobody can one-click commit', () => {
    const body = renderFindingBody({ ...bug, suggestion: 'const total = subtotal + tax' })

    assert.match(body, /Replacement for `src\/changed\.ts` L12:/)
    assert.match(body, /```ts\nconst total = subtotal \+ tax\n```\n/)
    assert.ok(!body.includes('```suggestion'))

    const ranged = renderFindingBody({ ...bug, end_line: 15, suggestion: 'return total' })
    assert.match(ranged, /Replacement for `src\/changed\.ts` L12-L15:/)

    const unknownType = renderFindingBody({
        ...bug,
        path: 'Makefile',
        suggestion: 'build:\n\tpnpm build'
    })
    assert.match(unknownType, /```\nbuild:/)
})

test('anchors single-line and multi-line comments the way GitHub expects', () => {
    assert.deepEqual(toReviewComment(bug), {
        path: 'src/changed.ts',
        side: 'RIGHT',
        line: 12,
        body: renderFindingBody(bug)
    })

    const ranged = { ...bug, end_line: 15 }
    assert.deepEqual(toReviewComment(ranged), {
        path: 'src/changed.ts',
        side: 'RIGHT',
        line: 15,
        start_line: 12,
        start_side: 'RIGHT',
        body: renderFindingBody(ranged)
    })
})

test('keeps an unchanged thread and replaces its own stale ones', () => {
    const unchanged = { ...bug, line: 20 }
    const reworded = { ...bug, problem: 'Returns a stale value' }
    const existing = [
        botComment(1, 20, renderFindingBody(unchanged)),
        botComment(2, 99, renderFindingBody(bug)),
        botComment(3, 20, renderFindingBody(unchanged)),
        { id: 4, path: bug.path, line: 5, body: 'a human review comment', user: { type: 'User' } }
    ]

    const plan = planReviewComments([unchanged, reworded], existing)

    assert.deepEqual(plan.keep, [1])
    assert.deepEqual(plan.create, [reworded])
    assert.deepEqual(plan.delete.sort(), [2, 3])
})

test('leaves a marked comment from another bot alone', () => {
    const impostor = {
        id: 9,
        path: bug.path,
        line: 12,
        body: renderFindingBody(bug),
        user: { type: 'Bot', login: 'some-other-app[bot]' }
    }

    const plan = planReviewComments([], [impostor])

    assert.deepEqual(plan.delete, [])
})

test('never deletes a thread somebody replied to', () => {
    const answered = { ...bug, line: 20 }
    const existing = [
        botComment(1, 20, renderFindingBody(answered)),
        {
            id: 2,
            path: bug.path,
            line: 20,
            in_reply_to_id: 1,
            body: 'this one is intentional',
            user: { type: 'User' }
        }
    ]

    const plan = planReviewComments([], existing)

    assert.deepEqual(plan.delete, [])
    assert.deepEqual(plan.create, [])
})

test('does not claim an inline comment when every finding was refused', () => {
    const body = renderStatusComment({
        headSha: 'abc123abc123',
        state: 'reviewed',
        findings: [bug],
        unanchored: [bug],
        specStatus: 'verified',
        specNote: '',
        runUrl: 'https://github.com/o/r/actions/runs/1'
    })

    assert.match(body, /🔴 bug ×1\.\n/)
    assert.ok(!body.includes('commented inline on the diff'))
})

test('summarises the review in one status comment', () => {
    const reviewed = renderStatusComment({
        headSha: '0d184760b5cbdeadbeef',
        state: 'reviewed',
        findings: [bug, { ...bug, severity: 'risk' }],
        specStatus: 'partial',
        specNote: 'no acceptance criteria',
        runUrl: 'https://github.com/o/r/actions/runs/1',
        reviewsUsed: 1
    })
    assert.match(reviewed, /Reviewed `0d184760b5cb` — review 1 of 2\./)
    assert.match(reviewed, /🔴 bug ×1 · 🟡 risk ×1 — commented inline on the diff\./)
    assert.match(reviewed, /⚪ spec partial: no acceptance criteria\./)

    const clean = renderStatusComment({
        headSha: 'abc123abc123',
        state: 'reviewed',
        findings: [],
        specStatus: 'verified',
        specNote: '',
        runUrl: 'https://github.com/o/r/actions/runs/1'
    })
    assert.match(clean, /✅ clean\./)
    assert.ok(!clean.includes('spec'))

    const skipped = renderStatusComment({
        headSha: 'abc123abc123',
        state: 'skipped',
        skipReason: 'documentation only',
        runUrl: 'https://github.com/o/r/actions/runs/1'
    })
    assert.match(skipped, /⚪ skipped: documentation only\./)

    const unavailable = renderStatusComment({
        headSha: 'abc123abc123',
        state: 'invalid',
        runUrl: 'https://github.com/o/r/actions/runs/1'
    })
    assert.match(unavailable, /🔴 review unavailable: invalid Codex output\./)
})

test('names the failing step instead of one catch-all sentence', () => {
    const cause = (state) =>
        renderStatusComment({
            headSha: 'abc123abc123',
            state,
            runUrl: 'https://github.com/o/r/actions/runs/1'
        })

    assert.match(
        cause('context-failed'),
        /🔴 review unavailable: preparing the review context failed\./
    )
    assert.match(
        cause('codex-failed'),
        /🔴 review unavailable: the Run Codex step did not finish\./
    )
    assert.match(
        cause('validate-failed'),
        /🔴 review unavailable: validating the findings against the diff failed\./
    )
    assert.match(cause('invalid'), /🔴 review unavailable: invalid Codex output\./)
    // A withheld payload is its own sentence, never the "invalid Codex output" the reviewer got
    // when GitHub redacted its findings — the review ran, its output did not arrive.
    assert.match(
        cause('withheld'),
        /🔴 review unavailable: the review finished but its findings did not reach the publisher\./
    )
    assert.ok(!cause('withheld').includes('invalid Codex output'))
    // Only a status that never reached the reporter still reads as the job not finishing.
    assert.match(cause('unavailable'), /🔴 review unavailable: the review job did not finish\./)
})

test('lists findings GitHub refused inline in the status comment', () => {
    const body = renderStatusComment({
        headSha: 'abc123abc123',
        state: 'reviewed',
        findings: [bug],
        unanchored: [bug],
        specStatus: 'verified',
        specNote: '',
        runUrl: 'https://github.com/o/r/actions/runs/1'
    })

    assert.match(body, /Could not be attached to the diff/)
    assert.match(body, /- src\/changed\.ts:L12: 🔴 bug: Returns the wrong value\./)
})

function extractInlineScript(workflow, stepName) {
    const step = workflow.indexOf(`- name: ${stepName}`)
    assert.notEqual(step, -1, `the workflow must keep a step named ${stepName}`)
    const marker = 'script: |\n'
    const start = workflow.indexOf(marker, step)
    assert.notEqual(start, -1, `${stepName} must keep an inline github-script block`)
    const lines = workflow.slice(start + marker.length).split('\n')
    const indent = /^ +/.exec(lines[0])[0]
    const body = []
    for (const line of lines) {
        if (line.trim() !== '' && !line.startsWith(indent)) break
        body.push(line.slice(indent.length))
    }
    return body.join('\n')
}

function extractRunScript(workflow, stepName) {
    const step = workflow.indexOf(`- name: ${stepName}`)
    assert.notEqual(step, -1, `the workflow must keep a step named ${stepName}`)
    const marker = 'run: |\n'
    const start = workflow.indexOf(marker, step)
    assert.notEqual(start, -1, `${stepName} must keep an inline run block`)
    const lines = workflow.slice(start + marker.length).split('\n')
    const indent = /^ +/.exec(lines[0])[0]
    const body = []
    for (const line of lines) {
        if (line.trim() !== '' && !line.startsWith(indent)) break
        body.push(line.slice(indent.length))
    }
    return body.join('\n')
}

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor

async function runPublishStep({ env, api }) {
    const script = extractInlineScript(
        await readFile(workflowPath, 'utf8'),
        'Comment the findings on the diff'
    )
    const calls = { deleted: [], reviews: [], singles: [], issueComments: [], warnings: [] }
    const github = {
        paginate: async (endpoint, parameters) => (await endpoint(parameters)).data,
        rest: {
            pulls: {
                get: async () => ({ data: { head: { sha: env.REVIEWED_HEAD_SHA } } }),
                listReviewComments: async () => ({ data: api.reviewComments ?? [] }),
                deleteReviewComment: async ({ comment_id }) => calls.deleted.push(comment_id),
                createReview: async (parameters) => {
                    if (api.failBatchedReview) throw new Error('line must be part of the diff')
                    calls.reviews.push(parameters)
                },
                createReviewComment: async (parameters) => {
                    if (api.failComment?.(parameters)) throw new Error('unprocessable location')
                    calls.singles.push(parameters)
                }
            },
            issues: {
                listComments: async () => ({ data: api.issueComments ?? [] }),
                createComment: async (parameters) =>
                    calls.issueComments.push({ action: 'create', ...parameters }),
                updateComment: async (parameters) =>
                    calls.issueComments.push({ action: 'update', ...parameters })
            }
        }
    }
    const context = {
        repo: { owner: 'acme', repo: 'app' },
        issue: { number: 7 },
        serverUrl: 'https://github.com',
        runId: 99
    }
    const core = { warning: (message) => calls.warnings.push(message) }

    const previous = { ...process.env }
    // The workflow ships the findings to the publisher as an artifact file, so the harness writes
    // whatever FINDINGS holds to a temp file and points REVIEW_FINDINGS_FILE at it.
    const stepEnv = { ...env }
    let findingsDir
    if (stepEnv.FINDINGS !== undefined) {
        findingsDir = await mkdtemp(join(tmpdir(), 'leo-review-publish-'))
        const findingsFile = join(findingsDir, 'findings.json')
        await writeFile(findingsFile, stepEnv.FINDINGS)
        delete stepEnv.FINDINGS
        stepEnv.REVIEW_FINDINGS_FILE = findingsFile
    }
    const workspace = await makeWorkspace()
    Object.assign(process.env, { GITHUB_WORKSPACE: workspace, ...stepEnv })
    try {
        await new AsyncFunction('require', 'github', 'context', 'core', script)(
            createRequire(import.meta.url),
            github,
            context,
            core
        )
    } finally {
        for (const key of Object.keys(process.env)) {
            if (!(key in previous)) delete process.env[key]
            else process.env[key] = previous[key]
        }
        if (findingsDir) await rm(findingsDir, { recursive: true, force: true })
        await rm(workspace, { recursive: true, force: true })
    }

    return calls
}

const reviewedEnv = {
    REVIEWED_HEAD_SHA: 'a'.repeat(40),
    REVIEW_STATUS: 'reviewed',
    SKIP_REASON: '',
    REVIEW_SKILLS: 'leo-simplify,leo-code-review,leo-trust-but-verify',
    FINDINGS: JSON.stringify({
        findings: [bug, { ...bug, severity: 'risk', line: 30, suggestion: 'return total' }],
        spec_status: 'partial',
        spec_note: 'no acceptance criteria'
    })
}

test('the publish step posts findings as one review of inline comments', async () => {
    const calls = await runPublishStep({ env: reviewedEnv, api: {} })

    assert.equal(calls.reviews.length, 1)
    const review = calls.reviews[0]
    assert.equal(review.event, 'COMMENT')
    assert.equal(review.commit_id, reviewedEnv.REVIEWED_HEAD_SHA)
    assert.deepEqual(
        review.comments.map((comment) => [comment.path, comment.line, comment.side]),
        [
            ['src/changed.ts', 12, 'RIGHT'],
            ['src/changed.ts', 30, 'RIGHT']
        ]
    )
    assert.match(review.comments[1].body, /```ts\nreturn total\n```/)
    assert.ok(!review.comments[1].body.includes('```suggestion'))
    assert.equal(calls.issueComments.length, 1)
    assert.equal(calls.issueComments[0].action, 'create')
    assert.match(calls.issueComments[0].body, /🔴 bug ×1 · 🟡 risk ×1/)
})

test('the publish step deletes its stale threads and updates its status comment', async () => {
    const calls = await runPublishStep({
        env: reviewedEnv,
        api: {
            reviewComments: [
                botComment(11, 12, renderFindingBody(bug)),
                botComment(12, 4, `${MARKER_PREFIX} finding:${'0'.repeat(16)} -->`),
                { id: 13, path: bug.path, line: 4, body: 'a human comment', user: { type: 'User' } }
            ],
            issueComments: [
                { id: 21, body: `${MARKER_PREFIX} head:old reviews:0 -->`, user: { type: 'Bot' } }
            ]
        }
    })

    assert.deepEqual(calls.deleted, [12])
    assert.equal(calls.reviews[0].comments.length, 1)
    assert.equal(calls.reviews[0].comments[0].line, 30)
    assert.deepEqual(
        calls.issueComments.map((comment) => [comment.action, comment.comment_id]),
        [['update', 21]]
    )
})

test('the publish step falls back to one post per comment when the batch is refused', async () => {
    const calls = await runPublishStep({
        env: reviewedEnv,
        api: {
            failBatchedReview: true,
            failComment: (parameters) => parameters.line === 30
        }
    })

    assert.equal(calls.reviews.length, 0)
    assert.deepEqual(
        calls.singles.map((comment) => comment.line),
        [12]
    )
    assert.equal(calls.warnings.length, 2)
    assert.match(calls.issueComments[0].body, /Could not be attached to the diff/)
    assert.match(calls.issueComments[0].body, /- src\/changed\.ts:L30: 🟡 risk:/)
})

test('the publish step leaves existing threads alone when the review produced nothing', async () => {
    const calls = await runPublishStep({
        env: {
            REVIEWED_HEAD_SHA: 'b'.repeat(40),
            REVIEW_STATUS: 'unavailable',
            SKIP_REASON: '',
            FINDINGS: ''
        },
        api: {
            reviewComments: [botComment(31, 12, renderFindingBody(bug))]
        }
    })

    assert.deepEqual(calls.deleted, [])
    assert.equal(calls.reviews.length, 0)
    assert.match(calls.issueComments[0].body, /🔴 review unavailable/)
})

test('the publish step treats output that parses but has no findings array as invalid', async () => {
    const calls = await runPublishStep({
        env: {
            REVIEWED_HEAD_SHA: 'c'.repeat(40),
            REVIEW_STATUS: 'reviewed',
            SKIP_REASON: '',
            FINDINGS: 'null'
        },
        api: { reviewComments: [botComment(41, 12, renderFindingBody(bug))] }
    })

    assert.deepEqual(calls.deleted, [])
    assert.equal(calls.reviews.length, 0)
    assert.match(calls.issueComments[0].body, /🔴 review unavailable: invalid Codex output/)
})

test('delivers findings whose text contains a secret-shaped token like Bearer', async () => {
    const authFinding = {
        severity: 'bug',
        path: 'src/auth.ts',
        line: 12,
        problem: 'Sends the Bearer token to the wrong host',
        fix: 'Send the Bearer header only to the API origin'
    }
    const calls = await runPublishStep({
        env: {
            REVIEWED_HEAD_SHA: 'f'.repeat(40),
            REVIEW_STATUS: 'reviewed',
            SKIP_REASON: '',
            FINDINGS: JSON.stringify({
                findings: [authFinding],
                spec_status: 'verified',
                spec_note: ''
            })
        },
        api: {}
    })

    // The word "Bearer" is why the whole review used to vanish: GitHub redacted it out of the job
    // output. The artifact channel carries it through.
    assert.equal(calls.reviews.length, 1)
    assert.equal(calls.reviews[0].comments.length, 1)
    assert.match(calls.reviews[0].comments[0].body, /Sends the Bearer token to the wrong host/)
})

test('the publish step names a withheld payload rather than posting invalid output', async () => {
    const calls = await runPublishStep({
        env: {
            REVIEWED_HEAD_SHA: 'e'.repeat(40),
            REVIEW_STATUS: 'reviewed',
            SKIP_REASON: '',
            FINDINGS: ''
        },
        api: { reviewComments: [botComment(71, 12, renderFindingBody(bug))] }
    })

    // review_status is 'reviewed', so the empty payload is withheld findings, not a missing review:
    // leave the existing threads alone and say so loudly, never "invalid Codex output".
    assert.deepEqual(calls.deleted, [])
    assert.equal(calls.reviews.length, 0)
    assert.match(
        calls.issueComments[0].body,
        /🔴 review unavailable: the review finished but its findings did not reach the publisher/
    )
    assert.ok(!calls.issueComments[0].body.includes('invalid Codex output'))
})

test('keeps counts out of the immutable review body', () => {
    const body = renderReviewBody('b3046a1677d3f59c340a72828076e9796810732a')

    assert.match(body, /^<!-- leo-pr-review review head:b3046a1677d3/)
    assert.match(body, /summary in the pre-review comment\./)
    assert.equal(/\d+ findings?/.test(body), false)
})

test('fingerprints separate findings that differ only in their suggestion', () => {
    assert.notEqual(
        fingerprintFinding(bug),
        fingerprintFinding({ ...bug, suggestion: 'return total' })
    )
})

test('carries a copy-pasteable agent prompt on every finding', () => {
    const body = renderFindingBody({ ...bug, end_line: 15, suggestion: 'return total' })

    assert.match(body, /Prompt to hand an agent:\n```text\n/)
    assert.match(body, /in src\/changed\.ts at lines 12-15/)
    assert.match(body, /leo-systematic-debugging/)
    assert.match(body, /leo-tdd/)
    assert.match(body, /leo-trust-but-verify/)

    // A backtick in model output would close the prompt fence early and drag the rest of the
    // comment into whatever the developer pastes.
    const backticked = renderFindingBody({ ...bug, problem: 'Calls `reset()` twice' })
    const prompt = backticked.slice(backticked.indexOf('```text'))
    assert.equal(prompt.split('```').length, 3)
})

test('reads the findings file, or an empty string when it is absent', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'leo-review-findings-'))
    try {
        const path = join(dir, 'findings.json')
        await writeFile(path, '{"findings":[]}')
        assert.equal(readReviewFindings(path), '{"findings":[]}')
        assert.equal(readReviewFindings(join(dir, 'missing.json')), '')
        assert.equal(readReviewFindings(undefined), '')
    } finally {
        await rm(dir, { recursive: true, force: true })
    }
})

test('reads and writes the review tally in the status comment marker', () => {
    assert.equal(parseReviewsUsed(`${MARKER_PREFIX} head:abc reviews:2 -->`), 2)
    assert.equal(parseReviewsUsed(`${MARKER_PREFIX} head:abc -->`), 0)
    assert.equal(parseReviewsUsed(undefined), 0)
    assert.equal(
        readReviewsUsed([
            { body: 'a human comment', user: { type: 'User' } },
            { body: `${MARKER_PREFIX} head:abc reviews:1 -->`, user: { type: 'Bot' } }
        ]),
        1
    )
})

test('recommends the skills once the last review is spent', () => {
    const skills = ['leo-simplify', 'leo-code-review', 'leo-trust-but-verify']
    const first = renderStatusComment({
        headSha: 'abc123abc123',
        state: 'reviewed',
        findings: [bug],
        specStatus: 'verified',
        specNote: '',
        runUrl: 'https://github.com/o/r/actions/runs/1',
        reviewsUsed: 1,
        skills
    })
    assert.match(first, /review 1 of 2\./)
    assert.ok(!first.includes('Finish with the leo skills'))

    const last = renderStatusComment({
        headSha: 'abc123abc123',
        state: 'reviewed',
        findings: [bug],
        specStatus: 'verified',
        specNote: '',
        runUrl: 'https://github.com/o/r/actions/runs/1',
        reviewsUsed: MAX_REVIEWS,
        skills
    })
    assert.match(last, /review 2 of 2\./)
    assert.match(last, /Finish with the leo skills.*leo-simplify.*leo-trust-but-verify/)
    assert.match(last, /Prompt to hand an agent:\n```text\n/)
})

test('answers a push past the budget with the skill plan and nothing else', () => {
    const body = renderStatusComment({
        headSha: 'abc123abc123',
        state: 'exhausted',
        runUrl: 'https://github.com/o/r/actions/runs/1',
        reviewsUsed: 2,
        skills: ['leo-code-review', 'leo-security-review']
    })

    assert.match(body, new RegExp(`^${MARKER_PREFIX} head:abc123abc123 reviews:2 -->`))
    assert.match(body, /used its 2 reviews/)
    assert.match(body, /leo-security-review/)
    assert.ok(!body.includes('review unavailable'))
})

test('the publish step counts the review it just published', async () => {
    const calls = await runPublishStep({
        env: reviewedEnv,
        api: {
            issueComments: [
                { id: 21, body: `${MARKER_PREFIX} head:old reviews:1 -->`, user: { type: 'Bot' } }
            ]
        }
    })

    assert.match(calls.issueComments[0].body, /reviews:2 -->/)
    assert.match(calls.issueComments[0].body, /Finish with the leo skills/)
})

test('the publish step leaves the tally and the threads alone once the budget is spent', async () => {
    const calls = await runPublishStep({
        env: {
            REVIEWED_HEAD_SHA: 'd'.repeat(40),
            REVIEW_STATUS: 'exhausted',
            SKIP_REASON: 'automatic review budget spent (2 of 2)',
            REVIEW_SKILLS: 'leo-code-review,leo-trust-but-verify',
            FINDINGS: ''
        },
        api: {
            reviewComments: [botComment(51, 12, renderFindingBody(bug))],
            issueComments: [
                { id: 61, body: `${MARKER_PREFIX} head:old reviews:2 -->`, user: { type: 'Bot' } }
            ]
        }
    })

    assert.deepEqual(calls.deleted, [])
    assert.equal(calls.reviews.length, 0)
    assert.match(calls.issueComments[0].body, /reviews:2 -->/)
    assert.match(calls.issueComments[0].body, /used its 2 reviews/)
})

test('the status step names which step failed rather than one shared status', async () => {
    const script = extractRunScript(
        await readFile(workflowPath, 'utf8'),
        'Report what the review produced'
    )
    const dir = await mkdtemp(join(tmpdir(), 'leo-review-status-'))
    try {
        const statusFor = async (key, env) => {
            const outputPath = join(dir, `${key}.txt`)
            await writeFile(outputPath, '')
            await execFile('bash', ['-c', script], {
                env: { ...process.env, GITHUB_OUTPUT: outputPath, ...env }
            })
            return /review_status=(\S+)/.exec(await readFile(outputPath, 'utf8'))?.[1]
        }

        const reviewed = {
            BUDGET_SPENT: 'false',
            CONTEXT_OUTCOME: 'success',
            SHOULD_REVIEW: 'true',
            CODEX_OUTCOME: 'success',
            VALIDATE_OUTCOME: 'success'
        }

        assert.equal(await statusFor('reviewed', reviewed), 'reviewed')
        assert.equal(
            await statusFor('exhausted', { ...reviewed, BUDGET_SPENT: 'true' }),
            'exhausted'
        )
        assert.equal(
            await statusFor('context', { ...reviewed, CONTEXT_OUTCOME: 'failure' }),
            'context-failed'
        )
        assert.equal(await statusFor('skipped', { ...reviewed, SHOULD_REVIEW: 'false' }), 'skipped')
        assert.equal(
            await statusFor('codex', { ...reviewed, CODEX_OUTCOME: 'failure' }),
            'codex-failed'
        )
        assert.equal(
            await statusFor('validate', { ...reviewed, VALIDATE_OUTCOME: 'failure' }),
            'validate-failed'
        )
    } finally {
        await rm(dir, { recursive: true, force: true })
    }
})

test('no step in the workflow may fail the pull request', async () => {
    const workflow = await readFile(workflowPath, 'utf8')
    const steps = workflow.split('\n').filter((line) => /^ {12}- name: /.test(line))
    const guarded = workflow.split('\n').filter((line) => line.trim() === 'continue-on-error: true')

    assert.ok(steps.length > 0)
    assert.equal(guarded.length, steps.length)
})

test('the budget step reads the tally off the previous status comment', async () => {
    const script = extractInlineScript(
        await readFile(workflowPath, 'utf8'),
        'Count the reviews already published'
    )
    const outputs = {}
    const github = {
        paginate: async (endpoint, parameters) => (await endpoint(parameters)).data,
        rest: {
            issues: {
                listComments: async () => ({
                    data: [
                        { body: 'a human comment', user: { type: 'User' } },
                        {
                            body: `${MARKER_PREFIX} head:old reviews:2 -->`,
                            user: { type: 'Bot' }
                        }
                    ]
                })
            }
        }
    }
    const context = { repo: { owner: 'acme', repo: 'app' }, issue: { number: 7 } }
    const core = { setOutput: (name, value) => (outputs[name] = value) }

    const previous = process.env.GITHUB_WORKSPACE
    const workspace = await makeWorkspace()
    process.env.GITHUB_WORKSPACE = workspace
    try {
        await new AsyncFunction('require', 'github', 'context', 'core', script)(
            createRequire(import.meta.url),
            github,
            context,
            core
        )
    } finally {
        if (previous === undefined) delete process.env.GITHUB_WORKSPACE
        else process.env.GITHUB_WORKSPACE = previous
        await rm(workspace, { recursive: true, force: true })
    }

    assert.equal(outputs.reviews_used, 2)
})

test('the workflow imports the scripts from where consumers copy them', async () => {
    const workflow = await readFile(workflowPath, 'utf8')

    assert.match(workflow, /\.github\/leo-pr-review\/publish-review\.mjs/)
    assert.match(workflow, /\.github\/leo-pr-review\/prepare-context\.mjs/)
    assert.match(workflow, /\.github\/leo-pr-review\/validate-output\.mjs/)
    assert.match(workflow, /vars\.LEO_PR_REVIEW_ENABLED == 'true'/)
})

test('the default skill plan always includes the security review', () => {
    const body = renderStatusComment({
        headSha: 'abc123abc123',
        state: 'exhausted',
        runUrl: 'https://github.com/o/r/actions/runs/1',
        reviewsUsed: 2
    })

    assert.match(body, /leo-simplify.*leo-code-review.*leo-security-review.*leo-trust-but-verify/)
})
