/** @type {import('electron-builder').Configuration} */
module.exports = {
  appId: 'com.loop.routines',
  productName: 'Loop',
  // Skip native module rebuild — Loop has no native deps and rebuild slows CI.
  npmRebuild: false,
  directories: {
    output: 'dist',
    buildResources: 'resources'
  },
  // App contents: bundled main/preload/renderer output, resources, and
  // package.json. Build assets under resources/icon-source (svg, render
  // script) are dev-only and intentionally excluded from the packaged app.
  files: [
    'out/**/*',
    'resources/**/*',
    'package.json',
    '!resources/icon-source/**/*'
  ],
  extraResources: [
    {
      from: 'resources/loop.daemon.plist',
      to: 'loop.daemon.plist'
    }
  ],
  mac: {
    category: 'public.app-category.developer-tools',
    icon: 'resources/build/icon.icns',
    // CI builds are not signed with a Developer ID or notarized (no cert). We do
    // NOT set `identity: null` because that disables even ad-hoc signing, which
    // makes the arm64 app fail to launch with "Loop is damaged". Leaving identity
    // unset lets electron-builder ad-hoc sign (codesign -s -) the arm64 build so
    // it runs; downloaded copies still carry the quarantine attribute, so users
    // must right-click → Open once (or run `xattr -dr com.apple.quarantine`).
    target: [{ target: 'dmg', arch: ['arm64', 'x64'] }],
    darkModeSupport: true,
    extendInfo: {
      LSUIElement: false,
      NSAppleEventsUsageDescription:
        'Loop runs Claude Code sessions on your behalf for scheduled routines.'
    }
  },
  dmg: {
    title: '${productName} ${version}',
    artifactName: '${productName}-${version}-${arch}.${ext}',
    // Standard "drag app to Applications" install window layout.
    window: { width: 540, height: 380 },
    contents: [
      { x: 150, y: 200, type: 'file' },
      { x: 390, y: 200, type: 'link', path: '/Applications' }
    ]
  }
}
