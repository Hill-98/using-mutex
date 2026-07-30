# using-mutex

A lightweight, zero-dependency, mutex with built-in pool and [resource management](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Resource_management).

## What is mutex?

See [Mutual exclusion](https://en.wikipedia.org/wiki/Mutual_exclusion)

## Features

**`using` Syntax Support**: With ES2024's [`using`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/using) keyword, safely using a mutex no longer require `try...finally` block or callback.

**`AbortSignal` Support**: Supports [AbortSignal](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal), you can accurately control timeout and manually cancel waiting

**Key-Based Lock Pool**: Built-in key-based pool, the same key uses FIFO queue.

## Require

* NodeJS 24+
* Chrome 134+
* Firefox 141+

Or any engine that supports resource management, `using` keyword and `AbortSignal`.

## Usage

```javascript
import { Mutex } from 'using-mutex'

const mutex = new Mutex()

async function doing() {
  // When the current scope ends, the lock is auto release.
  using lock = await mutex.acquire()
  //...
  // It can also be release manually.
  // lock.release()
}

doing()
doing()
```

## API

### `Mutex.acquire(key?: string | symbol, timeout?: number | AbortSignal): Promise<MutexGuard>`

Acquires a lock for the specific `key`, returns an object that supports `Symbol.dispose`.

`timeout`: A wait timeout duration (millisecond) or `AbortSignal` used to abort lock acquisition.
