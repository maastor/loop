import { describe, it, expect } from 'vitest'
import {
  compareSemver,
  isNewer,
  pickDmgAsset,
  parseLatestRelease,
  type GithubRelease
} from '@shared/release'

describe('compareSemver / isNewer', () => {
  it('treats equal versions as equal', () => {
    expect(compareSemver('0.1.3', '0.1.3')).toBe(0)
    expect(isNewer('0.1.3', '0.1.3')).toBe(false)
  })

  it('orders by major, minor, patch', () => {
    expect(compareSemver('0.2.0', '0.1.9')).toBe(1)
    expect(compareSemver('1.0.0', '0.9.9')).toBe(1)
    expect(compareSemver('0.1.2', '0.1.3')).toBe(-1)
  })

  it('compares multi-digit segments numerically (not lexically)', () => {
    expect(isNewer('0.10.0', '0.9.0')).toBe(true)
    expect(compareSemver('0.10.0', '0.2.0')).toBe(1)
  })

  it('tolerates a leading v and pre-release suffixes', () => {
    expect(isNewer('v0.2.0', '0.1.0')).toBe(true)
    expect(compareSemver('0.2.0-rc.1', '0.2.0')).toBe(0)
  })
})

describe('pickDmgAsset', () => {
  const assets = [
    { name: 'Loop-0.2.0-arm64.dmg', browser_download_url: 'https://x/arm64.dmg' },
    { name: 'Loop-0.2.0-x64.dmg', browser_download_url: 'https://x/x64.dmg' }
  ]

  it('matches the running architecture by filename suffix', () => {
    expect(pickDmgAsset(assets, 'arm64')?.browser_download_url).toBe('https://x/arm64.dmg')
    expect(pickDmgAsset(assets, 'x64')?.browser_download_url).toBe('https://x/x64.dmg')
  })

  it('returns null when no DMG matches', () => {
    expect(pickDmgAsset([{ name: 'notes.txt', browser_download_url: 'u' }], 'arm64')).toBeNull()
    expect(pickDmgAsset(undefined, 'arm64')).toBeNull()
  })
})

describe('parseLatestRelease', () => {
  const release: GithubRelease = {
    tag_name: 'v0.2.0',
    html_url: 'https://github.com/maxi-scala/loop/releases/tag/v0.2.0',
    body: 'release notes',
    assets: [
      { name: 'Loop-0.2.0-arm64.dmg', browser_download_url: 'https://x/arm64.dmg' },
      { name: 'Loop-0.2.0-x64.dmg', browser_download_url: 'https://x/x64.dmg' }
    ]
  }
  const at = '2026-06-12T00:00:00.000Z'

  it('reports available when newer and a matching DMG exists', () => {
    const info = parseLatestRelease(release, '0.1.3', 'arm64', at)
    expect(info.available).toBe(true)
    expect(info.latestVersion).toBe('0.2.0')
    expect(info.assetUrl).toBe('https://x/arm64.dmg')
    expect(info.assetName).toBe('Loop-0.2.0-arm64.dmg')
    expect(info.releaseUrl).toBe(release.html_url)
    expect(info.notes).toBe('release notes')
    expect(info.checkedAt).toBe(at)
  })

  it('is not available when current version is the latest', () => {
    expect(parseLatestRelease(release, '0.2.0', 'arm64', at).available).toBe(false)
  })

  it('is not available when no DMG matches the architecture', () => {
    const noAssets: GithubRelease = { ...release, assets: [] }
    const info = parseLatestRelease(noAssets, '0.1.3', 'arm64', at)
    expect(info.available).toBe(false)
    expect(info.assetUrl).toBeNull()
  })

  it('is not available for a draft release', () => {
    expect(parseLatestRelease({ ...release, draft: true }, '0.1.3', 'arm64', at).available).toBe(
      false
    )
  })
})
