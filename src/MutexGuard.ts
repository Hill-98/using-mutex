import type { Waiter } from './Waiter.ts'

export class MutexGuard implements Disposable {
  readonly #key: string | symbol
  readonly #queues: Map<string | symbol, Set<Waiter>>
  #released = false

  constructor(queues: Map<string | symbol, Set<Waiter>>, key: string | symbol) {
    this.#queues = queues
    this.#key = key
  }

  get key() {
    return this.#key
  }

  #clone(): MutexGuard {
    return new MutexGuard(this.#queues, this.#key)
  }

  release(): void {
    if (this.#released) {
      return
    }
    this.#released = true
    const queue = this.#queues.get(this.#key)
    if (queue && queue.size > 0) {
      // biome-ignore lint/style/noNonNullAssertion: cannot be null
      const waiter = queue.values().next().value!
      waiter.resolveLock(this.#clone())
    } else {
      this.#queues.delete(this.#key)
    }
  }

  [Symbol.dispose]() {
    this.release()
  }
}
