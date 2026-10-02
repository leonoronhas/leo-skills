export const SEMVER = /^(\d+)\.(\d+)\.(\d+)$/

export function compare(a, b) {
    const pa = a.match(SEMVER).slice(1).map(Number)
    const pb = b.match(SEMVER).slice(1).map(Number)
    for (let i = 0; i < 3; i++) if (pa[i] !== pb[i]) return pa[i] - pb[i]
    return 0
}

export function versionOf(manifestText) {
    return JSON.parse(manifestText).version
}
