import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  const projectType = useTreeStore((s) => s.meta.projectType);
  const theme = useSettingsStore((s) => s.theme);
  const { fitView } = useReactFlow();

  const effectiveTheme = useMemo(() => {
    if (theme === "system") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    return theme;
  }, [theme]);

  const [localNodes, setLocalNodes] = useState<Node[]>([]);
  const positionsRef = useRef(layout.nodePositions);
  positionsRef.current = layout.nodePositions;

  useEffect(() => {
    if (persons.length === 0) {
      setLocalNodes([]);
      return;
    }
    const hasPositions = Object.keys(layout.nodePositions).length > 0;
    if (!hasPositions) {
      const result = computeLayout(persons, relationships, layout.orientation, projectType);
      setLayout({ nodePositions: result.nodePositions });
      setTimeout(() => fitView({ padding: 0.2, duration: 300 }), 100);
      return;
    }

    setLocalNodes(
      persons.map((person) => ({
        id: person.id,
        type: "person" as const,
        position: layout.nodePositions[person.id] ?? { x: 0, y: 0 },
        data: { person, handlePositions: layout.handlePositions?.[person.id] },
        selected: person.id === selectedPersonId,
      }))
    );
  }, [persons, layout.nodePositions, selectedPersonId, relationships, layout.orientation, setLayout, fitView, projectType]);

  const edges: Edge[] = useMemo(
    () =>
      relationships.map((rel) => {
        const isPartner = rel.type === "partner";
        const isFriend = rel.type === "friend";
        return {
          id: rel.id,
          source: rel.from,
          target: rel.to,
          sourceHandle: (isPartner || isFriend) ? "right" : "bottom",
          targetHandle: (isPartner || isFriend) ? "left" : "top",
          type: "relationship",
          data: {
            relationType: rel.type,
            subtype: rel.subtype,
          },
        };
      }),
    [relationships]
  );

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => {
      setLocalNodes((nds) => {
        const updated = applyNodeChanges(changes, nds);

        const hasDragEnd = changes.some(
          (c) => c.type === "position" && !c.dragging && c.position
        );
        if (hasDragEnd) {
          const newPositions = { ...positionsRef.current };
          for (const node of updated) {
            newPositions[node.id] = { x: node.position.x, y: node.position.y };
          }
          setLayout({ nodePositions: newPositions });
        }

        return updated;
      });

      const selectionChange = changes.find(
        (c): c is Extract<typeof c, { type: "select" }> =>
          c.type === "select" && "selected" in c && c.selected === true
      );
      if (selectionChange) {
        selectPerson(selectionChange.id);
      }
    },
    [setLayout, selectPerson]
  );

  const onPaneClick = useCallback(() => {
    selectPerson(null);
  }, [selectPerson]);

  const setStandaloneAddPosition = useUiStore((s) => s.setStandaloneAddPosition);
  const { screenToFlowPosition } = useReactFlow();

  const onPaneContextMenu = useCallback(
    (event: MouseEvent | React.MouseEvent) => {
      event.preventDefault();
      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      setStandaloneAddPosition(position);
    },
    [screenToFlowPosition, setStandaloneAddPosition]
  );

  if (persons.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="w-full h-full relative">
      <ReactFlow
        nodes={localNodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onPaneClick={onPaneClick}
        onPaneContextMenu={onPaneContextMenu}
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
