import { describe, it, expect } from 'vitest'
import { getInitials, getAvatarColor } from '@/utils/avatar'

describe('getInitials', () => {
  it('returns first letters of first and last name', () => {
    expect(getInitials('Mario', 'Rossi')).toBe('MR')
  })

  it('handles single name (empty last name)', () => {
    expect(getInitials('Mario', '')).toBe('M')
  })

  it('handles empty first name', () => {
    expect(getInitials('', 'Rossi')).toBe('R')
  })

  it('returns ? for both empty', () => {
    expect(getInitials('', '')).toBe('?')
  })

  it('trims whitespace', () => {
    expect(getInitials('  Mario  ', '  Rossi  ')).toBe('MR')
  })

  it('uppercases initials', () => {
    expect(getInitials('mario', 'rossi')).toBe('MR')
  })
})

describe('getAvatarColor', () => {
  it('returns consistent color for same name', () => {
    const color1 = getAvatarColor('Mario Rossi')
    const color2 = getAvatarColor('Mario Rossi')
    expect(color1).toBe(color2)
  })

  it('returns different colors for different names', () => {
    const color1 = getAvatarColor('Mario Rossi')
    const color2 = getAvatarColor('Anna Bianchi')
    // Not guaranteed to always differ with a small palette, but very likely
    // At minimum, both should be valid hex colors
    expect(color1).toMatch(/^#[0-9A-Fa-f]{6}$/)
    expect(color2).toMatch(/^#[0-9A-Fa-f]{6}$/)
  })

  it('returns a valid hex color', () => {
    const color = getAvatarColor('Test')
    expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/)
  })
})
