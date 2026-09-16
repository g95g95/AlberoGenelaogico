import {
  ACCENT_WIDTH,
  AVATAR_SIZE,
  CARD_PADDING,
  CARD_RADIUS,
  CARD_TEXT_WIDTH,
  META_FONT_SIZE,
  NAME_FONT_SIZE,
  truncateToWidth,
  type SceneNode,
  type TreeScene,
} from "@/lib/treeScene";

const FONT_STACK =
  "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

const INK = "#1A1A2E";
const MUTED = "#6B7280";
const FAINT = "#9CA3AF";
const HAIRLINE = "#E5E7EB";
const PAPER = "#FFFFFF";

export interface ImageExportOptions {
  filename?: string;
  background?: string;
  /** Pixel density multiplier for raster output */
  scale?: number;
}

/** Vertical offsets of the text lines inside a card, relative to its centre. */
function textLines(node: SceneNode) {
  const lines: { text: string; size: number; color: string; bold: boolean }[] = [
    {
      text: truncateToWidth(node.name, CARD_TEXT_WIDTH, NAME_FONT_SIZE, true),
      size: NAME_FONT_SIZE,
      color: INK,
      bold: true,
    },
  ];
  if (node.dates) {
    lines.push({ text: node.dates, size: META_FONT_SIZE, color: MUTED, bold: false });
  }
  if (node.place) {
    lines.push({
      text: truncateToWidth(node.place, CARD_TEXT_WIDTH, META_FONT_SIZE),
      size: META_FONT_SIZE,
      color: FAINT,
      bold: false,
    });
  }
  return lines;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * True vector SVG built from the scene: no rasterised screenshot, no clipping
 * to the visible canvas, and the text stays real text.
 */
export function buildSvg(scene: TreeScene, background = PAPER): string {
  const { bounds } = scene;
  const parts: string[] = [];

  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${bounds.width}" height="${bounds.height}" viewBox="${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}" font-family="${FONT_STACK}">`
  );
  parts.push(`<rect x="${bounds.x}" y="${bounds.y}" width="${bounds.width}" height="${bounds.height}" fill="${background}"/>`);

  const clipPaths: string[] = [];
  for (const node of scene.nodes) {
    clipPaths.push(
      `<clipPath id="card-${escapeXml(node.id)}"><rect x="${node.x}" y="${node.y}" width="${node.width}" height="${node.height}" rx="${CARD_RADIUS}"/></clipPath>`
    );
    if (!node.photo) continue;
    const cx = node.x + CARD_PADDING + AVATAR_SIZE / 2;
    const cy = node.y + node.height / 2;
    clipPaths.push(
      `<clipPath id="avatar-${escapeXml(node.id)}"><circle cx="${cx}" cy="${cy}" r="${AVATAR_SIZE / 2}"/></clipPath>`
    );
  }
  if (clipPaths.length > 0) parts.push(`<defs>${clipPaths.join("")}</defs>`);

  for (const edge of scene.edges) {
    const d = edge.points
      .map((p, i) => `${i === 0 ? "M" : "L"}${p.x} ${p.y}`)
      .join(" ");
    const dash = edge.dash ? ` stroke-dasharray="${edge.dash.join(" ")}"` : "";
    parts.push(
      `<path d="${d}" fill="none" stroke="${edge.color}" stroke-width="${edge.width}" stroke-linejoin="round"${dash}/>`
    );
  }

  for (const node of scene.nodes) {
    const cx = node.x + CARD_PADDING + AVATAR_SIZE / 2;
    const cy = node.y + node.height / 2;

    parts.push(
      `<rect x="${node.x}" y="${node.y}" width="${node.width}" height="${node.height}" rx="${CARD_RADIUS}" fill="${PAPER}"/>`,
      `<rect x="${node.x}" y="${node.y}" width="${ACCENT_WIDTH}" height="${node.height}" fill="${node.accent}" clip-path="url(#card-${escapeXml(node.id)})"/>`,
      `<rect x="${node.x}" y="${node.y}" width="${node.width}" height="${node.height}" rx="${CARD_RADIUS}" fill="none" stroke="${HAIRLINE}"/>`
    );

    if (node.photo) {
      parts.push(
        `<image href="${escapeXml(node.photo)}" x="${cx - AVATAR_SIZE / 2}" y="${cy - AVATAR_SIZE / 2}" width="${AVATAR_SIZE}" height="${AVATAR_SIZE}" preserveAspectRatio="xMidYMid slice" clip-path="url(#avatar-${escapeXml(node.id)})"/>`
      );
    } else {
      parts.push(
        `<circle cx="${cx}" cy="${cy}" r="${AVATAR_SIZE / 2}" fill="${node.avatarColor}"/>`,
        `<text x="${cx}" y="${cy}" fill="${PAPER}" font-size="13" font-weight="600" text-anchor="middle" dominant-baseline="central">${escapeXml(node.initials)}</text>`
      );
    }

    const lines = textLines(node);
    const textX = node.x + CARD_PADDING + AVATAR_SIZE + CARD_PADDING;
    let lineY = cy - ((lines.length - 1) * 16) / 2;
    for (const line of lines) {
      parts.push(
        `<text x="${textX}" y="${lineY}" fill="${line.color}" font-size="${line.size}" font-weight="${line.bold ? 600 : 400}" dominant-baseline="central">${escapeXml(line.text)}</text>`
      );
      lineY += 16;
    }
  }

  parts.push("</svg>");
  return parts.join("");
}

