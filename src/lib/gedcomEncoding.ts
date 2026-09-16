/**
 * GEDCOM files in the wild are not always UTF-8: MyHeritage and FamilySearch
 * emit UTF-8 (often with a BOM), Ancestry and Geni may emit UTF-8 or
 * Windows-1252, and older desktop programs (PAF, Legacy, Family Tree Maker)
 * still write ANSEL. Decoding with the wrong table mangles every accented
 * name, so the charset is detected before parsing.
 */

export type GedcomCharset = "utf-8" | "utf-16le" | "utf-16be" | "windows-1252" | "ansel";

const ANSEL_SINGLE: Record<number, string> = {
  0xa1: "Ł", 0xa2: "Ø", 0xa3: "Đ", 0xa4: "Þ", 0xa5: "Æ", 0xa6: "Œ",
  0xa7: "ʹ", 0xa8: "·", 0xa9: "♭", 0xaa: "®", 0xab: "±", 0xac: "Ơ",
  0xad: "Ư", 0xae: "ʼ", 0xb0: "ʻ", 0xb1: "ł", 0xb2: "ø", 0xb3: "đ",
  0xb4: "þ", 0xb5: "æ", 0xb6: "œ", 0xb7: "ʺ", 0xb8: "ı", 0xb9: "£",
  0xba: "ð", 0xbc: "°", 0xbd: "℗", 0xbe: "©", 0xbf: "♯",
  0xc0: "¿", 0xc1: "¡",
};

/** ANSEL writes the diacritic *before* the letter it applies to. */
const ANSEL_COMBINING: Record<number, string> = {
  0xe0: "̉", 0xe1: "̀", 0xe2: "́", 0xe3: "̂",
  0xe4: "̃", 0xe5: "̄", 0xe6: "̆", 0xe7: "̇",
  0xe8: "̈", 0xe9: "̌", 0xea: "̊", 0xeb: "︠",
  0xec: "︡", 0xed: "̕", 0xee: "̋", 0xef: "̐",
  0xf0: "̧", 0xf1: "̨", 0xf2: "̣", 0xf3: "̤",
  0xf4: "̥", 0xf5: "̳", 0xf6: "̲", 0xf7: "̦",
  0xf8: "̜", 0xf9: "̮", 0xfa: "︢", 0xfb: "︣",
  0xfe: "̓",
};

export function decodeAnsel(bytes: Uint8Array): string {
  let out = "";
  let pending = "";

  for (const byte of bytes) {
    if (byte < 0x80) {
      out += String.fromCharCode(byte) + pending;
      pending = "";
      continue;
    }
    const combining = ANSEL_COMBINING[byte];
    if (combining) {
      pending = combining + pending;
      continue;
    }
    out += (ANSEL_SINGLE[byte] ?? "") + pending;
    pending = "";
  }

  return (out + pending).normalize("NFC");
}

function decodeWith(bytes: Uint8Array, charset: string): string {
  try {
    return new TextDecoder(charset).decode(bytes);
  } catch {
    return new TextDecoder("utf-8").decode(bytes);
  }
}

/** Reads the `1 CHAR` value from the header without decoding the whole file. */
export function declaredCharset(bytes: Uint8Array): string | null {
  const probe = new TextDecoder("latin1").decode(bytes.subarray(0, 4096));
  const match = /^\s*1\s+CHAR\s+(.+)$/im.exec(probe);
  return match ? match[1].trim().toUpperCase() : null;
}

export function detectCharset(bytes: Uint8Array): GedcomCharset {
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) return "utf-8";
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return "utf-16le";
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return "utf-16be";

  const declared = declaredCharset(bytes);
  if (!declared) return "utf-8";
  if (declared.startsWith("ANSEL")) return "ansel";
  if (declared.startsWith("UNICODE") || declared.startsWith("UTF-16")) return "utf-16le";
  if (declared.startsWith("ANSI") || declared.includes("1252")) return "windows-1252";
  return "utf-8";
}

export function decodeGedcom(buffer: ArrayBuffer): { text: string; charset: GedcomCharset } {
  const bytes = new Uint8Array(buffer);
  const charset = detectCharset(bytes);

  if (charset === "ansel") {
    return { text: decodeAnsel(bytes), charset };
  }

  const body =
    bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf
      ? bytes.subarray(3)
      : bytes;
  return { text: decodeWith(body, charset), charset };
}
