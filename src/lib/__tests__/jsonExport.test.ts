import { describe, it, expect } from 'vitest'
import { exportProject, importProject } from '@/lib/jsonExport'
import type { FamilyTreeProject } from '@/types/domain'

function makeValidProject(): FamilyTreeProject {
  return {
    version: '1.0.0',
    meta: {
      name: 'Test Project',
      description: 'A test project',
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z',
      author: 'Tester',
    },
    persons: [
      {
        id: 'p1',
        firstName: 'Mario',
        lastName: 'Rossi',
        gender: 'male',
        birthDate: '1980-01-15',
        birthPlace: 'Roma',
        deathDate: null,
        deathPlace: null,
        photo: null,
        notes: '',
        customFields: {},
      },
    ],
    relationships: [],
    layout: {
      orientation: 'vertical',
      rootPersonId: 'p1',
      nodePositions: {},
    },
    settings: {
      theme: 'light',
      locale: 'it',
    },
  }
}

describe('exportProject', () => {
  it('produces valid project structure', () => {
    const input = makeValidProject()
    const result = exportProject({
      persons: input.persons,
      relationships: input.relationships,
      meta: input.meta,
      layout: input.layout,
      settings: input.settings,
    })

    expect(result.version).toBe('1.0.0')
    expect(result.meta.name).toBe('Test Project')
    expect(result.persons).toHaveLength(1)
    expect(result.relationships).toHaveLength(0)
    expect(result.layout.orientation).toBe('vertical')
    expect(result.settings.locale).toBe('it')
  })

  it('updates updatedAt timestamp', () => {
    const input = makeValidProject()
    const before = new Date().toISOString()
    const result = exportProject({
      persons: input.persons,
      relationships: input.relationships,
      meta: input.meta,
      layout: input.layout,
      settings: input.settings,
    })

    expect(result.meta.updatedAt >= before).toBe(true)
  })
})

describe('importProject', () => {
  it('validates and loads valid JSON', () => {
    const project = makeValidProject()
    const result = importProject(project)

    expect(result.version).toBe('1.0.0')
    expect(result.persons).toHaveLength(1)
    expect(result.meta.name).toBe('Test Project')
  })

  it('rejects invalid JSON with errors', () => {
    expect(() => importProject({})).toThrow()
  })

  it('rejects missing required fields', () => {
    expect(() => importProject({ version: '1.0.0' })).toThrow()
  })

  it('rejects invalid person gender', () => {
    const project = makeValidProject()
    ;(project.persons[0] as unknown as Record<string, unknown>).gender = 'invalid'
    expect(() => importProject(project)).toThrow()
  })
})
