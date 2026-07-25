import type { TestContext } from 'node:test'
import { test } from 'node:test'
import { MutexAcquireError } from '../src/errors.ts'
import { Mutex } from '../src/Mutex.ts'

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

test('Mutex test', async (t: TestContext) => {
  const mutex = new Mutex()
  let x = 0
  const add = async function add(timeout?: number) {
    using _ = await mutex.acquire(timeout)
    await sleep(100)
    x += 1
  }
  add()
  add()
  await sleep(150)
  t.assert.strictEqual(x, 1)
  await sleep(150)
  t.assert.strictEqual(x, 2)
  add()
  try {
    await add(10)
    t.assert.ok(false)
  } catch (err: unknown) {
    t.assert.ok(err instanceof DOMException)
    t.assert.strictEqual(err.name, 'TimeoutError')
  }
})

test('two Mutex test', async (t: TestContext) => {
  const mutex = new Mutex()
  let [x, y] = [0, 0]
  const addX = async function addX() {
    using _ = await mutex.acquire('x')
    await sleep(200)
    x += 1
  }
  const addY = async function addY() {
    using _ = await mutex.acquire('y')
    await sleep(200)
    y += 1
  }
  addX()
  addY()
  await sleep(250)
  t.assert.strictEqual(x, 1)
  t.assert.strictEqual(y, 1)
})

test('Mutex abort signal test', async (t: TestContext) => {
  const mutex = new Mutex()
  let x = 0
  const add = async function add(signal?: AbortSignal) {
    using _ = await mutex.acquire('signal', signal as AbortSignal)
    await sleep(100)
    x += 1
  }
  add()

  try {
    const controller = new AbortController()
    controller.abort('test')
    await add(controller.signal)
  } catch (err: unknown) {
    t.assert.strictEqual(err, 'test')
  }

  try {
    const controller = new AbortController()
    controller.abort(null)
    await add(controller.signal)
  } catch (err: unknown) {
    t.assert.ok(err instanceof Error)
    t.assert.strictEqual(err.message, 'Abort')
  }

  try {
    const controller = new AbortController()
    setTimeout(() => controller.abort(null), 10)
    await add(controller.signal)
  } catch (err: unknown) {
    t.assert.ok(err instanceof Error)
    t.assert.strictEqual(err.message, 'Abort')
  }

  await sleep(100)
  t.assert.strictEqual(x, 1)
})

test('Mutex error test', async (t: TestContext) => {
  const mutex = new Mutex()
  using _ = await mutex.acquire()
  try {
    await mutex.acquire(0)
    t.assert.ok(false)
  } catch (err: unknown) {
    t.assert.ok(err instanceof MutexAcquireError)
    t.assert.strictEqual(err.message, 'Mutex is in use and cannot be acquired as there is no timeout.')
  }
  try {
    await mutex.acquire(-1)
    t.assert.ok(false)
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

test('MutexGuard key test ', async (t: TestContext) => {
  const mutex = new Mutex()
  const symbol = Symbol()
  using lock = await mutex.acquire(symbol)
  t.assert.strictEqual(lock.key, symbol)
})

test('MutexGuard multiple release test ', async (t: TestContext) => {
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
