import assert from 'node:assert/strict'
import { execFile as execFileCallback } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'

import {
    changedHeadLines,
    isPublishableSuggestion,
    normalizeFinding,
    validateLocations,
    validateShape
} from './validate-output.mjs'

const execFile = promisify(execFileCallback)

const validResult = {
    findings: [
        {
            severity: 'bug',
            path: 'src/changed.ts',
            line: 12,
            problem: 'Returns the wrong value',
            fix: 'Return the computed value'
        }
    ],
    spec_status: 'partial',
    spec_note: 'Parent issue was unavailable'
}

test('validates the trusted output shape', () => {
    assert.equal(validateShape(validResult), true)
    assert.equal(
        validateShape({ ...validResult, findings: [{ ...validResult.findings[0], line: 0 }] }),
        false
    )
    assert.equal(validateShape({ ...validResult, spec_status: 'complete' }), false)
})

test('accepts an optional range and suggestion, and rejects malformed ones', () => {
    const ranged = {
        ...validResult,
        findings: [
            {
                ...validResult.findings[0],
                end_line: 14,
                suggestion: 'return computed'
            }
        ]
    }
    assert.equal(validateShape(ranged), true)
    assert.equal(
        validateShape({
            ...validResult,
            findings: [{ ...validResult.findings[0], end_line: null, suggestion: null }]
        }),
        true
    )
    assert.equal(
        validateShape({
            ...validResult,
            findings: [{ ...validResult.findings[0], end_line: 0 }]
        }),
        false
    )
    assert.equal(
        validateShape({
            ...validResult,
            findings: [{ ...validResult.findings[0], suggestion: 'x'.repeat(1201) }]
        }),
        false
    )
})

test('keeps the schema and the validator uncapped together', async () => {
    const schema = JSON.parse(
        await readFile(new URL('./review-output.schema.json', import.meta.url), 'utf8')
    )

    assert.equal(schema.properties.findings.maxItems, undefined)
    assert.equal(
        validateShape({ ...validResult, findings: Array(40).fill(validResult.findings[0]) }),
        true
    )
})

test('refuses a suggestion that could break out of its fence or flood the thread', () => {
    assert.equal(isPublishableSuggestion('return computed'), true)
    assert.equal(isPublishableSuggestion('```js\nreturn computed\n```'), false)
    assert.equal(isPublishableSuggestion('return\r\ncomputed'), false)
    assert.equal(isPublishableSuggestion(Array(41).fill('line').join('\n')), false)
    assert.equal(isPublishableSuggestion(undefined), false)
})

test('keeps a range only when the trusted diff covers every line in it', () => {
    const finding = {
        ...validResult.findings[0],
        line: 12,
        end_line: 14,
        suggestion: 'return computed'
    }

    assert.deepEqual(normalizeFinding(finding, new Set([12, 13, 14])), {
        severity: 'bug',
        path: 'src/changed.ts',
        line: 12,
        end_line: 14,
        problem: 'Returns the wrong value',
        fix: 'Return the computed value',
        suggestion: 'return computed'
    })

    // The suggestion was written for lines 12-14, so a range the diff cannot prove drops both.
    assert.deepEqual(normalizeFinding(finding, new Set([12, 14])), {
        severity: 'bug',
        path: 'src/changed.ts',
        line: 12,
        problem: 'Returns the wrong value',
        fix: 'Return the computed value'
    })

    assert.deepEqual(
        normalizeFinding({ ...finding, end_line: null }, new Set([12])).suggestion,
        'return computed'
    )
})

test('extracts only changed head-side lines from zero-context patches', () => {
    const patch = [
        '@@ -10,0 +11,2 @@',
        '+first',
        '+second',
        '@@ -20,1 +22 @@',
        '-old',
        '+new',
        '@@ -30,2 +31,0 @@',
        '-deleted',
        '-deleted'
    ].join('\n')

    assert.deepEqual([...changedHeadLines(patch)], [11, 12, 22])
})

test('drops findings outside the trusted changed paths and lines', async () => {
    const result = {
        ...validResult,
        findings: [
            validResult.findings[0],
            { ...validResult.findings[0], path: 'src/untouched.ts' },
            { ...validResult.findings[0], line: 99 }
        ]
    }
    const git = async (args) => {
        if (args.includes('--name-only')) return Buffer.from('src/changed.ts\0')
        return Buffer.from('@@ -10,0 +12,1 @@\n+changed\n')
    }

    const validated = await validateLocations(result, 'base', 'head', git)
    assert.deepEqual(validated.findings, [validResult.findings[0]])
})

test('names the empty-output cause instead of throwing a JSON parse trace', async () => {
    const scriptPath = fileURLToPath(new URL('./validate-output.mjs', import.meta.url))

    await assert.rejects(
        execFile(process.execPath, [scriptPath], {
            env: {
                ...process.env,
                BASE_SHA: 'base',
                HEAD_SHA: 'head',
                CODEX_FINAL_MESSAGE: ''
            }
        }),
        (error) => {
            assert.equal(error.code, 1)
            assert.match(error.stderr, /Codex produced no output/)
            assert.doesNotMatch(error.stderr, /SyntaxError/)
            assert.doesNotMatch(error.stderr, /Unexpected end of JSON input/)
            return true
        }
    )
})

test('runs the validator entry point against an actual git diff', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'review-validator-'))
    try {
        const git = (...args) => execFile('git', args, { cwd: directory })
        await git('init', '-b', 'main')
        await git('config', 'user.email', 'review@example.com')
        await git('config', 'user.name', 'Review Test')
        await writeFile(join(directory, 'changed.ts'), 'first\n')
        await git('add', 'changed.ts')
        await git('commit', '-m', 'chore: base')
        const { stdout: baseSha } = await git('rev-parse', 'HEAD')

        await writeFile(join(directory, 'changed.ts'), 'first\nsecond\n')
        await git('add', 'changed.ts')
        await git('commit', '-m', 'feat: add second line')
        const { stdout: headSha } = await git('rev-parse', 'HEAD')
        const outputPath = join(directory, 'nested', 'findings.json')

        const result = {
            ...validResult,
            findings: [{ ...validResult.findings[0], path: 'changed.ts', line: 2 }]
        }
        await execFile(
            process.execPath,
            [fileURLToPath(new URL('./validate-output.mjs', import.meta.url))],
            {
                cwd: directory,
                env: {
                    ...process.env,
                    BASE_SHA: baseSha.trim(),
                    HEAD_SHA: headSha.trim(),
                    CODEX_FINAL_MESSAGE: JSON.stringify(result),
                    REVIEW_OUTPUT_FILE: outputPath
                }
            }
        )

        assert.deepEqual(JSON.parse(await readFile(outputPath, 'utf8')), result)
    } finally {
        await rm(directory, { recursive: true, force: true })
    }
})
