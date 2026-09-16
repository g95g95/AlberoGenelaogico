import { describe, it, expect } from 'vitest'
import { computeLayout } from '@/lib/layoutEngine'
import type { Person, Relationship } from '@/types/domain'

function makePerson(id: string): Person {
  return {
    id,
    firstName: 'Test',
    lastName: 'Person',
    gender: 'unknown',
    birthDate: null,
    birthPlace: null,
    deathDate: null,
    deathPlace: null,
    photo: null,
    notes: '',
    customFields: {},
  }
}

describe('computeLayout', () => {
  it('returns positions for all persons', () => {
    const persons = [makePerson('p1'), makePerson('p2')]
    const relationships: Relationship[] = [
      {
        id: 'r1', type: 'parent-child', from: 'p1', to: 'p2',
        subtype: 'biological', startDate: null, endDate: null, location: null,
      },
    ]

    const result = computeLayout(persons, relationships)

    expect(result.nodePositions).toBeDefined()
    expect(result.nodePositions['p1']).toBeDefined()
    expect(result.nodePositions['p2']).toBeDefined()
    expect(typeof result.nodePositions['p1'].x).toBe('number')
    expect(typeof result.nodePositions['p1'].y).toBe('number')
  })

  it('handles empty input', () => {
    const result = computeLayout([], [])
    expect(result.nodePositions).toEqual({})
  })

  it('handles single person with no relationships', () => {
    const result = computeLayout([makePerson('p1')], [])
    expect(result.nodePositions['p1']).toBeDefined()
  })

  it('vertical vs horizontal orientation produces different layouts', () => {
    const persons = [makePerson('p1'), makePerson('p2')]
    const relationships: Relationship[] = [
      {
        id: 'r1', type: 'parent-child', from: 'p1', to: 'p2',
        subtype: 'biological', startDate: null, endDate: null, location: null,
      },
    ]

    const vertical = computeLayout(persons, relationships, 'vertical')
    const horizontal = computeLayout(persons, relationships, 'horizontal')

    const vP1 = vertical.nodePositions['p1']
    const vP2 = vertical.nodePositions['p2']
    const hP1 = horizontal.nodePositions['p1']
    const hP2 = horizontal.nodePositions['p2']

    // In vertical (TB), parent is above child: y difference is larger
    // In horizontal (LR), parent is left of child: x difference is larger
    const vYDiff = Math.abs(vP2.y - vP1.y)
    const vXDiff = Math.abs(vP2.x - vP1.x)
    const hYDiff = Math.abs(hP2.y - hP1.y)
    const hXDiff = Math.abs(hP2.x - hP1.x)

    // Vertical layout should have larger Y spread; horizontal should have larger X spread
    expect(vYDiff).toBeGreaterThan(vXDiff)
    expect(hXDiff).toBeGreaterThan(hYDiff)
  })
})

describe('computeLayout with siblings', () => {
  it('places siblings on the same row instead of one level below', () => {
    const persons = [makePerson('parent'), makePerson('kid1'), makePerson('kid2')]
    const relationships: Relationship[] = [
      {
        id: 'r1', type: 'parent-child', from: 'parent', to: 'kid1',
        subtype: 'biological', startDate: null, endDate: null, location: null,
      },
      {
        id: 'r2', type: 'parent-child', from: 'parent', to: 'kid2',
        subtype: 'biological', startDate: null, endDate: null, location: null,
      },
      {
        id: 'r3', type: 'sibling', from: 'kid1', to: 'kid2',
        subtype: 'half', startDate: null, endDate: null, location: null,
      },
    ]

    const { nodePositions } = computeLayout(persons, relationships)

    expect(nodePositions['kid1'].y).toBe(nodePositions['kid2'].y)
    expect(nodePositions['kid1'].y).toBeGreaterThan(nodePositions['parent'].y)
  })

  it('keeps a sibling-only link on the same row', () => {
    const persons = [makePerson('a'), makePerson('b')]
    const relationships: Relationship[] = [
      {
        id: 'r1', type: 'sibling', from: 'a', to: 'b',
        subtype: 'half', startDate: null, endDate: null, location: null,
      },
    ]

    const { nodePositions } = computeLayout(persons, relationships)

    expect(nodePositions['a'].y).toBe(nodePositions['b'].y)
    expect(Math.abs(nodePositions['a'].x - nodePositions['b'].x)).toBeGreaterThan(0)
  })
})
