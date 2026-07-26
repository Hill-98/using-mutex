import type { MutexGuard } from './MutexGuard.ts'

export class Waiter {
  readonly #queue: Set<Waiter>
  readonly #resolve: (release: MutexGuard) => void
  readonly #reject: (reason: Error) => void
  readonly #signal: AbortSignal | undefined

  constructor(
    queue: Set<Waiter>,
    resolve: (release: MutexGuard) => void,
    reject: (reason: Error) => void,
    signal?: AbortSignal,
  ) {
    this.#queue = queue
    this.#resolve = resolve
    this.#reject = reject
    this.#signal = signal
    this.#signal?.addEventListener('abort', this.#onAbort, { once: true })
  }

  #onAbort = () => {
    this.cleanup()
    this.#reject(this.#signal?.reason)
  }

  cleanup(): void {
    this.#queue.delete(this)
    this.#signal?.removeEventListener('abort', this.#onAbort)
  }

  resolveLock(guard: MutexGuard): void {
    this.cleanup()
    this.#resolve(guard)
  }
}
