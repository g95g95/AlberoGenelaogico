import type { Person, Relationship, Gender } from "@/types/domain";
import { generateId } from "@/utils/id";

interface GedcomResult {
  persons: Person[];
  relationships: Relationship[];
}

export function parseGedcom(text: string): GedcomResult {
  const lines = text.split(/\r?\n/);
  const persons: Person[] = [];
  const relationships: Relationship[] = [];
  const indiMap = new Map<string, Person>();
  const famRecords: {
    id: string;
    husb: string | null;
    wife: string | null;
    children: string[];
    married: boolean;
    divorced: boolean;
  }[] = [];

  let currentIndi: Person | null = null;
  let currentFam: (typeof famRecords)[0] | null = null;
  let currentTag = "";
  let inBirt = false;
  let inDeat = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const match = line.match(/^(\d+)\s+(@\S+@\s+)?(.*)$/);
    if (!match) continue;

    const level = parseInt(match[1], 10);
    const rest = match[3];

    if (level === 0) {
      currentIndi = null;
      currentFam = null;
      inBirt = false;
      inDeat = false;

      if (rest.includes("INDI")) {
        const xref = match[2]?.trim().replace(/@/g, "") ?? "";
        currentIndi = {
          id: xref || generateId("p"),
          firstName: "",
          lastName: "",
          gender: "unknown",
          birthDate: null,
          birthPlace: null,
          deathDate: null,
          deathPlace: null,
          photo: null,
          notes: "",
          customFields: {},
        };
        indiMap.set(xref, currentIndi);
        persons.push(currentIndi);
      } else if (rest.includes("FAM")) {
        const xref = match[2]?.trim().replace(/@/g, "") ?? "";
        currentFam = {
          id: xref,
          husb: null,
          wife: null,
          children: [],
          married: false,
          divorced: false,
        };
        famRecords.push(currentFam);
      }
      continue;
    }

    const tagMatch = rest.match(/^(\S+)\s*(.*)?$/);
    if (!tagMatch) continue;
    const tag = tagMatch[1];
    const value = (tagMatch[2] ?? "").trim().replace(/@/g, "");

    if (currentIndi) {
      if (level === 1) {
        currentTag = tag;
        inBirt = tag === "BIRT";
        inDeat = tag === "DEAT";

        if (tag === "NAME") {
          const nameParts = value.split("/").map((s) => s.trim());
          currentIndi.firstName = nameParts[0] || "";
          currentIndi.lastName = nameParts[1] || "";
        } else if (tag === "SEX") {
          const sexMap: Record<string, Gender> = {
            M: "male",
            F: "female",
            U: "unknown",
          };
          currentIndi.gender = sexMap[value] ?? "unknown";
        } else if (tag === "NOTE") {
          currentIndi.notes = value;
        }
      } else if (level === 2) {
        if (inBirt && tag === "DATE") currentIndi.birthDate = parseGedcomDate(value);
        if (inBirt && tag === "PLAC") currentIndi.birthPlace = value;
        if (inDeat && tag === "DATE") currentIndi.deathDate = parseGedcomDate(value);
        if (inDeat && tag === "PLAC") currentIndi.deathPlace = value;
        if (currentTag === "NOTE" && tag === "CONT") {
          currentIndi.notes += "\n" + value;
        }
      }
    }

    if (currentFam && level === 1) {
      if (tag === "HUSB") currentFam.husb = value;
      else if (tag === "WIFE") currentFam.wife = value;
      else if (tag === "CHIL") currentFam.children.push(value);
      else if (tag === "MARR") currentFam.married = true;
      else if (tag === "DIV") currentFam.divorced = true;
    }
  }

  for (const fam of famRecords) {
    if (fam.husb && fam.wife) {
      relationships.push({
        id: generateId("r"),
        type: "partner",
        from: fam.husb,
        to: fam.wife,
        subtype: fam.divorced ? "divorced" : fam.married ? "married" : "partner",
        startDate: null,
        endDate: null,
      });
    }

    const parents = [fam.husb, fam.wife].filter(Boolean) as string[];
    for (const childId of fam.children) {
      for (const parentId of parents) {
        relationships.push({
          id: generateId("r"),
          type: "parent-child",
          from: parentId,
          to: childId,
          subtype: "biological",
          startDate: null,
          endDate: null,
        });
      }
    }
  }

  return { persons, relationships };
}

function parseGedcomDate(value: string): string | null {
  if (!value) return null;
  const cleaned = value.replace(/^(ABT|EST|CAL|BEF|AFT|BET)\s+/i, "").trim();
  const fullMatch = cleaned.match(/(\d{1,2})\s+(\w{3})\s+(\d{4})/);
  if (fullMatch) {
    const day = fullMatch[1].padStart(2, "0");
    const month = gedcomMonthToNum(fullMatch[2]);
    return `${fullMatch[3]}-${month}-${day}`;
  }
  const monthYear = cleaned.match(/(\w{3})\s+(\d{4})/);
  if (monthYear) {
    return `${monthYear[2]}-${gedcomMonthToNum(monthYear[1])}`;
  }
  const yearOnly = cleaned.match(/(\d{4})/);
  if (yearOnly) return yearOnly[1];
  return null;
}

const GEDCOM_MONTHS: Record<string, string> = {
  JAN: "01", FEB: "02", MAR: "03", APR: "04", MAY: "05", JUN: "06",
  JUL: "07", AUG: "08", SEP: "09", OCT: "10", NOV: "11", DEC: "12",
};

function gedcomMonthToNum(m: string): string {
  return GEDCOM_MONTHS[m.toUpperCase()] ?? "01";
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

  // Build families from partner relationships
  const partnerRels = relationships.filter((r) => r.type === "partner");
  const parentChildRels = relationships.filter(
    (r) => r.type === "parent-child"
  );
  let famIdx = 1;

  for (const pr of partnerRels) {
    const famId = `F${famIdx++}`;
    const p1 = persons.find((p) => p.id === pr.from);
    const p2 = persons.find((p) => p.id === pr.to);
    if (!p1 || !p2) continue;

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

    // Find children of this couple
    const parentIds = new Set([pr.from, pr.to]);
    const childIds = new Set<string>();
    for (const pcr of parentChildRels) {
      if (parentIds.has(pcr.from)) childIds.add(pcr.to);
    }
    for (const cid of childIds) {
      const hasOtherParent = parentChildRels.some(
        (r) => r.to === cid && parentIds.has(r.from)
      );
      if (hasOtherParent) lines.push(`1 CHIL @${cid}@`);
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
