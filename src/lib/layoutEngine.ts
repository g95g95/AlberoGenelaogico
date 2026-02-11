import dagre from "@dagrejs/dagre";
import type { Person, Relationship } from "@/types/domain";

interface LayoutResult {
  nodePositions: Record<string, { x: number; y: number }>;
}

export function computeLayout(
  persons: Person[],
  relationships: Relationship[],
  orientation: "vertical" | "horizontal" = "vertical"
): LayoutResult {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: orientation === "vertical" ? "TB" : "LR",
    nodesep: 100,
    ranksep: 140,
    marginx: 50,
    marginy: 50,
  });

  const NODE_WIDTH = 220;
  const NODE_HEIGHT = 100;

  for (const person of persons) {
    g.setNode(person.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }

  const personIds = new Set(persons.map((p) => p.id));

  // Only use parent-child edges for dagre ranking (vertical hierarchy)
  for (const rel of relationships) {
    if (!personIds.has(rel.from) || !personIds.has(rel.to)) continue;
    if (rel.type === "parent-child") {
      g.setEdge(rel.from, rel.to);
    }
  }

  dagre.layout(g);

  const nodePositions: Record<string, { x: number; y: number }> = {};
  for (const person of persons) {
    const node = g.node(person.id);
    if (node) {
      nodePositions[person.id] = {
        x: node.x - NODE_WIDTH / 2,
        y: node.y - NODE_HEIGHT / 2,
      };
    }
  }

  // Post-process: place partners on the same Y level, side by side
  for (const rel of relationships) {
    if (rel.type !== "partner") continue;
    if (!nodePositions[rel.from] || !nodePositions[rel.to]) continue;

    const posA = nodePositions[rel.from];
    const posB = nodePositions[rel.to];

    // Align Y to the same level (use the one dagre assigned first)
    const sharedY = Math.min(posA.y, posB.y);
    posA.y = sharedY;
    posB.y = sharedY;

    // Ensure they're side by side with proper spacing
    if (Math.abs(posA.x - posB.x) < NODE_WIDTH + 40) {
      const midX = (posA.x + posB.x) / 2;
      posA.x = midX - (NODE_WIDTH / 2 + 30);
      posB.x = midX + (NODE_WIDTH / 2 + 30);
    }
  }

  return { nodePositions };
}
