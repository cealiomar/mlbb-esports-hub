import { describe, it, expect } from 'vitest'
import { ok, err, isOk } from './source'

describe('Result', () => {
  it('wraps a success value', () => {
    const r = ok(42)
    expect(isOk(r)).toBe(true)
    if (isOk(r)) expect(r.value).toBe(42)
  })

  it('wraps a failure with a message', () => {
    const r = err<number>('upstream exploded')
    expect(isOk(r)).toBe(false)
    if (!isOk(r)) expect(r.error).toBe('upstream exploded')
  })
})
