import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const SCRIPTS = resolve(dirname(fileURLToPath(import.meta.url)), '../scripts')

function sh(cwd, cmd, args) {
    const r = spawnSync(cmd, args, { cwd, encoding: 'utf8' })
    return { code: r.status, out: `${r.stdout}${r.stderr}` }
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
}

const manifest = (v) => `{ "name": "leo", "version": "${v}" }\n`

function repo() {
    const root = mkdtempSync(join(tmpdir(), 'leo-release-'))
    git(root, 'init', '-q', '-b', 'main')
    write(root, 'plugins/leo/.claude-plugin/plugin.json', manifest('0.1.0'))
    write(root, 'plugins/leo/skills/leo-a/SKILL.md', 'a\n')
    write(root, 'README.md', 'r\n')
    commit(root, 'init')
    git(root, 'checkout', '-q', '-b', 'work')
    return root
}

const versionCheck = (root) => sh(root, 'node', [join(SCRIPTS, 'version-check.mjs'), 'main'])

test('version-check fails when skills change without a version bump', () => {
    const root = repo()
    write(root, 'plugins/leo/skills/leo-a/SKILL.md', 'b\n')
    commit(root, 'change skill')
    const r = versionCheck(root)
    assert.equal(r.code, 1, r.out)
    assert.match(r.out, /plugins\/ changed but version stays 0\.1\.0/)
})

test('version-check passes when the version goes up', () => {
    const root = repo()
    write(root, 'plugins/leo/skills/leo-a/SKILL.md', 'b\n')
    write(root, 'plugins/leo/.claude-plugin/plugin.json', manifest('0.2.0'))
    commit(root, 'change skill and bump')
    const r = versionCheck(root)
    assert.equal(r.code, 0, r.out)
    assert.match(r.out, /0\.1\.0 -> 0\.2\.0/)
})

test('version-check fails when the version goes down', () => {
    const root = repo()
    write(root, 'plugins/leo/.claude-plugin/plugin.json', manifest('0.0.9'))
    commit(root, 'lower')
    assert.equal(versionCheck(root).code, 1)
})

test('version-check passes when nothing under plugins/ changed', () => {
    const root = repo()
    write(root, 'README.md', 'docs\n')
    commit(root, 'docs')
    assert.equal(versionCheck(root).code, 0)
})

test('version-check compares numerically, not as text', () => {
    const root = repo()
    write(root, 'plugins/leo/.claude-plugin/plugin.json', manifest('0.10.0'))
    commit(root, 'bump to 0.10.0')
    assert.equal(versionCheck(root).code, 0)
})

test('changelog-section prints one version body and fails on a missing version', () => {
    const root = mkdtempSync(join(tmpdir(), 'leo-changelog-'))
    write(root, 'CHANGELOG.md', '# Changelog\n\n## [0.2.0] - 2026-10-02\n\n### Added\n\n- New.\n\n## [0.1.0] - 2026-09-28\n\n- Old.\n')
    const r = sh(root, 'node', [join(SCRIPTS, 'changelog-section.mjs'), '0.2.0'])
    assert.equal(r.code, 0, r.out)
    assert.equal(r.out.trim(), '### Added\n\n- New.')
    assert.equal(sh(root, 'node', [join(SCRIPTS, 'changelog-section.mjs'), '9.9.9']).code, 1)
})
