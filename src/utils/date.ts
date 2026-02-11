const monthNames: Record<string, string[]> = {
  it: [
    "gen", "feb", "mar", "apr", "mag", "giu",
    "lug", "ago", "set", "ott", "nov", "dic",
  ],
  en: [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ],
};

export function formatDate(
  isoPartial: string | null | undefined,
  locale: string = "it"
): string {
  if (!isoPartial) return "";
  const parts = isoPartial.split("-");
  const months = monthNames[locale] ?? monthNames.it;

  if (parts.length === 1) return parts[0];
  if (parts.length === 2) {
    const monthIdx = parseInt(parts[1], 10) - 1;
    return `${months[monthIdx]} ${parts[0]}`;
  }
  if (parts.length >= 3) {
    const monthIdx = parseInt(parts[1], 10) - 1;
    return `${parseInt(parts[2], 10)} ${months[monthIdx]} ${parts[0]}`;
  }
  return isoPartial;
}

export function formatDateRange(
  birthDate: string | null | undefined,
  deathDate: string | null | undefined
): string {
  const birth = birthDate ? extractYear(birthDate) : "";
  const death = deathDate ? extractYear(deathDate) : "";

  if (!birth && !death) return "";
  if (birth && !death) return birth;
  if (!birth && death) return `? - ${death}`;
  return `${birth} - ${death}`;
}

function extractYear(isoPartial: string): string {
  return isoPartial.split("-")[0];
}
