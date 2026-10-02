import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const SKILLS = resolve(dirname(fileURLToPath(import.meta.url)), '../plugins/leo/skills')
const script = (skill, name) => join(SKILLS, skill, 'scripts', name)

function sh(cwd, cmd, args = []) {
    const r = spawnSync(cmd, args, { cwd, encoding: 'utf8' })
    return { code: r.status, out: `${r.stdout}${r.stderr}` }
}

function run(cwd, skill, name, args = []) {
    return sh(cwd, 'bash', [script(skill, name), ...args])
}

function git(cwd, ...args) {
    const r = sh(cwd, 'git', args)
    assert.equal(r.code, 0, r.out)
    return r.out.trim()
}

function write(root, path, text) {
    mkdirSync(dirname(join(root, path)), { recursive: true })
    writeFileSync(join(root, path), text)
}

function commit(root, message) {
    git(root, 'add', '-A')
    git(root, '-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-q', '-m', message)
    return git(root, 'rev-parse', 'HEAD')
}

function repo(commands = {}) {
    const root = mkdtempSync(join(tmpdir(), 'leo-scripts-'))
    git(root, 'init', '-q', '-b', 'main')
    const lines = ['test', 'lint', 'typecheck', 'build'].map((k) => `- ${k}: ${commands[k] ?? ''}`)
    write(root, '.agents/leo.md', `# leo adapter\n\n## Commands\n${lines.join('\n')}\n- dev: sleep 999\n\n## Git\n- base-branch: main\n`)
    write(root, 'src/app.sh', 'echo one\n')
    commit(root, 'init')
    return root
}

// verify

test('verify passes when every set command passes and writes a transcript', () => {
    const root = repo({ test: 'echo tests-ran', lint: 'true' })
    const r = run(root, 'leo-trust-but-verify', 'verify', ['out.txt'])
    assert.equal(r.code, 0, r.out)
    assert.match(r.out, /ok test/)
    assert.match(r.out, /skip typecheck \(blank\)/)
    const transcript = readFileSync(join(root, 'out.txt'), 'utf8')
    assert.match(transcript, /\$ echo tests-ran\nexit: 0\ntests-ran/)
})

test('verify fails on a failing command and never runs dev', () => {
    const root = repo({ test: 'true', lint: 'exit 3' })
    const r = run(root, 'leo-trust-but-verify', 'verify', ['out.txt'])
    assert.equal(r.code, 1)
    assert.match(r.out, /FAIL lint \(exit 3\)/)
    assert.doesNotMatch(readFileSync(join(root, 'out.txt'), 'utf8'), /sleep 999/)
})

test('verify fails on leftover __ scratch files', () => {
    const root = repo({ test: 'true' })
    write(root, 'src/__probe.js', 'x\n')
    const r = run(root, 'leo-trust-but-verify', 'verify', ['out.txt'])
    assert.equal(r.code, 1)
    assert.match(r.out, /src\/__probe\.js/)
})

test('verify strips backticks around a command', () => {
    const root = repo({ test: '`echo quoted`' })
    const r = run(root, 'leo-trust-but-verify', 'verify', ['out.txt'])
    assert.equal(r.code, 0, r.out)
})

// gauntlet

test('tree-hash equals HEAD^{tree} on a clean tree and changes with any edit', () => {
    const root = repo()
    const clean = run(root, 'leo-gauntlet', 'tree-hash').out.trim()
    assert.equal(clean, git(root, 'rev-parse', 'HEAD^{tree}'))
    write(root, 'new-untracked.txt', 'x\n')
    assert.notEqual(run(root, 'leo-gauntlet', 'tree-hash').out.trim(), clean)
    assert.equal(git(root, 'status', '--porcelain'), '?? new-untracked.txt', 'tree-hash must not touch the real index')
})

