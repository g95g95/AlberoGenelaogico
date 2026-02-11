const PALETTE = [
  "#7C9A72", "#C87941", "#6B9AC4", "#D4849A", "#9B8EC4",
  "#E0A070", "#94BBD9", "#A3C49A", "#B8856C", "#7EAAB3",
];

export function getInitials(firstName: string, lastName: string): string {
  const f = firstName.trim().charAt(0).toUpperCase();
  const l = lastName.trim().charAt(0).toUpperCase();
  return `${f}${l}` || "?";
}

export function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
}
