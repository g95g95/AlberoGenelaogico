let counter = 0;

export function generateId(prefix: string = "id"): string {
  counter++;
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).substring(2, 6);
  return `${prefix}_${ts}_${rand}_${counter}`;
}
