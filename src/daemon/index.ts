import { appendFileSync } from 'fs'
import { Store } from '@core/persistence'
import { Scheduler, STALE_RUN_MS } from '@core/scheduler'
import { logFile } from '@core/paths'

function log(msg: string): void {
  const line = `[${new Date().toISOString()}] ${msg}\n`
  try {
    appendFileSync(logFile(), line)
  } catch {
    /* ignore log failures */
  }
  process.stdout.write(line)
}

function main(): void {
  log('loop daemon starting')
  const store = new Store()
  const cleaned = store.reconcileStaleRuns(STALE_RUN_MS)
  if (cleaned) {
    log(`reconciled ${cleaned} stale running run(s)`)
  }
  const scheduler = new Scheduler(store, { log })
  scheduler.start()

  const shutdown = (signal: string): void => {
    log(`received ${signal}, shutting down`)
    scheduler.stop()
    process.exit(0)
  }
  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))

  setInterval(() => {}, 1 << 30)
}

main()
