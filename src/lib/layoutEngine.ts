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
    nodesep: 80,
    ranksep: 120,
    marginx: 50,
    marginy: 50,
  });

  const NODE_WIDTH = 220;
  const NODE_HEIGHT = 100;

  for (const person of persons) {
    g.setNode(person.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }

  const personIds = new Set(persons.map((p) => p.id));
  for (const rel of relationships) {
    if (!personIds.has(rel.from) || !personIds.has(rel.to)) continue;
    if (rel.type === "parent-child") {
      g.setEdge(rel.from, rel.to);
    } else if (rel.type === "partner") {
      g.setEdge(rel.from, rel.to, { minlen: 0 });
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

  return { nodePositions };
}