export function exportToSvg(scene: TreeScene, options: ImageExportOptions = {}) {
  const { filename = "familytree", background = PAPER } = options;
  if (scene.nodes.length === 0) return;

  const blob = new Blob([buildSvg(scene, background)], {
    type: "image/svg+xml;charset=utf-8",
  });
  downloadBlob(blob, `${filename.replace(/\s+/g, "_")}.svg`);
}

export async function exportToPng(
  scene: TreeScene,
  options: ImageExportOptions = {}
) {
  const { filename = "familytree", background = PAPER, scale = 3 } = options;
  if (scene.nodes.length === 0) return;

  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(scene.bounds.width * scale);
  canvas.height = Math.ceil(scene.bounds.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.scale(scale, scale);
  ctx.translate(-scene.bounds.x, -scene.bounds.y);

  ctx.fillStyle = background;
  ctx.fillRect(scene.bounds.x, scene.bounds.y, scene.bounds.width, scene.bounds.height);

  for (const edge of scene.edges) {
    ctx.beginPath();
    edge.points.forEach((point, index) => {
      if (index === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.strokeStyle = edge.color;
    ctx.lineWidth = edge.width;
    ctx.lineJoin = "round";
    ctx.setLineDash(edge.dash ?? []);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  const photos = await loadPhotos(scene);

  for (const node of scene.nodes) {
    roundedRectPath(ctx, node.x, node.y, node.width, node.height, CARD_RADIUS);
    ctx.fillStyle = PAPER;
    ctx.fill();

    ctx.save();
    roundedRectPath(ctx, node.x, node.y, node.width, node.height, CARD_RADIUS);
    ctx.clip();
    ctx.fillStyle = node.accent;
    ctx.fillRect(node.x, node.y, ACCENT_WIDTH, node.height);
    ctx.restore();

    roundedRectPath(ctx, node.x, node.y, node.width, node.height, CARD_RADIUS);
    ctx.strokeStyle = HAIRLINE;
    ctx.lineWidth = 1;
    ctx.stroke();

    const cx = node.x + CARD_PADDING + AVATAR_SIZE / 2;
    const cy = node.y + node.height / 2;
    const photo = photos.get(node.id);

    if (photo) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, AVATAR_SIZE / 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(photo, cx - AVATAR_SIZE / 2, cy - AVATAR_SIZE / 2, AVATAR_SIZE, AVATAR_SIZE);
      ctx.restore();
    } else {
      ctx.beginPath();
      ctx.arc(cx, cy, AVATAR_SIZE / 2, 0, Math.PI * 2);
      ctx.fillStyle = node.avatarColor;
      ctx.fill();

      ctx.fillStyle = PAPER;
      ctx.font = `600 13px ${FONT_STACK}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(node.initials, cx, cy);
    }

    const lines = textLines(node);
    const textX = node.x + CARD_PADDING + AVATAR_SIZE + CARD_PADDING;
    let lineY = cy - ((lines.length - 1) * 16) / 2;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    for (const line of lines) {
      ctx.fillStyle = line.color;
      ctx.font = `${line.bold ? 600 : 400} ${line.size}px ${FONT_STACK}`;
      ctx.fillText(line.text, textX, lineY);
      lineY += 16;
    }
  }

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/png")
  );
  if (blob) downloadBlob(blob, `${filename.replace(/\s+/g, "_")}.png`);
}

function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

async function loadPhotos(scene: TreeScene): Promise<Map<string, HTMLImageElement>> {
  const entries = await Promise.all(
    scene.nodes
      .filter((node) => node.photo)
      .map(
        (node) =>
          new Promise<[string, HTMLImageElement] | null>((resolve) => {
            const img = new Image();
            img.onload = () => resolve([node.id, img]);
            img.onerror = () => resolve(null);
            img.src = node.photo as string;
          })
      )
  );
  return new Map(entries.filter((e): e is [string, HTMLImageElement] => e !== null));
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
