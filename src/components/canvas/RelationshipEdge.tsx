import {
  BaseEdge,
  getSmoothStepPath,
  type EdgeProps,
} from "@xyflow/react";
import { getRelationshipStyle } from "@/lib/relationshipStyle";
import type { RelationType } from "@/types/domain";

type RelEdgeData = {
  relationType: RelationType;
  subtype: string | null;
};

export function RelationshipEdge(props: EdgeProps & { data?: RelEdgeData }) {
  const { sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data } = props;

  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 16,
  });

  // Same styling source as the PDF/SVG/PNG exports, so print matches screen
  const style = data
    ? getRelationshipStyle(data.relationType, data.subtype)
    : { color: "#9CA3AF", dash: null, width: 2, lateral: true };

  return (
    <BaseEdge
      path={edgePath}
      style={{
        stroke: style.color,
        strokeWidth: style.width,
        strokeDasharray: style.dash ? style.dash.join(" ") : undefined,
      }}
    />
  );
}
