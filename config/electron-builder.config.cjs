const { join } = require('path')

/** @type {import('electron-builder').Configuration} */
module.exports = {
  appId: 'com.loop.routines',
  productName: 'Loop',
  directories: {
    output: 'dist',
    buildResources: 'resources'
  },
  files: ['out/**/*', 'resources/**/*', 'package.json'],
  extraResources: [
    {
      from: 'resources/loop.daemon.plist',
      to: 'loop.daemon.plist'
    }
  ],
  mac: {
    category: 'public.app-category.developer-tools',
    target: [{ target: 'dmg', arch: ['arm64', 'x64'] }],
    darkModeSupport: true,
    extendInfo: {
      LSUIElement: false,
      NSAppleEventsUsageDescription:
        'Loop runs Claude Code sessions on your behalf for scheduled routines.'
    }
  },
  dmg: {
    artifactName: '${productName}-${version}-${arch}.${ext}'
  }
}