test('live-fingerprint changes only when a customer-facing path changes', () => {
    const root = repo()
    git(root, 'checkout', '-q', '-b', 'feature')
    const fp = () => run(root, 'leo-gauntlet', 'live-fingerprint', ['main', 'ui/']).out.trim()
    const before = fp()
    write(root, 'src/app.sh', 'echo two\n')
    assert.equal(fp(), before)
    write(root, 'ui/page.html', '<p>hi</p>\n')
    assert.notEqual(fp(), before)
    const whole = () => run(root, 'leo-gauntlet', 'live-fingerprint', ['main']).out.trim()
    const w1 = whole()
    write(root, 'src/app.sh', 'echo three\n')
    assert.notEqual(whole(), w1, 'no pathspec hashes the whole diff')
})

function report(root, tree, verdict, result, rows = []) {
    const table = ['| severity | stage | file:line | finding | status |', '|---|---|---|---|---|', ...rows].join('\n')
    write(root, `.agents/gauntlet/${tree}.md`, `tree: ${tree}\nverdict: ${verdict}\nresult: ${result}\n\n${table}\n`)
    write(root, '.agents/gauntlet/.gitignore', '*\n')
}

test('gate-check passes only a consistent passing report for the current tree', () => {
    const root = repo()
    const tree = git(root, 'rev-parse', 'HEAD^{tree}')
    assert.equal(run(root, 'leo-gauntlet', 'gate-check').code, 1, 'missing report')

    report(root, tree, 'PROVEN', 'pass', ['| low | code | a.ts:1 | nit | open |', '| high | security | b.ts:2 | authz | fixed |'])
    const ok = run(root, 'leo-gauntlet', 'gate-check')
    assert.equal(ok.code, 0, ok.out)
    assert.match(ok.out, /gauntlet gate: pass/)

    report(root, tree, 'NOT YET', 'pass')
    assert.match(run(root, 'leo-gauntlet', 'gate-check').out, /says result: pass but/)

    report(root, tree, 'PROVEN', 'pass', ['| high | bugs | c.ts:3 | race | open |'])
    assert.equal(run(root, 'leo-gauntlet', 'gate-check').code, 1)

    report(root, tree, 'PROVEN', 'fail')
    assert.equal(run(root, 'leo-gauntlet', 'gate-check').code, 1)
})

test('gate-check rejects a report whose tree line does not match', () => {
    const root = repo()
    const tree = git(root, 'rev-parse', 'HEAD^{tree}')
    write(root, `.agents/gauntlet/${tree}.md`, 'tree: deadbeef\nverdict: PROVEN\nresult: pass\n')
    write(root, '.agents/gauntlet/.gitignore', '*\n')
    assert.match(run(root, 'leo-gauntlet', 'gate-check').out, /tree line/)
})

// leo-mode

test('log writes a header once and neutralises tabs and formula prefixes', () => {
    const root = repo()
    mkdirSync(join(root, 'task'))
    run(root, 'leo-mode', 'log', ['task', 'frame', 'picked A', 'faster\tto check', 'abc', 'open'])
    run(root, 'leo-mode', 'log', ['task', 'fix', '=SUM(1)', 'why', 'src/app.sh', 'green'])
    const lines = readFileSync(join(root, 'task/decisions.tsv'), 'utf8').trim().split('\n')
    assert.equal(lines[0], 'ts\tphase\tdecision\twhy\tevidence\tresult')
    assert.equal(lines.length, 3)
    assert.equal(lines[1].split('\t')[3], 'faster to check')
    assert.equal(lines[2].split('\t')[2], "'=SUM(1)")
})

test('audit passes resolvable evidence and names rows that do not resolve', () => {
    const root = repo()
    const sha = git(root, 'rev-parse', '--short', 'HEAD')
    mkdirSync(join(root, 'task'))
    run(root, 'leo-mode', 'log', ['task', 'a', 'd', 'w', `commit ${sha}, src/app.sh:1, PR #12`, 'ok'])
    const ok = run(root, 'leo-mode', 'audit', ['task'])
    assert.equal(ok.code, 0, ok.out)
    run(root, 'leo-mode', 'log', ['task', 'b', 'd', 'w', 'src/missing.ts:4, e.g. a note', 'ok'])
    const bad = run(root, 'leo-mode', 'audit', ['task'])
    assert.equal(bad.code, 1)
    assert.match(bad.out, /row 3: path src\/missing\.ts not found/)
    assert.doesNotMatch(bad.out, /e\.g/)
})

