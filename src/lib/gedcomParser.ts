import type { Gender, Person, Relationship } from "@/types/domain";
import { generateId } from "@/utils/id";

/**
 * GEDCOM reader aimed at the files public genealogy services actually hand
 * out (MyHeritage, Ancestry, FamilySearch, Geni, Gramps, Legacy, PAF…).
 * Those exports use the whole 5.5.1 grammar, not the handful of tags a toy
 * parser expects: CONC/CONT continuations, GIVN/SURN sub-tags, event blocks
 * with dates and places, adoption pedigrees, and non-UTF-8 encodings.
 */

export interface GedcomNode {
  tag: string;
  xref: string | null;
  value: string;
  children: GedcomNode[];
}

export interface GedcomSource {
  /** Program that produced the file, e.g. "MyHeritage Family Tree Builder" */
  generator: string | null;
  /** Tree/file name declared in the header */
  treeName: string | null;
  submitter: string | null;
}

export interface GedcomImportResult {
  persons: Person[];
  relationships: Relationship[];
  source: GedcomSource;
  warnings: string[];
  stats: { individuals: number; families: number; ignoredRecords: number };
}

const LINE_RE = /^\s*(\d+)\s+(?:(@[^@]*@)\s+)?([A-Za-z0-9_]+)(?:\s(.*))?$/;

/** Splits the flat GEDCOM lines into a record tree, folding CONC/CONT. */
export function tokenizeGedcom(text: string): GedcomNode[] {
  const roots: GedcomNode[] = [];
  const stack: GedcomNode[] = [];

  for (const rawLine of text.split(/\r\n|\r|\n/)) {
    if (!rawLine.trim()) continue;
    const match = LINE_RE.exec(rawLine);
    if (!match) continue;

    const level = parseInt(match[1], 10);
    const xref = match[2] ? match[2].slice(1, -1) : null;
    const tag = match[3].toUpperCase();
    const value = match[4] ?? "";

    // Continuations belong to the value of the line above them
    if ((tag === "CONC" || tag === "CONT") && stack.length > 0) {
      const parent = stack[Math.min(level, stack.length) - 1];
      if (parent) {
        parent.value += tag === "CONT" ? `\n${value}` : value;
        continue;
      }
    }

    const node: GedcomNode = { tag, xref, value, children: [] };
    if (level === 0) {
      roots.push(node);
      stack.length = 0;
      stack.push(node);
    } else {
      const parent = stack[level - 1];
      if (!parent) continue;
      parent.children.push(node);
      stack.length = level;
      stack.push(node);
    }
  }

  return roots;
}

function child(node: GedcomNode | undefined, tag: string): GedcomNode | undefined {
  return node?.children.find((c) => c.tag === tag);
}

function childValue(node: GedcomNode | undefined, tag: string): string {
  return child(node, tag)?.value.trim() ?? "";
}

function pointer(value: string): string | null {
  const match = /^@([^@]+)@$/.exec(value.trim());
  return match ? match[1] : null;
}

const SEX_MAP: Record<string, Gender> = {
  M: "male",
  F: "female",
  X: "other",
  U: "unknown",
  N: "other",
};

/** Extra facts worth keeping, mapped onto the person's custom fields. */
const EXTRA_FACT_TAGS: Record<string, string> = {
  OCCU: "Occupation",
  RELI: "Religion",
  EDUC: "Education",
  NATI: "Nationality",
  RESI: "Residence",
  TITL: "Title",
  CAST: "Caste",
  NCHI: "Children",
};

const EVENT_WITH_PLACE_TAGS: Record<string, string> = {
  BURI: "Burial",
  CHR: "Christening",
  BAPM: "Baptism",
  CREM: "Cremation",
};

function personName(indi: GedcomNode): { firstName: string; lastName: string } {
  const nameNode = child(indi, "NAME");
  if (!nameNode) return { firstName: "", lastName: "" };

  // MyHeritage and friends usually provide the structured sub-tags too
  const given = childValue(nameNode, "GIVN");
  const surname = childValue(nameNode, "SURN");
  if (given || surname) {
    return { firstName: given, lastName: surname };
  }

  const raw = nameNode.value.trim();
  const slashed = /^(.*?)\/(.*?)\/(.*)$/.exec(raw);
  if (slashed) {
    const suffix = slashed[3].trim();
    return {
      firstName: slashed[1].trim(),
      lastName: [slashed[2].trim(), suffix].filter(Boolean).join(" ").trim(),
    };
  }
  return { firstName: raw, lastName: "" };
}

