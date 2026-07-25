import type { TestContext } from 'node:test'
import { test } from 'node:test'
import { isAbortSignal } from '../src/utils.ts'

test('isAbortSignal test', (t: TestContext) => {
  t.assert.ok(!isAbortSignal(null))
  t.assert.ok(!isAbortSignal(''))
  t.assert.ok(!isAbortSignal(Object.create(null)))
  t.assert.ok(!isAbortSignal({ aborted: true }))
  t.assert.ok(isAbortSignal(new AbortController().signal))
  t.assert.ok(
    isAbortSignal({
      aborted: true,
      reason: 'aborted',
    }),
  )
})
