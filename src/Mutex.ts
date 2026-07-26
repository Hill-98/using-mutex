import { MutexAcquireError } from './errors.ts'
import { MutexGuard } from './MutexGuard.ts'
import { isAbortSignal } from './utils.ts'
import { Waiter } from './Waiter.ts'

export class Mutex {
  readonly #defaultKey = Symbol()
  readonly #queues: Map<string | symbol, Set<Waiter>> = new Map()

  async acquire(key?: string | symbol): Promise<MutexGuard>
  async acquire(timeout?: number | AbortSignal): Promise<MutexGuard>
  async acquire(key: string | symbol, timeout: number | AbortSignal): Promise<MutexGuard>
  async acquire(key?: string | symbol | number | AbortSignal, timeout?: number | AbortSignal): Promise<MutexGuard> {
    const hasKey = typeof key === 'string' || typeof key === 'symbol'
    const k = hasKey ? key : this.#defaultKey
    let queue = this.#queues.get(k)
    if (!queue) {
      queue = new Set()
      this.#queues.set(k, queue)
      return new MutexGuard(this.#queues, k)
    }
    let signal = !hasKey && typeof timeout === 'undefined' ? key : timeout
    if (typeof signal === 'number') {
      if (signal > 0) {
        signal = AbortSignal.timeout(signal)
      } else {
        throw signal === 0
          ? new MutexAcquireError('Mutex is in use and cannot be acquired as there is no timeout.')
          : new RangeError('timeout must be a positive number.')
      }
    }
    return new Promise<MutexGuard>((resolve, reject) => {
      if (isAbortSignal(signal) && signal.aborted) {
        reject(signal.reason)
        return
      }
      queue.add(new Waiter(queue, resolve, reject, signal))
    })
  }
}
