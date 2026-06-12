// shared/release.ts — pure helpers for the assisted updater: semver compare and
// turning a GitHub `releases/latest` payload into an UpdateInfo. No node/electron
// imports, so this is unit-testable under vitest like the rest of src/shared.
import type { UpdateInfo } from './types'

/** Strip a leading "v" and parse "X.Y.Z" into numeric parts (pre-release suffix ignored). */
function parts(version: string): number[] {
  const core = version.trim().replace(/^v/i, '').split(/[-+]/)[0]
  return core.split('.').map((n) => {
    const v = Number.parseInt(n, 10)
    return Number.isFinite(v) ? v : 0
  })
}

/** Compare two "X.Y.Z" versions: -1 if a<b, 0 if equal, 1 if a>b. */
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

/** True when `latest` is a strictly newer version than `current`. */
export function isNewer(latest: string, current: string): boolean {
  return compareSemver(latest, current) > 0
}

/** Minimal shape of a GitHub release asset we care about. */
export type ReleaseAsset = {
  name: string
  browser_download_url: string
}

/** Minimal shape of the GitHub `releases/latest` payload we read. */
export type GithubRelease = {
  tag_name?: string
  name?: string
  html_url?: string
  body?: string
  draft?: boolean
  prerelease?: boolean
  assets?: ReleaseAsset[]
}

/** Node's process.arch values we ship DMGs for. */
export type AppArch = 'arm64' | 'x64'

/**
 * Pick the .dmg asset matching the running architecture. DMGs are named
 * `Loop-<version>-<arch>.dmg` (see config/electron-builder.config.cjs), so we
 * match on the `-<arch>.dmg` suffix.
 */
export function pickDmgAsset(
  assets: ReleaseAsset[] | undefined,
  arch: AppArch
): ReleaseAsset | null {
  if (!assets) {
    return null
  }
  const suffix = `-${arch}.dmg`
  return assets.find((a) => a.name.toLowerCase().endsWith(suffix)) ?? null
}

/**
 * Build an UpdateInfo from a raw GitHub release payload. `available` is true only
 * when the release's version is strictly newer than `currentVersion` AND a DMG
 * for `arch` exists. `checkedAt` must be supplied by the caller (main passes an
 * ISO timestamp) so this stays pure/deterministic for tests.
 */
export function parseLatestRelease(
  release: GithubRelease,
  currentVersion: string,
  arch: AppArch,
  checkedAt: string
): UpdateInfo {
  const latestVersion = release.tag_name?.replace(/^v/i, '') ?? null
  const asset = pickDmgAsset(release.assets, arch)
  const available = Boolean(
    latestVersion && !release.draft && isNewer(latestVersion, currentVersion) && asset
  )
  return {
    currentVersion,
    latestVersion,
    available,
    releaseUrl: release.html_url ?? null,
    assetUrl: asset?.browser_download_url ?? null,
    assetName: asset?.name ?? null,
    notes: release.body ?? null,
    checkedAt
  }
}
