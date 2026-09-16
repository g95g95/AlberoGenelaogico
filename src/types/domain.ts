export const GENDERS = {
  male: "male",
  female: "female",
  other: "other",
  unknown: "unknown",
} as const;
export type Gender = (typeof GENDERS)[keyof typeof GENDERS];

export const RELATION_TYPES = {
  partner: "partner",
  parentChild: "parent-child",
  sibling: "sibling",
  friend: "friend",
} as const;
export type RelationType = (typeof RELATION_TYPES)[keyof typeof RELATION_TYPES];

export const PARTNER_SUBTYPES = {
  married: "married",
  divorced: "divorced",
  partner: "partner",
} as const;
export type PartnerSubtype =
  | (typeof PARTNER_SUBTYPES)[keyof typeof PARTNER_SUBTYPES]
  | null;

export const PARENT_CHILD_SUBTYPES = {
  biological: "biological",
  adopted: "adopted",
  foster: "foster",
  step: "step",
} as const;
export type ParentChildSubtype =
  (typeof PARENT_CHILD_SUBTYPES)[keyof typeof PARENT_CHILD_SUBTYPES];

export const SIBLING_SUBTYPES = {
  /** Same two parents */
  full: "full",
  /** Exactly one shared parent (fratellastro/sorellastra) */
  half: "half",
  /** No shared parent, the parents are partners (fratello/sorella acquisito) */
  stepSibling: "stepSibling",
  /** Sibling through adoption */
  adoptiveSibling: "adoptiveSibling",
} as const;
export type SiblingSubtype =
  (typeof SIBLING_SUBTYPES)[keyof typeof SIBLING_SUBTYPES];

export const PROJECT_TYPES = {
  familyTree: "familyTree",
  friendCluster: "friendCluster",
} as const;
export type ProjectType = (typeof PROJECT_TYPES)[keyof typeof PROJECT_TYPES];

export const FRIEND_SUBTYPES = {
  university: "university",
  highSchool: "highSchool",
  middleSchool: "middleSchool",
  elementary: "elementary",
  summerCityFriend: "summerCityFriend",
  sport: "sport",
  romantic: "romantic",
  flirt: "flirt",
  workColleague: "workColleague",
  neighbor: "neighbor",
  acquaintance: "acquaintance",
} as const;
export type FriendSubtype = (typeof FRIEND_SUBTYPES)[keyof typeof FRIEND_SUBTYPES];

export interface Person {
  id: string;
  firstName: string;
  lastName: string;
  gender: Gender;
  birthDate: string | null;
  birthPlace: string | null;
  deathDate: string | null;
  deathPlace: string | null;
  photo: string | null;
  notes: string;
  customFields: Record<string, string>;
}

export interface Relationship {
  id: string;
  type: RelationType;
  from: string;
  to: string;
  subtype: PartnerSubtype | ParentChildSubtype | SiblingSubtype | FriendSubtype;
  startDate: string | null;
  endDate: string | null;
  location: string | null;
}

export interface ProjectMeta {
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  author: string;
  projectType: ProjectType;
}

export interface HandlePosition {
  side: "top" | "bottom" | "left" | "right";
  offset: number; // 0-100 percentage along that side
}

export interface LayoutConfig {
  orientation: "vertical" | "horizontal";
  rootPersonId: string | null;
  nodePositions: Record<string, { x: number; y: number }>;
  handlePositions?: Record<string, Record<string, HandlePosition>>;
}

export interface Settings {
  theme: "light" | "dark" | "system";
  locale: "it" | "en";
}

export interface FamilyTreeProject {
  version: string;
  meta: ProjectMeta;
  persons: Person[];
  relationships: Relationship[];
  layout: LayoutConfig;
  settings: Settings;
}
