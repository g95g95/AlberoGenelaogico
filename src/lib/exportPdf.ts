import { jsPDF } from "jspdf";
import {
  ACCENT_WIDTH,
  AVATAR_SIZE,
  CARD_PADDING,
  CARD_RADIUS,
  CARD_TEXT_WIDTH,
  META_FONT_SIZE,
  NAME_FONT_SIZE,
  truncateToWidth,
  type SceneEdge,
  type SceneNode,
  type TreeScene,
} from "@/lib/treeScene";

export type PdfPageFormat = "a4" | "a3" | "letter";
export type PdfOrientation = "auto" | "portrait" | "landscape";
export type PdfLayoutMode = "auto" | "single" | "poster";

export interface PdfTexts {
  /** e.g. "Generato il" */
  generatedOn: string;
  /** e.g. "Foglio" */
  sheet: string;
  /** e.g. "di" */
  of: string;
  /** e.g. "riga" */
  row: string;
  /** e.g. "colonna" */
  column: string;
}

export interface PdfExportOptions {
  filename?: string;
  format?: PdfPageFormat;
  orientation?: PdfOrientation;
  mode?: PdfLayoutMode;
  title?: string;
  subtitle?: string;
  author?: string;
  locale?: string;
  texts?: Partial<PdfTexts>;
}

const DEFAULT_TEXTS: PdfTexts = {
  generatedOn: "Generato il",
  sheet: "Foglio",
  of: "di",
  row: "riga",
  column: "colonna",
};

const PT_PER_MM = 72 / 25.4;

const MARGIN = 12;
const HEADER_HEIGHT = 15;
const FOOTER_TEXT_HEIGHT = 7;
const LEGEND_ROW_HEIGHT = 4.5;
const LEGEND_SWATCH = 7;

/** Card width, in mm, that keeps a printed sheet comfortably readable. */
const POSTER_CARD_WIDTH_MM = 46;
/** Below this scale the names become too small to read on paper. */
const MIN_READABLE_SCALE = 14 / 220 / 2.6;

const INK = "#1A1A2E";
const MUTED = "#6B7280";
const FAINT = "#9CA3AF";
const HAIRLINE = "#E5E7EB";
const PAPER = "#FFFFFF";

