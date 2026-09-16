import { describe, it, expect } from 'vitest'
import { buildTreeScene } from '@/lib/treeScene'
import { buildSvg } from '@/lib/exportImage'
import { renderPdf } from '@/lib/exportPdf'
import type { LayoutConfig, Person, Relationship } from '@/types/domain'

function makePerson(id: string, overrides: Partial<Person> = {}): Person {
  return {
    id,
    firstName: 'Nome',
    lastName: id.toUpperCase(),
    gender: 'unknown',
    birthDate: '1950',
    birthPlace: 'Roma',
    deathDate: null,
    deathPlace: null,
    photo: null,
    notes: '',
    customFields: {},
    ...overrides,
  }
}

function layoutFor(positions: Record<string, { x: number; y: number }>): LayoutConfig {
  return {
    orientation: 'vertical',
    rootPersonId: null,
    nodePositions: positions,
  }
}

const persons = [makePerson('p1'), makePerson('p2'), makePerson('p3')]
const relationships: Relationship[] = [
  {
    id: 'r1', type: 'parent-child', from: 'p1', to: 'p2',
    subtype: 'biological', startDate: null, endDate: null, location: null,
  },
  {
    id: 'r2', type: 'sibling', from: 'p2', to: 'p3',
    subtype: 'half', startDate: null, endDate: null, location: null,
  },
]
const layout = layoutFor({
  p1: { x: 0, y: 0 },
  p2: { x: 0, y: 200 },
  p3: { x: 300, y: 200 },
})

describe('buildTreeScene', () => {
  it('covers every person, not just the ones on screen', () => {
    const scene = buildTreeScene(persons, relationships, layout)

    expect(scene.nodes).toHaveLength(3)
    expect(scene.edges).toHaveLength(2)
    expect(scene.bounds.width).toBeGreaterThan(300)
    expect(scene.bounds.height).toBeGreaterThan(200)
  })

  it('routes parent-child vertically and siblings sideways', () => {
    const scene = buildTreeScene(persons, relationships, layout)
    const parentEdge = scene.edges.find((e) => e.id === 'r1')!
    const siblingEdge = scene.edges.find((e) => e.id === 'r2')!

    // parent link leaves the bottom of p1 and enters the top of p2
    expect(parentEdge.points[0].y).toBeGreaterThan(0)
    expect(parentEdge.points[0].x).toBe(parentEdge.points[parentEdge.points.length - 1].x)

    // sibling link is horizontal between two cards on the same row
    expect(siblingEdge.points[0].y).toBe(siblingEdge.points[1].y)
    expect(siblingEdge.points[0].x).toBeLessThan(siblingEdge.points[1].x)
    expect(siblingEdge.dash).not.toBeNull()
  })

  it('honours custom handle positions', () => {
    const custom = {
      ...layout,
      handlePositions: { p1: { bottom: { side: 'bottom' as const, offset: 10 } } },
    }
    const scene = buildTreeScene(persons, relationships, custom)
    const parentEdge = scene.edges.find((e) => e.id === 'r1')!

    expect(parentEdge.points[0].x).toBeCloseTo(22, 5)
  })

  it('collects a legend entry per distinct relationship', () => {
    const scene = buildTreeScene(persons, relationships, layout, {
      subtypeLabel: (type, subtype) => `${type}/${subtype}`,
    })

    expect(scene.legend.map((l) => l.label)).toEqual([
      'parent-child/biological',
      'sibling/half',
    ])
  })
})

describe('buildSvg', () => {
  it('produces vector markup with real text for every person', () => {
    const svg = buildSvg(buildTreeScene(persons, relationships, layout))

    expect(svg.startsWith('<svg')).toBe(true)
    expect(svg).toContain('Nome P1')
    expect(svg).toContain('Nome P3')
    expect(svg).toContain('<path')
    expect(svg).not.toContain('foreignObject')
  })

  it('escapes text that would break the markup', () => {
    const tricky = [makePerson('p1', { firstName: 'Anna & <b>', lastName: '"Q"' })]
    const svg = buildSvg(buildTreeScene(tricky, [], layoutFor({ p1: { x: 0, y: 0 } })))

    expect(svg).toContain('Anna &amp; &lt;b&gt;')
    expect(svg).not.toContain('<b>')
  })
})

describe('renderPdf', () => {
  it('fits a small tree on a single page', () => {
    const doc = renderPdf(buildTreeScene(persons, relationships, layout), {
      mode: 'single',
      title: 'Famiglia Rossi',
    })

    expect(doc.getNumberOfPages()).toBe(1)
    expect(doc.output('datauristring').startsWith('data:application/pdf')).toBe(true)
  })

  it('tiles a large tree over several sheets in poster mode', () => {
    const many: Person[] = []
    const positions: Record<string, { x: number; y: number }> = {}
    for (let i = 0; i < 40; i++) {
      many.push(makePerson(`x${i}`))
      positions[`x${i}`] = { x: (i % 8) * 320, y: Math.floor(i / 8) * 220 }
    }

    const scene = buildTreeScene(many, [], layoutFor(positions))
    const single = renderPdf(scene, { mode: 'single' })
    const poster = renderPdf(scene, { mode: 'poster' })

    expect(single.getNumberOfPages()).toBe(1)
    expect(poster.getNumberOfPages()).toBeGreaterThan(1)
  })

  it('picks the orientation from the shape of the tree', () => {
    const wide = buildTreeScene(
      [makePerson('a'), makePerson('b')],
      [],
      layoutFor({ a: { x: 0, y: 0 }, b: { x: 1200, y: 0 } })
    )
    const tall = buildTreeScene(
      [makePerson('a'), makePerson('b')],
      [],
      layoutFor({ a: { x: 0, y: 0 }, b: { x: 0, y: 1200 } })
    )

    const wideDoc = renderPdf(wide)
    const tallDoc = renderPdf(tall)

    expect(wideDoc.internal.pageSize.getWidth()).toBeGreaterThan(
      wideDoc.internal.pageSize.getHeight()
    )
    expect(tallDoc.internal.pageSize.getHeight()).toBeGreaterThan(
      tallDoc.internal.pageSize.getWidth()
    )
  })
})
