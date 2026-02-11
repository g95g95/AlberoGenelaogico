import { describe, it, expect, beforeEach } from 'vitest'
import { useTreeStore } from '@/stores/treeStore'
import type { Person, Relationship, ProjectMeta, LayoutConfig } from '@/types/domain'

function makePerson(overrides: Partial<Person> = {}): Person {
  return {
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
    ...overrides,
  }
}

function makeRelationship(overrides: Partial<Relationship> = {}): Relationship {
  return {
    id: 'r1',
    type: 'partner',
    from: 'p1',
    to: 'p2',
    subtype: 'married',
    startDate: null,
    endDate: null,
    ...overrides,
  }
}

describe('treeStore', () => {
  beforeEach(() => {
    useTreeStore.getState().clearProject()
  })

  describe('addPerson', () => {
    it('adds a person to the store', () => {
      const person = makePerson()
      useTreeStore.getState().addPerson(person)

      const state = useTreeStore.getState()
      expect(state.persons).toHaveLength(1)
      expect(state.persons[0].id).toBe('p1')
      expect(state.persons[0].firstName).toBe('Mario')
    })
  })

  describe('updatePerson', () => {
    it('updates person fields', () => {
      useTreeStore.getState().addPerson(makePerson())
      useTreeStore.getState().updatePerson('p1', { firstName: 'Luigi' })

      const state = useTreeStore.getState()
      expect(state.persons[0].firstName).toBe('Luigi')
      expect(state.persons[0].lastName).toBe('Rossi')
    })

    it('does nothing if person not found', () => {
      useTreeStore.getState().addPerson(makePerson())
      useTreeStore.getState().updatePerson('nonexistent', { firstName: 'Ghost' })

      expect(useTreeStore.getState().persons).toHaveLength(1)
      expect(useTreeStore.getState().persons[0].firstName).toBe('Mario')
    })
  })

  describe('deletePerson', () => {
    it('removes person and related relationships', () => {
      const p1 = makePerson({ id: 'p1' })
      const p2 = makePerson({ id: 'p2', firstName: 'Anna' })
      const rel = makeRelationship({ from: 'p1', to: 'p2' })

      const store = useTreeStore.getState()
      store.addPerson(p1)
      useTreeStore.getState().addPerson(p2)
      useTreeStore.getState().addRelationship(rel)

      useTreeStore.getState().deletePerson('p1')

      const state = useTreeStore.getState()
      expect(state.persons).toHaveLength(1)
      expect(state.persons[0].id).toBe('p2')
      expect(state.relationships).toHaveLength(0)
    })

    it('clears rootPersonId if deleted person was root', () => {
      const p1 = makePerson({ id: 'p1' })
      const p2 = makePerson({ id: 'p2' })
      useTreeStore.getState().addPerson(p1)
      useTreeStore.getState().addPerson(p2)
      useTreeStore.getState().setLayout({ rootPersonId: 'p1' })

      useTreeStore.getState().deletePerson('p1')

      expect(useTreeStore.getState().layout.rootPersonId).toBe('p2')
    })
  })

  describe('addRelationship', () => {
    it('adds a relationship', () => {
      const rel = makeRelationship()
      useTreeStore.getState().addRelationship(rel)

      const state = useTreeStore.getState()
      expect(state.relationships).toHaveLength(1)
      expect(state.relationships[0].type).toBe('partner')
    })
  })

  describe('deleteRelationship', () => {
    it('removes a relationship', () => {
      useTreeStore.getState().addRelationship(makeRelationship({ id: 'r1' }))
      useTreeStore.getState().addRelationship(makeRelationship({ id: 'r2', from: 'p3', to: 'p4' }))

      useTreeStore.getState().deleteRelationship('r1')

      const state = useTreeStore.getState()
      expect(state.relationships).toHaveLength(1)
      expect(state.relationships[0].id).toBe('r2')
    })
  })

  describe('undo/redo', () => {
    it('undo reverses the last action', () => {
      useTreeStore.getState().addPerson(makePerson({ id: 'p1' }))
      expect(useTreeStore.getState().persons).toHaveLength(1)

      useTreeStore.getState().undo()
      expect(useTreeStore.getState().persons).toHaveLength(0)
    })

    it('redo re-applies an undone action', () => {
      useTreeStore.getState().addPerson(makePerson({ id: 'p1' }))
      useTreeStore.getState().undo()
      expect(useTreeStore.getState().persons).toHaveLength(0)

      useTreeStore.getState().redo()
      expect(useTreeStore.getState().persons).toHaveLength(1)
    })

    it('canUndo returns false when no history', () => {
      expect(useTreeStore.getState().canUndo()).toBe(false)
    })

    it('canUndo returns true after an action', () => {
      useTreeStore.getState().addPerson(makePerson())
      expect(useTreeStore.getState().canUndo()).toBe(true)
    })

    it('canRedo returns true after undo', () => {
      useTreeStore.getState().addPerson(makePerson())
      useTreeStore.getState().undo()
      expect(useTreeStore.getState().canRedo()).toBe(true)
    })
  })

  describe('loadProject', () => {
    it('loads a complete project', () => {
      const meta: ProjectMeta = {
        name: 'Test Project',
        description: 'A test',
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
        author: 'Tester',
      }
      const layout: LayoutConfig = {
        orientation: 'horizontal',
        rootPersonId: 'p1',
        nodePositions: {},
      }
      const persons = [makePerson({ id: 'p1' })]
      const relationships = [makeRelationship({ id: 'r1' })]

      useTreeStore.getState().loadProject({ persons, relationships, meta, layout })

      const state = useTreeStore.getState()
      expect(state.persons).toHaveLength(1)
      expect(state.relationships).toHaveLength(1)
      expect(state.meta.name).toBe('Test Project')
      expect(state.layout.orientation).toBe('horizontal')
    })

    it('resets undo/redo history on load', () => {
      useTreeStore.getState().addPerson(makePerson())
      expect(useTreeStore.getState().canUndo()).toBe(true)

      useTreeStore.getState().loadProject({
        persons: [],
        relationships: [],
        meta: {
          name: 'Fresh',
          description: '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          author: '',
        },
        layout: { orientation: 'vertical', rootPersonId: null, nodePositions: {} },
      })

      expect(useTreeStore.getState().canUndo()).toBe(false)
      expect(useTreeStore.getState().canRedo()).toBe(false)
    })
  })

  describe('clearProject', () => {
    it('resets to empty state', () => {
      useTreeStore.getState().addPerson(makePerson())
      useTreeStore.getState().addRelationship(makeRelationship())

      useTreeStore.getState().clearProject()

      const state = useTreeStore.getState()
      expect(state.persons).toHaveLength(0)
      expect(state.relationships).toHaveLength(0)
      expect(state.canUndo()).toBe(false)
      expect(state.canRedo()).toBe(false)
    })
  })
})
