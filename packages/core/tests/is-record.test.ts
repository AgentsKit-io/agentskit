import { describe, expect, it } from 'vitest'
import { isRecord } from '../src'

class Example {}

describe('isRecord', () => {
  it.each([
    ['object', {}, true],
    ['null-prototype object', Object.create(null), true],
    ['array', [], false],
    ['null', null, false],
    ['undefined', undefined, false],
    ['string', 'value', false],
    ['number', 1, false],
    ['boolean', true, false],
    ['Date', new Date(), true],
    ['class instance', new Example(), true],
    ['Map', new Map(), true],
  ])('returns %s for %s', (_name, value, expected) => {
    expect(isRecord(value)).toBe(expected)
  })
})
