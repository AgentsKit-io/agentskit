import treeKill from 'tree-kill'
import which from 'which'
import { isLinux, isWindows } from '../runtime'

let psAvailable: boolean | undefined

// tree-kill walks the tree with `ps` on Linux and crashes the process with an
// unhandled 'error' when `ps` is missing (slim containers). Check once.
function canWalkTree(): boolean {
  if (!isLinux) return true
  psAvailable ??= which.sync('ps', { nothrow: true }) !== null
  return psAvailable
}

// A child spawned with `detached: true` on POSIX leads its own process group.
// Signalling the group also reaches descendants whose parent already exited
// (re-parented to init, so a tree walk from `pid` no longer finds them).
// ESRCH means `pid` leads no group: nothing to do.
function signalGroup(pid: number, signal: NodeJS.Signals): void {
  if (isWindows) return
  try {
    process.kill(-pid, signal)
  } catch {
    // Not a group leader, already gone, or unsupported by the runtime.
  }
}

/**
 * Kill a process and every descendant. Windows uses `taskkill /T /F`,
 * POSIX signals each process found under `pid` (via `tree-kill`), then the
 * process group `pid` leads, if any (children spawned with `detached: true`).
 * Falls back to signalling only `pid` when the tree cannot be walked. Never
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
    signalGroup(pid, signal)
    return Promise.resolve()
  }
  return new Promise(resolve => {
    const done = () => {
      signalGroup(pid, signal)
      resolve()
    }
    try {
      treeKill(pid, signal, error => {
        if (error) signalOnlyPid()
        done()
      })
    } catch {
      signalOnlyPid()
      done()
    }
  })
}
