import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { cpSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const script = fileURLToPath(new URL('../install.sh', import.meta.url))

function fakeRepo() {
    const root = mkdtempSync(join(tmpdir(), 'leo-install-'))
    cpSync(script, join(root, 'install.sh'))
    const skill = join(root, 'plugins/leo/skills/leo-a')
    mkdirSync(skill, { recursive: true })
    writeFileSync(join(skill, 'SKILL.md'), '---\nname: leo-a\ndescription: A.\n---\n')
    const home = join(root, 'home')
    mkdirSync(home)
    return { root, home }
}

function run({ root, home }, args) {
    return spawnSync('bash', [join(root, 'install.sh'), ...args], {
        env: { ...process.env, HOME: home, CODEX_HOME: '' },
        encoding: 'utf8',
    })
}

test('claude target copies into ~/.claude/skills', () => {
    const repo = fakeRepo()
    assert.equal(run(repo, ['--target', 'claude']).status, 0)
    const dest = join(repo.home, '.claude/skills/leo-a/SKILL.md')
    assert.ok(existsSync(dest))
    assert.equal(lstatSync(join(repo.home, '.claude/skills/leo-a')).isSymbolicLink(), false)
})

test('--link symlinks instead of copying', () => {
    const repo = fakeRepo()
    assert.equal(run(repo, ['--target', 'claude', '--link']).status, 0)
    assert.ok(lstatSync(join(repo.home, '.claude/skills/leo-a')).isSymbolicLink())
})

test('--project installs into the project', () => {
    const repo = fakeRepo()
    const project = join(repo.root, 'proj')
    mkdirSync(project)
    assert.equal(run(repo, ['--target', 'claude', '--project', project]).status, 0)
    assert.ok(existsSync(join(project, '.claude/skills/leo-a/SKILL.md')))
})

test('codex target installs into ~/.agents/skills', () => {
    const repo = fakeRepo()
    assert.equal(run(repo, ['--target', 'codex']).status, 0)
    assert.ok(existsSync(join(repo.home, '.agents/skills/leo-a/SKILL.md')))
})

test('agents target requires --project', () => {
    const repo = fakeRepo()
    assert.equal(run(repo, ['--target', 'agents']).status, 2)
})

test('unknown target prints usage', () => {
    const result = run(fakeRepo(), ['--target', 'nope'])
    assert.equal(result.status, 2)
    assert.match(result.stderr, /usage:/)
})

test('rerun is idempotent', () => {
    const repo = fakeRepo()
    run(repo, ['--target', 'claude'])
    const before = readFileSync(join(repo.home, '.claude/skills/leo-a/SKILL.md'), 'utf8')
    assert.equal(run(repo, ['--target', 'claude']).status, 0)
    assert.equal(readFileSync(join(repo.home, '.claude/skills/leo-a/SKILL.md'), 'utf8'), before)
})

test('refuses to replace a foreign dir with the same name', () => {
    const repo = fakeRepo()
    const foreign = join(repo.home, '.claude/skills/leo-a')
    mkdirSync(foreign, { recursive: true })
    writeFileSync(join(foreign, 'SKILL.md'), '---\nname: someone-else\n---\n')
    const result = run(repo, ['--target', 'claude'])
    assert.equal(result.status, 1)
    assert.match(result.stderr, /refusing to replace/)
    assert.match(readFileSync(join(foreign, 'SKILL.md'), 'utf8'), /someone-else/)
})
