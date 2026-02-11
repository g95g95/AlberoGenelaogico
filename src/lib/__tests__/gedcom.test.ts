import { describe, it, expect } from 'vitest'
import { parseGedcom, serializeGedcom } from '@/lib/gedcom'

const SIMPLE_GEDCOM = `0 HEAD
1 SOUR Test
1 GEDC
2 VERS 5.5.1
0 @I1@ INDI
1 NAME Mario /Rossi/
1 SEX M
1 BIRT
2 DATE 15 JAN 1980
2 PLAC Roma
0 @I2@ INDI
1 NAME Anna /Bianchi/
1 SEX F
1 BIRT
2 DATE 20 MAR 1982
0 @F1@ FAM
1 HUSB @I1@
1 WIFE @I2@
1 MARR
1 CHIL @I3@
0 @I3@ INDI
1 NAME Luca /Rossi/
1 SEX M
0 TRLR`

describe('parseGedcom', () => {
  it('parses individuals and families from a simple GEDCOM', () => {
    const result = parseGedcom(SIMPLE_GEDCOM)

    expect(result.persons).toHaveLength(3)

    const mario = result.persons.find(p => p.firstName === 'Mario')
    expect(mario).toBeDefined()
    expect(mario!.lastName).toBe('Rossi')
    expect(mario!.gender).toBe('male')
    expect(mario!.birthDate).toBe('1980-01-15')
    expect(mario!.birthPlace).toBe('Roma')

    const anna = result.persons.find(p => p.firstName === 'Anna')
    expect(anna).toBeDefined()
    expect(anna!.gender).toBe('female')
    expect(anna!.birthDate).toBe('1982-03-20')

    const luca = result.persons.find(p => p.firstName === 'Luca')
    expect(luca).toBeDefined()
  })

  it('creates partner and parent-child relationships', () => {
    const result = parseGedcom(SIMPLE_GEDCOM)

    const partnerRel = result.relationships.find(r => r.type === 'partner')
    expect(partnerRel).toBeDefined()
    expect(partnerRel!.subtype).toBe('married')

    const parentChildRels = result.relationships.filter(r => r.type === 'parent-child')
    expect(parentChildRels.length).toBe(2)
  })

  it('handles empty input', () => {
    const result = parseGedcom('')
    expect(result.persons).toHaveLength(0)
    expect(result.relationships).toHaveLength(0)
  })

  it('handles input with only header and trailer', () => {
    const result = parseGedcom('0 HEAD\n0 TRLR')
    expect(result.persons).toHaveLength(0)
    expect(result.relationships).toHaveLength(0)
  })

  it('parses divorced families', () => {
    const gedcom = `0 HEAD
0 @I1@ INDI
1 NAME John /Doe/
1 SEX M
0 @I2@ INDI
1 NAME Jane /Doe/
1 SEX F
0 @F1@ FAM
1 HUSB @I1@
1 WIFE @I2@
1 MARR
1 DIV
0 TRLR`

    const result = parseGedcom(gedcom)
    const partnerRel = result.relationships.find(r => r.type === 'partner')
    expect(partnerRel!.subtype).toBe('divorced')
  })
})

describe('serializeGedcom', () => {
  it('produces valid GEDCOM output', () => {
    const persons = [
      {
        id: 'p1',
        firstName: 'Mario',
        lastName: 'Rossi',
        gender: 'male' as const,
        birthDate: '1980-01-15',
        birthPlace: 'Roma',
        deathDate: null,
        deathPlace: null,
        photo: null,
        notes: '',
        customFields: {},
      },
    ]

    const output = serializeGedcom(persons, [])

    expect(output).toContain('0 HEAD')
    expect(output).toContain('0 TRLR')
    expect(output).toContain('0 @p1@ INDI')
    expect(output).toContain('1 NAME Mario /Rossi/')
    expect(output).toContain('1 SEX M')
    expect(output).toContain('2 DATE 15 JAN 1980')
    expect(output).toContain('2 PLAC Roma')
  })

  it('serializes partner relationships as FAM records', () => {
    const persons = [
      {
        id: 'p1', firstName: 'Mario', lastName: 'Rossi', gender: 'male' as const,
        birthDate: null, birthPlace: null, deathDate: null, deathPlace: null,
        photo: null, notes: '', customFields: {},
      },
      {
        id: 'p2', firstName: 'Anna', lastName: 'Bianchi', gender: 'female' as const,
        birthDate: null, birthPlace: null, deathDate: null, deathPlace: null,
        photo: null, notes: '', customFields: {},
      },
    ]
    const relationships = [
      {
        id: 'r1', type: 'partner' as const, from: 'p1', to: 'p2',
        subtype: 'married' as const, startDate: null, endDate: null,
      },
    ]

    const output = serializeGedcom(persons, relationships)
    expect(output).toContain('FAM')
    expect(output).toContain('1 HUSB @p1@')
    expect(output).toContain('1 WIFE @p2@')
    expect(output).toContain('1 MARR')
  })
})

describe('GEDCOM round-trip', () => {
  it('parse then serialize then parse produces consistent data', () => {
    const first = parseGedcom(SIMPLE_GEDCOM)
    const serialized = serializeGedcom(first.persons, first.relationships)
    const second = parseGedcom(serialized)

    expect(second.persons).toHaveLength(first.persons.length)
    expect(second.relationships.length).toBeGreaterThanOrEqual(first.relationships.length)

    for (const p of first.persons) {
      const match = second.persons.find(sp => sp.firstName === p.firstName && sp.lastName === p.lastName)
      expect(match).toBeDefined()
      expect(match!.gender).toBe(p.gender)
    }
  })
})
