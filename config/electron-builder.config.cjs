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
    // CI builds are unsigned: disable code signing so packaging never fails on
    // a missing identity. See .github/workflows/build.yml (signing/notarization
    // are intentionally disabled).
    identity: null,
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
