import { describe, it, expect } from 'vitest'
import { parseGedcom, parseGedcomDate } from '@/lib/gedcomParser'
import { decodeGedcom, decodeAnsel, detectCharset } from '@/lib/gedcomEncoding'

// Shaped after a real MyHeritage "Export to GEDCOM" file: structured name
// sub-tags, CONC/CONT notes, dated marriage and divorce, adoption pedigree.
const MYHERITAGE = `0 HEAD
1 SOUR MYHERITAGE
2 NAME MyHeritage Family Tree Builder
2 VERS 8.0
2 CORP MyHeritage.com
1 DATE 12 MAR 2024
1 FILE Famiglia Bernelli.ged
1 CHAR UTF-8
1 SUBM @SUBM@
1 GEDC
2 VERS 5.5.1
2 FORM LINEAGE-LINKED
0 @SUBM@ SUBM
1 NAME Giulio Bernelli
0 @I1@ INDI
1 NAME Giuseppe /Bernelli/
2 GIVN Giuseppe
2 SURN Bernelli
1 SEX M
1 BIRT
2 DATE ABT 1901
2 PLAC Verona, Veneto, Italia
1 DEAT
2 DATE 3 FEB 1978
2 PLAC Verona, Veneto, Italia
1 OCCU Falegname
1 NOTE Emigrato in Argentina nel 1925 e
2 CONT tornato in Italia dieci anni dopo.
1 OBJE
2 FILE media/giuseppe.jpg
0 @I2@ INDI
1 NAME Maria Teresa /Conti/
2 GIVN Maria Teresa
2 SURN Conti
1 SEX F
1 BIRT
2 DATE BET 1903 AND 1905
0 @I3@ INDI
1 NAME Franco /Bernelli/
2 GIVN Franco
2 SURN Bernelli
1 SEX M
1 BIRT
2 DATE 14 SEP 1930
1 FAMC @F1@
0 @I4@ INDI
1 NAME Elena /Bernelli/
2 GIVN Elena
2 SURN Bernelli
1 SEX F
1 FAMC @F1@
2 PEDI adopted
0 @F1@ FAM
1 HUSB @I1@
1 WIFE @I2@
1 MARR
2 DATE 7 JUN 1928
2 PLAC Verona, Italia
1 DIV
2 DATE 1952
1 CHIL @I3@
1 CHIL @I4@
0 TRLR`

