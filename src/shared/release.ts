import type { UpdateInfo } from './types'

function parts(version: string): number[] {
  const core = version.trim().replace(/^v/i, '').split(/[-+]/)[0]
  return core.split('.').map((n) => {
    const v = Number.parseInt(n, 10)
    return Number.isFinite(v) ? v : 0
  })
}

export function compareSemver(a: string, b: string): number {
  const pa = parts(a)
  const pb = parts(b)
  const len = Math.max(pa.length, pb.length)
  for (let i = 0; i < len; i++) {
    const x = pa[i] ?? 0
    const y = pb[i] ?? 0
    if (x !== y) {
      return x > y ? 1 : -1
    }
  }
  return 0
}

export function isNewer(latest: string, current: string): boolean {
  return compareSemver(latest, current) > 0
}

export type AppArch = 'arm64' | 'x64'

export type AtomRelease = {
  tag: string
  version: string
  releaseUrl: string
}

// Feed titles are human text; tag links provide the stable machine-readable version.
export function parseReleasesAtom(xml: string): AtomRelease[] {
  const out: AtomRelease[] = []
  const seen = new Set<string>()
  const re = /href="([^"]*\/releases\/tag\/([^"]+))"/g
  let m: RegExpExecArray | null
  while ((m = re.exec(xml)) !== null) {
    const releaseUrl = m[1]
    const tag = decodeURIComponent(m[2])
    if (seen.has(tag)) {
      continue
    }
    seen.add(tag)
    out.push({ tag, version: tag.replace(/^v/i, ''), releaseUrl })
  }
  return out
}

// Atom order is not guaranteed.
export function pickLatestRelease(releases: AtomRelease[]): AtomRelease | null {
  return releases.reduce<AtomRelease | null>((best, r) => {
    return !best || compareSemver(r.version, best.version) > 0 ? r : best
  }, null)
}

export function dmgAssetName(version: string, arch: AppArch): string {
  return `Loop-${version}-${arch}.dmg`
}

// GitHub derives release asset URLs from tag URLs; no API request is needed.
export function buildUpdateInfo(
  latest: AtomRelease | null,
  currentVersion: string,
  arch: AppArch,
  checkedAt: string
): UpdateInfo {
  if (!latest) {
    return {
      currentVersion,
      latestVersion: null,
      available: false,
      releaseUrl: null,
      assetUrl: null,
      assetName: null,
      notes: null,
      checkedAt
    }
  }
  const available = isNewer(latest.version, currentVersion)
  const assetName = dmgAssetName(latest.version, arch)
  const assetUrl = `${latest.releaseUrl.replace('/releases/tag/', '/releases/download/')}/${assetName}`
  return {
    currentVersion,
    latestVersion: latest.version,
    available,
    releaseUrl: latest.releaseUrl,
    assetUrl,
    assetName,
    notes: null,
    checkedAt
  }
}
