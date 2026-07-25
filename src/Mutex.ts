import { MutexGuard } from './MutexGuard.ts'
import { isAbortSignal } from './utils.ts'
import { Waiter } from './Waiter.ts'

export class Mutex {
  readonly #defaultKey = Symbol()
  readonly #queues: Map<string | symbol, Set<Waiter>> = new Map()

  async wait(key?: string | symbol): Promise<MutexGuard>
  async wait(timeout?: number | AbortSignal): Promise<MutexGuard>
  async wait(key: string | symbol, timeout: number | AbortSignal): Promise<MutexGuard>
  async wait(key?: string | symbol | number | AbortSignal, timeout?: number | AbortSignal): Promise<MutexGuard> {
    const hasKey = typeof key === 'string' || typeof key === 'symbol'
    const k = hasKey ? key : this.#defaultKey
    let queue = this.#queues.get(k)
    if (!queue) {
      queue = new Set()
      this.#queues.set(k, queue)
      return new MutexGuard(this.#queues, k)
    }
    let signal = !hasKey && typeof timeout === 'undefined' ? key : timeout
    if (typeof signal === 'number' && signal <= 0) {
      throw new RangeError('timeout must be a positive number.')
    }
    return new Promise<MutexGuard>((resolve, reject) => {
      if (isAbortSignal(signal) && signal.aborted) {
        reject(signal.reason ?? new Error('Abort'))
        return
      }
      if (typeof signal === 'number') {
        signal = AbortSignal.timeout(signal)
      }
      queue.add(new Waiter(queue, resolve, reject, signal))
    })
  }
}
