/** @type {import('electron-builder').Configuration} */
module.exports = {
  appId: 'com.loop.routines',
  productName: 'Loop',
  // No native dependencies; rebuilding only slows CI.
  npmRebuild: false,
  directories: {
    output: 'dist',
    buildResources: 'resources'
  },
  // icon-source contains build inputs, not runtime assets.
  files: ['out/**/*', 'resources/**/*', 'package.json', '!resources/icon-source/**/*'],
  extraResources: [
    {
      from: 'resources/loop.daemon.plist',
      to: 'loop.daemon.plist'
    }
  ],
  mac: {
    category: 'public.app-category.developer-tools',
    icon: 'resources/build/icon.icns',
    // Leaving identity unset preserves electron-builder's ad-hoc arm64 signature.
    // `identity: null` produces a bundle macOS reports as damaged.
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
    window: { width: 540, height: 380 },
    contents: [
      { x: 150, y: 200, type: 'file' },
      { x: 390, y: 200, type: 'link', path: '/Applications' }
    ]
  }
}
