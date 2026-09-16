import type { RelationType } from "@/types/domain";

export interface RelationshipStyle {
  color: string;
  /** Dash pattern in canvas pixels, or null for a solid line */
  dash: number[] | null;
  width: number;
  /** Lateral relations join the sides of the cards, not top/bottom */
  lateral: boolean;
}

const FRIEND_COLORS: Record<string, string> = {
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

const PARTNER_COLOR = "#C87941";
const PARENT_CHILD_COLOR = "#7C9A72";
const SIBLING_COLOR = "#8B7BB8";
const NEUTRAL_COLOR = "#9CA3AF";

/**
 * Single source of truth for how a relationship looks, shared by the on-screen
 * canvas and every export, so a printed tree matches what the user sees.
 */
export function getRelationshipStyle(
  type: RelationType | string,
  subtype: string | null
): RelationshipStyle {
  if (type === "partner") {
    return {
      color: PARTNER_COLOR,
      dash: subtype === "divorced" ? [5, 5] : null,
      width: subtype === "married" ? 3 : 2,
      lateral: true,
    };
  }

  if (type === "parent-child") {
    const dash =
      subtype === "adopted"
        ? [8, 4]
        : subtype === "foster"
          ? [4, 4]
          : subtype === "step"
            ? [12, 4]
            : null;
    return { color: PARENT_CHILD_COLOR, dash, width: 2, lateral: false };
  }

  if (type === "sibling") {
    const dash =
      subtype === "half"
        ? [10, 5]
        : subtype === "stepSibling"
          ? [2, 5]
          : subtype === "adoptiveSibling"
            ? [8, 4]
            : null;
    return { color: SIBLING_COLOR, dash, width: 2, lateral: true };
  }

  if (type === "friend") {
    return {
      color: FRIEND_COLORS[subtype ?? ""] ?? NEUTRAL_COLOR,
      dash: null,
      width: 2,
      lateral: true,
    };
  }

  return { color: NEUTRAL_COLOR, dash: null, width: 2, lateral: true };
}

export const GENDER_COLORS: Record<string, string> = {
  male: "#6B9AC4",
  female: "#D4849A",
  other: "#9B8EC4",
  unknown: "#9CA3AF",
};
