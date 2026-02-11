import { z } from "zod/v4";
import type { FamilyTreeProject } from "@/types/domain";

const PersonSchema = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  gender: z.union([
    z.literal("male"),
    z.literal("female"),
    z.literal("other"),
    z.literal("unknown"),
  ]),
  birthDate: z.string().nullable(),
  birthPlace: z.string().nullable(),
  deathDate: z.string().nullable(),
  deathPlace: z.string().nullable(),
  photo: z.string().nullable(),
  notes: z.string(),
  customFields: z.record(z.string(), z.string()),
});

const RelationshipSchema = z.object({
  id: z.string(),
  type: z.union([z.literal("partner"), z.literal("parent-child"), z.literal("friend")]),
  from: z.string(),
  to: z.string(),
  subtype: z
    .union([
      z.literal("married"),
      z.literal("divorced"),
      z.literal("partner"),
      z.literal("biological"),
      z.literal("adopted"),
      z.literal("foster"),
      z.literal("step"),
      z.literal("university"),
      z.literal("highSchool"),
      z.literal("middleSchool"),
      z.literal("elementary"),
      z.literal("summerCityFriend"),
      z.literal("sport"),
      z.literal("romantic"),
      z.literal("flirt"),
      z.literal("workColleague"),
      z.literal("neighbor"),
      z.literal("acquaintance"),
    ])
    .nullable(),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  location: z.string().nullable().default(null),
});

const ProjectSchema = z.object({
  version: z.string(),
  meta: z.object({
    name: z.string(),
    description: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
    author: z.string(),
    projectType: z.union([z.literal("familyTree"), z.literal("friendCluster")]).optional().default("familyTree"),
  }),
  persons: z.array(PersonSchema),
  relationships: z.array(RelationshipSchema),
  layout: z.object({
    orientation: z.union([z.literal("vertical"), z.literal("horizontal")]),
    rootPersonId: z.string().nullable(),
    nodePositions: z.record(
      z.string(),
      z.object({ x: z.number(), y: z.number() })
    ),
    handlePositions: z.record(
      z.string(),
      z.record(
        z.string(),
        z.object({
          side: z.union([z.literal("top"), z.literal("bottom"), z.literal("left"), z.literal("right")]),
          offset: z.number(),
        })
      )
    ).optional(),
  }),
  settings: z.object({
    theme: z.union([
      z.literal("light"),
      z.literal("dark"),
      z.literal("system"),
    ]),
    locale: z.union([z.literal("it"), z.literal("en")]),
  }),
});

export function exportProject(state: {
  persons: FamilyTreeProject["persons"];
  relationships: FamilyTreeProject["relationships"];
  meta: FamilyTreeProject["meta"];
  layout: FamilyTreeProject["layout"];
  settings: FamilyTreeProject["settings"];
}): FamilyTreeProject {
  return {
    version: "1.0.0",
    meta: { ...state.meta, updatedAt: new Date().toISOString() },
    persons: state.persons,
    relationships: state.relationships,
    layout: state.layout,
    settings: state.settings,
  };
}

export function importProject(json: unknown): FamilyTreeProject {
  return ProjectSchema.parse(json);
}

export function downloadJson(project: FamilyTreeProject) {
  const data = JSON.stringify(project, null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${project.meta.name.replace(/\s+/g, "_")}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function readJsonFile(file: File): Promise<FamilyTreeProject> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string);
        const validated = importProject(parsed);
        resolve(validated);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}