describe('GEDCOM import from public services', () => {
  it('reads the header so the project keeps its origin', () => {
    const result = parseGedcom(MYHERITAGE)

    expect(result.source.generator).toBe('MyHeritage Family Tree Builder')
    expect(result.source.treeName).toBe('Famiglia Bernelli.ged')
    expect(result.source.submitter).toBe('Giulio Bernelli')
    expect(result.stats.individuals).toBe(4)
    expect(result.stats.families).toBe(1)
  })

  it('prefers the structured GIVN/SURN name sub-tags', () => {
    const { persons } = parseGedcom(MYHERITAGE)
    const maria = persons.find((p) => p.id === 'I2')!

    expect(maria.firstName).toBe('Maria Teresa')
    expect(maria.lastName).toBe('Conti')
  })

  it('joins CONC/CONT continuation lines', () => {
    const giuseppe = parseGedcom(MYHERITAGE).persons.find((p) => p.id === 'I1')!

    expect(giuseppe.notes).toBe(
      'Emigrato in Argentina nel 1925 e\ntornato in Italia dieci anni dopo.'
    )
  })

  it('keeps extra facts and media references', () => {
    const giuseppe = parseGedcom(MYHERITAGE).persons.find((p) => p.id === 'I1')!

    expect(giuseppe.customFields.Occupation).toBe('Falegname')
    expect(giuseppe.customFields.Media).toBe('media/giuseppe.jpg')
  })

  it('carries marriage and divorce dates onto the partner relationship', () => {
    const partner = parseGedcom(MYHERITAGE).relationships.find((r) => r.type === 'partner')!

    expect(partner.subtype).toBe('divorced')
    expect(partner.startDate).toBe('1928-06-07')
    expect(partner.endDate).toBe('1952')
    expect(partner.location).toBe('Verona, Italia')
  })

  it('uses the FAMC pedigree for adopted children', () => {
    const rels = parseGedcom(MYHERITAGE).relationships
    const franco = rels.filter((r) => r.type === 'parent-child' && r.to === 'I3')
    const elena = rels.filter((r) => r.type === 'parent-child' && r.to === 'I4')

    expect(franco).toHaveLength(2)
    expect(franco.every((r) => r.subtype === 'biological')).toBe(true)
    expect(elena).toHaveLength(2)
    expect(elena.every((r) => r.subtype === 'adopted')).toBe(true)
  })

  it('records approximate and range dates as their first known value', () => {
    const { persons } = parseGedcom(MYHERITAGE)

    expect(persons.find((p) => p.id === 'I1')!.birthDate).toBe('1901')
    expect(persons.find((p) => p.id === 'I2')!.birthDate).toBe('1903')
  })

  it('warns about pointers to individuals missing from the file', () => {
    const broken = `0 HEAD
0 @I1@ INDI
1 NAME Solo /Uno/
0 @F1@ FAM
1 HUSB @I1@
1 WIFE @I9@
1 CHIL @I8@
0 TRLR`
    const result = parseGedcom(broken)

    expect(result.persons).toHaveLength(1)
    expect(result.warnings.join(' ')).toContain('@I9@')
    expect(result.warnings.join(' ')).toContain('@I8@')
  })

  it('keeps siblings of a parentless family as explicit sibling links', () => {
    const orphans = `0 HEAD
0 @I1@ INDI
1 NAME Ada /Neri/
0 @I2@ INDI
1 NAME Bruno /Neri/
0 @F1@ FAM
1 CHIL @I1@
1 CHIL @I2@
0 TRLR`
    const { relationships } = parseGedcom(orphans)

    expect(relationships).toHaveLength(1)
    expect(relationships[0].type).toBe('sibling')
    expect(relationships[0].subtype).toBe('full')
  })

  it('does not duplicate a parent link repeated across families', () => {
    const duplicated = `0 HEAD
0 @I1@ INDI
1 NAME Padre /Uno/
0 @I2@ INDI
1 NAME Figlio /Uno/
0 @F1@ FAM
1 HUSB @I1@
1 CHIL @I2@
0 @F2@ FAM
1 HUSB @I1@
1 CHIL @I2@
0 TRLR`
    const { relationships } = parseGedcom(duplicated)

    expect(relationships).toHaveLength(1)
  })

  it('handles GEDCOM 7 style ISO dates', () => {
    expect(parseGedcomDate('2024-03-12')).toBe('2024-03-12')
    expect(parseGedcomDate('FROM 1901 TO 1910')).toBe('1901')
    expect(parseGedcomDate('EST 1880')).toBe('1880')
    expect(parseGedcomDate('CAL 12 JUNE 1901')).toBe('1901-06-12')
    expect(parseGedcomDate('')).toBeNull()
  })
})

describe('GEDCOM character sets', () => {
  function bytesOf(...parts: (string | number[])[]): ArrayBuffer {
    const chunks: number[] = []
    for (const part of parts) {
      if (typeof part === 'string') {
        for (const char of part) chunks.push(char.charCodeAt(0))
      } else {
        chunks.push(...part)
      }
    }
    return new Uint8Array(chunks).buffer
  }

  it('strips a UTF-8 BOM', () => {
    const buffer = bytesOf([0xef, 0xbb, 0xbf], '0 HEAD\n1 CHAR UTF-8\n0 TRLR')

    const { text, charset } = decodeGedcom(buffer)
    expect(charset).toBe('utf-8')
    expect(text.startsWith('0 HEAD')).toBe(true)
  })

  it('decodes Windows-1252 files declared as ANSI', () => {
    // 0xE9 is "é" in Windows-1252 but invalid on its own in UTF-8
    const buffer = bytesOf('0 HEAD\n1 CHAR ANSI\n0 @I1@ INDI\n1 NAME Ren', [0xe9], ' /Dupont/\n0 TRLR')

    const { text, charset } = decodeGedcom(buffer)
    expect(charset).toBe('windows-1252')
    expect(text).toContain('René')

    const person = parseGedcom(text).persons[0]
    expect(person.firstName).toBe('René')
  })

  it('decodes ANSEL, where the accent comes before the letter', () => {
    // 0xE2 is a combining acute accent applied to the next character
    const decoded = decodeAnsel(new Uint8Array([0x52, 0x65, 0x6e, 0xe2, 0x65]))
    expect(decoded).toBe('René')

    const buffer = bytesOf('0 HEAD\n1 CHAR ANSEL\n0 @I1@ INDI\n1 NAME Ren', [0xe2, 0x65], ' /Dupont/\n0 TRLR')
    expect(detectCharset(new Uint8Array(buffer))).toBe('ansel')

    const person = parseGedcom(decodeGedcom(buffer).text).persons[0]
    expect(person.firstName).toBe('René')
  })

  it('reads files with CRLF line endings', () => {
    const crlf = '0 HEAD\r\n0 @I1@ INDI\r\n1 NAME Anna /Blu/\r\n0 TRLR\r\n'
    expect(parseGedcom(crlf).persons[0].lastName).toBe('Blu')
  })
})
