import { describe, it, expect } from 'vitest'
import { buildPlistXml } from '../src/main/plist'

describe('buildPlistXml', () => {
  const xml = buildPlistXml({
    label: 'com.loop.routines.daemon',
    electronPath: '/Applications/loop.app/Contents/MacOS/loop',
    daemonScript: '/Applications/loop.app/Contents/Resources/app/out/main/daemon.js',
    logPath: '/Users/test/Library/Application Support/loop/daemon.log'
  })

  it('includes the label', () => {
    expect(xml).toContain('<string>com.loop.routines.daemon</string>')
  })

  it('enables RunAtLoad and KeepAlive', () => {
    expect(xml).toContain('<key>RunAtLoad</key>\n  <true/>')
    expect(xml).toContain('<key>KeepAlive</key>\n  <true/>')
  })

  it('runs the daemon as node via ELECTRON_RUN_AS_NODE', () => {
    expect(xml).toContain('<key>ELECTRON_RUN_AS_NODE</key>')
    expect(xml).toContain('/Applications/loop.app/Contents/MacOS/loop')
    expect(xml).toContain('out/main/daemon.js')
  })

  it('wires stdout/stderr to the log path', () => {
    expect(xml).toContain('<key>StandardOutPath</key>')
    expect(xml).toContain('<key>StandardErrorPath</key>')
    expect(xml).toContain('/Users/test/Library/Application Support/loop/daemon.log')
  })

  it('produces valid plist scaffolding', () => {
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true)
    expect(xml).toContain('<plist version="1.0">')
  })
})
