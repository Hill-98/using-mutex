import type { TestContext } from 'node:test'
import { test } from 'node:test'
import { MutexAcquireError } from '../src/errors.ts'
import { Mutex } from '../src/Mutex.ts'

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

test('mutex simple test', async (t: TestContext) => {
  const mutex = new Mutex()
  let x = 0
  const add = async function add() {
    using _ = await mutex.acquire()
    await sleep(100)
    x += 1
  }
  add()
  add()
  await sleep(120)
  t.assert.strictEqual(x, 1)
  await sleep(120)
  t.assert.strictEqual(x, 2)
})

test('mutex acquire timeout test', async (t: TestContext) => {
  t.plan(3)
  const mutex = new Mutex()
  let x = 0
  const add = async function add(timeout?: number) {
    using _ = await mutex.acquire(timeout)
    await sleep(100)
    x += 1
  }
  add()
  try {
    await add(50)
  } catch (err: unknown) {
    t.assert.ok(err instanceof DOMException)
    t.assert.strictEqual(err.name, 'TimeoutError')
  }
  await sleep(70)
  t.assert.strictEqual(x, 1)
})

test('mutex different keys test', async (t: TestContext) => {
  const mutex = new Mutex()
  const keys: string[] = []
  const add = async function add(key: string) {
    using _ = await mutex.acquire(key)
    await sleep(100)
    keys.push(key)
  }
  add('x')
  add('y')
  await sleep(150)
  t.assert.deepStrictEqual(keys, ['x', 'y'])
})

test('mutex abort signal test', async (t: TestContext) => {
  const mutex = new Mutex()
  let x = 0
  const add = async function add(signal?: AbortSignal) {
    using _ = await mutex.acquire('signal', signal as AbortSignal)
    await sleep(100)
    x += 1
  }

  using _ = await mutex.acquire('signal')

  await t.test('pass a aborted signal', async (t: TestContext) => {
    t.plan(1)
    try {
      const controller = new AbortController()
      controller.abort('test')
      await add(controller.signal)
    } catch (err: unknown) {
      t.assert.strictEqual(err, 'test')
    }
  })

  await t.test('delay abort signal', async (t: TestContext) => {
    t.plan(2)
    try {
      const controller = new AbortController()
      setTimeout(() => controller.abort(), 10)
      await add(controller.signal)
    } catch (err: unknown) {
      t.assert.ok(err instanceof DOMException)
      t.assert.strictEqual(err.message, 'This operation was aborted')
    }
  })

  await sleep(100)
  t.assert.strictEqual(x, 0)
})

test('mutex.acquire args throw error test', async (t: TestContext) => {
  t.plan(4)
  const mutex = new Mutex()
  using _ = await mutex.acquire()
  try {
    await mutex.acquire(0)
  } catch (err: unknown) {
    t.assert.ok(err instanceof MutexAcquireError)
    t.assert.strictEqual(err.message, 'Mutex is in use and cannot be acquired as there is no timeout.')
  }
  try {
    await mutex.acquire(-1)
  } catch (err: unknown) {
    t.assert.ok(err instanceof RangeError)
    t.assert.strictEqual(err.message, 'timeout must be a positive number.')
  }
})

test('Mutex many test', async (t: TestContext) => {
  const mutex = new Mutex()
  let x = 0
  const add = async function add(sleepMs?: number, timeout?: number) {
    using _ = await mutex.acquire(timeout)
    if (sleepMs) {
      await sleep(sleepMs)
    }
    x += 1
  }
  await Promise.allSettled([add(100), add(0, 10), add(200, 20), add(0, 200), add(0, 90)])
  t.assert.strictEqual(x, 2)
})

test('mutex key test ', async (t: TestContext) => {
  const mutex = new Mutex()
  const symbol = Symbol()
  using lock = await mutex.acquire(symbol)
  t.assert.strictEqual(lock.key, symbol)
})

test('mutex multiple release test ', async (t: TestContext) => {
  const mutex = new Mutex()
  let x = 0
  const add = async function add() {
    const lock = await mutex.acquire()
    await sleep(100)
    x += 1
    lock.release()
    lock.release()
  }
  add()
  add()
  add()
  await sleep(150)
  t.assert.strictEqual(x, 1)
  await sleep(20)
  t.assert.strictEqual(x, 1)
  await sleep(50)
  t.assert.strictEqual(x, 2)
  await sleep(50)
  t.assert.strictEqual(x, 2)
  await sleep(100)
  t.assert.strictEqual(x, 3)
})