function hexToRgb(hex: string): [number, number, number] {
  const normalized = hex.replace("#", "");
  const full =
    normalized.length === 3
      ? normalized.split("").map((c) => c + c).join("")
      : normalized;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

function setFill(doc: jsPDF, hex: string) {
  const [r, g, b] = hexToRgb(hex);
  doc.setFillColor(r, g, b);
}

function setStroke(doc: jsPDF, hex: string) {
  const [r, g, b] = hexToRgb(hex);
  doc.setDrawColor(r, g, b);
}

function setText(doc: jsPDF, hex: string) {
  const [r, g, b] = hexToRgb(hex);
  doc.setTextColor(r, g, b);
}

function clipRect(doc: jsPDF, x: number, y: number, w: number, h: number) {
  // jsPDF builds a clipping path when the shape is drawn with a null style
  const rect = doc.rect as unknown as (
    x: number,
    y: number,
    w: number,
    h: number,
    style: string | null
  ) => jsPDF;
  rect.call(doc, x, y, w, h, null).clip().discardPath();
}

function clipRoundedRect(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const rounded = doc.roundedRect as unknown as (
    x: number,
    y: number,
    w: number,
    h: number,
    rx: number,
    ry: number,
    style: string | null
  ) => jsPDF;
  rounded.call(doc, x, y, w, h, r, r, null).clip().discardPath();
}

function clipCircle(doc: jsPDF, cx: number, cy: number, r: number) {
  const circle = doc.circle as unknown as (
    x: number,
    y: number,
    r: number,
    style: string | null
  ) => jsPDF;
  circle.call(doc, cx, cy, r, null).clip().discardPath();
}

function imageFormat(dataUrl: string): string {
  if (dataUrl.startsWith("data:image/jpeg") || dataUrl.startsWith("data:image/jpg")) {
    return "JPEG";
  }
  if (dataUrl.startsWith("data:image/webp")) return "WEBP";
  return "PNG";
}

interface PageBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Renders the tree as real vector graphics: text stays selectable, lines stay
 * crisp at any zoom or print resolution, and the whole tree is exported rather
 * than the visible part of the canvas.
 */
export function renderPdf(scene: TreeScene, options: PdfExportOptions = {}): jsPDF {
  const {
    filename = "familytree",
    format = "a4",
    orientation = "auto",
    mode = "auto",
    title = "",
    subtitle = "",
    author = "",
    locale = "it",
  } = options;
  const texts = { ...DEFAULT_TEXTS, ...options.texts };

  const resolvedOrientation =
    orientation === "auto"
      ? scene.bounds.width >= scene.bounds.height
        ? "landscape"
        : "portrait"
      : orientation;

  const doc = new jsPDF({
    orientation: resolvedOrientation,
    unit: "mm",
    format,
    compress: true,
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const legendRows = layoutLegend(doc, scene, pageWidth - MARGIN * 2);
  const footerHeight =
    FOOTER_TEXT_HEIGHT + legendRows.length * LEGEND_ROW_HEIGHT + (legendRows.length ? 2 : 0);

  const content: PageBox = {
    x: MARGIN,
    y: MARGIN + HEADER_HEIGHT,
    width: pageWidth - MARGIN * 2,
    height: pageHeight - MARGIN * 2 - HEADER_HEIGHT - footerHeight,
  };

  // Scene pixels are converted to millimetres through a single scale factor.
  const sceneWidth = Math.max(1, scene.bounds.width);
  const sceneHeight = Math.max(1, scene.bounds.height);
  const fitScale = Math.min(content.width / sceneWidth, content.height / sceneHeight);
  const posterScale = POSTER_CARD_WIDTH_MM / 220;
  const usePoster =
    mode === "poster" || (mode === "auto" && fitScale < MIN_READABLE_SCALE);
  const scale = usePoster ? Math.max(posterScale, fitScale) : fitScale;

  const treeWidth = sceneWidth * scale;
  const treeHeight = sceneHeight * scale;
  const columns = Math.max(1, Math.ceil(treeWidth / content.width - 1e-6));
  const rows = Math.max(1, Math.ceil(treeHeight / content.height - 1e-6));
  const totalPages = columns * rows;

  // Centre the tree on the axes that fit a single sheet; on a multi-sheet
  // poster, anchoring instead keeps the first sheets from being half empty.
  const originX =
    columns === 1 ? content.x + (content.width - treeWidth) / 2 : content.x;
  const originY =
    rows === 1 ? content.y + (content.height - treeHeight) / 2 : content.y;

  const generated = new Date().toLocaleDateString(locale === "en" ? "en-GB" : "it-IT", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  let page = 0;
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      if (page > 0) doc.addPage(format, resolvedOrientation);
      page++;

      drawHeader(doc, pageWidth, title, subtitle, author);

      const offsetX = originX - column * content.width;
      const offsetY = originY - row * content.height;
      const toX = (px: number) => offsetX + (px - scene.bounds.x) * scale;
      const toY = (py: number) => offsetY + (py - scene.bounds.y) * scale;

      doc.saveGraphicsState();
      clipRect(doc, content.x, content.y, content.width, content.height);
      for (const edge of scene.edges) drawEdge(doc, edge, toX, toY, scale);
      for (const node of scene.nodes) drawNode(doc, node, toX, toY, scale);
      doc.restoreGraphicsState();

      drawFooter(doc, {
        pageWidth,
        pageHeight,
        legendRows,
        footerHeight,
        page,
        totalPages,
        row: row + 1,
        column: column + 1,
        multiSheet: totalPages > 1,
        generated,
        texts,
      });
    }
  }

  doc.setProperties({
    title: title || filename,
    author,
    subject: subtitle,
    creator: "AlberoGenealogico",
  });

  return doc;
}

export function exportToPdf(scene: TreeScene, options: PdfExportOptions = {}) {
  if (scene.nodes.length === 0) return;
  const filename = options.filename ?? "familytree";
  renderPdf(scene, options).save(`${filename.replace(/\s+/g, "_")}.pdf`);
}

function drawEdge(
  doc: jsPDF,
  edge: SceneEdge,
  toX: (px: number) => number,
  toY: (py: number) => number,
  scale: number
) {
  setStroke(doc, edge.color);
  doc.setLineWidth(Math.max(0.2, edge.width * scale));
  doc.setLineJoin("round");
  if (edge.dash) {
    doc.setLineDashPattern(
      edge.dash.map((d) => Math.max(0.3, d * scale)),
      0
    );
  }

  for (let i = 1; i < edge.points.length; i++) {
    const a = edge.points[i - 1];
    const b = edge.points[i];
    doc.line(toX(a.x), toY(a.y), toX(b.x), toY(b.y));
  }

  if (edge.dash) doc.setLineDashPattern([], 0);
}

function drawNode(
  doc: jsPDF,
  node: SceneNode,
  toX: (px: number) => number,
  toY: (py: number) => number,
  scale: number
) {
  const x = toX(node.x);
  const y = toY(node.y);
  const w = node.width * scale;
  const h = node.height * scale;
  const radius = CARD_RADIUS * scale;

  setFill(doc, PAPER);
  doc.roundedRect(x, y, w, h, radius, radius, "F");

  // Gender accent bar down the left edge, like the card border on screen
  doc.saveGraphicsState();
  clipRoundedRect(doc, x, y, w, h, radius);
  setFill(doc, node.accent);
  doc.rect(x, y, ACCENT_WIDTH * scale, h, "F");
  doc.restoreGraphicsState();

  setStroke(doc, HAIRLINE);
  doc.setLineWidth(0.2);
  doc.roundedRect(x, y, w, h, radius, radius, "S");

  const avatarRadius = (AVATAR_SIZE / 2) * scale;
  const avatarCx = x + (CARD_PADDING + AVATAR_SIZE / 2) * scale;
  const avatarCy = y + h / 2;

  if (node.photo) {
    doc.saveGraphicsState();
    clipCircle(doc, avatarCx, avatarCy, avatarRadius);
    try {
      doc.addImage(
        node.photo,
        imageFormat(node.photo),
        avatarCx - avatarRadius,
        avatarCy - avatarRadius,
        avatarRadius * 2,
        avatarRadius * 2
      );
    } catch {
      setFill(doc, node.avatarColor);
      doc.circle(avatarCx, avatarCy, avatarRadius, "F");
    }
    doc.restoreGraphicsState();
  } else {
    setFill(doc, node.avatarColor);
    doc.circle(avatarCx, avatarCy, avatarRadius, "F");
    setText(doc, PAPER);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(pxToPt(13, scale));
    doc.text(node.initials, avatarCx, avatarCy, {
      align: "center",
      baseline: "middle",
    });
  }

  const textX = x + (CARD_PADDING + AVATAR_SIZE + CARD_PADDING) * scale;
  const lineGap = 16 * scale;
  const lines = 1 + (node.dates ? 1 : 0) + (node.place ? 1 : 0);
  let textY = avatarCy - ((lines - 1) * lineGap) / 2;

  setText(doc, INK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(pxToPt(NAME_FONT_SIZE, scale));
  doc.text(
    truncateToWidth(node.name, CARD_TEXT_WIDTH, NAME_FONT_SIZE, true),
    textX,
    textY,
    { baseline: "middle" }
  );

  doc.setFont("helvetica", "normal");
  doc.setFontSize(pxToPt(META_FONT_SIZE, scale));
  if (node.dates) {
    textY += lineGap;
    setText(doc, MUTED);
    doc.text(node.dates, textX, textY, { baseline: "middle" });
  }
  if (node.place) {
    textY += lineGap;
    setText(doc, FAINT);
    doc.text(
      truncateToWidth(node.place, CARD_TEXT_WIDTH, META_FONT_SIZE),
      textX,
      textY,
      { baseline: "middle" }
    );
  }
}

function pxToPt(fontSizePx: number, scale: number): number {
  return Math.max(3, fontSizePx * scale * PT_PER_MM);
}

interface LegendEntry {
  label: string;
  color: string;
  dash: number[] | null;
  x: number;
  width: number;
}

function layoutLegend(
  doc: jsPDF,
  scene: TreeScene,
  availableWidth: number
): LegendEntry[][] {
  if (scene.legend.length === 0) return [];

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);

  const rows: LegendEntry[][] = [];
  let current: LegendEntry[] = [];
  let cursor = 0;

  for (const item of scene.legend) {
    const width = LEGEND_SWATCH + 1.5 + doc.getTextWidth(item.label) + 6;
    if (current.length > 0 && cursor + width > availableWidth) {
      rows.push(current);
      current = [];
      cursor = 0;
    }
    current.push({ ...item, x: cursor, width });
    cursor += width;
  }
  if (current.length > 0) rows.push(current);

  return rows;
}

function drawHeader(
  doc: jsPDF,
  pageWidth: number,
  title: string,
  subtitle: string,
  author: string
) {
  if (title) {
    setText(doc, INK);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.text(title, MARGIN, MARGIN + 4, { baseline: "middle" });
  }

  const secondLine = [subtitle, author].filter(Boolean).join(" · ");
  if (secondLine) {
    setText(doc, MUTED);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.text(secondLine, MARGIN, MARGIN + 9.5, { baseline: "middle" });
  }

  setStroke(doc, HAIRLINE);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, MARGIN + HEADER_HEIGHT - 3, pageWidth - MARGIN, MARGIN + HEADER_HEIGHT - 3);
}

function drawFooter(
  doc: jsPDF,
  params: {
    pageWidth: number;
    pageHeight: number;
    legendRows: LegendEntry[][];
    footerHeight: number;
    page: number;
    totalPages: number;
    row: number;
    column: number;
    multiSheet: boolean;
    generated: string;
    texts: PdfTexts;
  }
) {
  const {
    pageWidth,
    pageHeight,
    legendRows,
    footerHeight,
    page,
    totalPages,
    row,
    column,
    multiSheet,
    generated,
    texts,
  } = params;

  const footerTop = pageHeight - MARGIN - footerHeight;

  setStroke(doc, HAIRLINE);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, footerTop, pageWidth - MARGIN, footerTop);

  let y = footerTop + 3.5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);

  for (const legendRow of legendRows) {
    for (const entry of legendRow) {
      setStroke(doc, entry.color);
      doc.setLineWidth(0.6);
      if (entry.dash) doc.setLineDashPattern([1.2, 0.8], 0);
      doc.line(MARGIN + entry.x, y, MARGIN + entry.x + LEGEND_SWATCH, y);
      if (entry.dash) doc.setLineDashPattern([], 0);

      setText(doc, MUTED);
      doc.text(entry.label, MARGIN + entry.x + LEGEND_SWATCH + 1.5, y, {
        baseline: "middle",
      });
    }
    y += LEGEND_ROW_HEIGHT;
  }

  setText(doc, FAINT);
  doc.setFontSize(7);
  doc.text(`${texts.generatedOn} ${generated}`, MARGIN, pageHeight - MARGIN, {
    baseline: "bottom",
  });

  const pageLabel = multiSheet
    ? `${texts.sheet} ${page}/${totalPages} · ${texts.row} ${row}, ${texts.column} ${column}`
    : `${page} ${texts.of} ${totalPages}`;
  doc.text(pageLabel, pageWidth - MARGIN, pageHeight - MARGIN, {
    align: "right",
    baseline: "bottom",
  });
}
