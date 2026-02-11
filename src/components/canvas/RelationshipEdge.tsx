import {
  BaseEdge,
  getSmoothStepPath,
  type EdgeProps,
} from "@xyflow/react";

type RelEdgeData = {
  relationType: "partner" | "parent-child" | "friend";
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
    } else if (data.relationType === "friend") {
      strokeWidth = 2;
      const friendColors: Record<string, string> = {
        university: "#3B82F6",
        highSchool: "#60A5FA",
        middleSchool: "#93C5FD",
        elementary: "#818CF8",
        summerCityFriend: "#F59E0B",
        sport: "#10B981",
        romantic: "#EF4444",
        flirt: "#F472B6",
        workColleague: "#14B8A6",
        neighbor: "#22C55E",
        acquaintance: "#9CA3AF",
      };
      strokeColor = friendColors[data.subtype ?? ""] ?? "#9CA3AF";
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
