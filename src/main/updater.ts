import { createWriteStream } from 'fs'
import { join } from 'path'
import { app, net, shell, BrowserWindow } from 'electron'
import { IPC } from '@shared/ipc'
import type { UpdateStatus } from '@shared/types'
import {
  parseReleasesAtom,
  pickLatestRelease,
  buildUpdateInfo,
  type AppArch
} from '@shared/release'

const OWNER = 'maxi-scala'
const REPO = 'loop'
// The REST API's shared-IP rate limit makes the public Atom feed more reliable.
const FEED_URL = `https://github.com/${OWNER}/${REPO}/releases.atom`
const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000
const FIRST_CHECK_DELAY_MS = 8 * 1000

let current: UpdateStatus = { phase: 'idle', info: null }
let timer: NodeJS.Timeout | null = null

function broadcastStatus(): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send(IPC.updateStatus, current)
    }
  }
}

function setStatus(next: UpdateStatus): void {
  current = next
  broadcastStatus()
}

export function getStatus(): UpdateStatus {
  return current
}

function appArch(): AppArch {
  return process.arch === 'arm64' ? 'arm64' : 'x64'
}

function fetchText(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const request = net.request(url)
    request.setHeader('User-Agent', `Loop/${app.getVersion()}`)
    request.setHeader('Accept', 'application/atom+xml')
    request.on('response', (response) => {
      if (response.statusCode < 200 || response.statusCode >= 300) {
        // Drain so the socket frees, then reject.
        response.on('data', () => {})
        response.on('end', () => reject(new Error(`GitHub responded ${response.statusCode}`)))
        return
      }
      const chunks: Buffer[] = []
      response.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
      response.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    })
    request.on('error', reject)
    request.end()
  })
}

// Background checks report failure through state instead of rejecting into the main process.
export async function checkForUpdate(): Promise<UpdateStatus> {
  setStatus({ phase: 'checking', info: current.info })
  try {
    const xml = await fetchText(FEED_URL)
    const latest = pickLatestRelease(parseReleasesAtom(xml))
    const info = buildUpdateInfo(latest, app.getVersion(), appArch(), new Date().toISOString())
    setStatus({ phase: info.available ? 'available' : 'idle', info })
  } catch (e) {
    setStatus({ phase: 'error', info: current.info, error: String(e) })
  }
  return current
}

export async function downloadAndOpen(): Promise<void> {
  const info = current.info
  if (!info?.assetUrl || !info.assetName) {
    setStatus({ phase: 'error', info, error: 'No download available for this platform.' })
    return
  }
  const dest = join(app.getPath('downloads'), info.assetName)
  setStatus({ phase: 'downloading', info, percent: 0 })
  try {
    await new Promise<void>((resolve, reject) => {
      const request = net.request(info.assetUrl as string)
      request.setHeader('User-Agent', `Loop/${app.getVersion()}`)
      request.on('response', (response) => {
        if (response.statusCode < 200 || response.statusCode >= 300) {
          response.on('data', () => {})
          response.on('end', () => reject(new Error(`Download failed (${response.statusCode})`)))
          return
        }
        const total = Number.parseInt(String(response.headers['content-length'] ?? ''), 10)
        let received = 0
        const file = createWriteStream(dest)
        response.on('data', (chunk) => {
          received += chunk.length
          file.write(chunk)
          if (Number.isFinite(total) && total > 0) {
            setStatus({
              phase: 'downloading',
              info,
              percent: Math.min(100, Math.round((received / total) * 100))
            })
          }
        })
        response.on('end', () => file.end(() => resolve()))
        response.on('error', reject)
        file.on('error', reject)
      })
      request.on('error', reject)
      request.end()
    })
    setStatus({ phase: 'ready', info, percent: 100 })
    await shell.openPath(dest)
  } catch (e) {
    setStatus({ phase: 'error', info, error: String(e) })
  }
}

export async function openReleasePage(): Promise<void> {
  if (current.info?.releaseUrl) {
    await shell.openExternal(current.info.releaseUrl)
  }
}

export function startAutoChecks(): void {
  if (timer) {
    return
  }
  setTimeout(() => void checkForUpdate(), FIRST_CHECK_DELAY_MS)
  timer = setInterval(() => void checkForUpdate(), CHECK_INTERVAL_MS)
}
