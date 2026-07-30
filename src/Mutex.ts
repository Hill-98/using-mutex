import { MutexAcquireError } from './errors.ts'
import { MutexGuard } from './MutexGuard.ts'
import { isAbortSignal } from './utils.ts'
import { Waiter } from './Waiter.ts'

export class Mutex {
  readonly #defaultKey = Symbol()
  readonly #queues: Map<string | symbol, Set<Waiter>> = new Map()

  async acquire(): Promise<MutexGuard>
  async acquire(key: string | symbol): Promise<MutexGuard>
  async acquire(timeout: number): Promise<MutexGuard>
  async acquire(signal: AbortSignal): Promise<MutexGuard>
  async acquire(key: string | symbol, timeout: number): Promise<MutexGuard>
  async acquire(key: string | symbol, signal: AbortSignal): Promise<MutexGuard>
  async acquire(key?: string | symbol | number | AbortSignal, signal?: number | AbortSignal): Promise<MutexGuard> {
    const hasKey = typeof key === 'string' || typeof key === 'symbol'
    const k = hasKey ? key : this.#defaultKey
    const queue = this.#queues.get(k)
    if (!queue) {
      this.#queues.set(k, new Set())
      return new MutexGuard(this.#queues, k)
    }
    let s = !hasKey && typeof signal === 'undefined' ? key : signal
    if (typeof s === 'number') {
      if (s > 0) {
        s = AbortSignal.timeout(s)
      } else {
        throw s === 0
          ? new MutexAcquireError('Mutex is in use and cannot be acquired as there is no timeout.')
          : new RangeError('timeout must be a positive number.')
      }
    }
    return new Promise<MutexGuard>((resolve, reject) => {
      if (isAbortSignal(s) && s.aborted) {
        reject(s.reason)
        return
      }
      queue.add(new Waiter(queue, resolve, reject, s))
    })
  }
}
