import { describe, it, expect } from 'vitest'
import { formatDate, formatDateRange } from '@/utils/date'

describe('formatDate', () => {
  it('formats full ISO date (Italian)', () => {
    expect(formatDate('1980-01-15', 'it')).toBe('15 gen 1980')
  })

  it('formats full ISO date (English)', () => {
    expect(formatDate('1980-01-15', 'en')).toBe('15 Jan 1980')
  })

  it('formats year-month', () => {
    expect(formatDate('1980-03', 'it')).toBe('mar 1980')
  })

  it('formats year only', () => {
    expect(formatDate('1980')).toBe('1980')
  })

  it('handles null', () => {
    expect(formatDate(null)).toBe('')
  })

  it('handles undefined', () => {
    expect(formatDate(undefined)).toBe('')
  })

  it('handles empty string', () => {
    expect(formatDate('')).toBe('')
  })

  it('defaults to Italian locale', () => {
    expect(formatDate('2000-06-10')).toBe('10 giu 2000')
  })
})

describe('formatDateRange', () => {
  it('formats birth-death range', () => {
    expect(formatDateRange('1920-05-10', '2000-12-31')).toBe('1920 - 2000')
  })

  it('formats birth only', () => {
    expect(formatDateRange('1980-01-15', null)).toBe('1980')
  })

  it('formats death only', () => {
    expect(formatDateRange(null, '2020-06-01')).toBe('? - 2020')
  })

  it('returns empty string for no dates', () => {
    expect(formatDateRange(null, null)).toBe('')
  })

  it('handles undefined inputs', () => {
    expect(formatDateRange(undefined, undefined)).toBe('')
  })
})