function eventDate(node: GedcomNode | undefined): string | null {
  const value = childValue(node, "DATE");
  return value ? parseGedcomDate(value) : null;
}

function eventPlace(node: GedcomNode | undefined): string | null {
  const value = childValue(node, "PLAC");
  return value || null;
}

function personFromIndi(indi: GedcomNode): Person {
  const { firstName, lastName } = personName(indi);
  const birth = child(indi, "BIRT");
  const death = child(indi, "DEAT");

  const customFields: Record<string, string> = {};
  for (const node of indi.children) {
    const factLabel = EXTRA_FACT_TAGS[node.tag];
    if (factLabel && node.value.trim()) {
      customFields[factLabel] = node.value.trim();
      continue;
    }
    const eventLabel = EVENT_WITH_PLACE_TAGS[node.tag];
    if (eventLabel) {
      const parts = [childValue(node, "DATE"), childValue(node, "PLAC")].filter(Boolean);
      if (parts.length > 0) customFields[eventLabel] = parts.join(" — ");
    }
  }

  // Photos live outside a plain .ged file, but keeping the reference lets the
  // user find them in the archive the service handed out.
  const media = child(indi, "OBJE");
  const mediaFile = media ? childValue(media, "FILE") || media.value.trim() : "";
  if (mediaFile && !pointer(mediaFile)) customFields.Media = mediaFile;

  const notes = indi.children
    .filter((c) => c.tag === "NOTE")
    .map((c) => c.value.trim())
    .filter(Boolean)
    .join("\n\n");

  return {
    id: indi.xref || generateId("p"),
    firstName,
    lastName,
    gender: SEX_MAP[childValue(indi, "SEX").toUpperCase()] ?? "unknown",
    birthDate: eventDate(birth),
    birthPlace: eventPlace(birth),
    deathDate: eventDate(death),
    deathPlace: eventPlace(death),
    photo: null,
    notes,
    customFields,
  };
}

/** Pedigree recorded on the child's FAMC link, per family. */
function pedigreeByFamily(indi: GedcomNode): Map<string, string> {
  const map = new Map<string, string>();
  for (const node of indi.children) {
    if (node.tag !== "FAMC") continue;
    const famId = pointer(node.value);
    if (!famId) continue;
    const pedi = childValue(node, "PEDI").toLowerCase();
    if (pedi) map.set(famId, pedi);
  }
  return map;
}

const PEDIGREE_SUBTYPES: Record<string, Relationship["subtype"]> = {
  adopted: "adopted",
  foster: "foster",
  step: "step",
  birth: "biological",
  natural: "biological",
};

