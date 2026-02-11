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
  subtype: PartnerSubtype | ParentChildSubtype;
  startDate: string | null;
  endDate: string | null;
}

export interface ProjectMeta {
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  author: string;
}

export interface LayoutConfig {
  orientation: "vertical" | "horizontal";
  rootPersonId: string | null;
  nodePositions: Record<string, { x: number; y: number }>;
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
