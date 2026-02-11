import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";

export async function exportToPdf(
  element: HTMLElement,
  options: { filename?: string; orientation?: "portrait" | "landscape" } = {}
) {
  const { filename = "familytree", orientation = "landscape" } = options;

  const dataUrl = await toPng(element, {
    backgroundColor: "#FAFAF8",
    pixelRatio: 2,
  });

  const img = new Image();
  img.src = dataUrl;
  await new Promise<void>((resolve) => {
    img.onload = () => resolve();
  });

  const pdf = new jsPDF({
    orientation,
    unit: "mm",
    format: "a4",
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 10;
  const maxW = pageWidth - margin * 2;
  const maxH = pageHeight - margin * 2;

  const ratio = Math.min(maxW / img.width, maxH / img.height);
  const w = img.width * ratio;
  const h = img.height * ratio;
  const x = (pageWidth - w) / 2;
  const y = (pageHeight - h) / 2;

  pdf.addImage(dataUrl, "PNG", x, y, w, h);
  pdf.save(`${filename}.pdf`);
}
