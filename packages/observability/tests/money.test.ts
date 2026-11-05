import { describe, expect, it } from 'vitest'
import { NANO, toNano, toUsdDecimal } from '../src/money'

describe('money', () => {
  it('converts USD to integer nano-dollars so sums stay exact', () => {
    expect(NANO).toBe(1e9)
    expect(toNano(0.1) + toNano(0.2)).toBe(toNano(0.3))
    expect(toNano(0.000_000_000_4)).toBe(0)
    expect(toNano(0.000_000_000_6)).toBe(1)
  })

  it('formats USD as decimal text rounded to the nano-dollar', () => {
    expect(toUsdDecimal(0.1 + 0.2)).toBe('0.300000000')
    expect(toUsdDecimal(12.5)).toBe('12.500000000')
    expect(toUsdDecimal(0)).toBe('0.000000000')
  })
})