function bugRepo() {
    const root = repo()
    write(root, 'src/add.sh', 'echo $(( $1 - $2 ))\n')
    commit(root, 'buggy add')
    git(root, 'checkout', '-q', '-b', 'fix')
    write(root, 'test/add.test.sh', '[ "$(bash src/add.sh 2 3)" = 5 ]\n')
    return root
}

test('base-head --expect-fix passes when the new test fails on base and passes now', () => {
    const root = bugRepo()
    write(root, 'src/add.sh', 'echo $(( $1 + $2 ))\n')
    const r = run(root, 'leo-mode', 'base-head', ['--expect-fix', '--with', 'test/add.test.sh', 'main', '--', 'bash test/add.test.sh'])
    assert.equal(r.code, 0, r.out)
    assert.match(r.out, /base: exit 1/)
    assert.match(r.out, /head: exit 0/)
    assert.equal(git(root, 'worktree', 'list').split('\n').length, 1, 'temporary worktree removed')
})

test('base-head --expect-fix fails when the code is still broken', () => {
    const root = bugRepo()
    const r = run(root, 'leo-mode', 'base-head', ['--expect-fix', '--with', 'test/add.test.sh', 'main', '--', 'bash test/add.test.sh'])
    assert.equal(r.code, 1)
})

test('commit-proof accepts a red test commit followed by its fix', () => {
    const root = bugRepo()
    write(root, 'test.sh', 'for t in test/*.sh; do bash "$t" || exit 1; done\n')
    commit(root, 'test: failing add test')
    write(root, 'src/add.sh', 'echo $(( $1 + $2 ))\n')
    commit(root, 'fix: add')
    const r = run(root, 'leo-mode', 'commit-proof', ['main', '--', 'bash test.sh'])
    assert.equal(r.code, 0, r.out)
    assert.match(r.out, /red .*failing add test/)
})

test('commit-proof rejects a red commit that is not followed by a green one', () => {
    const root = bugRepo()
    write(root, 'test.sh', 'for t in test/*.sh; do bash "$t" || exit 1; done\n')
    commit(root, 'test: failing add test')
    write(root, 'README', 'docs\n')
    commit(root, 'docs')
    const r = run(root, 'leo-mode', 'commit-proof', ['main', '--', 'bash test.sh'])
    assert.equal(r.code, 1)
    assert.match(r.out, /red and not fixed by the next commit/)
})

// leo-writing

test('prose-lint flags catchable writing patterns outside code fences', () => {
    const root = mkdtempSync(join(tmpdir(), 'leo-prose-'))
    write(root, 'bad.md', 'We delve in — fast.\n“Quoted” text.\nI hope this helps!\nStep: TBD\n```\nconst a = "—"\n```\n')
    write(root, 'good.md', 'The parser rejects a bad date and exits with code 2.\n')
    const bad = sh(root, 'bash', [script('leo-writing', 'prose-lint'), 'bad.md'])
    assert.equal(bad.code, 1)
    for (const rule of ['rule 3', 'rule 9', 'rule 15', 'rule 16', 'placeholder']) assert.match(bad.out, new RegExp(rule))
    assert.doesNotMatch(bad.out, /bad\.md:6:/, 'code fences are skipped')
    assert.equal(sh(root, 'bash', [script('leo-writing', 'prose-lint'), 'good.md']).code, 0)
})

test('scripts exist and are executable', () => {
    for (const [skill, name] of [
        ['leo-trust-but-verify', 'verify'],
        ['leo-gauntlet', 'tree-hash'],
        ['leo-gauntlet', 'live-fingerprint'],
        ['leo-gauntlet', 'gate-check'],
        ['leo-mode', 'log'],
        ['leo-mode', 'audit'],
        ['leo-mode', 'base-head'],
        ['leo-mode', 'commit-proof'],
        ['leo-writing', 'prose-lint'],
    ]) {
        assert.ok(existsSync(script(skill, name)), `${skill}/scripts/${name}`)
        assert.equal(sh(SKILLS, 'test', ['-x', script(skill, name)]).code, 0, `${name} executable`)
    }
})
