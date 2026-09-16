import type { Person, Relationship } from "@/types/domain";
import { decodeGedcom } from "@/lib/gedcomEncoding";
import { parseGedcom } from "@/lib/gedcomParser";
import type { GedcomImportResult } from "@/lib/gedcomParser";

export { parseGedcom, parseGedcomDate, tokenizeGedcom } from "@/lib/gedcomParser";
export type { GedcomImportResult, GedcomSource } from "@/lib/gedcomParser";
export { decodeGedcom, detectCharset } from "@/lib/gedcomEncoding";

/** Reads a .ged/.gedcom file, detecting its charset before parsing. */
export async function readGedcomFile(file: File): Promise<GedcomImportResult> {
  const { text } = decodeGedcom(await file.arrayBuffer());
  return parseGedcom(text);
}

const MONTH_TO_GEDCOM = [
  "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
  "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
];

function toGedcomDate(iso: string | null): string {
  if (!iso) return "";
  const parts = iso.split("-");
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) {
    return `${MONTH_TO_GEDCOM[parseInt(parts[1], 10) - 1]} ${parts[0]}`;
  }
  const day = parseInt(parts[2], 10);
  const month = MONTH_TO_GEDCOM[parseInt(parts[1], 10) - 1];
  return `${day} ${month} ${parts[0]}`;
}

export function serializeGedcom(
  persons: Person[],
  relationships: Relationship[]
): string {
  const lines: string[] = [];
  lines.push("0 HEAD");
  lines.push("1 SOUR FamilyTree");
  lines.push("1 GEDC");
  lines.push("2 VERS 5.5.1");
  lines.push("2 FORM LINEAGE-LINKED");
  lines.push("1 CHAR UTF-8");

  for (const p of persons) {
    lines.push(`0 @${p.id}@ INDI`);
    lines.push(`1 NAME ${p.firstName} /${p.lastName}/`);
    const sexMap: Record<string, string> = {
      male: "M",
      female: "F",
      other: "U",
      unknown: "U",
    };
    lines.push(`1 SEX ${sexMap[p.gender]}`);
    if (p.birthDate || p.birthPlace) {
      lines.push("1 BIRT");
      if (p.birthDate) lines.push(`2 DATE ${toGedcomDate(p.birthDate)}`);
      if (p.birthPlace) lines.push(`2 PLAC ${p.birthPlace}`);
    }
    if (p.deathDate || p.deathPlace) {
      lines.push("1 DEAT");
      if (p.deathDate) lines.push(`2 DATE ${toGedcomDate(p.deathDate)}`);
      if (p.deathPlace) lines.push(`2 PLAC ${p.deathPlace}`);
    }
    if (p.notes) lines.push(`1 NOTE ${p.notes}`);
  }

  // Build families from partner relationships.
  // Sibling relationships have no GEDCOM equivalent: they are conveyed by the
  // shared parents, so a sibling link on its own is not exported.
  const partnerRels = relationships.filter((r) => r.type === "partner");
  const parentChildRels = relationships.filter(
    (r) => r.type === "parent-child"
  );
  let famIdx = 1;

  const linkKey = (parentId: string, childId: string) => `${parentId}>${childId}`;
  const emittedLinks = new Set<string>();

  for (const pr of partnerRels) {
    const p1 = persons.find((p) => p.id === pr.from);
    const p2 = persons.find((p) => p.id === pr.to);
    if (!p1 || !p2) continue;

    const famId = `F${famIdx++}`;
    const husb = p1.gender === "female" ? p2 : p1;
    const wife = p1.gender === "female" ? p1 : p2;

    lines.push(`0 @${famId}@ FAM`);
    lines.push(`1 HUSB @${husb.id}@`);
    lines.push(`1 WIFE @${wife.id}@`);

    if (pr.subtype === "married") lines.push("1 MARR");
    if (pr.subtype === "divorced") {
      lines.push("1 MARR");
      lines.push("1 DIV");
    }

    // Only children of BOTH partners belong to this family. A child of just
    // one of them is a half sibling and gets its own family below, otherwise
    // the export would silently promote it to a full sibling.
    const childIds = new Set(
      parentChildRels
        .filter((r) => r.from === pr.from || r.from === pr.to)
        .map((r) => r.to)
    );
    for (const cid of childIds) {
      const fromFirst = parentChildRels.some((r) => r.from === pr.from && r.to === cid);
      const fromSecond = parentChildRels.some((r) => r.from === pr.to && r.to === cid);
      if (!fromFirst || !fromSecond) continue;
      lines.push(`1 CHIL @${cid}@`);
      emittedLinks.add(linkKey(pr.from, cid));
      emittedLinks.add(linkKey(pr.to, cid));
    }
  }

  // Children not covered by a couple (single parent, or a child of only one
  // member of a couple) get a one-parent family so the link is not lost.
  const leftoverByParent = new Map<string, string[]>();
  for (const pcr of parentChildRels) {
    if (emittedLinks.has(linkKey(pcr.from, pcr.to))) continue;
    if (!persons.some((p) => p.id === pcr.from)) continue;
    if (!persons.some((p) => p.id === pcr.to)) continue;
    const children = leftoverByParent.get(pcr.from) ?? [];
    if (!children.includes(pcr.to)) children.push(pcr.to);
    leftoverByParent.set(pcr.from, children);
  }

  for (const [parentId, childIds] of leftoverByParent) {
    const parent = persons.find((p) => p.id === parentId);
    if (!parent) continue;
    lines.push(`0 @F${famIdx++}@ FAM`);
    lines.push(`1 ${parent.gender === "female" ? "WIFE" : "HUSB"} @${parent.id}@`);
    for (const cid of childIds) {
      lines.push(`1 CHIL @${cid}@`);
    }
  }

  lines.push("0 TRLR");
  return lines.join("\n");
}

export function downloadGedcom(
  persons: Person[],
  relationships: Relationship[],
  filename: string = "familytree"
) {
  const content = serializeGedcom(persons, relationships);
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.ged`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