export function parseGedcom(text: string): GedcomImportResult {
  const records = tokenizeGedcom(text);
  const warnings: string[] = [];

  const head = records.find((r) => r.tag === "HEAD");
  const headSource = child(head, "SOUR");
  const source: GedcomSource = {
    generator:
      [childValue(headSource, "NAME"), headSource?.value.trim()]
        .find((v) => v) ?? null,
    treeName: childValue(head, "FILE") || null,
    submitter: null,
  };

  const indiRecords = records.filter((r) => r.tag === "INDI");
  const famRecords = records.filter((r) => r.tag === "FAM");
  const ignoredRecords = records.filter(
    (r) => !["INDI", "FAM", "HEAD", "TRLR"].includes(r.tag)
  ).length;

  const submitterRef = pointer(childValue(head, "SUBM"));
  const submitterRecord = records.find(
    (r) => r.tag === "SUBM" && (submitterRef ? r.xref === submitterRef : true)
  );
  source.submitter = childValue(submitterRecord, "NAME") || null;

  const persons: Person[] = [];
  const seenIds = new Set<string>();
  const pedigrees = new Map<string, Map<string, string>>();

  for (const indi of indiRecords) {
    const person = personFromIndi(indi);
    if (seenIds.has(person.id)) {
      warnings.push(`Individuo duplicato ignorato: @${person.id}@`);
      continue;
    }
    seenIds.add(person.id);
    persons.push(person);
    pedigrees.set(person.id, pedigreeByFamily(indi));
  }

  const relationships: Relationship[] = [];
  const seenLinks = new Set<string>();

  const addRelationship = (rel: Relationship) => {
    const key = `${rel.type}:${rel.from}:${rel.to}`;
    const mirrored = `${rel.type}:${rel.to}:${rel.from}`;
    if (seenLinks.has(key) || (rel.type !== "parent-child" && seenLinks.has(mirrored))) {
      return;
    }
    seenLinks.add(key);
    relationships.push(rel);
  };

  for (const fam of famRecords) {
    const famId = fam.xref ?? "";
    const husband = pointer(childValue(fam, "HUSB"));
    const wife = pointer(childValue(fam, "WIFE"));
    const children = fam.children
      .filter((c) => c.tag === "CHIL")
      .map((c) => pointer(c.value))
      .filter((id): id is string => id !== null);

    const marriage = child(fam, "MARR");
    const divorce = child(fam, "DIV");

    const parents = [husband, wife].filter((id): id is string => {
      if (id === null) return false;
      if (!seenIds.has(id)) {
        warnings.push(`Persona non trovata nel file: @${id}@`);
        return false;
      }
      return true;
    });

    if (parents.length === 2) {
      addRelationship({
        id: generateId("r"),
        type: "partner",
        from: parents[0],
        to: parents[1],
        subtype: divorce ? "divorced" : marriage ? "married" : "partner",
        startDate: eventDate(marriage),
        endDate: eventDate(divorce),
        location: eventPlace(marriage),
      });
    }

    for (const childId of children) {
      if (!seenIds.has(childId)) {
        warnings.push(`Figlio non trovato nel file: @${childId}@`);
        continue;
      }
      const pedigree = pedigrees.get(childId)?.get(famId) ?? "";
      const subtype = PEDIGREE_SUBTYPES[pedigree] ?? "biological";

      for (const parentId of parents) {
        addRelationship({
          id: generateId("r"),
          type: "parent-child",
          from: parentId,
          to: childId,
          subtype,
          startDate: null,
          endDate: null,
          location: null,
        });
      }
    }

    // A family with children but no recorded parents only carries the fact
    // that these people are siblings: keep it as an explicit sibling link.
    if (parents.length === 0 && children.length > 1) {
      for (let i = 1; i < children.length; i++) {
        if (!seenIds.has(children[i - 1]) || !seenIds.has(children[i])) continue;
        addRelationship({
          id: generateId("r"),
          type: "sibling",
          from: children[i - 1],
          to: children[i],
          subtype: "full",
          startDate: null,
          endDate: null,
          location: null,
        });
      }
    }
  }

  return {
    persons,
    relationships,
    source,
    warnings,
    stats: {
      individuals: persons.length,
      families: famRecords.length,
      ignoredRecords,
    },
  };
}

const GEDCOM_MONTHS: Record<string, string> = {
  JAN: "01", FEB: "02", MAR: "03", APR: "04", MAY: "05", JUN: "06",
  JUL: "07", AUG: "08", SEP: "09", OCT: "10", NOV: "11", DEC: "12",
};

function gedcomMonthToNum(month: string): string {
  return GEDCOM_MONTHS[month.toUpperCase()] ?? "01";
}

/**
 * GEDCOM dates carry qualifiers ("ABT 1900", "BET 1900 AND 1910",
 * "FROM 1900 TO 1910"); the tree stores a single partial ISO date, so the
 * qualifier is dropped and ranges collapse to their first date.
 */
export function parseGedcomDate(value: string): string | null {
  if (!value) return null;

  let cleaned = value.trim().toUpperCase();
  cleaned = cleaned.replace(/\((.*)\)/g, "").trim();
  cleaned = cleaned.replace(/^(ABT|EST|CAL|BEF|AFT|INT)\s+/, "");
  cleaned = cleaned.replace(/^BET\s+(.*?)\s+AND\s+.*$/, "$1");
  cleaned = cleaned.replace(/^FROM\s+(.*?)(?:\s+TO\s+.*)?$/, "$1");
  cleaned = cleaned.replace(/^TO\s+/, "");
  cleaned = cleaned.trim();

  // GEDCOM 7 already speaks ISO
  const iso = /^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?$/.exec(cleaned);
  if (iso) return [iso[1], iso[2], iso[3]].filter(Boolean).join("-");

  const full = /(\d{1,2})\s+([A-Z]{3})[A-Z]*\s+(\d{3,4})/.exec(cleaned);
  if (full) {
    return `${full[3].padStart(4, "0")}-${gedcomMonthToNum(full[2])}-${full[1].padStart(2, "0")}`;
  }

  const monthYear = /([A-Z]{3})[A-Z]*\s+(\d{3,4})/.exec(cleaned);
  if (monthYear) {
    return `${monthYear[2].padStart(4, "0")}-${gedcomMonthToNum(monthYear[1])}`;
  }

  const yearOnly = /(\d{3,4})/.exec(cleaned);
  return yearOnly ? yearOnly[1].padStart(4, "0") : null;
}
