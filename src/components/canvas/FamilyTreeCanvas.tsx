import { useCallback, useEffect, useMemo } from "react";
import {
  ReactFlow,
  MiniMap,
  Background,
  BackgroundVariant,
  useReactFlow,
  type Node,
  type Edge,
  type OnNodesChange,
  applyNodeChanges,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useTreeStore } from "@/stores/treeStore";
import { useUiStore } from "@/stores/uiStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { computeLayout } from "@/lib/layoutEngine";
import { PersonNode } from "./PersonNode";
import { RelationshipEdge } from "./RelationshipEdge";
import { CanvasToolbar } from "./CanvasToolbar";
import { EmptyState } from "./EmptyState";

const nodeTypes = { person: PersonNode };
const edgeTypes = { relationship: RelationshipEdge };

export function FamilyTreeCanvas() {
  const persons = useTreeStore((s) => s.persons);
  const relationships = useTreeStore((s) => s.relationships);
  const layout = useTreeStore((s) => s.layout);
  const setLayout = useTreeStore((s) => s.setLayout);
  const selectPerson = useUiStore((s) => s.selectPerson);
  const selectedPersonId = useUiStore((s) => s.selectedPersonId);
  const minimapVisible = useUiStore((s) => s.minimapVisible);
  const effectiveTheme = useSettingsStore((s) => s.getEffectiveTheme());
  const { fitView } = useReactFlow();

  // Compute layout on first load or when persons change and no positions exist
  useEffect(() => {
    if (persons.length === 0) return;
    const hasPositions = Object.keys(layout.nodePositions).length > 0;
    if (hasPositions) return;

    const result = computeLayout(persons, relationships, layout.orientation);
    setLayout({ nodePositions: result.nodePositions });
    setTimeout(() => fitView({ padding: 0.2, duration: 300 }), 100);
  }, [persons.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const nodes: Node[] = useMemo(
    () =>
      persons.map((person) => ({
        id: person.id,
        type: "person",
        position: layout.nodePositions[person.id] ?? { x: 0, y: 0 },
        data: { person },
        selected: person.id === selectedPersonId,
      })),
    [persons, layout.nodePositions, selectedPersonId]
  );

  const edges: Edge[] = useMemo(
    () =>
      relationships.map((rel) => ({
        id: rel.id,
        source: rel.type === "parent-child" ? rel.from : rel.from,
        target: rel.type === "parent-child" ? rel.to : rel.to,
        type: "relationship",
        data: {
          relationType: rel.type,
          subtype: rel.subtype,
        },
      })),
    [relationships]
  );

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => {
      // Apply drag changes to update positions in store
      const updated = applyNodeChanges(changes, nodes);
      const positionChanges = changes.filter(
        (c) => c.type === "position" && c.position
      );
      if (positionChanges.length > 0) {
        const newPositions = { ...layout.nodePositions };
        for (const node of updated) {
          newPositions[node.id] = { x: node.position.x, y: node.position.y };
        }
        setLayout({ nodePositions: newPositions });
      }

      const selectionChange = changes.find(
        (c): c is Extract<typeof c, { type: "select" }> =>
          c.type === "select" && "selected" in c && c.selected === true
      );
      if (selectionChange) {
        selectPerson(selectionChange.id);
      }
    },
    [nodes, layout.nodePositions, setLayout, selectPerson]
  );

  const onPaneClick = useCallback(() => {
    selectPerson(null);
  }, [selectPerson]);

  if (persons.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="w-full h-full relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onPaneClick={onPaneClick}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
        className={effectiveTheme === "dark" ? "dark" : ""}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color={effectiveTheme === "dark" ? "#2a2a3a" : "#e5e5e5"}
        />
        {minimapVisible && (
          <MiniMap
            nodeColor={(node) => {
              const gender = (node.data as { person?: { gender?: string } })?.person?.gender;
              if (gender === "male") return "#6B9AC4";
              if (gender === "female") return "#D4849A";
              if (gender === "other") return "#9B8EC4";
              return "#9CA3AF";
            }}
            maskColor={
              effectiveTheme === "dark"
                ? "rgba(15,15,20,0.7)"
                : "rgba(250,250,248,0.7)"
            }
          />
        )}
      </ReactFlow>
      <CanvasToolbar />
    </div>
  );
}
