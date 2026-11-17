import { describe, expect, it } from 'vitest'
import { targetProgress } from './accountTargets'

describe('live account targets', () => {
  it('tracks zero, partial and reduced balances independently', () => {
    expect(targetProgress('0.00', '1000.00')).toEqual({
      reached: false,
      percent: 0,
      remaining: '1000.00',
    })
    expect(targetProgress('500.00', '1000.00')).toEqual({
      reached: false,
      percent: 50,
      remaining: '500.00',
    })
    expect(targetProgress('250.00', '1000.00')).toEqual({
      reached: false,
      percent: 25,
      remaining: '750.00',
    })
  })
  it('caps the bar at 100 and continues tracking after reaching a goal', () => {
    for (const balance of ['1000.00', '1500.00', '9999999999999999.99']) {
      expect(targetProgress(balance, '1000.00')).toEqual({
        reached: true,
        percent: 100,
        remaining: '0.00',
      })
    }
    expect(targetProgress('999.99', '1000.00').reached).toBe(false)
  })
  it('preserves single cents at maximum precision without rounding up to reached', () => {
    expect(targetProgress('9999999999999999.98', '9999999999999999.99')).toEqual({
      reached: false,
      percent: 99.99,
      remaining: '0.01',
    })
    expect(targetProgress('0.00', '0.01').remaining).toBe('0.01')
    expect(targetProgress('0.01', '0.01').reached).toBe(true)
    expect(targetProgress('1.00', '3.00').percent).toBe(33.33)
  })
})
