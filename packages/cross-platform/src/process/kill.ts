import treeKill from 'tree-kill'
import which from 'which'
import { isLinux } from '../runtime'

let psAvailable: boolean | undefined

// tree-kill walks the tree with `ps` on Linux and crashes the process with an
// unhandled 'error' when `ps` is missing (slim containers). Check once.
function canWalkTree(): boolean {
  if (!isLinux) return true
  psAvailable ??= which.sync('ps', { nothrow: true }) !== null
  return psAvailable
}

/**
 * Kill a process and every descendant. Windows uses `taskkill /T /F`,
 * POSIX signals each process found under `pid` (via `tree-kill`). Falls
 * back to signalling only `pid` when the tree cannot be walked. Never
 * rejects: a process that already exited is not an error.
 */
export function killProcessTree(
  pid: number,
  signal: NodeJS.Signals = 'SIGTERM',
  fallback: (signal: NodeJS.Signals) => void = sig => process.kill(pid, sig),
): Promise<void> {
  const signalOnlyPid = () => {
    try {
      fallback(signal)
    } catch {
      // Already gone.
    }
  }
  if (!canWalkTree()) {
    signalOnlyPid()
    return Promise.resolve()
  }
  return new Promise(resolve => {
    try {
      treeKill(pid, signal, error => {
        if (error) signalOnlyPid()
        resolve()
      })
    } catch {
      signalOnlyPid()
      resolve()
    }
  })
}
