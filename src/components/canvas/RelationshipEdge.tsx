import {
  BaseEdge,
  getSmoothStepPath,
  type EdgeProps,
} from "@xyflow/react";

type RelEdgeData = {
  relationType: "partner" | "parent-child";
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

  let strokeColor = "#9CA3AF";
  let strokeDasharray = "";
  let strokeWidth = 2;

  if (data) {
    if (data.relationType === "partner") {
      strokeColor = "#C87941";
      if (data.subtype === "divorced") {
        strokeDasharray = "5 5";
      } else if (data.subtype === "married") {
        strokeWidth = 3;
      }
    } else if (data.relationType === "parent-child") {
      strokeColor = "#7C9A72";
      if (data.subtype === "adopted") {
        strokeDasharray = "8 4";
      } else if (data.subtype === "foster") {
        strokeDasharray = "4 4";
      } else if (data.subtype === "step") {
        strokeDasharray = "12 4";
      }
    }
  }

  return (
    <BaseEdge
      path={edgePath}
      style={{
        stroke: strokeColor,
        strokeWidth,
        strokeDasharray,
      }}
    />
  );
}
