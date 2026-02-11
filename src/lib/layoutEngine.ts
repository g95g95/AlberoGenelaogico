import dagre from "@dagrejs/dagre";
import type { Person, Relationship, ProjectType } from "@/types/domain";

interface LayoutResult {
  nodePositions: Record<string, { x: number; y: number }>;
}

export function computeLayout(
  persons: Person[],
  relationships: Relationship[],
  orientation: "vertical" | "horizontal" = "vertical",
  projectType: ProjectType = "familyTree"
): LayoutResult {
  const isFriendCluster = projectType === "friendCluster";

  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: isFriendCluster ? "LR" : (orientation === "vertical" ? "TB" : "LR"),
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

  for (const rel of relationships) {
    if (!personIds.has(rel.from) || !personIds.has(rel.to)) continue;
    if (isFriendCluster || rel.type === "parent-child") {
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

  if (!isFriendCluster) {
    for (const rel of relationships) {
      if (rel.type !== "partner") continue;
      if (!nodePositions[rel.from] || !nodePositions[rel.to]) continue;

      const posA = nodePositions[rel.from];
      const posB = nodePositions[rel.to];

      const sharedY = Math.min(posA.y, posB.y);
      posA.y = sharedY;
      posB.y = sharedY;

      if (Math.abs(posA.x - posB.x) < NODE_WIDTH + 40) {
        const midX = (posA.x + posB.x) / 2;
        posA.x = midX - (NODE_WIDTH / 2 + 30);
        posB.x = midX + (NODE_WIDTH / 2 + 30);
      }
    }
  }

  return { nodePositions };
}
