import type {
  HandlePosition,
  LayoutConfig,
  Person,
  Relationship,
} from "@/types/domain";
import { getAvatarColor, getInitials } from "@/utils/avatar";
import { formatDateRange } from "@/utils/date";
import { GENDER_COLORS, getRelationshipStyle } from "@/lib/relationshipStyle";

/**
 * A resolution independent description of the tree, expressed in the same
 * pixel coordinates the canvas uses. Every exporter (PDF, SVG, PNG) draws
 * from this scene instead of screenshotting the DOM, so exports contain the
 * whole tree at any resolution rather than whatever happened to be on screen.
 */

export const NODE_WIDTH = 220;
export const CARD_PADDING = 12;
export const AVATAR_SIZE = 40;
export const ACCENT_WIDTH = 4;
export const CARD_RADIUS = 16;

export const NAME_FONT_SIZE = 14;
export const META_FONT_SIZE = 11;

export interface ScenePoint {
  x: number;
  y: number;
}

export interface SceneNode {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  accent: string;
  avatarColor: string;
  initials: string;
  photo: string | null;
  name: string;
  dates: string;
  place: string;
}

export interface SceneEdge {
  id: string;
  points: ScenePoint[];
  color: string;
  dash: number[] | null;
  width: number;
}

export interface SceneLegendItem {
  label: string;
  color: string;
  dash: number[] | null;
}

export interface TreeScene {
  nodes: SceneNode[];
  edges: SceneEdge[];
  legend: SceneLegendItem[];
  bounds: { x: number; y: number; width: number; height: number };
}

const DEFAULT_HANDLES: Record<string, HandlePosition> = {
  top: { side: "top", offset: 50 },
  bottom: { side: "bottom", offset: 50 },
  right: { side: "right", offset: 50 },
  left: { side: "left", offset: 50 },
};

function cardHeight(node: { dates: string; place: string }): number {
  const textHeight =
    20 + (node.dates ? 16 : 0) + (node.place ? 16 : 0);
  return CARD_PADDING * 2 + Math.max(AVATAR_SIZE, textHeight);
}

function anchorPoint(
  node: SceneNode,
  handleId: string,
  handles: Record<string, HandlePosition> | undefined
): ScenePoint {
  const pos = handles?.[handleId] ?? DEFAULT_HANDLES[handleId];
  const ratio = Math.min(100, Math.max(0, pos.offset)) / 100;
  switch (pos.side) {
    case "top":
      return { x: node.x + node.width * ratio, y: node.y };
    case "bottom":
      return { x: node.x + node.width * ratio, y: node.y + node.height };
    case "left":
      return { x: node.x, y: node.y + node.height * ratio };
    default:
      return { x: node.x + node.width, y: node.y + node.height * ratio };
  }
}

/** Orthogonal route between two anchors, the shape genealogy charts use. */
function routeEdge(
  from: ScenePoint,
  to: ScenePoint,
  lateral: boolean
): ScenePoint[] {
  if (lateral) {
    if (Math.abs(from.y - to.y) < 1) return [from, to];
    const midX = (from.x + to.x) / 2;
    return [
      from,
      { x: midX, y: from.y },
      { x: midX, y: to.y },
      to,
    ];
  }
  if (Math.abs(from.x - to.x) < 1) return [from, to];
  const midY = (from.y + to.y) / 2;
  return [
    from,
    { x: from.x, y: midY },
    { x: to.x, y: midY },
    to,
  ];
}

export interface BuildSceneOptions {
  /** Human readable label for a relationship, used by the printed legend */
  subtypeLabel?: (type: string, subtype: string | null) => string;
  padding?: number;
}

export function buildTreeScene(
  persons: Person[],
  relationships: Relationship[],
  layout: LayoutConfig,
  options: BuildSceneOptions = {}
): TreeScene {
  const { subtypeLabel, padding = 40 } = options;

  const nodes: SceneNode[] = persons.map((person) => {
    const position = layout.nodePositions[person.id] ?? { x: 0, y: 0 };
    const dates = formatDateRange(person.birthDate, person.deathDate);
    const place = person.birthPlace ?? "";
    const base = {
      id: person.id,
      x: position.x,
      y: position.y,
      width: NODE_WIDTH,
      accent: GENDER_COLORS[person.gender] ?? GENDER_COLORS.unknown,
      avatarColor: getAvatarColor(`${person.firstName} ${person.lastName}`),
      initials: getInitials(person.firstName, person.lastName),
      photo: person.photo,
      name: `${person.firstName} ${person.lastName}`.trim(),
      dates,
      place,
    };
    return { ...base, height: cardHeight(base) };
  });

  const nodeById = new Map(nodes.map((n) => [n.id, n]));

  const edges: SceneEdge[] = [];
  const legendSeen = new Set<string>();
  const legend: SceneLegendItem[] = [];

  for (const rel of relationships) {
    const source = nodeById.get(rel.from);
    const target = nodeById.get(rel.to);
    if (!source || !target) continue;

    const style = getRelationshipStyle(rel.type, rel.subtype);
    const sourceHandle = style.lateral ? "right" : "bottom";
    const targetHandle = style.lateral ? "left" : "top";

    edges.push({
      id: rel.id,
      points: routeEdge(
        anchorPoint(source, sourceHandle, layout.handlePositions?.[source.id]),
        anchorPoint(target, targetHandle, layout.handlePositions?.[target.id]),
        style.lateral
      ),
      color: style.color,
      dash: style.dash,
      width: style.width,
    });

    const legendKey = `${rel.type}:${rel.subtype ?? ""}`;
    if (subtypeLabel && !legendSeen.has(legendKey)) {
      legendSeen.add(legendKey);
      legend.push({
        label: subtypeLabel(rel.type, rel.subtype),
        color: style.color,
        dash: style.dash,
      });
    }
  }

  const bounds = computeBounds(nodes, edges, padding);
  return { nodes, edges, legend, bounds };
}

function computeBounds(
  nodes: SceneNode[],
  edges: SceneEdge[],
  padding: number
): TreeScene["bounds"] {
  if (nodes.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const node of nodes) {
    minX = Math.min(minX, node.x);
    minY = Math.min(minY, node.y);
    maxX = Math.max(maxX, node.x + node.width);
    maxY = Math.max(maxY, node.y + node.height);
  }
  for (const edge of edges) {
    for (const point of edge.points) {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    }
  }

  return {
    x: minX - padding,
    y: minY - padding,
    width: maxX - minX + padding * 2,
    height: maxY - minY + padding * 2,
  };
}

/**
 * Rough text width estimate in canvas pixels. Exact metrics differ per backend,
 * so truncation happens once here to keep PDF, SVG and PNG consistent.
 */
export function estimateTextWidth(text: string, fontSize: number, bold = false): number {
  return text.length * fontSize * (bold ? 0.56 : 0.5);
}

export function truncateToWidth(
  text: string,
  maxWidth: number,
  fontSize: number,
  bold = false
): string {
  if (estimateTextWidth(text, fontSize, bold) <= maxWidth) return text;
  let result = text;
  while (result.length > 1 && estimateTextWidth(`${result}…`, fontSize, bold) > maxWidth) {
    result = result.slice(0, -1);
  }
  return `${result.trimEnd()}…`;
}

/** Usable width for the text column of a card (right of the avatar). */
export const CARD_TEXT_WIDTH =
  NODE_WIDTH - CARD_PADDING * 2 - AVATAR_SIZE - CARD_PADDING;
