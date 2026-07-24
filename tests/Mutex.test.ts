import type { TestContext } from 'node:test'
import { test } from 'node:test'
import { Mutex } from '../src/Mutex.ts'

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

test('Mutex test', async (t: TestContext) => {
  const mutex = new Mutex()
  let x = 0
  const add = async function add(timeout = 0) {
    using _ = await mutex.wait(timeout)
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
    throw new Error('test error')
  } catch (err: unknown) {
    t.assert.ok(err instanceof DOMException)
    t.assert.strictEqual(err.name, 'TimeoutError')
  }
})

test('two Mutex test', async (t: TestContext) => {
  const mutex = new Mutex()
  let [x, y] = [0, 0]
  const addX = async function addX() {
    using _ = await mutex.wait('x')
    await sleep(200)
    x += 1
  }
  const addY = async function addY() {
    using _ = await mutex.wait('y')
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
    using _ = await mutex.wait('signal', signal as AbortSignal)
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

test('MutexGuard key test ', async (t: TestContext) => {
  const mutex = new Mutex()
  const symbol = Symbol()
  using lock = await mutex.wait(symbol)
  t.assert.strictEqual(lock.key, symbol)
})

test('MutexGuard multiple release test ', async (t: TestContext) => {
  const mutex = new Mutex()
  let x = 0
  const add = async function add() {
    const lock = await mutex.wait()
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
